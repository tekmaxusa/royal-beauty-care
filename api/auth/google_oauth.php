<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../booking/booking.php';

function google_oauth_env(string $key): string
{
    $v = getenv($key);
    if (is_string($v) && $v !== '') {
        return $v;
    }
    if (isset($_ENV[$key]) && is_string($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && is_string($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }

    return '';
}

function google_oauth_configured(): bool
{
    return google_oauth_env('GOOGLE_CLIENT_ID') !== ''
        && google_oauth_env('GOOGLE_CLIENT_SECRET') !== '';
}

/**
 * Candidate .env locations (project root, then parent directory).
 *
 * @return list<string>
 */
function google_oauth_env_file_candidates(): array
{
    $projectRoot = dirname(__DIR__);

    return [
        $projectRoot . DIRECTORY_SEPARATOR . '.env',
        dirname($projectRoot) . DIRECTORY_SEPARATOR . '.env',
    ];
}

/**
 * Public URL scheme when behind TLS termination (nginx, Cloudflare, Railway, etc.).
 * Set GOOGLE_REDIRECT_URI in .env if auto-detection is wrong.
 */
function google_oauth_request_scheme(): string
{
    $xfp = strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));
    if ($xfp === 'https') {
        return 'https';
    }
    if ($xfp === 'http') {
        return 'http';
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443);

    return $https ? 'https' : 'http';
}

function google_oauth_request_host(): string
{
    $xfh = trim((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''));
    if ($xfh !== '') {
        return trim(explode(',', $xfh)[0]);
    }

    return (string) ($_SERVER['HTTP_HOST'] ?? 'localhost:8080');
}

function google_oauth_redirect_uri(): string
{
    $fromEnv = google_oauth_env('GOOGLE_REDIRECT_URI');
    if ($fromEnv !== '') {
        return $fromEnv;
    }

    $scheme = google_oauth_request_scheme();
    $host = google_oauth_request_host();

    return $scheme . '://' . $host . '/google-oauth-callback.php';
}

function google_oauth_authorization_url(string $state): string
{
    $params = [
        'client_id' => google_oauth_env('GOOGLE_CLIENT_ID'),
        'redirect_uri' => google_oauth_redirect_uri(),
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'state' => $state,
        'access_type' => 'online',
        'include_granted_scopes' => 'true',
    ];

    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
}

/**
 * @return array{access_token: string}
 */
function google_oauth_exchange_code(string $code): array
{
    $body = http_build_query([
        'code' => $code,
        'client_id' => google_oauth_env('GOOGLE_CLIENT_ID'),
        'client_secret' => google_oauth_env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => google_oauth_redirect_uri(),
        'grant_type' => 'authorization_code',
    ]);

    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $body,
            'timeout' => 25,
        ],
    ]);

    $raw = @file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);
    if ($raw === false) {
        throw new RuntimeException('Token request failed.');
    }

    $json = json_decode($raw, true);
    if (!is_array($json) || empty($json['access_token'])) {
        throw new RuntimeException('Invalid token response.');
    }

    return ['access_token' => (string) $json['access_token']];
}

/**
 * @return array{sub: string, email: string, name: string}
 */
function google_oauth_userinfo(string $accessToken): array
{
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Authorization: Bearer {$accessToken}\r\n",
            'timeout' => 25,
        ],
    ]);

    $raw = @file_get_contents('https://openidconnect.googleapis.com/v1/userinfo', false, $ctx);
    if ($raw === false) {
        throw new RuntimeException('Userinfo request failed.');
    }

    $json = json_decode($raw, true);
    if (!is_array($json) || empty($json['sub']) || empty($json['email'])) {
        throw new RuntimeException('Invalid userinfo.');
    }

    return [
        'sub' => (string) $json['sub'],
        'email' => strtolower(trim((string) $json['email'])),
        'name' => trim((string) ($json['name'] ?? $json['email'])),
    ];
}

/**
 * Creates session for Google user (link existing email or new row).
 */
function login_or_register_google_user(string $googleSub, string $email, string $name): void
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Invalid email from Google.');
    }

    $pdo = db();

    $bySub = $pdo->prepare('SELECT id, name, email, google_sub, role FROM users WHERE google_sub = :g LIMIT 1');
    $bySub->execute([':g' => $googleSub]);
    $row = $bySub->fetch();

    if ($row) {
        $userId = (int) $row['id'];
        $dispName = $row['name'];
        $dispEmail = $row['email'];
        $dispRole = ((string) ($row['role'] ?? '')) === 'admin' ? 'admin' : 'client';
    } else {
        $byEmail = $pdo->prepare('SELECT id, name, email, google_sub, role FROM users WHERE email = :e LIMIT 1');
        $byEmail->execute([':e' => $email]);
        $row = $byEmail->fetch();

        if ($row) {
            if (!empty($row['google_sub']) && $row['google_sub'] !== $googleSub) {
                throw new RuntimeException('This email is linked to another Google account.');
            }
            if (empty($row['google_sub'])) {
                $u = $pdo->prepare('UPDATE users SET google_sub = :g WHERE id = :id');
                $u->execute([':g' => $googleSub, ':id' => (int) $row['id']]);
            }
            $userId = (int) $row['id'];
            $dispName = $row['name'];
            $dispEmail = $row['email'];
            $dispRole = ((string) ($row['role'] ?? '')) === 'admin' ? 'admin' : 'client';
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO users (name, email, password, google_sub, role) VALUES (:n, :e, NULL, :g, :r)'
            );
            $ins->execute([
                ':n' => $name !== '' ? $name : $email,
                ':e' => $email,
                ':g' => $googleSub,
                ':r' => 'client',
            ]);
            $userId = (int) $pdo->lastInsertId();
            $dispName = $name !== '' ? $name : $email;
            $dispEmail = $email;
            $dispRole = 'client';
        }
    }

    chb_attach_guest_bookings_to_user($userId, $email);

    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_name'] = $dispName;
    $_SESSION['user_email'] = $dispEmail;
    $_SESSION['user_role'] = $dispRole;
}
