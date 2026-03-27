<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';

chb_api_require_method('GET');

$u = chb_api_auth_user();
if ($u === null || $u['id'] <= 0) {
    chb_api_json(['ok' => true, 'user' => null]);
}

chb_api_json([
    'ok' => true,
    'user' => [
        'id' => $u['id'],
        'name' => $u['name'],
        'email' => $u['email'],
        'role' => $u['role'],
    ],
]);
