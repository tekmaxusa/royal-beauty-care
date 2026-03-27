<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/booking/booking.php';
require_once dirname(__DIR__, 3) . '/booking/booking_idempotency.php';
require_once dirname(__DIR__, 3) . '/config/booking_services.php';
require_once dirname(__DIR__, 3) . '/config/salon_notify.php';
require_once dirname(__DIR__, 3) . '/config/booking_webhook.php';
require_once dirname(__DIR__, 3) . '/payments/cardconnect.php';
require_once dirname(__DIR__, 3) . '/payments/booking_payments.php';

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    chb_api_require_login();
    $rows = fetch_bookings_for_user(current_user_id());
    chb_api_json(['ok' => true, 'bookings' => $rows]);
}

if ($method !== 'POST') {
    chb_api_json_error('Method not allowed', 405);
}

$body = chb_api_read_json();
$date = (string) ($body['booking_date'] ?? '');
$time = (string) ($body['booking_time'] ?? '');
$services = $body['services'] ?? [];
if (!is_array($services)) {
    $services = [];
}

$svcVal = booking_validate_service_picks($services);
if (!$svcVal['ok']) {
    chb_api_json_error($svcVal['error'] ?? 'Invalid services', 400);
}

session_bootstrap();
$isClientSession = !empty($_SESSION['user_id']) && !is_admin_session();

$guestName = trim((string) ($body['guest_name'] ?? ''));
$guestEmail = (string) ($body['guest_email'] ?? '');
$guestPhone = (string) ($body['guest_phone'] ?? '');

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    chb_api_json_error('Invalid date.', 400);
}

if (!booking_slot_is_available_for_request($date, $time)) {
    chb_api_json_error('That time slot is no longer available. Please choose another.', 400);
}

/** @var list<array{category:string,service:string}> $lines */
$lines = $svcVal['lines'];
$serviceTotalCents = booking_total_price_cents_from_picks($services);
if ($serviceTotalCents <= 0) {
    chb_api_json_error('Could not determine service total for deposit.', 400);
}
$depositDueCents = booking_deposit_due_cents($serviceTotalCents);
$currency = strtoupper(trim((string) (getenv('CARDCONNECT_CURRENCY') ?: 'USD')));
if ($currency === '' || strlen($currency) !== 3) {
    $currency = 'USD';
}

$postal = trim((string) ($body['billing_postal'] ?? ''));
$billingName = trim((string) ($body['billing_name'] ?? ''));
if ($billingName === '') {
    $billingName = $isClientSession ? current_user_name() : $guestName;
}
$billingAddress = trim((string) ($body['billing_address'] ?? ''));
$billingCity = trim((string) ($body['billing_city'] ?? ''));
$billingState = trim((string) ($body['billing_state'] ?? ''));
$billingCountry = strtoupper(trim((string) ($body['billing_country'] ?? 'US')));
if (strlen($billingCountry) !== 2) {
    $billingCountry = 'US';
}
$cardAccount = trim((string) ($body['card_account'] ?? ''));
$cardExpiry = trim((string) ($body['card_expiry'] ?? ''));
$cardCvv = trim((string) ($body['card_cvv'] ?? ''));
$cardToken = trim((string) ($body['card_token'] ?? ''));
$skipPayment = chb_payment_skip_enabled();
$cardTokenValid = $cardToken !== '' && chb_cardconnect_card_token_looks_valid($cardToken);

if (!$skipPayment && $depositDueCents > 0) {
    if ($billingName === '' || $billingAddress === '' || $billingCity === '' || $billingState === '') {
        chb_api_json_error(
            'Please provide the name on the card and full billing address (street, city, state, postal).',
            400,
            'billing'
        );
    }
    if ($postal === '') {
        chb_api_json_error('Please provide billing postal code.', 400, 'billing_postal');
    }
    if (!$cardTokenValid) {
        if ($cardAccount === '' || $cardExpiry === '' || $cardCvv === '') {
            chb_api_json_error(
                'Use the secure card form (card_token) or provide card number, expiry, and CVV.',
                400,
                'card'
            );
        }
    }
}

