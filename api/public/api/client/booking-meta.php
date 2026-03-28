<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/booking/booking.php';
require_once dirname(__DIR__, 3) . '/config/booking_services.php';
require_once dirname(__DIR__, 3) . '/payments/cardconnect.php';
require_once dirname(__DIR__, 3) . '/payments/clover.php';

chb_api_require_method('GET');

$paymentBypass = chb_payment_skip_enabled();
$depositGateway = chb_deposit_gateway();
$paymentTokenizer = (!$paymentBypass && $depositGateway === 'cardconnect')
    ? chb_cardconnect_hosted_tokenizer_meta()
    : null;
$cloverPublic = null;
if (!$paymentBypass && $depositGateway === 'clover') {
    $cp = chb_clover_public_meta_for_booking();
    $cloverPublic = $cp !== [] ? $cp : null;
}

$chb_book_categories = booking_service_categories();
$calendarDates = booking_calendar_dates(90);
$slotsByDate = [];

foreach ($calendarDates as $d) {
    $row = [];
    foreach (booking_time_options() as $opt) {
        $state = booking_time_slot_state($d, $opt);
        $row[] = [
            'time' => $opt,
            'state' => $state,
            'remaining' => $state === 'available' ? chb_booking_slots_remaining_display() : 0,
        ];
    }
    $slotsByDate[$d] = $row;
}

chb_api_json([
    'ok' => true,
    'categories' => $chb_book_categories,
    'slotsByDate' => $slotsByDate,
    'depositPercent' => 20,
    /** `cardconnect` | `clover` — matches CHB_DEPOSIT_GATEWAY. */
    'depositGateway' => $depositGateway,
    /** True when CHB_PAYMENT_SKIP is on — API will not charge cards; UI can hide the card form. */
    'paymentBypass' => $paymentBypass,
    /**
     * CardConnect Hosted iFrame Tokenizer — embed iframeSrc; listen for postMessage from allowedOrigin.
     * Null when payment bypass is on, gateway is Clover, or CARDCONNECT_BASE_URL is unusable.
     */
    'paymentTokenizer' => $paymentTokenizer,
    /**
     * Clover iframe SDK init: merchantId, publicKey (PAKMS), sdkUrl, sandbox.
     * Null when gateway is not Clover, bypass is on, or OAuth/PAKMS is not available.
     */
    'clover' => $cloverPublic,
]);
