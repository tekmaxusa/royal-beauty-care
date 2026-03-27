<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';
@require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Contact + booking email (PHP mail()). HTML + plain multipart.
 * Merchant vs client: different header treatments; tables + inline CSS for clients.
 */

function chb_smtp_enabled(): bool
{
    $user = chb_env_get('SMTP_USER', '');
    $pass = chb_env_get('SMTP_PASS', '');

    return $user !== '' && $pass !== '';
}

/**
 * @return array{host:string,port:int,secure:string,user:string,pass:string,from_email:string,from_name:string}
 */
function chb_smtp_config(): array
{
    $host = chb_env_get('SMTP_HOST', 'smtp.gmail.com');
    $port = (int) chb_env_get('SMTP_PORT', '587');
    if ($port <= 0) {
        $port = 587;
    }
    $secure = strtolower(chb_env_get('SMTP_SECURE', 'tls'));
    if (!in_array($secure, ['tls', 'ssl', ''], true)) {
        $secure = 'tls';
    }
    $user = chb_env_get('SMTP_USER', '');
    $pass = chb_env_get('SMTP_PASS', '');
    $fromEmail = chb_env_get('SMTP_FROM_EMAIL', '');
    if ($fromEmail === '') {
        $fromEmail = $user;
    }
    $fromName = chb_env_get('SMTP_FROM_NAME', 'Royal Beauty Care');

    return [
        'host' => $host,
        'port' => $port,
        'secure' => $secure,
        'user' => $user,
        'pass' => $pass,
        'from_email' => $fromEmail,
        'from_name' => $fromName,
    ];
}

/**
 * Domain part of an email address, or empty if invalid.
 */
function chb_email_domain_from_address(string $email): string
{
    $email = trim($email);
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return '';
    }
    $pos = strrpos($email, '@');

    return $pos !== false ? strtolower(substr($email, $pos + 1)) : '';
}

/**
 * CONTACT_MAIL_FROM as a bare address (for Message-ID / mail() -f), or empty.
 */
function chb_mail_contact_from_email_only(): string
{
    $t = chb_env_get('CONTACT_MAIL_FROM', '');

    return ($t !== '' && filter_var($t, FILTER_VALIDATE_EMAIL)) ? $t : '';
}

/**
 * Resolve a path under api/ (relative) or pass through absolute paths.
 */
function chb_mail_resolve_api_path(string $path): string
{
    $path = trim($path);
    if ($path === '') {
        return '';
    }
    if ($path[0] === '/' || (strlen($path) > 2 && ctype_alpha($path[0]) && $path[1] === ':')) {
        return $path;
    }
    if (str_contains($path, '..')) {
        return '';
    }

    return dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
}

/**
 * EHLO hostname + Message-ID alignment, optional DKIM, no noisy X-Mailer.
 */
function chb_phpmailer_configure_deliverability(\PHPMailer\PHPMailer\PHPMailer $m, array $cfg): void
{
    $domain = chb_email_domain_from_address($cfg['from_email']);
    if ($domain !== '') {
        $m->Hostname = $domain;
    }

    // Omit default "PHPMailer … (github…)" — some filters treat it as bulk/script mail.
    $m->XMailer = null;

    $selector = trim(chb_env_get('SMTP_DKIM_SELECTOR', ''));
    $keyRel = trim(chb_env_get('SMTP_DKIM_PRIVATE_KEY_FILE', ''));
    if ($selector === '' || $keyRel === '') {
        return;
    }

    $keyPath = chb_mail_resolve_api_path($keyRel);
    if ($keyPath === '' || !is_readable($keyPath)) {
        if (chb_env_flag_true('CHB_DEV_MAIL_LOG')) {
            error_log('CHB_SMTP_DKIM_KEY_UNREADABLE path=' . $keyRel);
        }

        return;
    }

    $dkimDomain = trim(chb_env_get('SMTP_DKIM_DOMAIN', ''));
    if ($dkimDomain === '') {
        $dkimDomain = $domain;
    }
    if ($dkimDomain === '') {
        return;
    }

    $m->DKIM_domain = $dkimDomain;
    $m->DKIM_selector = $selector;
    $m->DKIM_private = $keyPath;
    $m->DKIM_identity = $cfg['from_email'];
}

/**
 * Optional Message-ID + mail() envelope for the non-SMTP path.
 *
 * @return array{0: list<string>, 1: string} headers list and extra mail() params (may be empty)
 */
function chb_mail_fallback_headers_and_params(): array
{
    $headers = [];
    $fromAddr = chb_mail_contact_from_email_only();
    if ($fromAddr !== '') {
        $domain = chb_email_domain_from_address($fromAddr);
        if ($domain !== '') {
            $headers[] = 'Message-ID: <' . bin2hex(random_bytes(8)) . '.' . time() . '@' . $domain . '>';
        }
    }

    $extra = '';
    if ($fromAddr !== '') {
        $extra = '-f' . $fromAddr;
    }

    return [$headers, $extra];
}

