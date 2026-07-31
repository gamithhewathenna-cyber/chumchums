<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

function next_code() {
  $c = one("SELECT COUNT(*) AS c FROM orders")['c'];
  return 'ORD-' . (1001 + (int)$c);
}
function recalc($oid) {
  $items = all("SELECT qty,price FROM order_items WHERE order_id=?", [$oid]);
  $sub = 0; foreach ($items as $i) $sub += $i['qty'] * $i['price'];
  $o = one("SELECT discount,tip FROM orders WHERE id=?", [$oid]);
  $total = max(0, $sub - $o['discount']) + $o['tip'];
  q("UPDATE orders SET subtotal=?, total=?, updated_at=NOW() WHERE id=?", [$sub, $total, $oid]);
}
function with_items($o) {
  if (!$o) return $o;
  $o['items'] = all("SELECT * FROM order_items WHERE order_id=?", [$o['id']]);
  return $o;
}

// ---- KDS ----  /orders/kds/active
if ($sub === 'kds' && ($seg[2] ?? '') === 'active' && $method === 'GET') {
  require_auth();
  $rows = all("SELECT * FROM orders WHERE kitchen_status IN ('new','preparing','ready')
    AND status NOT IN ('completed','cancelled') ORDER BY created_at");
  json_out(array_map('with_items', $rows));
}

// ---- List ----  /orders
if ($sub === '' && $method === 'GET') {
  require_auth();
  $sql = "SELECT * FROM orders WHERE 1=1"; $p = [];
  if ($s = query_param('status')) { $sql .= " AND status=?"; $p[] = $s; }
  if ($t = query_param('type')) { $sql .= " AND type=?"; $p[] = $t; }
  if ($tb = query_param('table_id')) { $sql .= " AND table_id=?"; $p[] = $tb; }
  if ($src = query_param('source')) { $sql .= " AND source=?"; $p[] = $src; }
  if (query_param('today')) $sql .= " AND DATE(created_at)=CURDATE()";
  $sql .= " ORDER BY created_at DESC";
  json_out(array_map('with_items', all($sql, $p)));
}

// ---- Create ----  POST /orders
if ($sub === '' && $method === 'POST') {
  $u = require_auth();
  $tid = inp('table_id') ?: null;
  $oid = insert("INSERT INTO orders (code,type,table_id,customer_id,waiter_id,notes)
    VALUES (?,?,?,?,?,?)", [next_code(), inp('type','dine-in'), $tid,
    inp('customer_id') ?: null, $u['id'], inp('notes','')]);
  foreach (inp('items', []) as $i) {
    insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price,modifiers,notes)
      VALUES (?,?,?,?,?,?,?)", [$oid, $i['menu_item_id'] ?? null, $i['name'],
      $i['qty'] ?? 1, $i['price'] ?? 0,
      isset($i['modifiers']) ? json_encode($i['modifiers']) : null, $i['notes'] ?? null]);
  }
  recalc($oid);
  if ($tid) q("UPDATE restaurant_tables SET status='occupied' WHERE id=?", [$tid]);
  json_out(with_items(one("SELECT * FROM orders WHERE id=?", [$oid])));
}

// ---- Sub-routes on /orders/:id/... ----
if (is_numeric($sub)) {
  $id = (int)$sub;
  $action = $seg[2] ?? '';

  if ($action === '' && $method === 'GET') {
    require_auth();
    $o = one("SELECT * FROM orders WHERE id=?", [$id]);
    if (!$o) json_out(['error'=>'Not found'],404);
    json_out(with_items($o));
  }

  if ($action === '' && $method === 'PATCH') {
    require_auth();
    $cur = one("SELECT * FROM orders WHERE id=?", [$id]);
    if (!$cur) json_out(['error'=>'Not found'],404);
    q("UPDATE orders SET status=?,kitchen_status=?,notes=?,discount=?,tip=?,updated_at=NOW() WHERE id=?", [
      inp('status',$cur['status']), inp('kitchen_status',$cur['kitchen_status']),
      inp('notes',$cur['notes']), inp('discount',$cur['discount']), inp('tip',$cur['tip']), $id]);
    recalc($id);
    json_out(with_items(one("SELECT * FROM orders WHERE id=?", [$id])));
  }

  if ($action === 'items' && $method === 'POST') {
    require_auth();
    foreach (inp('items', []) as $i) {
      insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price,modifiers,notes)
        VALUES (?,?,?,?,?,?,?)", [$id, $i['menu_item_id'] ?? null, $i['name'],
        $i['qty'] ?? 1, $i['price'] ?? 0,
        isset($i['modifiers']) ? json_encode($i['modifiers']) : null, $i['notes'] ?? null]);
    }
    recalc($id);
    json_out(with_items(one("SELECT * FROM orders WHERE id=?", [$id])));
  }

  if ($action === 'items' && isset($seg[3]) && $method === 'DELETE') {
    require_auth();
    q("DELETE FROM order_items WHERE id=? AND order_id=?", [(int)$seg[3], $id]);
    recalc($id);
    json_out(['ok' => true]);
  }

  if ($action === 'send-kitchen' && $method === 'POST') {
    require_auth();
    $cur = one("SELECT table_id FROM orders WHERE id=?", [$id]);
    q("UPDATE orders SET status='kitchen', kitchen_status='new' WHERE id=?", [$id]);
    if ($cur && $cur['table_id']) q("UPDATE restaurant_tables SET status='occupied' WHERE id=?", [$cur['table_id']]);
    json_out(['ok' => true]);
  }

  if ($action === 'reject' && $method === 'POST') {
    require_auth();
    $cur = one("SELECT * FROM orders WHERE id=?", [$id]);
    if (!$cur) json_out(['error' => 'Not found'], 404);
    q("UPDATE orders SET status='cancelled' WHERE id=?", [$id]);
    audit('reject_online_order', $cur['code']);
    json_out(['ok' => true]);
  }

  if ($action === 'transfer' && $method === 'POST') {
    require_auth();
    $o = one("SELECT * FROM orders WHERE id=?", [$id]);
    if ($o['table_id']) q("UPDATE restaurant_tables SET status='available' WHERE id=?", [$o['table_id']]);
    $to = inp('table_id');
    q("UPDATE orders SET table_id=? WHERE id=?", [$to, $id]);
    q("UPDATE restaurant_tables SET status='occupied' WHERE id=?", [$to]);
    json_out(['ok' => true]);
  }

  if ($action === 'merge' && $method === 'POST') {
    require_auth();
    $target = (int)inp('target_id');
    q("UPDATE order_items SET order_id=? WHERE order_id=?", [$target, $id]);
    q("UPDATE orders SET status='cancelled' WHERE id=?", [$id]);
    recalc($target);
    json_out(['ok' => true]);
  }

  if ($action === 'split' && $method === 'POST') {
    $u = require_auth();
    $src = one("SELECT * FROM orders WHERE id=?", [$id]);
    $nid = insert("INSERT INTO orders (code,type,table_id,waiter_id,status) VALUES (?,?,?,?, 'open')",
      [next_code(), $src['type'], $src['table_id'], $u['id']]);
    $ids = inp('item_ids', []);
    if ($ids) {
      $ph = implode(',', array_fill(0, count($ids), '?'));
      q("UPDATE order_items SET order_id=? WHERE id IN ($ph)", array_merge([$nid], $ids));
    }
    recalc($id); recalc($nid);
    json_out(['new_order_id' => $nid]);
  }
}
