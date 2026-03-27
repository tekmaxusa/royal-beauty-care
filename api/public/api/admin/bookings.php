<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/booking/booking.php';
require_once dirname(__DIR__, 3) . '/config/contact_mail.php';

chb_api_require_admin_json();

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$usingBearer = function_exists('chb_auth_user_from_bearer')
    ? (chb_auth_user_from_bearer() !== null)
    : chb_api_has_bearer_token();

if ($method === 'GET') {
    if (!$usingBearer && (empty($_SESSION['chb_csrf_admin']) || !is_string($_SESSION['chb_csrf_admin']))) {
        $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
    }
    try {
        $rows = fetch_all_bookings_for_admin();
    } catch (Throwable $e) {
        chb_api_json_error('Could not load bookings: ' . $e->getMessage(), 500);
    }
    chb_api_json([
        'ok' => true,
        'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? ''),
        'bookings' => $rows,
    ]);
}

if ($method !== 'POST') {
    chb_api_json_error('Method not allowed', 405);
}

$body = chb_api_read_json();
if (!$usingBearer) {
    $csrf = (string) ($body['csrf'] ?? '');
    $sessionCsrf = (string) ($_SESSION['chb_csrf_admin'] ?? '');
    if ($sessionCsrf === '' || !hash_equals($sessionCsrf, $csrf)) {
        chb_api_json_error('Invalid session token.', 400);
    }
}

$action = (string) ($body['action'] ?? '');

if ($action === 'delete_many') {
    $rawIds = $body['booking_ids'] ?? [];
    if (!is_array($rawIds)) {
        chb_api_json_error('Invalid request.', 400);
    }
    $r = admin_delete_bookings($rawIds);
    if (!$r['ok']) {
        chb_api_json_error($r['error'] ?? 'Delete failed.', 400);
    }
    if (!$usingBearer) {
        $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
    }
    chb_api_json([
        'ok' => true,
        'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? ''),
        'message' => 'Bookings removed.',
        'deleted' => (int) ($r['deleted'] ?? 0),
    ]);
}

if ($action === 'refund_deposit') {
    require_once dirname(__DIR__, 3) . '/payments/admin_deposit_refund.php';
    $bidRefund = (int) ($body['booking_id'] ?? 0);
    if ($bidRefund <= 0) {
        chb_api_json_error('Invalid booking.', 400);
    }
    $amountRaw = $body['amount_cents'] ?? null;
    $refundCents = null;
    if ($amountRaw !== null && $amountRaw !== '') {
        $refundCents = (int) $amountRaw;
        if ($refundCents <= 0) {
            chb_api_json_error('Refund amount must be positive.', 400);
        }
    }
    $r = chb_admin_refund_booking_deposit($bidRefund, $refundCents);
    if (!$r['ok']) {
        chb_api_json_error($r['error'] ?? 'Refund failed.', 400);
    }
    if (!$usingBearer) {
        $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
    }
    chb_api_json([
        'ok' => true,
        'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? ''),
        'message' => 'Refund processed.',
        'refund' => $r['refund'] ?? [],
    ]);
}

$bid = (int) ($body['booking_id'] ?? 0);
if ($bid <= 0 || $action !== 'cancel') {
    chb_api_json_error('Invalid request.', 400);
}

require_once dirname(__DIR__, 3) . '/payments/admin_deposit_refund.php';
try {
    $rev = chb_admin_reverse_deposit_on_cancel($bid);
} catch (Throwable $e) {
    chb_api_json_error('Could not cancel booking: ' . $e->getMessage(), 500);
}
if (!$rev['ok']) {
    chb_api_json_error($rev['error'] ?? 'Could not reverse card deposit.', 400);
}

$r = admin_set_booking_status($bid, CHB_BOOKING_CANCELLED);
if (!$r['ok']) {
    chb_api_json_error($r['error'] ?? 'Update failed.', 400);
}

$old = (string) ($r['old_status'] ?? '');
$new = (string) ($r['new_status'] ?? '');
if ($old !== $new && $new === CHB_BOOKING_CANCELLED) {
    $row = fetch_booking_by_id($bid);
    if ($row) {
        $timeHi = substr((string) $row['booking_time'], 0, 5);
        $summary = chb_booking_services_summary($row);
        $emailDepositKind = null;
        $emailDepositCents = null;
        if (!empty($rev['method']) && ($rev['method'] === 'void' || $rev['method'] === 'refund')) {
            $emailDepositKind = (string) $rev['method'];
            $emailDepositCents = isset($rev['amount_cents']) ? (int) $rev['amount_cents'] : null;
        } elseif (!empty($rev['skipped'])) {
            $hadDeposit = (int) ($row['deposit_paid_cents'] ?? 0) > 0
                && (int) ($row['deposit_refunded_cents'] ?? 0) < (int) ($row['deposit_paid_cents'] ?? 0);
            if ($hadDeposit) {
                $emailDepositKind = 'skipped';
            }
        }
        chb_send_booking_status_email_to_client(
            (string) $row['client_email'],
            (string) $row['client_name'],
            $new,
            (string) $row['booking_date'],
            $timeHi,
            $summary,
            $emailDepositKind,
            $emailDepositCents,
            (string) ($row['guest_phone'] ?? '')
        );
    }
}

$message = 'Booking cancelled.';
if (!empty($rev['method']) && $rev['method'] === 'void') {
    $message .= ' Deposit voided at CardConnect.';
} elseif (!empty($rev['method']) && $rev['method'] === 'refund') {
    $message .= ' Deposit refunded at CardConnect.';
}

if (!$usingBearer) {
    $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
}
$out = [
    'ok' => true,
    'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? ''),
    'message' => $message,
];
if (!empty($rev['method'])) {
    $out['payment_reversal'] = $rev['method'];
} elseif (!empty($rev['skipped'])) {
    $out['payment_reversal'] = 'skipped';
}
chb_api_json($out);
