<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/auth/login.php';
require_once __DIR__ . '/_spa_redirect.php';

logout_user();
chb_redirect_spa('/login');
