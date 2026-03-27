<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/auth/google_oauth.php';

header('Content-Type: text/plain; charset=UTF-8');

echo "Royal Beauty Care — server is up and running.\n\n";

echo "Google OAuth (Continue with Google):\n";
echo '  Configured: ' . (google_oauth_configured() ? 'yes' : 'no') . "\n";

foreach (google_oauth_env_file_candidates() as $p) {
    $ok = is_readable($p) ? 'readable' : 'missing';
    echo '  .env candidate: ' . $ok . ' — ' . $p . "\n";
}

if (!google_oauth_configured()) {
    echo "\nFix: copy .env.example to api/.env and set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.\n";
    echo "Or set those variables in Docker / hosting panel. Restart the container after editing.\n";
}

echo "\nMySQL (PDO):\n";
try {
    require_once dirname(__DIR__) . '/config/database.php';
    db()->query('SELECT 1');
    echo "  OK — connected.\n";
} catch (Throwable $e) {
    echo '  FAILED — ' . $e->getMessage() . "\n";
    $dbHost = getenv('DB_HOST');
    $dbHostStr = is_string($dbHost) ? $dbHost : '';
    if ($dbHostStr === '' || $dbHostStr === 'db') {
        echo "  cPanel / shared hosting: set DB_HOST=localhost (or your host’s MySQL hostname), DB_NAME, DB_USER, DB_PASS; use DB_PORT=3306 or omit DB_PORT (not 3307 unless your host says so).\n";
    }
    echo "  Docker: ensure `db` is up (`docker compose up db -d`). From the host use DB_HOST=127.0.0.1 and DB_PORT=3307.\n";
}

$script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/status.php'));
$dir = dirname($script);
if ($dir === '/' || $dir === '.') {
    $pathPrefix = '';
} else {
    $pathPrefix = rtrim($dir, '/');
}
$base = google_oauth_request_scheme() . '://' . google_oauth_request_host() . $pathPrefix;

echo "\nRoutes (public/ — paths follow this script; use these in Google OAuth redirect URIs):\n";
echo "  API base:        {$base}/api/\n";
echo "  OAuth start:     {$base}/google-oauth-start.php\n";
echo "  OAuth callback:  {$base}/google-oauth-callback.php\n";
echo "  Logout route:    {$base}/logout.php\n";
