<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use PhpMqtt\Client\ConnectionSettings;
use PhpMqtt\Client\MqttClient;

header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

function respond(int $status, string $message): void
    {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
    }

$code = $_GET['code'] ?? null;
$state = $_GET['state'] ?? null;

if (!is_string($code) || !is_string($state) ||
    $code === '' || $state === '' ||
    preg_match('/[\x00-\x1F\x7F]/', $code . $state)) {
    respond(400, 'Missing or invalid authorization response.');
}

$host = '127.0.0.1';
$port = 1884;
$user = 'linc';
$password = 'linc';

if (!$user || !$password || $port < 1 || $port > 65535) {
    respond(500, 'MQTT callback is not configured.');
}

// mqtt_c strips the timestamp and client name from the first two fields.
$payload = implode("\x01", [
    (string) round(microtime(true) * 1000),
    'apache_callback',
    $code,
    $state,
    '',
]);

try {
    $settings = (new ConnectionSettings())
        ->setUsername($user)
        ->setPassword($password);

    $mqtt = new MqttClient(
        $host,
        $port,
        'viessmann-callback-' . bin2hex(random_bytes(4))
    );

    $mqtt->connect($settings, true);
    $mqtt->publish('linc/viessmanncode', $payload, 1);
    $mqtt->loop(true, true);
    $mqtt->disconnect();

    respond(200, 'Authorization response received. You can close this page.');
} catch (Throwable $error) {
    // Do not log the authorization code or state.
    error_log('Viessmann callback could not publish to MQTT.');
    respond(502, 'Could not forward the authorization response.');
}