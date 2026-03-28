<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';

/**
 * @return array{api_base:string,scl_base:string,checkout_sdk:string,sandbox:bool}
 */
function chb_clover_hosts(): array
{
    $raw = strtolower(trim((string) (getenv('CLOVER_SANDBOX') ?: '1')));
    $sandbox = $raw === '' || $raw === '1' || $raw === 'true' || $raw === 'yes';
    if ($sandbox) {
        return [
            'api_base' => 'https://apisandbox.dev.clover.com',
            'scl_base' => 'https://scl-sandbox.dev.clover.com',
            'checkout_sdk' => 'https://checkout.sandbox.dev.clover.com/sdk.js',
            'sandbox' => true,
        ];
    }

    return [
        'api_base' => rtrim((string) (getenv('CLOVER_API_BASE') ?: 'https://api.clover.com'), '/'),
        'scl_base' => rtrim((string) (getenv('CLOVER_SCL_BASE') ?: 'https://scl.clover.com'), '/'),
        'checkout_sdk' => (string) (getenv('CLOVER_CHECKOUT_SDK_URL') ?: 'https://checkout.clover.com/sdk.js'),
        'sandbox' => false,
    ];
}

function chb_request_client_ip(): string
{
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if (is_string($xff) && $xff !== '') {
        $parts = explode(',', $xff);

        return trim($parts[0]);
    }

    return trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
}

function chb_deposit_gateway(): string
{
    $g = strtolower(trim((string) (getenv('CHB_DEPOSIT_GATEWAY') ?: 'cardconnect')));
    if ($g === 'clover') {
        return 'clover';
    }

    return 'cardconnect';
}

function chb_clover_oauth_cache_path(): string
{
    $override = trim((string) (getenv('CLOVER_OAUTH_CACHE_FILE') ?: ''));
    if ($override !== '') {
        return $override;
    }

    return __DIR__ . '/../var/clover_oauth_cache.json';
}

/**
 * @return array{client_id:string,client_secret:string,refresh_token:string}
 */
function chb_clover_oauth_credentials(): array
{
    return [
        'client_id' => trim((string) (getenv('CLOVER_APP_ID') ?: '')),
        'client_secret' => trim((string) (getenv('CLOVER_APP_SECRET') ?: '')),
        'refresh_token' => trim((string) (getenv('CLOVER_REFRESH_TOKEN') ?: '')),
    ];
}

function chb_clover_merchant_id(): string
{
    return trim((string) (getenv('CLOVER_MERCHANT_ID') ?: ''));
}

/**
 * Server-side Clover deposit: OAuth + (optional) PAKMS for meta.
 */
function chb_clover_server_configured(): bool
{
    $mid = chb_clover_merchant_id();
    $c = chb_clover_oauth_credentials();

    return $mid !== '' && $c['client_id'] !== '' && $c['client_secret'] !== '' && $c['refresh_token'] !== '';
}

/**
 * @param array<string,mixed>|null $decoded
 * @return array{ok:bool,status:int,raw:string,decoded?:array<string,mixed>,error?:string}
 */
function chb_clover_curl_json(
    string $method,
    string $url,
    array $headers,
    ?string $body,
    int $timeoutSec = 35
): array {
    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'status' => 0, 'raw' => '', 'error' => 'curl init failed'];
    }
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeoutSec,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($body !== null && $body !== '') {
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if (!is_string($raw)) {
        return ['ok' => false, 'status' => $status, 'raw' => '', 'error' => $err !== '' ? $err : 'Request failed'];
    }
    $decoded = json_decode($raw, true);

    return [
        'ok' => $status >= 200 && $status < 300,
        'status' => $status,
        'raw' => $raw,
        'decoded' => is_array($decoded) ? $decoded : null,
        'error' => !$status || $status >= 400 ? ($err !== '' ? $err : 'HTTP ' . $status) : null,
    ];
}

/**
 * @return array{ok:bool,access_token?:string,refresh_token?:string,error?:string}
 */
