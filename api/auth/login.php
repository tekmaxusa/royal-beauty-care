<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../booking/booking.php';

/**
 * @return array{ok: bool, error?: string}
 */
function login_user(string $email, string $password): array
{
    session_bootstrap();

    $email = strtolower(trim($email));
    if ($email === '' || $password === '') {
        return ['ok' => false, 'error' => 'Email and password are required.'];
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, name, email, password, role FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $row = $stmt->fetch();

    if (!$row || empty($row['password'])) {
        return ['ok' => false, 'error' => 'Invalid email or password. Use Continue with Google if you signed up with Google.'];
    }

    if (!password_verify($password, $row['password'])) {
        return ['ok' => false, 'error' => 'Invalid email or password.'];
    }

    session_regenerate_id(true);
    $uid = (int) $row['id'];
    $_SESSION['user_id'] = $uid;
    $_SESSION['user_name'] = $row['name'];
    $_SESSION['user_email'] = $row['email'];
    $_SESSION['user_role'] = ((string) ($row['role'] ?? '')) === 'admin' ? 'admin' : 'client';

    chb_attach_guest_bookings_to_user($uid, $email);

    return ['ok' => true];
}

function logout_user(): void
{
    session_bootstrap();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], (bool) $p['secure'], (bool) $p['httponly']);
    }
    session_destroy();
}
