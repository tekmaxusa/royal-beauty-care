<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/session.php';

function chb_token_secret(): string
{
    $fromEnv = chb_env_get('CHB_TOKEN_SECRET', '');
    if ($fromEnv !== '') {
        return $fromEnv;
    }

    $fallback = chb_env_get('GOOGLE_CLIENT_SECRET', '');
    if ($fallback !== '') {
        return hash('sha256', $fallback);
    }

    return hash('sha256', __FILE__ . php_uname('n'));
}

function chb_b64url_encode(string $raw): string
{
    return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function chb_b64url_decode(string $in): string
{
    $in = strtr($in, '-_', '+/');
    $pad = strlen($in) % 4;
    if ($pad > 0) {
        $in .= str_repeat('=', 4 - $pad);
    }
    $out = base64_decode($in, true);

    return is_string($out) ? $out : '';
}

/**
 * @param array<string,mixed> $claims
 */
function chb_access_token_issue(array $claims, int $ttlSeconds = 900): string
{
    $now = time();
    $payload = array_merge($claims, [
        'iat' => $now,
        'exp' => $now + max(60, $ttlSeconds),
    ]);
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        throw new RuntimeException('Could not encode access token payload.');
    }
    $body = chb_b64url_encode($json);
    $sig = hash_hmac('sha256', $body, chb_token_secret(), true);

    return $body . '.' . chb_b64url_encode($sig);
}

/**
 * @return array<string,mixed>|null
 */
function chb_access_token_verify(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }
    [$body, $sig] = $parts;
    if ($body === '' || $sig === '') {
        return null;
    }
    $expect = chb_b64url_encode(hash_hmac('sha256', $body, chb_token_secret(), true));
    if (!hash_equals($expect, $sig)) {
        return null;
    }
    $raw = chb_b64url_decode($body);
    if ($raw === '') {
        return null;
    }
    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        return null;
    }
    $exp = (int) ($payload['exp'] ?? 0);
    if ($exp <= time()) {
        return null;
    }

    return $payload;
}

/**
 * @return array{id:int,name:string,email:string,role:string}|null
 */
function chb_auth_user_from_bearer(): ?array
{
    $hdr = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if ($hdr === '' && function_exists('getallheaders')) {
        $all = getallheaders();
        if (is_array($all)) {
            $hdr = (string) ($all['Authorization'] ?? $all['authorization'] ?? '');
        }
    }
    if (!preg_match('/^\s*Bearer\s+(.+)\s*$/i', $hdr, $m)) {
        return null;
    }
    $claims = chb_access_token_verify(trim((string) $m[1]));
    if ($claims === null) {
        return null;
    }

    return [
        'id' => (int) ($claims['uid'] ?? 0),
        'name' => (string) ($claims['name'] ?? ''),
        'email' => (string) ($claims['email'] ?? ''),
        'role' => ((string) ($claims['role'] ?? '')) === 'admin' ? 'admin' : 'client',
    ];
}

/**
 * @param array{id:int,name:string,email:string,role:string} $user
 */
function chb_issue_access_token_for_user(array $user): string
{
    return chb_access_token_issue([
        'uid' => (int) $user['id'],
        'name' => (string) $user['name'],
        'email' => (string) $user['email'],
        'role' => ((string) $user['role']) === 'admin' ? 'admin' : 'client',
    ]);
}

function chb_refresh_cookie_name(): string
{
    return 'CHBRT';
}

/**
 * Path for CHBRT cookie — must prefix-match browser requests to .../api/auth/*.php.
 * Optional override: CHB_REFRESH_COOKIE_PATH in api/.env.
 */
function chb_refresh_cookie_path(): string
{
    $fromEnv = chb_env_get('CHB_REFRESH_COOKIE_PATH', '');
    if ($fromEnv !== '') {
        $p = '/' . ltrim($fromEnv, '/');

        return str_ends_with($p, '/') ? $p : ($p . '/');
    }

    $sn = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
    if (preg_match('#^(.*)/api/auth/[^/]+$#', $sn, $m)) {
        return $m[1] . '/api/auth/';
    }
    if (preg_match('#^(.*)/public/[^/]+\.php$#', $sn, $m)) {
        return $m[1] . '/public/api/auth/';
    }

    return '/api/auth/';
}

