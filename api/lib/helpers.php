<?php
// ---- Response / request helpers ----
function json_out($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

function body() {
  static $b = null;
  if ($b === null) {
    $raw = file_get_contents('php://input');
    $b = json_decode($raw, true) ?: [];
  }
  return $b;
}

function inp($key, $default = null) {
  $b = body();
  return array_key_exists($key, $b) ? $b[$key] : $default;
}

function query_param($key, $default = null) {
  return isset($_GET[$key]) ? $_GET[$key] : $default;
}

// ---- Minimal JWT (HS256) ----
function b64url($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function b64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

function jwt_encode($payload) {
  $c = config();
  $header = b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
  $payload['exp'] = time() + ($c['jwt_ttl'] ?? 43200);
  $body = b64url(json_encode($payload));
  $sig = b64url(hash_hmac('sha256', "$header.$body", $c['jwt_secret'], true));
  return "$header.$body.$sig";
}

function jwt_decode($token) {
  $c = config();
  $parts = explode('.', $token);
  if (count($parts) !== 3) return null;
  [$h, $p, $s] = $parts;
  $expected = b64url(hash_hmac('sha256', "$h.$p", $c['jwt_secret'], true));
  if (!hash_equals($expected, $s)) return null;
  $payload = json_decode(b64url_decode($p), true);
  if (!$payload || ($payload['exp'] ?? 0) < time()) return null;
  return $payload;
}

// ---- Auth guards ----
function current_user() {
  static $u = null;
  if ($u !== null) return $u;
  $hdr = '';
  if (isset($_SERVER['HTTP_AUTHORIZATION'])) $hdr = $_SERVER['HTTP_AUTHORIZATION'];
  elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $hdr = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
  elseif (function_exists('apache_request_headers')) {
    $h = apache_request_headers();
    $hdr = $h['Authorization'] ?? $h['authorization'] ?? '';
  }
  if (stripos($hdr, 'Bearer ') === 0) {
    $u = jwt_decode(substr($hdr, 7));
  }
  return $u;
}

function require_auth() {
  $u = current_user();
  if (!$u) json_out(['error' => 'Unauthorized'], 401);
  return $u;
}

function require_role($roles) {
  $u = require_auth();
  if (!in_array($u['role'], $roles)) json_out(['error' => 'Forbidden'], 403);
  return $u;
}

function audit($action, $detail = '') {
  $u = current_user();
  insert("INSERT INTO audit_logs (user_id, action, detail) VALUES (?,?,?)",
    [$u['id'] ?? null, $action, $detail]);
}
