<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/config/session.php';
require_once dirname(__DIR__) . '/config/token_auth.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/auth/google_oauth.php';
require_once __DIR__ . '/partials/redirect.php';
require_once __DIR__ . '/_spa_redirect.php';

session_bootstrap();

$next = chb_safe_next((string) ($_SESSION['oauth_google_next'] ?? '/dashboard'));
unset($_SESSION['oauth_google_next']);

$err = (string) ($_GET['error'] ?? '');
if ($err !== '') {
    chb_redirect_spa('/login', ['google_err' => $err]);
}

$code = (string) ($_GET['code'] ?? '');
$state = (string) ($_GET['state'] ?? '');
$sessState = (string) ($_SESSION['oauth_google_state'] ?? '');
unset($_SESSION['oauth_google_state']);

if ($code === '' || $state === '' || $sessState === '' || !hash_equals($sessState, $state)) {
    chb_redirect_spa('/login', ['google_err' => 'invalid_state']);
}

try {
    $tok = google_oauth_exchange_code($code);
    $info = google_oauth_userinfo($tok['access_token']);
    login_or_register_google_user($info['sub'], $info['email'], $info['name']);
} catch (Throwable $e) {
    chb_redirect_spa('/login', ['google_err' => 'auth_failed']);
}

$uid = current_user_id();
$user = [
    'id' => $uid,
    'name' => current_user_name(),
    'email' => current_user_email(),
    'role' => current_user_role(),
];
$refresh = chb_refresh_token_new();
chb_refresh_token_store(db(), $uid, $refresh['hash']);
chb_set_refresh_cookie($refresh['raw']);
$access = chb_issue_access_token_for_user($user);

chb_redirect_spa('/login', [
    'next' => $next,
    'oauth_token' => $access,
]);
