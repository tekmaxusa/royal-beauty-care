<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/signup.php';

/**
 * Merchant login — only users with role = admin (same `users` table as clients).
 *
 * @return array{ok: bool, error?: string}
 */
function login_admin_user(string $email, string $password): array
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
        return ['ok' => false, 'error' => 'Invalid email or password.'];
    }

    if ((string) ($row['role'] ?? '') !== 'admin') {
        // Same message as wrong password so client accounts are not distinguishable from invalid credentials.
        return ['ok' => false, 'error' => 'Invalid email or password.'];
    }

    if (!password_verify($password, $row['password'])) {
        return ['ok' => false, 'error' => 'Invalid email or password.'];
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $row['id'];
    $_SESSION['user_name'] = $row['name'];
    $_SESSION['user_email'] = $row['email'];
    $_SESSION['user_role'] = 'admin';

    return ['ok' => true];
}

function require_admin(): void
{
    session_bootstrap();
    if (empty($_SESSION['user_id']) || (string) ($_SESSION['user_role'] ?? '') !== 'admin') {
        header('Location: /admin/login', true, 302);
        exit;
    }
}
