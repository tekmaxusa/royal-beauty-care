<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';

/**
 * @return array{base_url:string,merchid:string,api_user:string,api_password:string,currency:string}
 */
function chb_cardconnect_config(): array
{
    $baseUrl = trim((string) (getenv('CARDCONNECT_BASE_URL') ?: 'https://fts.cardconnect.com'));
    $merchid = trim((string) (getenv('CARDCONNECT_MERCHID') ?: ''));
    $apiUser = trim((string) (getenv('CARDCONNECT_API_USER') ?: ''));
    $apiPassword = trim((string) (getenv('CARDCONNECT_API_PASSWORD') ?: ''));
    $currency = strtoupper(trim((string) (getenv('CARDCONNECT_CURRENCY') ?: 'USD')));
    if ($currency === '' || strlen($currency) !== 3) {
        $currency = 'USD';
    }

    return [
        'base_url' => rtrim($baseUrl, '/'),
        'merchid' => $merchid,
        'api_user' => $apiUser,
        'api_password' => $apiPassword,
        'currency' => $currency,
    ];
}

function chb_cardconnect_is_enabled(): bool
{
    $cfg = chb_cardconnect_config();

    return $cfg['base_url'] !== ''
        && $cfg['merchid'] !== ''
        && $cfg['api_user'] !== ''
        && $cfg['api_password'] !== '';
}

/**
 * @param array<string,mixed> $payload
 * @return array{ok:bool,status:int,response:array<string,mixed>,raw:string,error?:string}
 */
function chb_cardconnect_post_json(string $path, array $payload): array
{
    $cfg = chb_cardconnect_config();
    if (!chb_cardconnect_is_enabled()) {
        return [
            'ok' => false,
            'status' => 0,
            'response' => [],
            'raw' => '',
            'error' => 'CardConnect credentials are not configured. Set CARDCONNECT_* in api/.env, then restart PHP (e.g. docker compose restart web).',
        ];
    }

    $url = $cfg['base_url'] . $path;
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        return ['ok' => false, 'status' => 0, 'response' => [], 'raw' => '', 'error' => 'JSON encode failed.'];
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'status' => 0, 'response' => [], 'raw' => '', 'error' => 'curl init failed.'];
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_USERPWD => $cfg['api_user'] . ':' . $cfg['api_password'],
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $json,
    ]);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if (!is_string($raw)) {
        return [
            'ok' => false,
            'status' => $status,
            'response' => [],
            'raw' => '',
            'error' => $curlError !== '' ? $curlError : 'Network request failed.',
        ];
    }

    $decoded = json_decode($raw, true);
    $resp = is_array($decoded) ? $decoded : [];

    return [
        'ok' => $status >= 200 && $status < 300,
        'status' => $status,
        'response' => $resp,
        'raw' => $raw,
    ];
}

/**
 * @return array{ok:bool,token?:string,error?:string,response:array<string,mixed>,raw:string,status:int}
 */
function chb_cardconnect_tokenize(string $account, string $expiry, string $cvv): array
{
    $payload = [
        'account' => preg_replace('/\s+/', '', trim($account)),
        'expiry' => trim($expiry),
        'cvv' => trim($cvv),
    ];
    $res = chb_cardconnect_post_json('/cardsecure/api/v1/ccn/tokenize', $payload);
    if (!$res['ok']) {
        return [
            'ok' => false,
            'error' => $res['error'] ?? 'Tokenize request failed.',
            'response' => $res['response'],
            'raw' => $res['raw'],
            'status' => $res['status'],
        ];
    }

    $token = trim((string) ($res['response']['token'] ?? ''));
    if ($token === '') {
        return [
            'ok' => false,
            'error' => (string) ($res['response']['message'] ?? 'Tokenize failed.'),
            'response' => $res['response'],
            'raw' => $res['raw'],
            'status' => $res['status'],
        ];
    }

    return ['ok' => true, 'token' => $token, 'response' => $res['response'], 'raw' => $res['raw'], 'status' => $res['status']];
}

