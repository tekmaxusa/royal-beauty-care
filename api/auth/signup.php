<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../booking/booking.php';

/**
 * @return array{ok: bool, error?: string}
 */
function register_user(string $name, string $email, string $password): array
{
    $name = trim($name);
    $email = strtolower(trim($email));

    if ($name === '' || $email === '' || $password === '') {
        return ['ok' => false, 'error' => 'All fields are required.'];
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Invalid email address.'];
    }

    if (strlen($password) < 8) {
        return ['ok' => false, 'error' => 'Password must be at least 8 characters.'];
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if ($hash === false) {
        return ['ok' => false, 'error' => 'Could not hash password.'];
    }

    $pdo = db();
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role)');
    try {
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':password' => $hash,
            ':role' => 'client',
        ]);
    } catch (PDOException $e) {
        if ((int) $e->errorInfo[1] === 1062) {
            return ['ok' => false, 'error' => 'That email is already registered.'];
        }
        throw $e;
    }

    return ['ok' => true];
}

/**
 * Merchant creates a user row (client or admin). Does not start a session for the new user.
 *
 * @return array{ok: bool, error?: string}
 */
function admin_create_user_account(string $name, string $email, string $password, string $role): array
{
    $name = trim($name);
    $email = strtolower(trim($email));

    if ($name === '' || $email === '' || $password === '') {
        return ['ok' => false, 'error' => 'All fields are required.'];
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Invalid email address.'];
    }

    if (strlen($password) < 8) {
        return ['ok' => false, 'error' => 'Password must be at least 8 characters.'];
    }

    if ($role !== 'admin' && $role !== 'client') {
        return ['ok' => false, 'error' => 'Invalid role.'];
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if ($hash === false) {
        return ['ok' => false, 'error' => 'Could not hash password.'];
    }

    $pdo = db();
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role)');
    try {
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':password' => $hash,
            ':role' => $role,
        ]);
    } catch (PDOException $e) {
        if ((int) $e->errorInfo[1] === 1062) {
            return ['ok' => false, 'error' => 'That email is already registered.'];
        }
        throw $e;
    }

    $newId = (int) $pdo->lastInsertId();
    if ($role === 'client') {
        chb_attach_guest_bookings_to_user($newId, $email);
    }

    return ['ok' => true];
}

/**
 * @return array{ok: bool, error?: string}
 */
function admin_delete_client_user(int $userId): array
{
    if ($userId <= 0) {
        return ['ok' => false, 'error' => 'Invalid user.'];
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, role FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => 'User not found.'];
    }
    if ((string) ($row['role'] ?? '') !== 'client') {
        return ['ok' => false, 'error' => 'Only client accounts can be removed here.'];
    }

    $del = $pdo->prepare("DELETE FROM users WHERE id = :id AND role = 'client' LIMIT 1");
    $del->execute([':id' => $userId]);
    if ($del->rowCount() === 0) {
        return ['ok' => false, 'error' => 'Could not delete user.'];
    }

    return ['ok' => true];
}
