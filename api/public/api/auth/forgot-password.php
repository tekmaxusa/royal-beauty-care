<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/auth/password_reset.php';

chb_api_require_method('POST');

$body = chb_api_read_json();
$email = (string) ($body['email'] ?? '');

$r = chb_request_password_reset_for_email($email);
if (!$r['ok']) {
    chb_api_json_error($r['error'] ?? 'Could not process request.', 400);
}

chb_api_json([
    'ok' => true,
    'message' => 'If an account with that email exists and can use password sign-in, we sent a reset link. Check your inbox.',
]);