function chb_h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function chb_email_nl2br(string $escapedPlain): string
{
    return str_replace(["\r\n", "\r", "\n"], '<br>', $escapedPlain);
}

function chb_contact_recipient_email(): string
{
    $t = chb_env_get('CONTACT_MAIL_TO', '');
    if ($t !== '' && filter_var($t, FILTER_VALIDATE_EMAIL)) {
        return $t;
    }

    $salon = require __DIR__ . '/salon_data.php';
    $pub = trim((string) ($salon['contact_email'] ?? ''));

    return filter_var($pub, FILTER_VALIDATE_EMAIL) ? $pub : '';
}

function chb_contact_from_header(): string
{
    $t = chb_env_get('CONTACT_MAIL_FROM', '');
    if ($t !== '' && filter_var($t, FILTER_VALIDATE_EMAIL)) {
        return 'Royal Beauty Care <' . $t . '>';
    }

    // If CONTACT_MAIL_FROM isn't configured, do not force a synthetic local address.
    // Many mail transports reject messages when the `From:` domain doesn't match the
    // server's sending identity (SPF/DKIM/DMARC alignment).
    return '';
}

function chb_booking_format_time_pretty(string $dateYmd, string $timeHi): string
{
    $ts = strtotime($dateYmd . ' ' . $timeHi . ':00');

    return $ts ? date('g:i A', $ts) : $timeHi;
}

function chb_booking_format_date_pretty(string $dateYmd): string
{
    $ts = strtotime($dateYmd . ' 12:00:00');

    return $ts ? date('l, F j, Y', $ts) : $dateYmd;
}

/**
 * Collapse repeated category prefixes like "Cut — Cut — Kids" -> "Cut — Kids".
 */
function chb_normalize_service_summary(string $summary): string
{
    $s = trim($summary);
    if ($s === '' || strpos($s, ' — ') === false) {
        return $s;
    }
    [$cat, $svc] = explode(' — ', $s, 2);
    $cat = trim($cat);
    $svc = trim($svc);
    if ($cat === '' || $svc === '') {
        return $s;
    }
    $prefix = $cat . ' — ';
    if (stripos($svc, $prefix) === 0) {
        return $cat . ' — ' . trim(substr($svc, strlen($prefix)));
    }

    return $s;
}

/** @return array{location:string,address:string,phone:string} */
function chb_email_salon_venue_bits(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $salon = require __DIR__ . '/salon_data.php';
    $cache = [
        'location' => trim((string) ($salon['location_name'] ?? '')),
        'address' => trim((string) ($salon['address'] ?? '')),
        'phone' => trim((string) ($salon['phone'] ?? '')),
    ];

    return $cache;
}

function chb_mail_send_multipart(
    string $to,
    string $subject,
    string $plainBody,
    string $htmlBody,
    string $replyTo
): bool {
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $rt = $replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : $to;
    $from = chb_contact_from_header();
    $boundary = 'chb_' . bin2hex(random_bytes(8));

    $plainBody = str_replace(["\r\n", "\r"], "\n", $plainBody);
    $htmlBody = str_replace(["\r\n", "\r"], "\n", $htmlBody);

    if (chb_smtp_enabled() && class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
        try {
            $cfg = chb_smtp_config();
            $m = new \PHPMailer\PHPMailer\PHPMailer(true);
            $m->CharSet = 'UTF-8';
            $m->isSMTP();
            $m->Host = $cfg['host'];
            $m->Port = $cfg['port'];
            $m->SMTPAuth = true;
            $m->Username = $cfg['user'];
            $m->Password = $cfg['pass'];
            if ($cfg['secure'] !== '') {
                $m->SMTPSecure = $cfg['secure'];
            }
            $m->setFrom($cfg['from_email'], $cfg['from_name']);
            $m->addAddress($to);
            $m->addReplyTo($rt);
            $m->Subject = $subject;
            $m->Body = $htmlBody;
            $m->AltBody = $plainBody;
            $m->isHTML(true);
            chb_phpmailer_configure_deliverability($m, $cfg);

            return $m->send();
        } catch (\Throwable $e) {
            if (chb_env_flag_true('CHB_DEV_MAIL_LOG')) {
                error_log('CHB_SMTP_SEND_MULTIPART_FAILED to=' . $to . ' subject=' . $subject . ' err=' . $e->getMessage());
            }
            return false;
        }
    }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $body = '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $plainBody . "\r\n\r\n";
    $body .= '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $htmlBody . "\r\n\r\n";
    $body .= '--' . $boundary . "--\r\n";

    [$extraHeaders, $mailParams] = chb_mail_fallback_headers_and_params();
    $headers = array_merge(
        [
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
            'Reply-To: ' . $rt,
        ],
        $extraHeaders
    );
    if ($from !== '') {
        $headers[] = 'From: ' . $from;
    }

    $ok = @mail($to, $encodedSubject, $body, implode("\r\n", $headers), $mailParams);
    if (!$ok && chb_env_flag_true('CHB_DEV_MAIL_LOG')) {
        error_log('CHB_MAIL_SEND_MULTIPART_FAILED to=' . $to . ' subject=' . $subject);
    }

    return $ok;
}

