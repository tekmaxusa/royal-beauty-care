<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/config/salon_notify.php';

chb_api_require_method('POST');

$body = chb_api_read_json();
$honeypot = trim((string) ($body['website'] ?? ''));
if ($honeypot !== '') {
    chb_api_json(['ok' => true]);
}

$csrfPost = (string) ($body['csrf'] ?? '');
$csrfSess = (string) ($_SESSION['chb_csrf_contact'] ?? '');
if ($csrfSess === '' || !hash_equals($csrfSess, $csrfPost)) {
    chb_api_json_error('Invalid or expired token. Refresh and try again.', 400);
}

$last = (int) ($_SESSION['chb_contact_last_send'] ?? 0);
if ($last > 0 && time() - $last < 90) {
    chb_api_json_error('Please wait a minute before sending another message.', 429);
}

$name = trim((string) ($body['name'] ?? ''));
$email = trim((string) ($body['email'] ?? ''));
$phone = trim((string) ($body['phone'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));

if ($name === '' || $email === '' || $message === '') {
    chb_api_json_error('Please fill in your name, email, and message.', 400);
}

if (mb_strlen($name) > 120 || mb_strlen($email) > 254 || mb_strlen($phone) > 40 || mb_strlen($message) > 6000) {
    chb_api_json_error('One of the fields is too long.', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    chb_api_json_error('Please enter a valid email address.', 400);
}

if (!chb_salon_notify_configured()) {
    chb_api_json_error('Contact is not configured yet. Please call us or use live chat.', 503);
}

$ok = chb_notify_contact_salon($name, $email, $phone, $message);

if ($ok) {
    $_SESSION['chb_contact_last_send'] = time();
    $_SESSION['chb_csrf_contact'] = bin2hex(random_bytes(16));
    chb_api_json(['ok' => true, 'message' => 'Thank you — your message was sent. We’ll get back to you soon.']);
}

chb_api_json_error('We could not deliver your message. Please email us directly or use live chat.', 500);
