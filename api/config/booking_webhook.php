<?php

declare(strict_types=1);

require_once __DIR__ . '/../booking/booking.php';

function chb_admin_booking_webhook_url(): string
{
    $u = getenv('ADMIN_BOOKING_WEBHOOK_URL');
    return is_string($u) ? trim($u) : '';
}

/**
 * POST a JSON payload when a new booking row exists (Slack, Discord, Zapier, custom endpoint).
 * Fire-and-forget; failures are ignored. Optional ADMIN_BOOKING_WEBHOOK_SECRET sent as Bearer token.
 */
function chb_notify_booking_created_webhook(int $bookingId): void
{
    if ($bookingId <= 0) {
        return;
    }

    $url = chb_admin_booking_webhook_url();
    if ($url === '') {
        return;
    }

    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return;
    }

    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
    if (!in_array($scheme, ['http', 'https'], true)) {
        return;
    }

    $row = fetch_booking_by_id($bookingId);
    if (!$row) {
        return;
    }

    $guestPhone = isset($row['guest_phone']) && is_string($row['guest_phone']) ? trim($row['guest_phone']) : '';
    $uid = $row['user_id'];
    $payload = [
        'event' => 'booking.created',
        'booking_id' => (int) $row['id'],
        'status' => (string) $row['status'],
        'booking_date' => (string) $row['booking_date'],
        'booking_time' => substr((string) $row['booking_time'], 0, 5),
        'service_category' => (string) $row['service_category'],
        'service_name' => (string) $row['service_name'],
        'client_name' => (string) $row['client_name'],
        'client_email' => (string) $row['client_email'],
        'client_phone' => $guestPhone !== '' ? $guestPhone : null,
        'user_id' => $uid !== null && (int) $uid > 0 ? (int) $uid : null,
        'is_guest' => $uid === null || (int) $uid === 0,
        'created_at' => (string) ($row['created_at'] ?? ''),
    ];

    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return;
    }

    $secret = getenv('ADMIN_BOOKING_WEBHOOK_SECRET');
    $authHeader = '';
    if (is_string($secret) && trim($secret) !== '') {
        $authHeader = 'Authorization: Bearer ' . trim($secret) . "\r\n";
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n"
                . "User-Agent: ChangeHairBooking/1\r\n"
                . $authHeader,
            'content' => $json,
            'timeout' => 5,
            'ignore_errors' => true,
        ],
    ]);

    @file_get_contents($url, false, $ctx);
}