function chb_clover_oauth_refresh(): array
{
    $c = chb_clover_oauth_credentials();
    if ($c['client_id'] === '' || $c['client_secret'] === '' || $c['refresh_token'] === '') {
        return ['ok' => false, 'error' => 'Clover OAuth credentials are not configured.'];
    }
    $hosts = chb_clover_hosts();
    $url = $hosts['api_base'] . '/oauth/v2/refresh';
    $payload = json_encode(
        [
            'client_id' => $c['client_id'],
            'client_secret' => $c['client_secret'],
            'refresh_token' => $c['refresh_token'],
        ],
        JSON_UNESCAPED_SLASHES
    );
    if (!is_string($payload)) {
        return ['ok' => false, 'error' => 'JSON encode failed'];
    }
    $res = chb_clover_curl_json(
        'POST',
        $url,
        ['Content-Type: application/json', 'Accept: application/json'],
        $payload
    );
    $dec = is_array($res['decoded'] ?? null) ? $res['decoded'] : [];
    $atTry = trim((string) ($dec['access_token'] ?? ''));
    if (!$res['ok'] || $atTry === '') {
        $altUrl = $hosts['api_base'] . '/oauth/v2/token';
        $altPayload = json_encode(
            [
                'client_id' => $c['client_id'],
                'client_secret' => $c['client_secret'],
                'refresh_token' => $c['refresh_token'],
                'grant_type' => 'refresh_token',
            ],
            JSON_UNESCAPED_SLASHES
        );
        if (is_string($altPayload)) {
            $res2 = chb_clover_curl_json(
                'POST',
                $altUrl,
                ['Content-Type: application/json', 'Accept: application/json'],
                $altPayload
            );
            if ($res2['ok'] && is_array($res2['decoded'])) {
                $res = $res2;
                $dec = $res2['decoded'];
            }
        }
    }
    if (!$res['ok'] || !is_array($dec)) {
        return [
            'ok' => false,
            'error' => (string) ($dec['message'] ?? $res['error'] ?? $res['raw'] ?? 'OAuth refresh failed'),
        ];
    }
    $at = trim((string) ($dec['access_token'] ?? ''));
    $rt = trim((string) ($dec['refresh_token'] ?? ''));
    if ($at === '') {
        return ['ok' => false, 'error' => 'OAuth refresh returned no access_token'];
    }
    if ($rt === '') {
        $rt = $c['refresh_token'];
    }

    $path = chb_clover_oauth_cache_path();
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $cache = [
        'access_token' => $at,
        'refresh_token' => $rt,
        'access_token_expiration' => (int) ($dec['access_token_expiration'] ?? 0),
        'updated_at' => time(),
    ];
    @file_put_contents(
        $path,
        json_encode($cache, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) ?: '{}',
        LOCK_EX
    );

    putenv('CLOVER_REFRESH_TOKEN=' . $rt);

    return ['ok' => true, 'access_token' => $at, 'refresh_token' => $rt];
}

/**
 * @return array{ok:bool,access_token?:string,error?:string}
 */
function chb_clover_get_access_token(): array
{
    $path = chb_clover_oauth_cache_path();
    if (is_readable($path)) {
        $j = json_decode((string) file_get_contents($path), true);
        if (is_array($j)) {
            $at = trim((string) ($j['access_token'] ?? ''));
            $exp = (int) ($j['access_token_expiration'] ?? 0);
            if ($at !== '' && ($exp <= 0 || $exp > time() + 120)) {
                return ['ok' => true, 'access_token' => $at];
            }
        }
    }

    return chb_clover_oauth_refresh();
}

/**
 * @return array{ok:bool,api_key?:string,error?:string}
 */
function chb_clover_fetch_pakms(string $accessToken): array
{
    $hosts = chb_clover_hosts();
    $url = $hosts['scl_base'] . '/pakms/apikey';
    $res = chb_clover_curl_json('GET', $url, [
        'Accept: application/json',
        'Authorization: Bearer ' . $accessToken,
    ], null);
    $dec = $res['decoded'] ?? [];
    if (!$res['ok'] || !is_array($dec)) {
        return [
            'ok' => false,
            'error' => is_array($dec) && isset($dec['message'])
                ? (string) $dec['message']
                : ($res['error'] ?? 'PAKMS fetch failed'),
        ];
    }
    $key = trim((string) ($dec['apiAccessKey'] ?? ''));
    if ($key === '') {
        return ['ok' => false, 'error' => 'PAKMS response missing apiAccessKey'];
    }

    return ['ok' => true, 'api_key' => $key];
}

/**
 * Public key for Clover iframe (PAKMS). Optional env override avoids OAuth on every meta request.
 *
 * @return array{ok:bool,api_key?:string,error?:string}
 */
