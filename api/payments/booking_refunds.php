<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

/**
 * @param array<string,mixed> $gatewayResponse
 * @param 'void'|'refund' $reversalKind
 */
function chb_refund_record_row(
    int $bookingId,
    int $amountCents,
    string $origRetref,
    string $orderId,
    array $gatewayResponse,
    string $rawResponseJson,
    string $reversalKind = 'refund'
): void {
    $kind = $reversalKind === 'void' ? 'void' : 'refund';
    $retref = trim((string) ($gatewayResponse['retref'] ?? ''));
    $respstat = trim((string) ($gatewayResponse['respstat'] ?? ''));
    $respcode = trim((string) ($gatewayResponse['respcode'] ?? ''));
    $resptext = trim((string) ($gatewayResponse['resptext'] ?? ''));
    $rawSafe = $rawResponseJson !== '' ? mb_substr($rawResponseJson, 0, 16000) : null;
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO booking_refunds (
            booking_id, reversal_kind, amount_cents, orig_retref, retref, orderid, respstat, respcode, resptext, raw_response_json
         ) VALUES (
            :bid, :kind, :amt, :orr, :rr, :oid, :rs, :rc, :rt, :raw
         )'
    );
    $stmt->execute([
        ':bid' => $bookingId,
        ':kind' => $kind,
        ':amt' => max(0, $amountCents),
        ':orr' => trim($origRetref),
        ':rr' => $retref,
        ':oid' => trim($orderId),
        ':rs' => $respstat,
        ':rc' => $respcode,
        ':rt' => $resptext,
        ':raw' => $rawSafe,
    ]);
}
