<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/booking/booking.php';
require_once dirname(__DIR__, 3) . '/booking/booking_idempotency.php';
require_once dirname(__DIR__, 3) . '/config/booking_services.php';
require_once dirname(__DIR__, 3) . '/config/salon_notify.php';
require_once dirname(__DIR__, 3) . '/config/booking_webhook.php';
require_once dirname(__DIR__, 3) . '/payments/cardconnect.php';
require_once dirname(__DIR__, 3) . '/payments/clover.php';
require_once dirname(__DIR__, 3) . '/payments/booking_payments.php';

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    chb_api_require_login();
    $rows = fetch_bookings_for_user(current_user_id());
    foreach ($rows as &$r) {
        $r['cancel_allowed'] = booking_row_client_cancel_allowed($r);
    }
    unset($r);
    chb_api_json(['ok' => true, 'bookings' => $rows]);
}

if ($method !== 'POST') {
    chb_api_json_error('Method not allowed', 405);
}

$body = chb_api_read_json();
$action = trim((string) ($body['action'] ?? ''));

if ($action === 'cancel') {
    chb_api_require_login();
    chb_api_require_client();
    $bookingId = (int) ($body['booking_id'] ?? 0);
    if ($bookingId <= 0) {
        chb_api_json_error('Invalid booking.', 400);
    }
    $r = client_cancel_own_booking(current_user_id(), $bookingId);
    if (!$r['ok']) {
        chb_api_json_error($r['error'] ?? 'Could not cancel booking.', 400);
    }
    chb_api_json(['ok' => true, 'message' => 'Booking cancelled.']);
}

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
$cloverSource = trim((string) ($body['clover_source'] ?? ''));
$skipPayment = chb_payment_skip_enabled();
$cardTokenValid = $cardToken !== '' && chb_cardconnect_card_token_looks_valid($cardToken);
$depositGateway = chb_deposit_gateway();