function chb_clover_get_pakms_public_key(): array
{
    $envPk = trim((string) (getenv('CLOVER_PAKMS_KEY') ?: ''));
    if ($envPk !== '') {
        return ['ok' => true, 'api_key' => $envPk];
    }
    if (!chb_clover_server_configured()) {
        return ['ok' => false, 'error' => 'Clover is not configured (set CLOVER_* OAuth or CLOVER_PAKMS_KEY).'];
    }
    $tok = chb_clover_get_access_token();
    if (!$tok['ok']) {
        return ['ok' => false, 'error' => $tok['error'] ?? 'No access token'];
    }

    return chb_clover_fetch_pakms((string) $tok['access_token']);
}

/**
 * @return array<string,string>
 */
function chb_clover_public_meta_for_booking(): array
{
    $mid = chb_clover_merchant_id();
    $hosts = chb_clover_hosts();
    $pk = chb_clover_get_pakms_public_key();
    if (!$pk['ok'] || $mid === '') {
        return [];
    }

    return [
        'merchantId' => $mid,
        'publicKey' => (string) ($pk['api_key'] ?? ''),
        'sdkUrl' => $hosts['checkout_sdk'],
        'sandbox' => $hosts['sandbox'] ? '1' : '0',
    ];
}

/**
 * Platform REST (v3) — uses OAuth access token or optional merchant dashboard token.
 *
 * @return array{ok:bool,status:int,raw:string,decoded?:array<string,mixed>,error?:string}
 */
function chb_clover_platform_request(string $method, string $path, ?string $jsonBody): array
{
    $token = trim((string) (getenv('CLOVER_PLATFORM_ACCESS_TOKEN') ?: ''));
    if ($token === '') {
        $t = chb_clover_get_access_token();
        if (!$t['ok']) {
            return ['ok' => false, 'status' => 0, 'raw' => '', 'error' => $t['error'] ?? 'No platform token'];
        }
        $token = (string) $t['access_token'];
    }
    $mid = chb_clover_merchant_id();
    if ($mid === '') {
        return ['ok' => false, 'status' => 0, 'raw' => '', 'error' => 'CLOVER_MERCHANT_ID is not set'];
    }
    $hosts = chb_clover_hosts();
    $path = '/' . ltrim($path, '/');
    $url = $hosts['api_base'] . $path;
    $headers = [
        'Accept: application/json',
        'Authorization: Bearer ' . $token,
    ];
    $body = null;
    if ($jsonBody !== null) {
        $headers[] = 'Content-Type: application/json';
        $body = $jsonBody;
    }

    return chb_clover_curl_json($method, $url, $headers, $body);
}

/**
 * @return array{ok:bool,status:int,raw:string,decoded?:array<string,mixed>,error?:string}
 */
function chb_clover_scl_request(
    string $method,
    string $path,
    ?string $jsonBody,
    string $accessToken,
    string $clientIp,
    ?string $idempotencyKey = null
): array {
    $hosts = chb_clover_hosts();
    $url = $hosts['scl_base'] . '/' . ltrim($path, '/');
    $headers = [
        'Accept: application/json',
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json',
        'x-forwarded-for: ' . ($clientIp !== '' ? $clientIp : '0.0.0.0'),
    ];
    if ($idempotencyKey !== null && $idempotencyKey !== '') {
        $headers[] = 'idempotency-key: ' . $idempotencyKey;
    }

    return chb_clover_curl_json($method, $url, $headers, $jsonBody);
}

/**
 * @param list<array{label:string,price_cents:int}> $lineItems
 * @return array{
 *   ok:bool,
 *   order_id?:string,
 *   charge_id?:string,
 *   pay_raw?:string,
 *   error?:string,
 *   platform_raw?:string,
 *   pay_decoded?:array<string,mixed>
 * }
 */
