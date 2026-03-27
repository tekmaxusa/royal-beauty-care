<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/_init.php';

chb_api_require_method('POST');
chb_api_json_error(
    'Merchant self-service sign-up is disabled. Configure ADMIN_NAME, ADMIN_EMAIL, and ADMIN_INITIAL_PASSWORD in .env to create the first admin when the database has no admin users yet.',
    403,
);
