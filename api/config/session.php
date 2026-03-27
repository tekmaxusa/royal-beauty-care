<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

function session_bootstrap(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');

    $cross = getenv('CHB_SESSION_CROSS_SITE');
    $crossSite = $cross === '1' || strtolower((string) $cross) === 'true';
    if ($crossSite) {
        ini_set('session.cookie_samesite', 'None');
        ini_set('session.cookie_secure', '1');
    } else {
        ini_set('session.cookie_samesite', 'Lax');
    }

    session_name('CHBSESSID');
    session_start();
}

function require_login(): void
{
    session_bootstrap();
    if (empty($_SESSION['user_id'])) {
        header('Location: /login', true, 302);
        exit;
    }
}

function current_user_id(): int
{
    session_bootstrap();
    return (int) ($_SESSION['user_id'] ?? 0);
}

function current_user_name(): string
{
    session_bootstrap();
    return (string) ($_SESSION['user_name'] ?? '');
}

function current_user_email(): string
{
    session_bootstrap();
    return (string) ($_SESSION['user_email'] ?? '');
}

function current_user_role(): string
{
    session_bootstrap();
    $r = (string) ($_SESSION['user_role'] ?? '');

    return $r === 'admin' ? 'admin' : 'client';
}

function is_admin_session(): bool
{
    return current_user_role() === 'admin';
}
