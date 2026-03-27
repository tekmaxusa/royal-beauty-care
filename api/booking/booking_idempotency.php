<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

/**
 * Drop stale processing rows so a tab closed mid-request does not block forever.
 */
function chb_booking_idempotency_purge_stale(PDO $pdo): void
{
    $pdo->exec(
        "DELETE FROM booking_idempotency
         WHERE state = 'processing'
           AND started_at < DATE_SUB(NOW(), INTERVAL 20 MINUTE)"
    );
}

/**
 * @return array{replay:bool,http_code:int,body:array<string,mixed>}|null null = caller may proceed
 */
function chb_booking_idempotency_try_begin(string $key): ?array
{
    $key = trim($key);
    if ($key === '') {
        return null;
    }
    $pdo = db();
    chb_booking_idempotency_purge_stale($pdo);

    for ($attempt = 0; $attempt < 3; $attempt++) {
        try {
            $ins = $pdo->prepare(
                "INSERT INTO booking_idempotency (idempotency_key, state, started_at)
                 VALUES (:k, 'processing', NOW())"
            );
            $ins->execute([':k' => $key]);

            return null;
        } catch (PDOException $e) {
            $sqlState = $e->errorInfo[0] ?? '';
            if ($sqlState !== '23000') {
                throw $e;
            }
        }

        $sel = $pdo->prepare(
            'SELECT state, http_code, response_json FROM booking_idempotency WHERE idempotency_key = :k LIMIT 1'
        );
        $sel->execute([':k' => $key]);
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            continue;
        }

        $state = (string) ($row['state'] ?? '');
        if ($state === 'completed') {
            $json = (string) ($row['response_json'] ?? '');
            $decoded = json_decode($json, true);
            $body = is_array($decoded) ? $decoded : ['ok' => false, 'error' => 'Invalid cached response.'];

            return [
                'replay' => true,
                'http_code' => (int) ($row['http_code'] ?? 200),
                'body' => $body,
            ];
        }
        if ($state === 'processing') {
            return [
                'replay' => true,
                'http_code' => 409,
                'body' => [
                    'ok' => false,
                    'code' => 'duplicate_request',
                    'error' => 'This booking is already being processed. Please wait a moment and check your email before trying again.',
                ],
            ];
        }
        if ($state === 'failed') {
            $pdo->prepare('DELETE FROM booking_idempotency WHERE idempotency_key = :k')->execute([':k' => $key]);
        }
    }

    return [
        'replay' => true,
        'http_code' => 409,
        'body' => [
            'ok' => false,
            'code' => 'duplicate_request',
            'error' => 'Could not start booking. Please try again in a moment.',
        ],
    ];
}

function chb_booking_idempotency_release(string $key): void
{
    $key = trim($key);
    if ($key === '') {
        return;
    }
    $pdo = db();
    $stmt = $pdo->prepare(
        "DELETE FROM booking_idempotency WHERE idempotency_key = :k AND state = 'processing'"
    );
    $stmt->execute([':k' => $key]);
}

/**
 * @param array<string,mixed> $body
 */
function chb_booking_idempotency_complete(string $key, int $httpCode, array $body): void
{
    $key = trim($key);
    if ($key === '') {
        return;
    }
    $json = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        $json = '{"ok":false}';
    }
    $pdo = db();
    $stmt = $pdo->prepare(
        "UPDATE booking_idempotency
         SET state = 'completed', http_code = :hc, response_json = :js, completed_at = NOW()
         WHERE idempotency_key = :k AND state = 'processing'"
    );
    $stmt->execute([
        ':hc' => max(100, min(599, $httpCode)),
        ':js' => $json,
        ':k' => $key,
    ]);
}