if ($isClientSession) {
    chb_api_require_client();
} else {
    $guestEmailNorm = strtolower(trim($guestEmail));
    if ($guestEmailNorm !== '') {
        $pdo = db();
        $stmt = $pdo->prepare('SELECT 1 FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $guestEmailNorm]);
        if ($stmt->fetchColumn()) {
            chb_api_json([
                'ok' => false,
                'code' => 'email_registered',
                'error' => 'This email already has an account. Sign in to book and track your requests in the dashboard.',
            ], 400);
        }
    }
}

$idempotencyKey = trim((string) ($body['idempotency_key'] ?? ''));
if (!preg_match(
    '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
    $idempotencyKey
)) {
    chb_api_json_error('idempotency_key must be a UUID (v4).', 400);
}

$idem = chb_booking_idempotency_try_begin($idempotencyKey);
if ($idem !== null) {
    chb_api_json($idem['body'], $idem['http_code']);
}

/**
 * @return array{ok:bool,orderid:string,response:array<string,mixed>,raw:string,error?:string}
 */
$runDeposit = static function () use (
    $skipPayment,
    $depositDueCents,
    $cardTokenValid,
    $cardToken,
    $cardAccount,
    $cardExpiry,
    $cardCvv,
    $postal,
    $billingName,
    $billingAddress,
    $billingCity,
    $billingState,
    $billingCountry,
    $date,
    $time,
    $currency
): array {
    $cfg = chb_cardconnect_config();
    $orderId = 'chb-book-' . date('YmdHis') . '-' . bin2hex(random_bytes(4));
    if ($skipPayment || $depositDueCents <= 0) {
        $resp = [
            'respstat' => 'A',
            'respcode' => '000',
            'resptext' => 'Deposit bypassed (CHB_PAYMENT_SKIP).',
            'retref' => '',
            'orderId' => $orderId,
        ];
        chb_payment_record_attempt(
            null,
            $orderId,
            $cfg['merchid'],
            $depositDueCents,
            $currency,
            'approved',
            $resp,
            json_encode($resp, JSON_UNESCAPED_SLASHES) ?: '',
            $date,
            $time
        );

        return ['ok' => true, 'orderid' => $orderId, 'response' => $resp, 'raw' => json_encode($resp) ?: ''];
    }

    if ($cardTokenValid) {
        $tok = [
            'ok' => true,
            'token' => $cardToken,
            'response' => [],
            'raw' => '',
            'status' => 200,
        ];
    } else {
        $tok = chb_cardconnect_tokenize($cardAccount, $cardExpiry, $cardCvv);
    }
    if (!$tok['ok']) {
        return [
            'ok' => false,
            'orderid' => $orderId,
            'response' => $tok['response'] ?? [],
            'raw' => $tok['raw'] ?? '',
            'error' => $tok['error'] ?? 'Could not tokenize card details.',
        ];
    }

    $auth = chb_cardconnect_auth((string) ($tok['token'] ?? ''), $depositDueCents, $postal, $orderId, [
        'name' => $billingName,
        'address' => $billingAddress,
        'city' => $billingCity,
        'state' => $billingState,
        'country' => $billingCountry,
    ]);
    $resp = $auth['response'] ?? [];
    $status = (!empty($auth['approved']) && $auth['approved'] === true) ? 'approved' : 'declined';
    chb_payment_record_attempt(
        null,
        $orderId,
        $cfg['merchid'],
        $depositDueCents,
        $currency,
        $status,
        $resp,
        (string) ($auth['raw'] ?? ''),
        $date,
        $time
    );
    if (!$auth['ok']) {
        return [
            'ok' => false,
            'orderid' => $orderId,
            'response' => $resp,
            'raw' => (string) ($auth['raw'] ?? ''),
            'error' => $auth['error'] ?? 'Could not process deposit.',
        ];
    }
    if (empty($auth['approved'])) {
        return [
            'ok' => false,
            'orderid' => $orderId,
            'response' => $resp,
            'raw' => (string) ($auth['raw'] ?? ''),
            'error' => (string) ($resp['resptext'] ?? 'Deposit was declined.'),
        ];
    }

    return ['ok' => true, 'orderid' => $orderId, 'response' => $resp, 'raw' => (string) ($auth['raw'] ?? '')];
};

$pay = $runDeposit();
if (!$pay['ok']) {
    chb_booking_idempotency_release($idempotencyKey);
    chb_api_json([
        'ok' => false,
        'code' => 'payment_declined',
        'error' => $pay['error'] ?? 'Deposit payment failed.',
        'payment' => [
            'orderid' => (string) ($pay['orderid'] ?? ''),
            'retref' => (string) (($pay['response']['retref'] ?? '')),
            'respcode' => (string) (($pay['response']['respcode'] ?? '')),
            'resptext' => (string) (($pay['response']['resptext'] ?? '')),
        ],
    ], 402);
}

$bookingUserId = $isClientSession ? current_user_id() : null;
$r = create_booking(
    $bookingUserId,
    $date,
    $time,
    $lines,
    $isClientSession ? null : $guestName,
    $isClientSession ? null : $guestEmail,
    $isClientSession ? null : $guestPhone,
    $serviceTotalCents,
    $depositDueCents,
    $depositDueCents,
    'deposit_paid'
);
if (!$r['ok']) {
    $retref = trim((string) (($pay['response']['retref'] ?? '')));
    $rev = chb_cardconnect_reverse_successful_deposit($retref, $depositDueCents);
    if ($rev['ok'] && (($rev['method'] ?? '') === 'void' || ($rev['method'] ?? '') === 'refund')) {
        chb_payment_mark_reversed_by_orderid(
            (string) ($pay['orderid'] ?? ''),
            (string) ($rev['method'] ?? ''),
            (array) ($rev['response'] ?? [])
        );
        chb_booking_idempotency_release($idempotencyKey);
        chb_api_json_error(
            'That time slot could not be reserved. Your deposit was voided or refunded to the card — please try another time.',
            400
        );
    }
    if (($rev['method'] ?? '') === 'none') {
        chb_booking_idempotency_release($idempotencyKey);
        chb_api_json_error($r['error'] ?? 'Could not book.', 400);
    }
    $failBody = [
        'ok' => false,
        'code' => 'booking_error_charge_pending',
        'error' => $rev['error'] ?? 'Could not book and could not automatically refund the deposit.',
        'payment' => [
            'orderid' => (string) ($pay['orderid'] ?? ''),
            'retref' => $retref,
        ],
    ];
    chb_booking_idempotency_complete($idempotencyKey, 503, $failBody);
    chb_api_json($failBody, 503);
}

$cfg = chb_cardconnect_config();
chb_payment_record_attempt(
    (int) ($r['booking_id'] ?? 0),
    (string) ($pay['orderid'] ?? ''),
    $cfg['merchid'],
    $depositDueCents,
    $currency,
    'approved',
    (array) ($pay['response'] ?? []),
    (string) ($pay['raw'] ?? ''),
    $date,
    $time
);

$summaryParts = [];
foreach ($lines as $line) {
    $summaryParts[] = trim((string) ($line['category'] ?? '')) . ' — ' . trim((string) ($line['service'] ?? ''));
}
$serviceSummary = implode(' · ', $summaryParts);

if ($isClientSession) {
    chb_notify_booking_created_all_channels(
        current_user_name(),
        current_user_email(),
        '—',
        $serviceSummary,
        $date,
        $time
    );
} else {
    $gName = trim($guestName);
    $gEmail = trim($guestEmail);
    $gPhone = trim($guestPhone);
    chb_notify_booking_created_all_channels(
        $gName,
        $gEmail,
        $gPhone !== '' ? $gPhone : '—',
        $serviceSummary,
        $date,
        $time
    );
}

chb_notify_booking_created_webhook((int) ($r['booking_id'] ?? 0));

$successPayload = [
    'ok' => true,
    'message' => 'Your appointment is confirmed. A confirmation email has been sent.',
    'amounts' => [
        'currency' => $currency,
        'service_total_cents' => $serviceTotalCents,
        'deposit_paid_cents' => $depositDueCents,
        'remaining_balance_cents' => max(0, $serviceTotalCents - $depositDueCents),
    ],
];
chb_booking_idempotency_complete($idempotencyKey, 200, $successPayload);
chb_api_json($successPayload, 200);