if (!$skipPayment && $depositDueCents > 0) {
    if ($depositGateway === 'clover') {
        if (!preg_match('/^clv_[A-Za-z0-9_-]+$/', $cloverSource)) {
            chb_api_json_error(
                'Complete payment using the secure Clover form (card, Google Pay, or Apple Pay).',
                400,
                'clover_source'
            );
        }
        if (!chb_clover_server_configured()) {
            chb_api_json_error('Online payments are not configured. Please contact the salon.', 503, 'clover_config');
        }
    } else {
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
}

if ($isClientSession) {
    chb_api_require_client();
} else {
    $guestEmailNorm = strtolower(trim($guestEmail));
    if ($guestEmailNorm !== '') {
        $pdo = db();
        // Only client accounts should be nudged to sign in; staff/admin rows share the same table.
        $stmt = $pdo->prepare(
            "SELECT 1 FROM users WHERE email = :email AND role = 'client' LIMIT 1"
        );
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
 * @return array{
 *   ok:bool,
 *   orderid:string,
 *   response:array<string,mixed>,
 *   raw:string,
 *   error?:string,
 *   payment_gateway?:string,
 *   clover_order_id?:string
 * }
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
    $currency,
    $depositGateway,
    $cloverSource,
    $services,
    $idempotencyKey,
    $isClientSession,
    $guestEmail
): array {
    $cfg = chb_cardconnect_config();
    $cloverMid = chb_clover_merchant_id();
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
            $time,
            'cardconnect'
        );

        return [
            'ok' => true,
            'orderid' => $orderId,
            'response' => $resp,
            'raw' => json_encode($resp) ?: '',
            'payment_gateway' => 'cardconnect',
        ];
    }

    if ($depositGateway === 'clover') {
        $internalOid = 'chb-clvr-' . str_replace('-', '', $idempotencyKey);
        $lineItems = booking_clover_line_items_from_picks($services);
        if ($lineItems === []) {
            return [
                'ok' => false,
                'orderid' => $internalOid,
                'response' => [],
                'raw' => '',
                'error' => 'Could not build service line items for payment.',
                'payment_gateway' => 'clover',
            ];
        }
        $custEmail = $isClientSession ? trim((string) current_user_email()) : trim($guestEmail);
        $payRes = chb_clover_create_order_and_pay_deposit(
            $depositDueCents,
            strtolower($currency),
            $cloverSource,
            chb_request_client_ip(),
            $idempotencyKey,
            $lineItems,
            $custEmail !== '' ? $custEmail : null
        );
        if (!$payRes['ok']) {
            $failResp = [
                'respstat' => 'D',
                'respcode' => '',
                'resptext' => (string) ($payRes['error'] ?? 'Clover payment failed'),
                'retref' => '',
            ];
            chb_payment_record_attempt(
                null,
                $internalOid,
                $cloverMid,
                $depositDueCents,
                $currency,
                'declined',
                $failResp,
                (string) ($payRes['pay_raw'] ?? $payRes['platform_raw'] ?? ''),
                $date,
                $time,
                'clover'
            );

            return [
                'ok' => false,
                'orderid' => $internalOid,
                'response' => $failResp,
                'raw' => (string) ($payRes['pay_raw'] ?? ''),
                'error' => (string) ($payRes['error'] ?? 'Deposit payment failed.'),
                'payment_gateway' => 'clover',
            ];
        }
        $chargeId = trim((string) ($payRes['charge_id'] ?? ''));
        if ($chargeId === '') {
            return [
                'ok' => false,
                'orderid' => $internalOid,
                'response' => [],
                'raw' => (string) ($payRes['pay_raw'] ?? ''),
                'error' => 'Payment succeeded but no charge reference was returned; cannot complete booking safely.',
                'payment_gateway' => 'clover',
            ];
        }
        $cloverOid = trim((string) ($payRes['order_id'] ?? ''));
        $payDec = $payRes['pay_decoded'] ?? [];
        $last4 = '';
        if (is_array($payDec)) {
            $src = $payDec['source'] ?? [];
            if (is_array($src) && isset($src['last4'])) {
                $last4 = substr(preg_replace('/\D+/', '', (string) $src['last4']) ?: '', -4);
            }
        }
        $resp = [
            'respstat' => 'A',
            'respcode' => '000',
            'resptext' => 'succeeded',
            'retref' => $chargeId,
            'account' => $last4 !== '' ? '****' . $last4 : '',
            'clover_order_id' => $cloverOid,
        ];
        chb_payment_record_attempt(
            null,
            $internalOid,
            $cloverMid,
            $depositDueCents,
            $currency,
            'approved',
            $resp,
            (string) ($payRes['pay_raw'] ?? ''),
            $date,
            $time,
            'clover'
        );

        return [
            'ok' => true,
            'orderid' => $internalOid,
            'response' => $resp,
            'raw' => (string) ($payRes['pay_raw'] ?? ''),
            'payment_gateway' => 'clover',
            'clover_order_id' => $cloverOid,
        ];
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
            'payment_gateway' => 'cardconnect',
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
        $time,
        'cardconnect'
    );
    if (!$auth['ok']) {
        return [
            'ok' => false,
            'orderid' => $orderId,
            'response' => $resp,
            'raw' => (string) ($auth['raw'] ?? ''),
            'error' => $auth['error'] ?? 'Could not process deposit.',
            'payment_gateway' => 'cardconnect',
        ];
    }
    if (empty($auth['approved'])) {
        return [
            'ok' => false,
            'orderid' => $orderId,
            'response' => $resp,
            'raw' => (string) ($auth['raw'] ?? ''),
            'error' => (string) ($resp['resptext'] ?? 'Deposit was declined.'),
            'payment_gateway' => 'cardconnect',
        ];
    }

    return [
        'ok' => true,
        'orderid' => $orderId,
        'response' => $resp,
        'raw' => (string) ($auth['raw'] ?? ''),
        'payment_gateway' => 'cardconnect',
    ];
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
    $gw = (string) ($pay['payment_gateway'] ?? 'cardconnect');
    if ($gw === 'clover') {
        $chargeId = trim((string) (($pay['response']['retref'] ?? '')));
        if ($chargeId !== '') {
            $cref = chb_clover_create_refund($chargeId, $depositDueCents);
            if ($cref['ok']) {
                chb_payment_mark_reversed_by_orderid(
                    (string) ($pay['orderid'] ?? ''),
                    'refund',
                    (array) ($cref['decoded'] ?? [])
                );
                chb_booking_idempotency_release($idempotencyKey);
                chb_api_json_error(
                    'That time slot could not be reserved. Your deposit was refunded — please try another time.',
                    400
                );
            }
            $failBody = [
                'ok' => false,
                'code' => 'booking_error_charge_pending',
                'error' => $cref['error'] ?? 'Could not book and could not automatically refund the Clover deposit.',
                'payment' => [
                    'orderid' => (string) ($pay['orderid'] ?? ''),
                    'retref' => $chargeId,
                ],
            ];
            chb_booking_idempotency_complete($idempotencyKey, 503, $failBody);
            chb_api_json($failBody, 503);
        }
        chb_booking_idempotency_release($idempotencyKey);
        chb_api_json_error($r['error'] ?? 'Could not book.', 400);
    }
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

$payGw = (string) ($pay['payment_gateway'] ?? 'cardconnect');
$merchForPay = $payGw === 'clover' ? chb_clover_merchant_id() : chb_cardconnect_config()['merchid'];
chb_payment_record_attempt(
    (int) ($r['booking_id'] ?? 0),
    (string) ($pay['orderid'] ?? ''),
    $merchForPay,
    $depositDueCents,
    $currency,
    'approved',
    (array) ($pay['response'] ?? []),
    (string) ($pay['raw'] ?? ''),
    $date,
    $time,
    $payGw
);

$bid = (int) ($r['booking_id'] ?? 0);
if ($bid > 0) {
    $cloverOidSuccess = trim((string) ($pay['clover_order_id'] ?? ($pay['response']['clover_order_id'] ?? '')));
    if ($cloverOidSuccess !== '') {
        $pdo = db();
        $u = $pdo->prepare(
            'UPDATE bookings SET clover_order_id = :o, clover_synced_at = NOW(), clover_sync_error = NULL WHERE id = :id'
        );
        $u->execute([':o' => $cloverOidSuccess, ':id' => $bid]);
    } elseif (trim((string) (getenv('CHB_CLOVER_SYNC_ENABLED') ?: '0')) === '1'
        && $payGw === 'cardconnect'
        && (chb_clover_server_configured() || trim((string) (getenv('CLOVER_PLATFORM_ACCESS_TOKEN') ?: '')) !== '')) {
        $sync = chb_clover_sync_order_cardconnect_deposit(
            booking_clover_line_items_from_picks($services),
            'Web booking #' . $bid . ' deposit via CardConnect'
        );
        $pdo = db();
        if ($sync['ok'] && !empty($sync['order_id'])) {
            $u = $pdo->prepare(
                'UPDATE bookings SET clover_order_id = :o, clover_synced_at = NOW(), clover_sync_error = NULL WHERE id = :id'
            );
            $u->execute([':o' => trim((string) $sync['order_id']), ':id' => $bid]);
        } elseif (!$sync['ok']) {
            $err = mb_substr((string) ($sync['error'] ?? 'sync failed'), 0, 500);
            $u = $pdo->prepare('UPDATE bookings SET clover_sync_error = :e WHERE id = :id');
            $u->execute([':e' => $err, ':id' => $bid]);
        }
    }
}

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
