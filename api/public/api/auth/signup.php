<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/auth/signup.php';
require_once dirname(__DIR__, 3) . '/auth/login.php';
require_once dirname(__DIR__, 3) . '/config/database.php';
require_once dirname(__DIR__, 3) . '/config/token_auth.php';

chb_api_require_method('POST');

$body = chb_api_read_json();
$name = (string) ($body['name'] ?? '');
$email = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');

$r = register_user($name, $email, $password);
if (!$r['ok']) {
    chb_api_json_error($r['error'] ?? 'Sign up failed', 400);
}

$l = login_user($email, $password);
if (!$l['ok']) {
    chb_api_json_error('Account created but automatic sign-in failed. Please log in.', 500);
}

$uid = current_user_id();
$refresh = chb_refresh_token_new();
chb_refresh_token_store(db(), $uid, $refresh['hash']);
chb_set_refresh_cookie($refresh['raw']);

chb_api_json([
    'ok' => true,
    'registered' => true,
    'accessToken' => chb_issue_access_token_for_user([
        'id' => $uid,
        'name' => current_user_name(),
        'email' => current_user_email(),
        'role' => current_user_role(),
    ]),
    'user' => [
        'id' => $uid,
        'name' => current_user_name(),
        'email' => current_user_email(),
        'role' => current_user_role(),
    ],
]);
