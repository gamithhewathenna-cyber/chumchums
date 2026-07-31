<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

// POST /auth/login
if ($sub === 'login' && $method === 'POST') {
  $username = trim(inp('username', ''));
  $password = inp('password', '');
  $u = one("SELECT * FROM users WHERE username=? AND active=1", [$username]);
  if (!$u || !password_verify($password, $u['password']))
    json_out(['error' => 'Invalid credentials'], 401);
  $token = jwt_encode(['id' => (int)$u['id'], 'name' => $u['name'], 'role' => $u['role']]);
  audit('login');
  json_out(['token' => $token, 'user' => [
    'id' => (int)$u['id'], 'name' => $u['name'], 'role' => $u['role'], 'username' => $u['username']]]);
}

// GET /auth/me
if ($sub === 'me' && $method === 'GET') json_out(require_auth());

// PUT /auth/password — self-service password change (any logged-in user)
if ($sub === 'password' && $method === 'PUT') {
  $u = require_auth();
  $cur = one("SELECT * FROM users WHERE id=?", [$u['id']]);
  $curPass = inp('current_password', '');
  $newPass = inp('new_password', '');
  if (!$cur || !password_verify($curPass, $cur['password']))
    json_out(['error' => 'Current password is incorrect'], 400);
  if (strlen($newPass) < 6)
    json_out(['error' => 'New password must be at least 6 characters'], 400);
  q("UPDATE users SET password=? WHERE id=?", [password_hash($newPass, PASSWORD_DEFAULT), $u['id']]);
  audit('change_own_password');
  json_out(['ok' => true]);
}

// ---- Users / staff ----
if ($sub === 'users') {
  if ($method === 'GET') {
    require_role(['admin','manager']);
    json_out(all("SELECT id,name,username,role,active,created_at FROM users ORDER BY id"));
  }
  if ($method === 'POST') {
    require_role(['admin','manager']);
    $exists = one("SELECT id FROM users WHERE username=?", [inp('username')]);
    if ($exists) json_out(['error' => 'Username taken'], 400);
    $id = insert("INSERT INTO users (name,username,password,role) VALUES (?,?,?,?)", [
      inp('name'), inp('username'), password_hash(inp('password'), PASSWORD_DEFAULT), inp('role','waiter')]);
    audit('create_user', inp('username'));
    json_out(['id' => $id]);
  }
}

// PUT/DELETE /auth/users/:id
if ($sub === 'users' && isset($seg[2])) {
  $id = (int)$seg[2];
  if ($method === 'PUT') {
    require_role(['admin','manager']);
    $cur = one("SELECT * FROM users WHERE id=?", [$id]);
    if (!$cur) json_out(['error'=>'Not found'],404);
    $pass = inp('password');
    q("UPDATE users SET name=?, role=?, active=?, password=? WHERE id=?", [
      inp('name', $cur['name']), inp('role', $cur['role']),
      inp('active', $cur['active']),
      $pass ? password_hash($pass, PASSWORD_DEFAULT) : $cur['password'], $id]);
    audit('update_user', $cur['username']);
    json_out(['ok' => true]);
  }
  if ($method === 'DELETE') {
    require_role(['admin']);
    q("UPDATE users SET active=0 WHERE id=?", [$id]);
    json_out(['ok' => true]);
  }
}

// ---- Clock in/out ----
if ($sub === 'clock') {
  $u = require_auth();
  if ($method === 'POST') {
    q("INSERT INTO clock_events (user_id,type) VALUES (?,?)", [$u['id'], inp('type')]);
    audit('clock_' . inp('type'));
    json_out(['ok' => true]);
  }
  if ($method === 'GET') {
    json_out(all("SELECT c.*, u.name FROM clock_events c JOIN users u ON u.id=c.user_id
      ORDER BY c.ts DESC LIMIT 100"));
  }
}

// ---- Audit ----
if ($sub === 'audit' && $method === 'GET') {
  require_role(['admin','manager']);
  json_out(all("SELECT a.*, u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
    ORDER BY a.ts DESC LIMIT 200"));
}
