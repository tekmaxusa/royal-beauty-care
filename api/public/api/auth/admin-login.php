<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/auth/admin_auth.php';
require_once dirname(__DIR__, 3) . '/config/database.php';
require_once dirname(__DIR__, 3) . '/config/token_auth.php';

chb_api_require_method('POST');

$body = chb_api_read_json();
$email = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');

$r = login_admin_user($email, $password);
if (!$r['ok']) {
    chb_api_json_error($r['error'] ?? 'Login failed', 401);
}

$uid = current_user_id();
$refresh = chb_refresh_token_new();
chb_refresh_token_store(db(), $uid, $refresh['hash']);
chb_set_refresh_cookie($refresh['raw']);

chb_api_json([
    'ok' => true,
    'accessToken' => chb_issue_access_token_for_user([
        'id' => $uid,
        'name' => current_user_name(),
        'email' => current_user_email(),
        'role' => 'admin',
    ]),
    'user' => [
        'id' => $uid,
        'name' => current_user_name(),
        'email' => current_user_email(),
        'role' => 'admin',
    ],
]);
