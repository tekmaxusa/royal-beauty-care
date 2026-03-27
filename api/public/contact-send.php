<?php

declare(strict_types=1);

http_response_code(410);
header('Content-Type: text/plain; charset=UTF-8');
echo "This endpoint was removed. Use POST /api/contact/submit.php instead.\n";
