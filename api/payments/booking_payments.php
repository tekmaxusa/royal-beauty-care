<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

/**
 * @param array<string,mixed> $gatewayResponse
 */
function chb_payment_record_attempt(
    ?int $bookingId,
    string $orderId,
    string $merchid,
    int $amountCents,
    string $currency,
    string $status,
    array $gatewayResponse,
    string $rawResponseJson,
    string $bookingDate,
    string $bookingTime
): void {
    $retref = trim((string) ($gatewayResponse['retref'] ?? ''));
    $respstat = trim((string) ($gatewayResponse['respstat'] ?? ''));
    $respcode = trim((string) ($gatewayResponse['respcode'] ?? ''));
    $resptext = trim((string) ($gatewayResponse['resptext'] ?? ''));
    $account = trim((string) ($gatewayResponse['account'] ?? ''));
    $last4 = $account === '' ? '' : substr(preg_replace('/\D+/', '', $account) ?? '', -4);
    $timeNorm = preg_match('/^\d{2}:\d{2}$/', $bookingTime) ? ($bookingTime . ':00') : null;
    $rawSafe = $rawResponseJson !== '' ? mb_substr($rawResponseJson, 0, 16000) : null;
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO booking_payments (
            booking_id, orderid, merchid, amount_cents, currency, status, respstat, respcode, resptext, retref, account_last4,
            booking_date, booking_time, raw_response_json
         ) VALUES (
            :bid, :oid, :mid, :amt, :cur, :st, :rs, :rc, :rt, :rr, :l4, :bd, :bt, :raw
         )
         ON DUPLICATE KEY UPDATE
            booking_id = VALUES(booking_id),
            amount_cents = VALUES(amount_cents),
            currency = VALUES(currency),
            status = VALUES(status),
            respstat = VALUES(respstat),
            respcode = VALUES(respcode),
            resptext = VALUES(resptext),
            retref = VALUES(retref),
            account_last4 = VALUES(account_last4),
            booking_date = VALUES(booking_date),
            booking_time = VALUES(booking_time),
            raw_response_json = VALUES(raw_response_json)'
    );
    $stmt->execute([
        ':bid' => $bookingId,
        ':oid' => trim($orderId),
        ':mid' => trim($merchid),
        ':amt' => max(0, $amountCents),
        ':cur' => strtoupper(trim($currency)) ?: 'USD',
        ':st' => trim($status) === '' ? 'declined' : trim($status),
        ':rs' => $respstat,
        ':rc' => $respcode,
        ':rt' => $resptext,
        ':rr' => $retref,
        ':l4' => $last4,
        ':bd' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $bookingDate) ? $bookingDate : null,
        ':bt' => $timeNorm,
        ':raw' => $rawSafe,
    ]);
}

/**
 * Latest approved capture for a booking (for refunds). Requires non-empty retref.
 *
 * @return array<string,mixed>|null
 */
function chb_payment_row_approved_for_booking(int $bookingId): ?array
{
    if ($bookingId <= 0) {
        return null;
    }
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT id, booking_id, orderid, merchid, amount_cents, currency, retref, status
         FROM booking_payments
         WHERE booking_id = :bid AND status = :st AND TRIM(retref) <> \'\'
         ORDER BY id DESC
         LIMIT 1'
    );
    $stmt->execute([':bid' => $bookingId, ':st' => 'approved']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
}

/**
 * Mark an orphan approved row reversed after automatic void/refund (e.g. booking create failed).
 *
 * @param array<string,mixed> $reversalGateway
 */
function chb_payment_mark_reversed_by_orderid(string $orderId, string $reversalMethod, array $reversalGateway): void
{
    $oid = trim($orderId);
    if ($oid === '') {
        return;
    }
    $wrap = [
        'reversal_method' => $reversalMethod,
        'reversal_gateway' => $reversalGateway,
        'reversed_at' => date('c'),
    ];
    $raw = json_encode($wrap, JSON_UNESCAPED_SLASHES);
    $rawSafe = is_string($raw) ? mb_substr($raw, 0, 16000) : null;
    $pdo = db();
    $stmt = $pdo->prepare(
        'UPDATE booking_payments
         SET status = :st, resptext = :rt, raw_response_json = :raw
         WHERE orderid = :oid AND status = :was'
    );
    $stmt->execute([
        ':st' => 'reversed',
        ':rt' => 'Reversed after booking failure (' . $reversalMethod . ').',
        ':raw' => $rawSafe,
        ':oid' => $oid,
        ':was' => 'approved',
    ]);
}
