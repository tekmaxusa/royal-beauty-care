<?php

declare(strict_types=1);

require_once __DIR__ . '/../booking/booking.php';
require_once __DIR__ . '/booking_payments.php';
require_once __DIR__ . '/booking_refunds.php';
require_once __DIR__ . '/cardconnect.php';

function chb_booking_apply_deposit_reversal_cents(int $bookingId, int $reversalAmountCents): void
{
    $row = fetch_booking_by_id($bookingId);
    if (!$row) {
        return;
    }
    $paid = (int) ($row['deposit_paid_cents'] ?? 0);
    $oldRef = (int) ($row['deposit_refunded_cents'] ?? 0);
    $newRef = $oldRef + max(0, $reversalAmountCents);
    $newStatus = $newRef >= $paid ? 'deposit_refunded' : 'deposit_partially_refunded';

    $pdo = db();
    $upd = $pdo->prepare(
        'UPDATE bookings SET deposit_refunded_cents = :dr, payment_status = :ps WHERE id = :id'
    );
    $upd->execute([
        ':dr' => $newRef,
        ':ps' => $newStatus,
        ':id' => $bookingId,
    ]);
}

/**
 * On admin cancel: try void first (unsettled / open batch), then refund (settled).
 *
 * @return array{ok:bool,skipped?:bool,method?:string,amount_cents?:int,error?:string}
 */
function chb_admin_reverse_deposit_on_cancel(int $bookingId): array
{
    if ($bookingId <= 0) {
        return ['ok' => false, 'error' => 'Invalid booking.'];
    }

    $row = fetch_booking_by_id($bookingId);
    if (!$row) {
        return ['ok' => false, 'error' => 'Booking not found.'];
    }

    $paid = (int) ($row['deposit_paid_cents'] ?? 0);
    $refundedSoFar = (int) ($row['deposit_refunded_cents'] ?? 0);
    $refundable = max(0, $paid - $refundedSoFar);

    if ($refundable <= 0) {
        return ['ok' => true, 'skipped' => true];
    }

    $ps = (string) ($row['payment_status'] ?? '');
    if ($ps !== 'deposit_paid' && $ps !== 'deposit_partially_refunded') {
        return ['ok' => true, 'skipped' => true];
    }

    $pay = chb_payment_row_approved_for_booking($bookingId);
    if ($pay === null) {
        return ['ok' => true, 'skipped' => true];
    }

    $origRetref = trim((string) ($pay['retref'] ?? ''));
    if ($origRetref === '') {
        return ['ok' => true, 'skipped' => true];
    }

    if (!chb_cardconnect_is_enabled()) {
        return [
            'ok' => false,
            'error' => 'CardConnect is not configured. Void or refund the deposit in CardPointe, then cancel again.',
        ];
    }

    $voidOrderId = 'chb-void-' . $bookingId . '-' . bin2hex(random_bytes(4));
    $void = chb_cardconnect_void($origRetref, $refundable);
    if ($void['ok'] && !empty($void['approved'])) {
        $vresp = $void['response'] ?? [];
        chb_refund_record_row(
            $bookingId,
            $refundable,
            $origRetref,
            $voidOrderId,
            $vresp,
            (string) ($void['raw'] ?? ''),
            'void'
        );
        chb_booking_apply_deposit_reversal_cents($bookingId, $refundable);

        return ['ok' => true, 'method' => 'void', 'amount_cents' => $refundable];
    }

    $voidMsg = '';
    if ($void['ok'] && empty($void['approved'])) {
        $voidMsg = (string) (($void['response']['resptext'] ?? '') ?: 'Void declined.');
    } elseif (!$void['ok']) {
        $voidMsg = (string) ($void['error'] ?? 'Void request failed.');
    }

    $refundOrderId = 'chb-refund-' . $bookingId . '-' . bin2hex(random_bytes(4));
    $refund = chb_cardconnect_refund($origRetref, $refundable, $refundOrderId);
    if ($refund['ok'] && !empty($refund['approved'])) {
        $rresp = $refund['response'] ?? [];
        chb_refund_record_row(
            $bookingId,
            $refundable,
            $origRetref,
            $refundOrderId,
            $rresp,
            (string) ($refund['raw'] ?? ''),
            'refund'
        );
        chb_booking_apply_deposit_reversal_cents($bookingId, $refundable);

        return ['ok' => true, 'method' => 'refund', 'amount_cents' => $refundable];
    }

    $refundMsg = '';
    if ($refund['ok'] && empty($refund['approved'])) {
        $refundMsg = (string) (($refund['response']['resptext'] ?? '') ?: 'Refund declined.');
    } elseif (!$refund['ok']) {
        $refundMsg = (string) ($refund['error'] ?? 'Refund request failed.');
    }

    return [
        'ok' => false,
        'error' => 'Could not void or refund the deposit. Void: ' . $voidMsg . ' Refund: ' . $refundMsg,
    ];
}

