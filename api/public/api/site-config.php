<?php

declare(strict_types=1);

require_once __DIR__ . '/_init.php';

chb_api_require_method('GET');

$data = require dirname(__DIR__, 2) . '/config/salon_data.php';
if (!is_array($data)) {
    chb_api_json_error('Config unavailable', 500);
}

chb_api_json(['ok' => true, 'salon' => $data]);
