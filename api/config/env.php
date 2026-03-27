<?php

declare(strict_types=1);

/**
 * Load .env files into the environment when vars are unset or empty.
 * Docker / real env vars take precedence if already non-empty.
 */
(function (): void {
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;

    /**
     * @return array<string, string>
     */
    $parseEnvFile = static function (string $path): array {
        if (!is_readable($path)) {
            return [];
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            return [];
        }
        $out = [];
        foreach (explode("\n", str_replace("\r\n", "\n", $raw)) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$name, $value] = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if ($name === '') {
                continue;
            }
            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"'))
                || (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }
            // Inline comments: CHB_PAYMENT_SKIP=1  # note — value was "1  # note" and broke truthy checks.
            $value = trim((string) preg_replace('/\s+#.*$/', '', trim($value)));
            $out[$name] = $value;
        }

        return $out;
    };

    // Merge: api/.env first, then repo-root .env (later wins on duplicate keys).
    // So CHB_PAYMENT_SKIP=1 in the monorepo root can override CHB_PAYMENT_SKIP=0 from api/.env.example.
    // CardConnect credentials still live in api/.env unless overridden in repo (avoid duplicating DB_* in repo).
    $apiEnv = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    $repoEnv = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env';
    $merged = array_merge($parseEnvFile($apiEnv), $parseEnvFile($repoEnv));

    foreach ($merged as $name => $value) {
        $existing = getenv($name);
        if (is_string($existing) && $existing !== '') {
            continue;
        }

        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
})();

/**
 * Read a non-empty string env var (getenv / $_ENV / $_SERVER). Returns $default if unset or blank after trim.
 */
function chb_env_get(string $name, string $default = ''): string
{
    $raw = getenv($name);
    if (!is_string($raw) || $raw === '') {
        $raw = (string) ($_ENV[$name] ?? $_SERVER[$name] ?? '');
    }
    $raw = trim($raw);
    if ($raw === '') {
        return $default;
    }

    return trim((string) preg_replace('/\s+#.*$/', '', $raw));
}

/**
 * Generic env truthy: 1 / true / yes / on (case-insensitive). Strips trailing " # comment" from raw value.
 */
function chb_env_flag_true(string $name): bool
{
    $raw = getenv($name);
    if (!is_string($raw) || $raw === '') {
        $raw = (string) ($_ENV[$name] ?? $_SERVER[$name] ?? '');
    }
    if ($raw === '') {
        return false;
    }
    $token = strtolower(trim((string) preg_replace('/\s+#.*$/', '', trim($raw))));

    return in_array($token, ['1', 'true', 'yes', 'on'], true);
}

/**
 * Explicit opt-out: 0 / false / no / off (case-insensitive). Same comment stripping as chb_env_flag_true.
 */
function chb_env_flag_false(string $name): bool
{
    $raw = getenv($name);
    if (!is_string($raw) || $raw === '') {
        $raw = (string) ($_ENV[$name] ?? $_SERVER[$name] ?? '');
    }
    if ($raw === '') {
        return false;
    }
    $token = strtolower(trim((string) preg_replace('/\s+#.*$/', '', trim($raw))));

    return in_array($token, ['0', 'false', 'no', 'off'], true);
}

function chb_payment_skip_enabled(): bool
{
    return chb_env_flag_true('CHB_PAYMENT_SKIP');
}
