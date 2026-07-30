<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

// ---- Reservations ----  /tables/reservations[/all|/:id]
if ($sub === 'reservations') {
  $arg = $seg[2] ?? '';
  if ($arg === 'all' && $method === 'GET') {
    require_auth();
    json_out(all("SELECT * FROM reservations ORDER BY created_at DESC"));
  }
  if ($arg === '' && $method === 'POST') {
    require_auth();
    $tid = inp('table_id') ?: null;
    $status = inp('status', 'booked');
    $id = insert("INSERT INTO reservations (customer_name,phone,party_size,table_id,reserved_for,status)
      VALUES (?,?,?,?,?,?)", [inp('customer_name'), inp('phone',''), inp('party_size',2),
      $tid, inp('reserved_for') ?: null, $status]);
    if ($tid && $status !== 'waiting') q("UPDATE restaurant_tables SET status='reserved' WHERE id=?", [$tid]);
    json_out(['id' => $id]);
  }
  if (is_numeric($arg) && $method === 'PUT') {
    require_auth();
    $cur = one("SELECT * FROM reservations WHERE id=?", [(int)$arg]);
    if (!$cur) json_out(['error'=>'Not found'],404);
    q("UPDATE reservations SET status=?, table_id=? WHERE id=?", [
      inp('status', $cur['status']), inp('table_id', $cur['table_id']), (int)$arg]);
    json_out(['ok' => true]);
  }
}

// ---- Tables ----  /tables[/:id]
$id = is_numeric($sub) ? (int)$sub : null;

if ($sub === '' && $method === 'GET') {
  require_auth();
  json_out(all("SELECT * FROM restaurant_tables ORDER BY id"));
}
if ($sub === '' && $method === 'POST') {
  require_role(['admin','manager']);
  json_out(['id' => insert("INSERT INTO restaurant_tables (name,seats,zone,pos_x,pos_y) VALUES (?,?,?,?,?)", [
    inp('name'), inp('seats',4), inp('zone','Main'), inp('pos_x',0), inp('pos_y',0)])]);
}
if ($id && $method === 'PUT') {
  require_auth();
  $cur = one("SELECT * FROM restaurant_tables WHERE id=?", [$id]);
  if (!$cur) json_out(['error'=>'Not found'],404);
  q("UPDATE restaurant_tables SET name=?,seats=?,zone=?,pos_x=?,pos_y=?,status=? WHERE id=?", [
    inp('name',$cur['name']), inp('seats',$cur['seats']), inp('zone',$cur['zone']),
    inp('pos_x',$cur['pos_x']), inp('pos_y',$cur['pos_y']), inp('status',$cur['status']), $id]);
  json_out(['ok' => true]);
}
if ($id && $method === 'DELETE') {
  require_role(['admin','manager']);
  q("DELETE FROM restaurant_tables WHERE id=?", [$id]);
  json_out(['ok' => true]);
}
