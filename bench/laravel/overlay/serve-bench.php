<?php
// Handles one GET request per iteration inside one process, the way a long-running
// server would, and prints the last body. argv: path, iterations.
define('LARAVEL_START', microtime(true));
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$path = $argv[1] ?? '/bench?n=1000';
$iterations = (int) ($argv[2] ?? 1);
$body = '';
for ($k = 0; $k < $iterations; $k++) {
    $request = Illuminate\Http\Request::create($path, 'GET');
    $response = $kernel->handle($request);
    $body = $response->getContent();
    $kernel->terminate($request, $response);
}
echo $body, "\n";