function chb_mail_send_plain(string $to, string $subject, string $body, string $replyTo): bool
{
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $from = chb_contact_from_header();
    $rt = $replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : $to;

    if (chb_smtp_enabled() && class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
        try {
            $cfg = chb_smtp_config();
            $m = new \PHPMailer\PHPMailer\PHPMailer(true);
            $m->CharSet = 'UTF-8';
            $m->isSMTP();
            $m->Host = $cfg['host'];
            $m->Port = $cfg['port'];
            $m->SMTPAuth = true;
            $m->Username = $cfg['user'];
            $m->Password = $cfg['pass'];
            if ($cfg['secure'] !== '') {
                $m->SMTPSecure = $cfg['secure'];
            }
            $m->setFrom($cfg['from_email'], $cfg['from_name']);
            $m->addAddress($to);
            $m->addReplyTo($rt);
            $m->Subject = $subject;
            $m->Body = $body;
            $m->isHTML(false);
            chb_phpmailer_configure_deliverability($m, $cfg);

            return $m->send();
        } catch (\Throwable $e) {
            if (chb_env_flag_true('CHB_DEV_MAIL_LOG')) {
                error_log('CHB_SMTP_SEND_PLAIN_FAILED to=' . $to . ' subject=' . $subject . ' err=' . $e->getMessage());
            }
            return false;
        }
    }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    [$extraHeaders, $mailParams] = chb_mail_fallback_headers_and_params();
    $headers = array_merge(
        [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Reply-To: ' . $rt,
        ],
        $extraHeaders
    );
    if ($from !== '') {
        $headers[] = 'From: ' . $from;
    }

    $ok = @mail($to, $encodedSubject, $body, implode("\r\n", $headers), $mailParams);
    if (!$ok && chb_env_flag_true('CHB_DEV_MAIL_LOG')) {
        error_log('CHB_MAIL_SEND_PLAIN_FAILED to=' . $to . ' subject=' . $subject);
    }

    return $ok;
}

/** @param 'accent'|'success'|'warning'|'security'|'merchant' $tone */
function chb_email_badge(string $label, string $tone = 'accent'): string
{
    // Modern luxe palette: espresso + champagne + warm neutrals.
    $styles = [
        'accent' => 'background-color:#fff7ed;color:#9a3412;border:1px solid #fed7aa;',
        'success' => 'background-color:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;',
        'warning' => 'background-color:#fff1f2;color:#9f1239;border:1px solid #fecdd3;',
        'security' => 'background-color:#eef2ff;color:#312e81;border:1px solid #c7d2fe;',
        'merchant' => 'background-color:#0f0a06;color:#f8e7c8;border:1px solid #c5a059;',
    ];
    $css = $styles[$tone] ?? $styles['accent'];

    return '<span style="display:inline-block;padding:8px 14px;border-radius:999px;font-size:10px;'
        . 'font-weight:800;letter-spacing:0.18em;text-transform:uppercase;'
        . 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;'
        . $css . '">' . chb_h($label) . '</span>';
}

function chb_email_section_rule(string $label): string
{
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">'
        . '<tr><td style="padding:0 0 12px 0;border-bottom:1px solid #efe7dd;">'
        . '<p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;'
        . 'color:#a08f7b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">' . chb_h($label) . '</p>'
        . '</td></tr></table>';
}

/**
 * Large featured date/time — merchant: dark luxe; client: warm editorial.
 *
 * @param 'merchant'|'client' $audience
 */