/**
 * Optional AVS / cardholder fields for Gateway auth (omit empty values).
 *
 * @param array{name?:string,address?:string,city?:string,state?:string,country?:string} $billing
 * @return array{ok:bool,approved:bool,response:array<string,mixed>,raw:string,status:int,error?:string}
 */
function chb_cardconnect_auth(string $token, int $amountCents, string $postal, string $orderId, array $billing = []): array
{
    $cfg = chb_cardconnect_config();
    $amount = number_format(max(0, $amountCents) / 100, 2, '.', '');
    $payload = [
        'merchid' => $cfg['merchid'],
        'account' => trim($token),
        'amount' => $amount,
        'currency' => $cfg['currency'],
        'capture' => 'Y',
        'orderid' => trim($orderId),
        'ecomind' => 'E',
        'postal' => trim($postal),
    ];

    $map = [
        'name' => (string) ($billing['name'] ?? ''),
        'address' => (string) ($billing['address'] ?? ''),
        'city' => (string) ($billing['city'] ?? ''),
        'state' => (string) ($billing['state'] ?? ''),
        'country' => (string) ($billing['country'] ?? ''),
    ];
    foreach ($map as $key => $val) {
        $val = trim($val);
        if ($val !== '') {
            $payload[$key] = $val;
        }
    }

    $res = chb_cardconnect_post_json('/cardconnect/rest/auth', $payload);
    if (!$res['ok']) {
        return [
            'ok' => false,
            'approved' => false,
            'response' => $res['response'],
            'raw' => $res['raw'],
            'status' => $res['status'],
            'error' => $res['error'] ?? 'Authorization request failed.',
        ];
    }

    $respstat = strtoupper((string) ($res['response']['respstat'] ?? ''));
    $approved = $respstat === 'A';

    return [
        'ok' => true,
        'approved' => $approved,
        'response' => $res['response'],
        'raw' => $res['raw'],
        'status' => $res['status'],
    ];
}

/**
 * Refund a captured sale using the original authorization retref (CardPointe Gateway).
 *
 * @return array{ok:bool,approved:bool,response:array<string,mixed>,raw:string,status:int,error?:string}
 */
function chb_cardconnect_refund(string $retref, int $amountCents, string $refundOrderId): array
{
    $cfg = chb_cardconnect_config();
    $amount = number_format(max(0, $amountCents) / 100, 2, '.', '');
    $payload = [
        'merchid' => $cfg['merchid'],
        'retref' => trim($retref),
        'amount' => $amount,
    ];
    $oid = trim($refundOrderId);
    if ($oid !== '') {
        $payload['orderid'] = $oid;
    }

    $res = chb_cardconnect_post_json('/cardconnect/rest/refund', $payload);
    if (!$res['ok']) {
        return [
            'ok' => false,
            'approved' => false,
            'response' => $res['response'],
            'raw' => $res['raw'],
            'status' => $res['status'],
            'error' => $res['error'] ?? 'Refund request failed.',
        ];
    }

    $respstat = strtoupper((string) ($res['response']['respstat'] ?? ''));
    $approved = $respstat === 'A';

    return [
        'ok' => true,
        'approved' => $approved,
        'response' => $res['response'],
        'raw' => $res['raw'],
        'status' => $res['status'],
    ];
}

/**
 * Void a prior authorization/capture when still voidable (batch / settlement rules apply).
 *
 * @return array{ok:bool,approved:bool,response:array<string,mixed>,raw:string,status:int,error?:string}
 */
