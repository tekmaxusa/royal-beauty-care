<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/auth/password_reset.php';

chb_api_require_method('POST');

$body = chb_api_read_json();
$token = (string) ($body['token'] ?? '');
$password = (string) ($body['password'] ?? '');

$r = chb_complete_password_reset($token, $password);
if (!$r['ok']) {
    chb_api_json_error($r['error'] ?? 'Reset failed.', 400);
}

chb_api_json(['ok' => true, 'message' => 'Your password has been updated. You can sign in now.']);