function chb_email_featured_datetime_html(string $datePretty, string $timePretty, string $audience): string
{
    if ($audience === 'merchant') {
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;border-collapse:separate;">'
            . '<tr><td style="padding:0 0 0 4px;background:linear-gradient(180deg,#e6c27a 0%,#b8872a 100%);border-radius:16px 0 0 16px;width:4px;font-size:0;line-height:0;">&nbsp;</td>'
            . '<td style="padding:26px 28px;background-color:#0f0a06;border-radius:0 16px 16px 0;">'
            . '<p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;'
            . 'color:#c1b7ab;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">Appointment time</p>'
            . '<p style="margin:10px 0 6px 0;font-size:22px;line-height:1.25;color:#fffaf2;font-family:Georgia,\'Times New Roman\',serif;">'
            . chb_h($datePretty) . '</p>'
            . '<p style="margin:0;font-size:20px;color:#f1d7a3;font-family:Georgia,\'Times New Roman\',serif;font-weight:400;">'
            . chb_h($timePretty) . '</p>'
            . '</td></tr></table>';
    }

    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">'
        . '<tr><td style="padding:28px 30px;background-color:#fffaf4;border:1px solid #f1e6d6;border-radius:18px;">'
        . '<p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;'
        . 'color:#a08f7b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">Your reservation</p>'
        . '<p style="margin:12px 0 6px 0;font-size:26px;line-height:1.15;color:#221913;font-family:Georgia,\'Times New Roman\',serif;">'
        . chb_h($datePretty) . '</p>'
        . '<p style="margin:0;font-size:22px;color:#8a6a2b;font-family:Georgia,\'Times New Roman\',serif;">'
        . chb_h($timePretty) . '</p>'
        . '</td></tr></table>';
}

function chb_email_cta_button(string $href, string $label, string $style = 'dark'): string
{
    $h = chb_h($href);
    $l = chb_h($label);
    if ($style === 'gold') {
        return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;">'
            . '<tr><td style="border-radius:14px;background:linear-gradient(180deg,#f1d7a3 0%,#c59b3a 100%);padding:2px;">'
            . '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>'
            . '<td style="border-radius:12px;background-color:#0f0a06;text-align:center;">'
            . '<a href="' . $h . '" target="_blank" style="display:inline-block;padding:16px 36px;'
            . 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;'
            . 'font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#fff7e6;text-decoration:none;">'
            . $l . '</a></td></tr></table></td></tr></table>';
    }

    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;">'
        . '<tr><td style="border-radius:14px;background-color:#0f0a06;">'
        . '<a href="' . $h . '" target="_blank" style="display:inline-block;padding:17px 36px;'
        . 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;'
        . 'font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#fffaf2;text-decoration:none;border-radius:14px;">'
        . $l . '</a></td></tr></table>';
}

/**
 * @param 'merchant'|'client' $audience
 */
function chb_email_detail_rows_html(array $pairs, string $audience = 'client'): string
{
    $bg = $audience === 'merchant' ? '#fbfbfc' : '#fffdf9';
    $border = $audience === 'merchant' ? '#ebe7e1' : '#f1e6d6';
    $labelColor = $audience === 'merchant' ? '#6b5f55' : '#8a7b6a';
    $valueColor = $audience === 'merchant' ? '#1f1a16' : '#221913';

    $rows = '';
    foreach ($pairs as $label => $value) {
        $rows .= '<tr>'
            . '<td style="padding:16px 18px;border-bottom:1px solid ' . $border . ';vertical-align:top;width:32%;">'
            . '<p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;'
            . 'color:' . $labelColor . ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">' . chb_h($label) . '</p>'
            . '</td>'
            . '<td style="padding:16px 18px;border-bottom:1px solid ' . $border . ';vertical-align:top;">'
            . '<p style="margin:0;font-size:16px;line-height:1.55;color:' . $valueColor . ';font-family:Georgia,\'Times New Roman\',serif;">'
            . chb_h($value) . '</p>'
            . '</td></tr>';
    }

    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        . 'style="border-collapse:collapse;background-color:' . $bg . ';border:1px solid ' . $border . ';border-radius:18px;overflow:hidden;">'
        . $rows . '</table>';
}

function chb_email_quote_block(string $escapedHtmlBody): string
{
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">'
        . '<tr><td style="padding:18px 18px;background-color:#ffffff;border-left:4px solid #c59b3a;'
        . 'border-radius:0 14px 14px 0;border:1px solid #efe7dd;border-left-width:4px;">'
        . '<p style="margin:0;font-size:15px;line-height:1.7;color:#221913;font-family:Georgia,\'Times New Roman\',serif;">'
        . $escapedHtmlBody . '</p></td></tr></table>';
}

