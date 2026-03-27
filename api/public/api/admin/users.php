<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/auth/signup.php';
require_once dirname(__DIR__, 3) . '/config/database.php';

chb_api_require_admin_json();

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$usingBearer = function_exists('chb_auth_user_from_bearer')
    ? (chb_auth_user_from_bearer() !== null)
    : chb_api_has_bearer_token();

if ($method === 'GET') {
    if (!$usingBearer && (empty($_SESSION['chb_csrf_admin']) || !is_string($_SESSION['chb_csrf_admin']))) {
        $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
    }
    $pdo = db();
    $clients = $pdo->query(
        "SELECT id, name, email, role, created_at FROM users WHERE role = 'client' ORDER BY id DESC LIMIT 200"
    )->fetchAll();
    $admins = $pdo->query(
        "SELECT id, name, email, role, created_at FROM users WHERE role = 'admin' ORDER BY id DESC LIMIT 50"
    )->fetchAll();
    chb_api_json([
        'ok' => true,
        'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? ''),
        'clients' => $clients,
        'admins' => $admins,
    ]);
}

if ($method !== 'POST') {
    chb_api_json_error('Method not allowed', 405);
}

$body = chb_api_read_json();
if (!$usingBearer) {
    $csrf = (string) ($body['csrf'] ?? '');
    $sessionCsrf = (string) ($_SESSION['chb_csrf_admin'] ?? '');
    if ($sessionCsrf === '' || !hash_equals($sessionCsrf, $csrf)) {
        chb_api_json_error('Invalid session token.', 400);
    }
}

$action = (string) ($body['action'] ?? '');

if ($action === 'delete_client') {
    $uid = (int) ($body['user_id'] ?? 0);
    $r = admin_delete_client_user($uid);
    if (!$r['ok']) {
        chb_api_json_error($r['error'] ?? 'Could not delete account.', 400);
    }
    if (!$usingBearer) {
        $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
    }
    chb_api_json(['ok' => true, 'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? ''), 'message' => 'Client account removed.']);
}

if ($action !== 'create_user') {
    chb_api_json_error('Invalid action.', 400);
}

$name = (string) ($body['name'] ?? '');
$email = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');
$role = (string) ($body['role'] ?? 'client');
if ($role !== 'client') {
    chb_api_json_error('Only client accounts can be created here. Merchant admins are configured on the server.', 400);
}

$r = admin_create_user_account($name, $email, $password, 'client');
if (!$r['ok']) {
    chb_api_json_error($r['error'] ?? 'Could not create account.', 400);
}

if (!$usingBearer) {
    $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
}
chb_api_json(['ok' => true, 'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? ''), 'message' => 'Account created.']);
