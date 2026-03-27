<?php

declare(strict_types=1);

/**
 * JSON API bootstrap: CORS (GitHub Pages + local Vite), session, helpers.
 * Include only from public/api/* endpoints.
 */

if (!defined('CHB_API_JSON_REQUEST')) {
    define('CHB_API_JSON_REQUEST', true);
}

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/token_auth.php';

/**
 * @return list<string>
 */
function chb_api_allowed_origins(): array
{
    $raw = getenv('ALLOWED_ORIGINS');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    return array_values(array_filter(array_map('trim', explode(',', $raw))));
}

function chb_api_origin_matches(): ?string
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!is_string($origin) || $origin === '') {
        return null;
    }

    foreach (chb_api_allowed_origins() as $allowed) {
        if ($allowed !== '' && hash_equals($allowed, $origin)) {
            return $origin;
        }
    }

    return null;
}

function chb_api_send_cors(): void
{
    $origin = chb_api_origin_matches();
    if ($origin !== null) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    $reqHeaders = $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? '';
    if (is_string($reqHeaders) && trim($reqHeaders) !== '') {
        // Echo requested headers so browser preflight succeeds for no-cache polling headers.
        header('Access-Control-Allow-Headers: ' . $reqHeaders);
    } else {
        header('Access-Control-Allow-Headers: Content-Type, Cache-Control, Pragma, Authorization');
    }
}

/**
 * @return array{id:int,name:string,email:string,role:string}|null
 */
function chb_api_auth_user(): ?array
{
    $tokUser = null;
    if (function_exists('chb_auth_user_from_bearer')) {
        $tokUser = chb_auth_user_from_bearer();
    }
    if ($tokUser !== null && $tokUser['id'] > 0) {
        return $tokUser;
    }

    session_bootstrap();
    if (!empty($_SESSION['user_id'])) {
        return [
            'id' => current_user_id(),
            'name' => current_user_name(),
            'email' => current_user_email(),
            'role' => current_user_role(),
        ];
    }

    return null;
}

function chb_api_has_bearer_token(): bool
{
    $hdr = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if ($hdr === '') {
        $hdr = (string) ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    }
    if ($hdr === '' && function_exists('getallheaders')) {
        $all = getallheaders();
        if (is_array($all)) {
            $hdr = (string) ($all['Authorization'] ?? $all['authorization'] ?? '');
        }
    }

    return (bool) preg_match('/^\s*Bearer\s+.+\s*$/i', $hdr);
}

function chb_api_init(): void
{
    chb_api_send_cors();

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    session_bootstrap();
}

/**
 * @param array<string,mixed> $data
 */
function chb_api_json(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function chb_api_json_error(string $message, int $code = 400, ?string $field = null): void
{
    $payload = ['ok' => false, 'error' => $message];
    if ($field !== null) {
        $payload['field'] = $field;
    }
    chb_api_json($payload, $code);
}

function chb_api_require_method(string ...$methods): void
{
    $m = $_SERVER['REQUEST_METHOD'] ?? '';
    foreach ($methods as $allowed) {
        if ($m === $allowed) {
            return;
        }
    }
    chb_api_json_error('Method not allowed', 405);
}

/**
 * @return array<string,mixed>
 */
function chb_api_read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        chb_api_json_error('Invalid JSON body', 400);
    }

    /** @var array<string,mixed> $data */
    return $data;
}

function chb_api_require_login(): void
{
    $u = chb_api_auth_user();
    if ($u === null || $u['id'] <= 0) {
        chb_api_json_error('Unauthorized', 401);
    }
}

function chb_api_require_client(): void
{
    $u = chb_api_auth_user();
    if ($u === null || $u['id'] <= 0) {
        chb_api_json_error('Unauthorized', 401);
    }
    if ($u['role'] === 'admin') {
        chb_api_json_error('Use client account', 403);
    }
}

function chb_api_require_admin_json(): void
{
    $u = chb_api_auth_user();
    if ($u === null || $u['id'] <= 0 || $u['role'] !== 'admin') {
        chb_api_json_error('Forbidden', 403);
    }
}