function chb_cardconnect_void(string $retref, int $amountCents): array
{
    $cfg = chb_cardconnect_config();
    $amount = number_format(max(0, $amountCents) / 100, 2, '.', '');
    $payload = [
        'merchid' => $cfg['merchid'],
        'retref' => trim($retref),
        'amount' => $amount,
    ];

    $res = chb_cardconnect_post_json('/cardconnect/rest/void', $payload);
    if (!$res['ok']) {
        return [
            'ok' => false,
            'approved' => false,
            'response' => $res['response'],
            'raw' => $res['raw'],
            'status' => $res['status'],
            'error' => $res['error'] ?? 'Void request failed.',
        ];
    }

    $respstat = strtoupper((string) ($res['response']['respstat'] ?? ''));
    $approved = $respstat === 'A';

    return [
        'ok' => true,
        'approved' => $approved,
        'response' => $res['response'],
        'raw' => $res['raw'],
        'status' => $res['status'],
    ];
}

/**
 * Hosted iFrame Tokenizer (CardConnect) — card data stays in the iframe origin; parent receives a token via postMessage.
 *
 * @return array{iframeSrc:string,allowedOrigin:string}|null
 */
function chb_cardconnect_hosted_tokenizer_meta(): ?array
{
    $cfg = chb_cardconnect_config();
    $base = $cfg['base_url'];
    if ($base === '') {
        return null;
    }
    $parts = parse_url($base);
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return null;
    }
    $allowedOrigin = $parts['scheme'] . '://' . $parts['host'];
    $extra = trim((string) (getenv('CARDCONNECT_TOKENIZER_QUERY') ?: ''));
    $extra = ltrim($extra, '?&');
    $q = 'sendcssloadedevent=true&useexpiry=true&usecvv=true';
    if ($extra !== '') {
        $q .= '&' . $extra;
    }

    return [
        'iframeSrc' => $base . '/itoke/ajax-tokenizer.html?' . $q,
        'allowedOrigin' => $allowedOrigin,
    ];
}

function chb_cardconnect_card_token_looks_valid(string $token): bool
{
    $t = trim($token);
    if (strlen($t) < 12 || strlen($t) > 32) {
        return false;
    }

    return (bool) preg_match('/^[0-9A-Za-z]+$/', $t);
}

/**
 * After a captured deposit succeeds but the booking cannot be created, void (if possible) then refund.
 *
 * @return array{ok:bool,method?:string,error?:string,response?:array<string,mixed>}
 */
function chb_cardconnect_reverse_successful_deposit(string $retref, int $amountCents): array
{
    $retref = trim($retref);
    if ($retref === '' || $amountCents <= 0) {
        return ['ok' => true, 'method' => 'none'];
    }
    if (!chb_cardconnect_is_enabled()) {
        return [
            'ok' => false,
            'error' => 'CardConnect is not configured; the deposit could not be reversed automatically. Contact support with your order reference.',
        ];
    }

    $void = chb_cardconnect_void($retref, $amountCents);
    if ($void['ok'] && !empty($void['approved'])) {
        return ['ok' => true, 'method' => 'void', 'response' => $void['response'] ?? []];
    }

    $refundOrderId = 'chb-rollback-' . date('YmdHis') . '-' . bin2hex(random_bytes(3));
    $refund = chb_cardconnect_refund($retref, $amountCents, $refundOrderId);
    if ($refund['ok'] && !empty($refund['approved'])) {
        return ['ok' => true, 'method' => 'refund', 'response' => $refund['response'] ?? []];
    }

    $voidMsg = '';
    if ($void['ok'] && empty($void['approved'])) {
        $voidMsg = (string) (($void['response']['resptext'] ?? '') ?: 'Void declined.');
    } elseif (!$void['ok']) {
        $voidMsg = (string) ($void['error'] ?? 'Void request failed.');
    }
    $refundMsg = '';
    if ($refund['ok'] && empty($refund['approved'])) {
        $refundMsg = (string) (($refund['response']['resptext'] ?? '') ?: 'Refund declined.');
    } elseif (!$refund['ok']) {
        $refundMsg = (string) ($refund['error'] ?? 'Refund request failed.');
    }

    return [
        'ok' => false,
        'error' => 'Your card was charged but we could not complete the booking or automatically refund the deposit. Void: '
            . $voidMsg . ' Refund: ' . $refundMsg,
    ];
}