function chb_clover_create_order_and_pay_deposit(
    int $depositCents,
    string $currencyLower,
    string $cloverSourceToken,
    string $clientIp,
    string $idempotencyKey,
    array $lineItems,
    ?string $customerEmail = null
): array {
    if (!preg_match('/^clv_[A-Za-z0-9_-]+$/', $cloverSourceToken)) {
        return ['ok' => false, 'error' => 'Invalid Clover payment token.'];
    }
    if ($depositCents <= 0) {
        return ['ok' => false, 'error' => 'Deposit amount must be positive.'];
    }
    $tok = chb_clover_get_access_token();
    if (!$tok['ok']) {
        return ['ok' => false, 'error' => $tok['error'] ?? 'Clover auth failed'];
    }
    $access = (string) $tok['access_token'];
    $mid = chb_clover_merchant_id();

    $orderBody = json_encode(
        [
            'title' => 'Online booking',
            'note' => 'Royal Beauty Care web booking',
        ],
        JSON_UNESCAPED_SLASHES
    );
    if (!is_string($orderBody)) {
        return ['ok' => false, 'error' => 'JSON encode failed (order)'];
    }
    $o = chb_clover_platform_request('POST', '/v3/merchants/' . rawurlencode($mid) . '/orders', $orderBody);
    if (!$o['ok']) {
        $em = is_array($o['decoded']) ? (string) ($o['decoded']['message'] ?? '') : '';

        return [
            'ok' => false,
            'error' => $em !== '' ? $em : ('Create order failed: ' . $o['raw']),
            'platform_raw' => $o['raw'],
        ];
    }
    $od = $o['decoded'] ?? [];
    $orderId = trim((string) ($od['id'] ?? ''));
    if ($orderId === '') {
        return ['ok' => false, 'error' => 'Clover create order returned no id', 'platform_raw' => $o['raw']];
    }

    foreach ($lineItems as $li) {
        $label = trim((string) ($li['label'] ?? ''));
        $cents = (int) ($li['price_cents'] ?? 0);
        if ($label === '' || $cents <= 0) {
            continue;
        }
        $liBody = json_encode(
            [
                'name' => $label,
                'price' => $cents,
                'unitQty' => 1,
            ],
            JSON_UNESCAPED_SLASHES
        );
        if (!is_string($liBody)) {
            continue;
        }
        $lr = chb_clover_platform_request(
            'POST',
            '/v3/merchants/' . rawurlencode($mid) . '/orders/' . rawurlencode($orderId) . '/line_items',
            $liBody
        );
        if (!$lr['ok']) {
            return [
                'ok' => false,
                'error' => 'Failed to add line item: ' . $lr['raw'],
                'platform_raw' => $lr['raw'],
            ];
        }
    }

    $payPayload = [
        'amount' => $depositCents,
        'currency' => $currencyLower,
        'source' => $cloverSourceToken,
        'ecomind' => 'ecom',
        'partial_redemption' => true,
    ];
    if ($customerEmail !== null && $customerEmail !== '') {
        $payPayload['email'] = $customerEmail;
    }
    $payJson = json_encode($payPayload, JSON_UNESCAPED_SLASHES);
    if (!is_string($payJson)) {
        return ['ok' => false, 'error' => 'JSON encode failed (pay)'];
    }

    $pay = chb_clover_scl_request(
        'POST',
        '/v1/orders/' . rawurlencode($orderId) . '/pay',
        $payJson,
        $access,
        $clientIp,
        $idempotencyKey
    );
    $payDec = $pay['decoded'] ?? [];
    if (!$pay['ok']) {
        $msg = '';
        if (is_array($payDec)) {
            $msg = (string) ($payDec['message'] ?? '');
            if ($msg === '' && isset($payDec['error']) && is_array($payDec['error'])) {
                $msg = (string) ($payDec['error']['message'] ?? '');
            }
        }

        return [
            'ok' => false,
            'error' => $msg !== '' ? $msg : ('Pay order failed: ' . $pay['raw']),
            'order_id' => $orderId,
            'platform_raw' => $o['raw'],
            'pay_raw' => $pay['raw'],
        ];
    }

    $chargeId = chb_clover_extract_charge_id_from_pay_response(is_array($payDec) ? $payDec : []);

    return [
        'ok' => true,
        'order_id' => $orderId,
        'charge_id' => $chargeId,
        'pay_raw' => $pay['raw'],
        'pay_decoded' => is_array($payDec) ? $payDec : [],
    ];
}

/**
 * @param array<string,mixed> $payDecoded
 */
function chb_clover_extract_charge_id_from_pay_response(array $payDecoded): string
{
    if (isset($payDecoded['charges']) && is_array($payDecoded['charges'])) {
        foreach ($payDecoded['charges'] as $c) {
            if (is_array($c) && !empty($c['id'])) {
                return trim((string) $c['id']);
            }
        }
    }
    if (isset($payDecoded['payment']) && is_array($payDecoded['payment'])) {
        $p = $payDecoded['payment'];
        if (!empty($p['id'])) {
            return trim((string) $p['id']);
        }
    }
    if (!empty($payDecoded['id']) && str_starts_with((string) $payDecoded['id'], 'ch_')) {
        return trim((string) $payDecoded['id']);
    }
    if (isset($payDecoded['payments']) && is_array($payDecoded['payments'])) {
        foreach ($payDecoded['payments'] as $p) {
            if (is_array($p)) {
                foreach (['id', 'chargeId', 'charge_id'] as $k) {
                    if (!empty($p[$k]) && is_string($p[$k]) && str_starts_with((string) $p[$k], 'ch_')) {
                        return trim((string) $p[$k]);
                    }
                }
            }
        }
    }

    $deep = chb_clover_deep_find_charge_id($payDecoded);

    return $deep !== '' ? $deep : '';
}