/** Salon strip for client emails (address + phone). */
function chb_email_salon_visit_strip_html(): string
{
    $v = chb_email_salon_venue_bits();
    if ($v['address'] === '' && $v['phone'] === '') {
        return '';
    }
    $locLine = $v['location'] !== '' ? chb_h($v['location']) . ' · ' : '';
    $addr = chb_h($v['address']);
    $phone = chb_h($v['phone']);

    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">'
        . '<tr><td style="padding:18px 18px;background-color:#ffffff;border-radius:16px;border:1px solid #efe7dd;">'
        . '<p style="margin:0 0 6px 0;font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;'
        . 'color:#8a7b6a;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">Salon</p>'
        . '<p style="margin:0;font-size:15px;line-height:1.55;color:#221913;font-family:Georgia,\'Times New Roman\',serif;">'
        . $locLine . $addr . '</p>'
        . ($phone !== '' ? '<p style="margin:10px 0 0 0;font-size:14px;color:#8a6a2b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">'
            . $phone . '</p>' : '')
        . '</td></tr></table>';
}

/**
 * @param 'merchant'|'client' $audience
 */
function chb_email_brand_wrap(string $preheader, string $innerHtml, string $audience = 'client', ?string $title = null): string
{
    $pre = chb_h($preheader);
    $year = (string) (int) date('Y');
    $venue = chb_email_salon_venue_bits();
    $sub = $venue['location'] !== ''
        ? chb_h($venue['location'])
        : ($venue['address'] !== '' ? chb_h($venue['address']) : 'Professional hair care & color');

    // White background, dark content, consistent for all emails.
    $footer = '<p style="margin:0 0 10px 0;font-size:12px;line-height:1.7;color:#6b5f55;'
        . 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">'
        . 'This is an automated message. If something looks wrong, reply to this email.</p>'
        . '<p style="margin:0;font-size:11px;color:#a99d91;'
        . 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">'
        . '&copy; ' . chb_h($year) . ' Royal Beauty Care</p>';

    $heading = trim((string) $title);
    if ($heading === '') {
        $heading = $audience === 'merchant' ? 'Booking notification' : 'Appointment update';
    }

    $header = '<tr><td style="padding:0;background-color:#ffffff;border-radius:18px 18px 0 0;border:1px solid #efe7dd;border-bottom:none;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
        . '<td style="height:6px;background:linear-gradient(90deg,#f1d7a3 0%,#c59b3a 50%,#f1d7a3 100%);font-size:0;line-height:0;border-radius:18px 18px 0 0;">&nbsp;</td></tr>'
        . '<tr><td style="padding:28px 30px 22px 30px;">'
        . '<p style="margin:0 0 6px 0;font-size:11px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;'
        . 'color:#8a6a2b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">Royal Beauty Care</p>'
        . '<p style="margin:0;font-size:24px;line-height:1.15;color:#221913;font-family:Georgia,\'Times New Roman\',serif;font-weight:400;">'
        . chb_h($heading) . '</p>'
        . '<p style="margin:12px 0 0 0;font-size:13px;line-height:1.6;color:#6b5f55;'
        . 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">'
        . $sub . '</p>'
        . '</td></tr></table></td></tr>';

    $cardBg = '#ffffff';
    $cardBorder = '#efe7dd';
    $outerBg = '#ffffff';

    return '<!DOCTYPE html><html lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>'
        . '<body style="margin:0;padding:0;background-color:' . $outerBg . ';">'
        . '<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;">'
        . $pre . '</span>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:' . $outerBg . ';padding:28px 12px;">'
        . '<tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;border-collapse:separate;">'
        . $header
        . '<tr><td style="padding:0;background-color:' . $cardBg . ';border:1px solid ' . $cardBorder . ';border-top:none;'
        . 'border-radius:0 0 18px 18px;box-shadow:0 10px 24px rgba(34,25,19,0.08);">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        . '<tr><td style="padding:28px 30px 30px 30px;">' . $innerHtml . '</td></tr>'
        . '<tr><td style="padding:18px 30px 22px 30px;background-color:#ffffff;'
        . 'border-top:1px solid ' . $cardBorder . ';border-radius:0 0 18px 18px;">'
        . $footer
        . '</td></tr></table></td></tr></table></td></tr></table></body></html>';
}

function chb_send_contact_message(
    string $visitorName,
    string $visitorEmail,
    string $visitorPhone,
    string $visitorMessage
): bool {
    $to = chb_contact_recipient_email();
    if ($to === '') {
        return false;
    }

    $subject = 'Website contact: ' . mb_substr(preg_replace('/\s+/', ' ', $visitorName), 0, 80);
    $plain = "New message from the website contact form.\r\n\r\n";
    $plain .= 'Name: ' . $visitorName . "\r\n";
    $plain .= 'Email: ' . $visitorEmail . "\r\n";
    $plain .= 'Phone: ' . $visitorPhone . "\r\n\r\n";
    $plain .= "Message:\r\n" . $visitorMessage . "\r\n";

    $inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">'
        . '<tr><td>' . chb_email_badge('Contact', 'accent') . '</td></tr></table>'
        . '<p style="margin:0 0 16px 0;font-size:18px;line-height:1.55;color:#221913;font-family:Georgia,\'Times New Roman\',serif;">'
        . 'New contact message</p>'
        . chb_email_detail_rows_html([
            'Name' => $visitorName,
            'Email' => $visitorEmail,
            'Phone' => $visitorPhone !== '' ? $visitorPhone : '—',
        ], 'merchant')
        . '<div style="height:14px;line-height:14px;font-size:14px;">&nbsp;</div>'
        . chb_email_section_rule('Message')
        . chb_email_detail_rows_html([
            'Message' => $visitorMessage,
        ], 'merchant');

    $html = chb_email_brand_wrap('New contact form submission.', $inner, 'merchant');

    return chb_mail_send_multipart($to, $subject, $plain, $html, $visitorEmail);
}

