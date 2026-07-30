<?php
// ---- CORS + preflight ----
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/helpers.php';

// ---- Resolve route ----
// Expect PATH_INFO like /auth/login  (see .htaccess)
$path = $_GET['_route'] ?? ($_SERVER['PATH_INFO'] ?? '');
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Split into segments: /orders/12/pay -> ['orders','12','pay']
$seg = $path === '/' ? [] : explode('/', ltrim($path, '/'));
$resource = $seg[0] ?? '';

// Make segments available to route files
$GLOBALS['SEG'] = $seg;
$GLOBALS['METHOD'] = $method;

$routes = [
  'auth'      => 'auth.php',
  'menu'      => 'menu.php',
  'tables'    => 'tables.php',
  'orders'    => 'orders.php',
  'payments'  => 'payments.php',
  'inventory' => 'inventory.php',
  'customers' => 'misc.php',
  'dashboard' => 'misc.php',
  'reports'   => 'misc.php',
  'settings'  => 'misc.php',
  'backup'    => 'misc.php',
  'health'    => null,
];

if ($resource === 'health') json_out(['ok' => true, 'ts' => time()]);

if (!array_key_exists($resource, $routes)) json_out(['error' => 'Not found'], 404);

require __DIR__ . '/routes/' . $routes[$resource];

// If a route file didn't handle + exit, it's an unknown sub-route
json_out(['error' => 'Route not handled'], 404);