/**
 * @param mixed $data
 */
function chb_clover_deep_find_charge_id($data): string
{
    if (is_array($data)) {
        foreach ($data as $k => $v) {
            if ($k === 'id' && is_string($v) && str_starts_with($v, 'ch_')) {
                return trim($v);
            }
            $inner = chb_clover_deep_find_charge_id($v);
            if ($inner !== '') {
                return $inner;
            }
        }
    }

    return '';
}

/**
 * @return array{ok:bool,decoded?:array<string,mixed>,raw?:string,error?:string}
 */
function chb_clover_create_refund(string $chargeId, int $amountCents): array
{
    if ($chargeId === '' || $amountCents <= 0) {
        return ['ok' => false, 'error' => 'Invalid refund parameters'];
    }
    $tok = chb_clover_get_access_token();
    if (!$tok['ok']) {
        return ['ok' => false, 'error' => $tok['error'] ?? 'Clover auth failed'];
    }
    $access = (string) $tok['access_token'];
    $body = json_encode(
        [
            'charge' => $chargeId,
            'amount' => $amountCents,
            'reason' => 'requested_by_customer',
        ],
        JSON_UNESCAPED_SLASHES
    );
    if (!is_string($body)) {
        return ['ok' => false, 'error' => 'JSON encode failed'];
    }
    $hosts = chb_clover_hosts();
    $res = chb_clover_curl_json(
        'POST',
        $hosts['scl_base'] . '/v1/refunds',
        [
            'Accept: application/json',
            'Authorization: Bearer ' . $access,
            'Content-Type: application/json',
            'x-forwarded-for: 127.0.0.1',
        ],
        $body
    );
    $dec = $res['decoded'] ?? [];

    return [
        'ok' => $res['ok'],
        'decoded' => is_array($dec) ? $dec : [],
        'raw' => $res['raw'],
        'error' => $res['ok'] ? null : (is_array($dec) ? (string) ($dec['message'] ?? '') : ($res['error'] ?? $res['raw'])),
    ];
}

/**
 * Optional: sync-only order for CardConnect path (non-blocking for caller).
 *
 * @param list<array{label:string,price_cents:int}> $lineItems
 * @return array{ok:bool,order_id?:string,error?:string}
 */
function chb_clover_sync_order_cardconnect_deposit(array $lineItems, string $note): array
{
    if (!chb_clover_server_configured() && trim((string) (getenv('CLOVER_PLATFORM_ACCESS_TOKEN') ?: '')) === '') {
        return ['ok' => false, 'error' => 'Clover not configured'];
    }
    $mid = chb_clover_merchant_id();
    if ($mid === '') {
        return ['ok' => false, 'error' => 'No merchant id'];
    }
    $orderBody = json_encode(['title' => 'Online booking', 'note' => $note], JSON_UNESCAPED_SLASHES);
    if (!is_string($orderBody)) {
        return ['ok' => false, 'error' => 'JSON encode failed'];
    }
    $o = chb_clover_platform_request('POST', '/v3/merchants/' . rawurlencode($mid) . '/orders', $orderBody);
    if (!$o['ok']) {
        return ['ok' => false, 'error' => $o['raw']];
    }
    $orderId = trim((string) (($o['decoded'] ?? [])['id'] ?? ''));
    if ($orderId === '') {
        return ['ok' => false, 'error' => 'No order id'];
    }
    foreach ($lineItems as $li) {
        $label = trim((string) ($li['label'] ?? ''));
        $cents = (int) ($li['price_cents'] ?? 0);
        if ($label === '' || $cents <= 0) {
            continue;
        }
        $liBody = json_encode(['name' => $label, 'price' => $cents, 'unitQty' => 1], JSON_UNESCAPED_SLASHES);
        if (!is_string($liBody)) {
            continue;
        }
        chb_clover_platform_request(
            'POST',
            '/v3/merchants/' . rawurlencode($mid) . '/orders/' . rawurlencode($orderId) . '/line_items',
            $liBody
        );
    }

    return ['ok' => true, 'order_id' => $orderId];
}