function chb_send_booking_request_email(
    string $clientName,
    string $clientEmail,
    string $clientPhone,
    string $dateYmd,
    string $timeHi,
    string $servicesSummary
): bool {
    $to = chb_contact_recipient_email();
    if ($to === '') {
        return false;
    }

    $datePretty = chb_booking_format_date_pretty($dateYmd);
    $timePretty = chb_booking_format_time_pretty($dateYmd, $timeHi);
    $phone = $clientPhone !== '' ? $clientPhone : '—';

    $subject = 'New booking — ' . $datePretty;
    $plain = "A new appointment was booked online and is confirmed in the schedule.\r\n\r\n";
    $plain .= "Client: {$clientName}\r\nEmail: {$clientEmail}\r\nPhone: {$phone}\r\n\r\n";
    $plain .= "When: {$datePretty} at {$timePretty}\r\nServices: {$servicesSummary}\r\n";

    $inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">'
        . '<tr><td>' . chb_email_badge('New booking', 'accent') . '</td></tr></table>'
        . chb_email_featured_datetime_html($datePretty, $timePretty, 'client')
        . chb_email_detail_rows_html([
            'Client' => $clientName,
            'Email' => $clientEmail,
            'Phone' => $phone,
            'Services' => $servicesSummary,
        ], 'merchant');

    $html = chb_email_brand_wrap('New confirmed booking — calendar.', $inner, 'merchant', 'New booking confirmed');

    return chb_mail_send_multipart($to, $subject, $plain, $html, $clientEmail);
}

/**
 * Merchant alert when a logged-in client cancels their own booking from the dashboard.
 */
function chb_send_merchant_client_cancelled_booking_email(
    int $bookingId,
    string $clientName,
    string $clientEmail,
    string $clientPhone,
    string $dateYmd,
    string $timeHi,
    string $servicesSummary
): bool {
    $to = chb_contact_recipient_email();
    if ($to === '') {
        return false;
    }

    $clientName = trim($clientName);
    $clientEmail = trim($clientEmail);
    $phone = trim($clientPhone) !== '' ? trim($clientPhone) : '—';
    $servicesSummary = trim($servicesSummary);

    $datePretty = chb_booking_format_date_pretty($dateYmd);
    $timePretty = chb_booking_format_time_pretty($dateYmd, $timeHi);

    $subject = 'Client cancelled — ' . $datePretty;
    $plain = "A client cancelled their appointment online.\r\n\r\n";
    $plain .= 'Booking #' . $bookingId . "\r\n";
    $plain .= "Client: {$clientName}\r\nEmail: {$clientEmail}\r\nPhone: {$phone}\r\n\r\n";
    $plain .= "Was scheduled for: {$datePretty} at {$timePretty}\r\n";
    $plain .= "Services: {$servicesSummary}\r\n";

    $inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">'
        . '<tr><td>' . chb_email_badge('Client cancelled', 'warning') . '</td></tr></table>'
        . '<p style="margin:0 0 16px 0;font-size:18px;line-height:1.55;color:#221913;font-family:Georgia,\'Times New Roman\',serif;">'
        . 'A client cancelled online</p>'
        . chb_email_featured_datetime_html($datePretty, $timePretty, 'merchant')
        . chb_email_detail_rows_html([
            'Booking #' => (string) $bookingId,
            'Client' => $clientName !== '' ? $clientName : '—',
            'Email' => $clientEmail !== '' ? $clientEmail : '—',
            'Phone' => $phone,
            'Services' => $servicesSummary !== '' ? $servicesSummary : '—',
        ], 'merchant');

    $html = chb_email_brand_wrap('Client cancelled an appointment.', $inner, 'merchant', 'Booking cancelled by client');

    $replyTo = filter_var($clientEmail, FILTER_VALIDATE_EMAIL) ? $clientEmail : $to;

    return chb_mail_send_multipart($to, $subject, $plain, $html, $replyTo);
}

