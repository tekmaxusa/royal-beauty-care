<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/schema_auto_migrate.php';

/**
 * Returns a shared PDO instance (MySQL).
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: 'db';
    $name = getenv('DB_NAME') ?: 'change_hair_beauty';
    $user = getenv('DB_USER') ?: 'salon_user';
    $pass = getenv('DB_PASS') ?: '';

    // .env often sets DB_PORT for host→container mapping (XAMPP). Inside Compose, host is `db` on internal 3306 — ignore mapped port.
    $port = null;
    if ($host !== 'db') {
        $portRaw = getenv('DB_PORT');
        if (is_string($portRaw) && $portRaw !== '' && ctype_digit($portRaw)) {
            $port = (int) $portRaw;
        }
    }
    $portSeg = $port !== null ? ';port=' . $port : '';

    $dsn = sprintf('mysql:host=%s%s;dbname=%s;charset=utf8mb4', $host, $portSeg, $name);

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    db_ensure_schema($pdo);

    return $pdo;
}

/**
 * Quick health check for the UI (counts only; no user input).
 *
 * @return array{ok: bool, users?: int, bookings?: int, error?: string}
 */
function db_stats(): array
{
    try {
        $pdo = db();
        $users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $bookings = (int) $pdo->query('SELECT COUNT(*) FROM bookings')->fetchColumn();

        return ['ok' => true, 'users' => $users, 'bookings' => $bookings];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    }
}
