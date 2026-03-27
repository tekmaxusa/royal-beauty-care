<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';
require_once dirname(__DIR__, 3) . '/auth/login.php';
require_once dirname(__DIR__, 3) . '/config/database.php';
require_once dirname(__DIR__, 3) . '/config/token_auth.php';

chb_api_require_method('POST');

chb_refresh_token_revoke_current(db());
logout_user();
chb_api_json(['ok' => true]);
