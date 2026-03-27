<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';

chb_api_require_method('GET');

if (empty($_SESSION['chb_csrf_contact']) || !is_string($_SESSION['chb_csrf_contact'])) {
    $_SESSION['chb_csrf_contact'] = bin2hex(random_bytes(16));
}

chb_api_json(['ok' => true, 'csrf' => (string) $_SESSION['chb_csrf_contact']]);