function chb_refresh_cookie_samesite(): string
{
    $cross = chb_env_get('CHB_SESSION_CROSS_SITE', '');
    $crossSite = $cross === '1' || strtolower($cross) === 'true';

    return $crossSite ? 'None' : 'Lax';
}

function chb_set_refresh_cookie(string $token, int $ttlSeconds = 2592000): void
{
    $exp = time() + max(3600, $ttlSeconds);
    $path = chb_refresh_cookie_path();
    setcookie(chb_refresh_cookie_name(), $token, [
        'expires' => $exp,
        'path' => $path,
        'secure' => true,
        'httponly' => true,
        'samesite' => chb_refresh_cookie_samesite(),
    ]);
}

function chb_clear_refresh_cookie(): void
{
    $path = chb_refresh_cookie_path();
    setcookie(chb_refresh_cookie_name(), '', [
        'expires' => time() - 3600,
        'path' => $path,
        'secure' => true,
        'httponly' => true,
        'samesite' => chb_refresh_cookie_samesite(),
    ]);
}

function chb_refresh_token_raw(): string
{
    $v = $_COOKIE[chb_refresh_cookie_name()] ?? '';

    return is_string($v) ? trim($v) : '';
}

/**
 * @return array{raw:string,hash:string}
 */
function chb_refresh_token_new(): array
{
    $raw = bin2hex(random_bytes(32));

    return ['raw' => $raw, 'hash' => hash('sha256', $raw)];
}

/**
 * @param PDO $pdo
 */
function chb_refresh_token_store(PDO $pdo, int $userId, string $tokenHash, int $ttlSeconds = 2592000): void
{
    $exp = date('Y-m-d H:i:s', time() + max(3600, $ttlSeconds));
    $ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
    $ip = substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
    $ins = $pdo->prepare(
        'INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_addr)
         VALUES (:u, :h, :e, :ua, :ip)'
    );
    $ins->execute([
        ':u' => $userId,
        ':h' => $tokenHash,
        ':e' => $exp,
        ':ua' => $ua,
        ':ip' => $ip,
    ]);
}

/**
 * @return array{id:int,name:string,email:string,role:string}|null
 */
function chb_refresh_token_rotate(PDO $pdo): ?array
{
    $raw = chb_refresh_token_raw();
    if ($raw === '') {
        return null;
    }
    $hash = hash('sha256', $raw);
    $st = $pdo->prepare(
        'SELECT rt.id, rt.user_id
           FROM auth_refresh_tokens rt
          WHERE rt.token_hash = :h
            AND rt.revoked_at IS NULL
            AND rt.expires_at > NOW()
          LIMIT 1'
    );
    $st->execute([':h' => $hash]);
    $tok = $st->fetch();
    if (!$tok) {
        return null;
    }

    $uid = (int) $tok['user_id'];
    $uSt = $pdo->prepare('SELECT id, name, email, role FROM users WHERE id = :id LIMIT 1');
    $uSt->execute([':id' => $uid]);
    $user = $uSt->fetch();
    if (!$user) {
        return null;
    }

    $upd = $pdo->prepare('UPDATE auth_refresh_tokens SET revoked_at = NOW(), last_used_at = NOW() WHERE id = :id');
    $upd->execute([':id' => (int) $tok['id']]);

    $pair = chb_refresh_token_new();
    chb_refresh_token_store($pdo, $uid, $pair['hash']);
    chb_set_refresh_cookie($pair['raw']);

    return [
        'id' => $uid,
        'name' => (string) ($user['name'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'role' => ((string) ($user['role'] ?? '')) === 'admin' ? 'admin' : 'client',
    ];
}

function chb_refresh_token_revoke_current(PDO $pdo): void
{
    $raw = chb_refresh_token_raw();
    if ($raw !== '') {
        $hash = hash('sha256', $raw);
        $st = $pdo->prepare('UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE token_hash = :h AND revoked_at IS NULL');
        $st->execute([':h' => $hash]);
    }
    chb_clear_refresh_cookie();
}
