<?php

declare(strict_types=1);

require_once __DIR__ . '/contact_mail.php';

/**
 * @return list<string> e.g. ['mail', 'script']
 */
function chb_salon_notify_channels(): array
{
    $c = [];
    if (chb_contact_recipient_email() !== '') {
        $c[] = 'mail';
    }

    return $c;
}

function chb_salon_notify_configured(): bool
{
    return chb_salon_notify_channels() !== [];
}

/**
 * Contact form via mail channel.
 *
 * @return bool true if at least one configured channel succeeds
 */
function chb_notify_contact_salon(string $name, string $email, string $phone, string $message): bool
{
    $channels = chb_salon_notify_channels();
    if ($channels === []) {
        return false;
    }

    $mailOk = true;
    if (in_array('mail', $channels, true)) {
        $mailOk = chb_send_contact_message($name, $email, $phone, $message);
    }

    return $mailOk;
}

/**
 * New confirmed booking: merchant email + client email (mail channel).
 *
 * @return bool true if at least one configured channel succeeds
 */
function chb_notify_booking_created_all_channels(
    string $clientName,
    string $clientEmail,
    string $clientPhone,
    string $serviceSummary,
    string $dateYmd,
    string $timeHi
): bool {
    $channels = chb_salon_notify_channels();
    $clientMailOk = true;
    if (filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        $clientMailOk = chb_send_booking_confirmation_to_client_email(
            $clientEmail,
            $clientName,
            $dateYmd,
            $timeHi,
            $serviceSummary
        );
    }

    $mailOk = true;
    if (in_array('mail', $channels, true)) {
        $mailOk = chb_send_booking_request_email(
            $clientName,
            $clientEmail,
            $clientPhone,
            $dateYmd,
            $timeHi,
            $serviceSummary
        );
    }

    return $mailOk || $clientMailOk;
}

/**
 * @deprecated Use chb_notify_booking_created_all_channels(); kept for legacy PHP entry points.
 */
function chb_notify_booking_salon(
    string $name,
    string $email,
    string $phone,
    string $serviceSummary,
    string $dateYmd,
    string $timeHi
): bool {
    return chb_notify_booking_created_all_channels($name, $email, $phone, $serviceSummary, $dateYmd, $timeHi);
}