/**
 * @return array{ok:bool,error?:string,refund?:array<string,mixed>}
 */
function chb_admin_refund_booking_deposit(int $bookingId, ?int $amountCents): array
{
    if ($bookingId <= 0) {
        return ['ok' => false, 'error' => 'Invalid booking.'];
    }

    if (!chb_cardconnect_is_enabled()) {
        return ['ok' => false, 'error' => 'CardConnect is not configured.'];
    }

    $row = fetch_booking_by_id($bookingId);
    if (!$row) {
        return ['ok' => false, 'error' => 'Booking not found.'];
    }

    $paid = (int) ($row['deposit_paid_cents'] ?? 0);
    $refundedSoFar = (int) ($row['deposit_refunded_cents'] ?? 0);
    $refundable = max(0, $paid - $refundedSoFar);

    if ($refundable <= 0) {
        return ['ok' => false, 'error' => 'No deposit balance left to refund.'];
    }

    $ps = (string) ($row['payment_status'] ?? '');
    if ($ps !== 'deposit_paid' && $ps !== 'deposit_partially_refunded') {
        return ['ok' => false, 'error' => 'This booking does not have a refundable card deposit.'];
    }

    $pay = chb_payment_row_approved_for_booking($bookingId);
    if ($pay === null) {
        return ['ok' => false, 'error' => 'No CardConnect capture on file for this booking (nothing to refund via API).'];
    }

    $origRetref = trim((string) ($pay['retref'] ?? ''));
    if ($origRetref === '') {
        return ['ok' => false, 'error' => 'Missing gateway reference for the original payment.'];
    }

    $refundAmount = $amountCents === null || $amountCents <= 0 ? $refundable : min($refundable, $amountCents);
    if ($refundAmount <= 0) {
        return ['ok' => false, 'error' => 'Refund amount must be positive.'];
    }

    $refundOrderId = 'chb-refund-' . $bookingId . '-' . bin2hex(random_bytes(4));
    $gw = chb_cardconnect_refund($origRetref, $refundAmount, $refundOrderId);

    if (!$gw['ok']) {
        return ['ok' => false, 'error' => $gw['error'] ?? 'Refund request failed.'];
    }

    if (empty($gw['approved'])) {
        $resp = $gw['response'] ?? [];

        return [
            'ok' => false,
            'error' => (string) ($resp['resptext'] ?? 'Refund was declined.'),
            'refund' => [
                'respcode' => (string) ($resp['respcode'] ?? ''),
                'resptext' => (string) ($resp['resptext'] ?? ''),
            ],
        ];
    }

    $resp = $gw['response'] ?? [];
    chb_refund_record_row(
        $bookingId,
        $refundAmount,
        $origRetref,
        $refundOrderId,
        $resp,
        (string) ($gw['raw'] ?? ''),
        'refund'
    );

    chb_booking_apply_deposit_reversal_cents($bookingId, $refundAmount);

    $row2 = fetch_booking_by_id($bookingId);
    $newRef = (int) ($row2['deposit_refunded_cents'] ?? 0);
    $newPs = (string) ($row2['payment_status'] ?? '');

    return [
        'ok' => true,
        'refund' => [
            'amount_cents' => $refundAmount,
            'retref' => (string) ($resp['retref'] ?? ''),
            'payment_status' => $newPs,
            'deposit_refunded_cents' => $newRef,
        ],
    ];
}