function chb_send_booking_confirmation_to_client_email(
    string $clientEmail,
    string $clientName,
    string $dateYmd,
    string $timeHi,
    string $servicesSummary
): bool {
    if (!filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $salonReply = chb_contact_recipient_email();
    $replyTo = $salonReply !== '' ? $salonReply : $clientEmail;
    $datePretty = chb_booking_format_date_pretty($dateYmd);
    $timePretty = chb_booking_format_time_pretty($dateYmd, $timeHi);

    $serviceLine = chb_normalize_service_summary($servicesSummary);
    $subject = 'You are booked — Royal Beauty Care';
    $plain = "Hi {$clientName},\r\n\r\n";
    $plain .= "Thank you for booking with Royal Beauty Care. Your appointment is confirmed.\r\n\r\n";
    $plain .= "Date: {$datePretty}\r\nTime: {$timePretty}\r\nServices: {$serviceLine}\r\n\r\n";
    $plain .= "If you need to make a change, please contact the salon as soon as possible.\r\n";

    $inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">'
        . '<tr><td>' . chb_email_badge('Confirmed', 'success') . '</td></tr></table>'
        . '<p style="margin:0 0 14px 0;font-size:18px;line-height:1.55;color:#221913;font-family:Georgia,\'Times New Roman\',serif;">'
        . 'Hi ' . chb_h($clientName) . ', your appointment is confirmed.</p>'
        . chb_email_featured_datetime_html($datePretty, $timePretty, 'client')
        . chb_email_detail_rows_html([
            'Service' => $serviceLine,
        ], 'client')
        . chb_email_salon_visit_strip_html();

    $html = chb_email_brand_wrap(
        'Your appointment is confirmed. We look forward to seeing you.',
        $inner,
        'client',
        'Appointment confirmed'
    );

    return chb_mail_send_multipart($clientEmail, $subject, $plain, $html, $replyTo);
}

function chb_send_booking_status_email_to_client(
    string $clientEmail,
    string $clientName,
    string $status,
    string $dateYmd,
    string $timeHi,
    string $servicesSummary,
    ?string $deposit_reversal_kind = null,
    ?int $deposit_reversal_amount_cents = null,
    string $client_phone = ''
): bool {
    if (!filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    if ($status !== 'cancelled') {
        return false;
    }

    $datePretty = chb_booking_format_date_pretty($dateYmd);
    $timePretty = chb_booking_format_time_pretty($dateYmd, $timeHi);

    $salonReply = chb_contact_recipient_email();
    $replyTo = $salonReply !== '' ? $salonReply : $clientEmail;

    $amtUsd = '';
    if ($deposit_reversal_amount_cents !== null && $deposit_reversal_amount_cents > 0) {
        $amtUsd = '$' . number_format($deposit_reversal_amount_cents / 100, 2, '.', '');
    }

    $depositPlain = '';
    $depositHtml = '';
    if ($deposit_reversal_kind === 'void' && $amtUsd !== '') {
        $depositPlain = "Your online deposit of {$amtUsd} was voided at the payment processor — you should not be charged. If you still see a pending authorization, your bank usually releases it within a few business days.\r\n\r\n";
        $depositHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">'
            . '<tr><td style="padding:22px 24px;background-color:#eff6ff;border:1px solid #93c5fd;border-radius:14px;">'
            . '<p style="margin:0 0 6px 0;font-size:12px;line-height:1.4;color:#1d4ed8;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;text-transform:uppercase;letter-spacing:0.08em;"><strong>Deposit</strong></p>'
            . '<p style="margin:0;font-size:14px;line-height:1.65;color:#1e3a8a;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">'
            . 'Your online deposit of <strong>' . chb_h($amtUsd) . '</strong> was <strong>voided</strong>. You should not be charged. If a pending hold still appears, your bank typically releases it within a few business days.</p>'
            . '</td></tr></table>';
    } elseif ($deposit_reversal_kind === 'refund' && $amtUsd !== '') {
        $depositPlain = "Your online deposit of {$amtUsd} has been refunded to your card. Depending on your bank, it may take several business days to show on your statement.\r\n\r\n";
        $depositHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">'
            . '<tr><td style="padding:22px 24px;background-color:#ecfdf5;border:1px solid #6ee7b7;border-radius:14px;">'
            . '<p style="margin:0 0 6px 0;font-size:12px;line-height:1.4;color:#047857;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;text-transform:uppercase;letter-spacing:0.08em;"><strong>Deposit</strong></p>'
            . '<p style="margin:0;font-size:14px;line-height:1.65;color:#065f46;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">'
            . 'Your online deposit of <strong>' . chb_h($amtUsd) . '</strong> has been <strong>refunded</strong> to your card. It may take a few business days to appear on your statement, depending on your bank.</p>'
            . '</td></tr></table>';
    } elseif ($deposit_reversal_kind === 'skipped') {
        $depositPlain = "If you paid a deposit through our website and have a question about your card, please reply to this email and we will help.\r\n\r\n";
        $depositHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">'
            . '<tr><td style="padding:22px 24px;background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:14px;">'
            . '<p style="margin:0;font-size:14px;line-height:1.65;color:#475569;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">'
            . 'If you paid a deposit through our website and have a question about your card, reply to this email — we are happy to help.</p>'
            . '</td></tr></table>';
    }

    $serviceLine = chb_normalize_service_summary($servicesSummary);
    $subject = 'Appointment cancelled — Royal Beauty Care';
    $plain = "Hi {$clientName},\r\n\r\n";
    $plain .= "Your appointment has been cancelled by the salon.\r\n\r\n";
    $plain .= "Was scheduled for: {$datePretty} at {$timePretty}\r\nServices: {$serviceLine}\r\n\r\n";
    if ($depositPlain !== '') {
        $plain .= $depositPlain;
    }
    $plain .= "If you did not expect this or would like to reschedule, please contact us.\r\n";

    $inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">'
        . '<tr><td>' . chb_email_badge('Update', 'warning') . '</td></tr></table>'
        . '<p style="margin:0 0 8px 0;font-size:28px;line-height:1.2;color:#1c1917;font-family:Georgia,\'Times New Roman\',serif;">'
        . 'Hello ' . chb_h($clientName) . '</p>'
        . '<p style="margin:0 0 28px 0;font-size:16px;line-height:1.65;color:#44403c;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">'
        . 'We need to let you know that we have <strong style="color:#be123c;">cancelled</strong> your upcoming appointment. We apologize for any inconvenience this may cause.</p>'
        . chb_email_featured_datetime_html($datePretty, $timePretty, 'client')
        . chb_email_section_rule('Previous reservation')
        . chb_email_detail_rows_html([
            'Service' => $serviceLine,
        ], 'client')
        . $depositHtml
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">'
        . '<tr><td style="padding:22px 24px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:14px;">'
        . '<p style="margin:0;font-size:14px;line-height:1.65;color:#92400e;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">'
        . '<strong>We would love to see you another time.</strong> Reply to this email and we will help you find a new date that works.</p>'
        . '</td></tr></table>'
        . chb_email_salon_visit_strip_html();

    $html = chb_email_brand_wrap('Update regarding your appointment.', $inner, 'client', 'Appointment cancelled');

    return chb_mail_send_multipart($clientEmail, $subject, $plain, $html, $replyTo);
}

function chb_send_password_reset_email(string $clientEmail, string $clientName, string $resetUrl): bool
{
    if (!filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $salonReply = chb_contact_recipient_email();
    $replyTo = $salonReply !== '' ? $salonReply : $clientEmail;
    $subject = 'Reset your password — Royal Beauty Care';
    $plain = "Hi {$clientName},\r\n\r\n";
    $plain .= "We received a request to reset your password. Open this link (valid for one hour):\r\n\r\n";
    $plain .= $resetUrl . "\r\n\r\n";
    $plain .= "If you did not ask for this, you can ignore this email.\r\n";

    $safeUrl = chb_h($resetUrl);
    $inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">'
        . '<tr><td>' . chb_email_badge('Security', 'security') . '</td></tr></table>'
        . '<p style="margin:0 0 8px 0;font-size:28px;line-height:1.2;color:#1c1917;font-family:Georgia,\'Times New Roman\',serif;">'
        . 'Password reset</p>'
        . '<p style="margin:0 0 30px 0;font-size:16px;line-height:1.65;color:#44403c;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">'
        . 'Hi ' . chb_h($clientName) . ', we received a request to reset your account password. '
        . 'Tap the button below — the link stays valid for <strong>one hour</strong>.</p>'
        . chb_email_cta_button($resetUrl, 'Reset my password', 'gold')
        . '<p style="margin:0 0 24px 0;font-size:12px;line-height:1.55;color:#78716c;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;word-break:break-all;">'
        . 'If the button does not work, paste this into your browser:<br><span style="color:#57534e;">' . $safeUrl . '</span></p>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        . '<tr><td style="padding:20px 22px;background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:14px;">'
        . '<p style="margin:0;font-size:13px;line-height:1.65;color:#475569;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">'
        . '<strong style="color:#1e293b;">You did not ask for this?</strong> No action needed — your password will remain unchanged.</p></td></tr></table>';

    $html = chb_email_brand_wrap('Reset your password securely.', $inner, 'client', 'Password reset');

    return chb_mail_send_multipart($clientEmail, $subject, $plain, $html, $replyTo);
}
