<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';

chb_api_require_method('GET');
chb_api_require_admin_json();

$usingBearer = function_exists('chb_auth_user_from_bearer')
    ? (chb_auth_user_from_bearer() !== null)
    : chb_api_has_bearer_token();

if (!$usingBearer && (empty($_SESSION['chb_csrf_admin']) || !is_string($_SESSION['chb_csrf_admin']))) {
    $_SESSION['chb_csrf_admin'] = bin2hex(random_bytes(16));
}

chb_api_json(['ok' => true, 'csrf' => $usingBearer ? '' : (string) ($_SESSION['chb_csrf_admin'] ?? '')]);
