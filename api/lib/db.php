<?php
// Database connection (PDO / MySQL)
function config() {
  static $cfg = null;
  if ($cfg === null) {
    $path = __DIR__ . '/../config.php';
    $cfg = file_exists($path) ? require $path : require __DIR__ . '/../config.example.php';
  }
  return $cfg;
}

function db() {
  static $pdo = null;
  if ($pdo === null) {
    $c = config();
    $dsn = "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4";
    try {
      $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
      ]);
    } catch (PDOException $e) {
      json_out(['error' => 'Database connection failed'], 500);
    }
  }
  return $pdo;
}

// Query helpers
function q($sql, $params = []) {
  $st = db()->prepare($sql);
  $st->execute($params);
  return $st;
}
function all($sql, $params = []) { return q($sql, $params)->fetchAll(); }
function one($sql, $params = []) { $r = q($sql, $params)->fetch(); return $r === false ? null : $r; }
function insert($sql, $params = []) { q($sql, $params); return (int) db()->lastInsertId(); }
