<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/contact_mail.php';

function chb_app_public_base_url(): string
{
    foreach (['CHB_APP_PUBLIC_URL', 'PUBLIC_APP_URL', 'VITE_APP_URL'] as $key) {
        $v = getenv($key);
        if (is_string($v)) {
            $v = trim($v);
            if ($v !== '' && preg_match('#^https?://#i', $v)) {
                return rtrim($v, '/');
            }
        }
    }

    return '';
}

/**
 * @return array{ok: bool, error?: string}
 */
function chb_request_password_reset_for_email(string $email): array
{
    $email = strtolower(trim($email));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => true];
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        "SELECT id, name, password, role FROM users WHERE email = :e LIMIT 1"
    );
    $stmt->execute([':e' => $email]);
    $row = $stmt->fetch();
    if (!$row || (string) ($row['role'] ?? '') !== 'client' || empty($row['password'])) {
        return ['ok' => true];
    }

    $base = chb_app_public_base_url();
    if ($base === '') {
        return ['ok' => false, 'error' => 'Password reset is not configured. Set CHB_APP_PUBLIC_URL to your site URL (e.g. https://your-site.example).'];
    }

    $userId = (int) $row['id'];
    $name = (string) $row['name'];
    $rawToken = bin2hex(random_bytes(32));
    $hash = hash('sha256', $rawToken);
    $expires = (new DateTimeImmutable('now'))->modify('+1 hour')->format('Y-m-d H:i:s');

    $pdo->prepare('DELETE FROM password_resets WHERE user_id = :u')->execute([':u' => $userId]);
    $ins = $pdo->prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (:u, :t, :e)'
    );
    $ins->execute([':u' => $userId, ':t' => $hash, ':e' => $expires]);

    $resetPath = '/reset-password?token=' . rawurlencode($rawToken);
    $resetUrl = $base . $resetPath;

    $sent = chb_send_password_reset_email($email, $name, $resetUrl);
    if (!$sent) {
        return ['ok' => false, 'error' => 'Could not send email. Check server mail configuration (CONTACT_MAIL_FROM / CONTACT_MAIL_TO).'];
    }

    return ['ok' => true];
}

/**
 * @return array{ok: bool, error?: string}
 */
function chb_complete_password_reset(string $rawToken, string $newPassword): array
{
    $rawToken = trim($rawToken);
    if ($rawToken === '') {
        return ['ok' => false, 'error' => 'Invalid or expired link.'];
    }

    if (strlen($newPassword) < 8) {
        return ['ok' => false, 'error' => 'Password must be at least 8 characters.'];
    }

    $hash = hash('sha256', $rawToken);
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT id, user_id FROM password_resets WHERE token_hash = :h AND expires_at > NOW() LIMIT 1'
    );
    $stmt->execute([':h' => $hash]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => 'This reset link is invalid or has expired. Request a new one.'];
    }

    $userId = (int) $row['user_id'];
    $pwHash = password_hash($newPassword, PASSWORD_DEFAULT);
    if ($pwHash === false) {
        return ['ok' => false, 'error' => 'Could not update password.'];
    }

    $u = $pdo->prepare(
        "UPDATE users SET password = :p WHERE id = :id AND role = 'client' LIMIT 1"
    );
    $u->execute([':p' => $pwHash, ':id' => $userId]);
    if ($u->rowCount() === 0) {
        return ['ok' => false, 'error' => 'Could not update account.'];
    }

    $pdo->prepare('DELETE FROM password_resets WHERE user_id = :u')->execute([':u' => $userId]);

    return ['ok' => true];
}
