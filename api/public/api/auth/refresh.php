<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/config/database.php';
require_once dirname(__DIR__, 3) . '/config/token_auth.php';

chb_api_require_method('POST');

$u = chb_refresh_token_rotate(db());
if ($u === null || $u['id'] <= 0) {
    chb_api_json_error('Unauthorized', 401);
}

chb_api_json([
    'ok' => true,
    'accessToken' => chb_issue_access_token_for_user($u),
    'user' => $u,
]);
