<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

// POST /payments  (take payment; supports split via repeated calls)
if ($sub === '' && $method === 'POST') {
  require_auth();
  $oid = (int)inp('order_id');
  $o = one("SELECT * FROM orders WHERE id=?", [$oid]);
  if (!$o) json_out(['error' => 'Order not found'], 404);

  if (inp('tip') !== null || inp('discount') !== null) {
    q("UPDATE orders SET tip=?, discount=? WHERE id=?", [
      inp('tip', $o['tip']), inp('discount', $o['discount']), $oid]);
  }
  q("INSERT INTO payments (order_id,method,amount) VALUES (?,?,?)",
    [$oid, inp('method'), inp('amount')]);

  $paid = one("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE order_id=?", [$oid])['s'];
  $fresh = one("SELECT * FROM orders WHERE id=?", [$oid]);

  if (inp('close') || $paid >= $fresh['total']) {
    q("UPDATE orders SET paid=1, status='completed', payment_method=? WHERE id=?", [inp('method'), $oid]);
    if ($fresh['table_id']) q("UPDATE restaurant_tables SET status='cleaning' WHERE id=?", [$fresh['table_id']]);
    if ($fresh['customer_id'])
      q("UPDATE customers SET loyalty_points=loyalty_points+? WHERE id=?",
        [(int)floor($fresh['total']), $fresh['customer_id']]);
  }
  json_out(['paid' => (float)$paid, 'total' => (float)$fresh['total'],
    'closed' => (bool)(inp('close') || $paid >= $fresh['total'])]);
}

// GET /payments/order/:id
if ($sub === 'order' && isset($seg[2]) && $method === 'GET') {
  require_auth();
  json_out(all("SELECT * FROM payments WHERE order_id=? ORDER BY ts", [(int)$seg[2]]));
}

// POST /payments/refund
if ($sub === 'refund' && $method === 'POST') {
  require_role(['admin','manager','cashier']);
  $oid = (int)inp('order_id'); $amt = abs((float)inp('amount'));
  q("INSERT INTO payments (order_id,method,amount) VALUES (?,?,?)", [$oid, 'refund', -$amt]);
  q("UPDATE orders SET status='refunded' WHERE id=?", [$oid]);
  audit('refund', "order $oid amount $amt");
  json_out(['ok' => true]);
}

// GET /payments/receipt/:id
if ($sub === 'receipt' && isset($seg[2]) && $method === 'GET') {
  require_auth();
  $oid = (int)$seg[2];
  $o = one("SELECT * FROM orders WHERE id=?", [$oid]);
  if (!$o) json_out(['error'=>'Not found'],404);
  $items = all("SELECT * FROM order_items WHERE order_id=?", [$oid]);
  $settings = [];
  foreach (all("SELECT skey,svalue FROM settings") as $s) $settings[$s['skey']] = $s['svalue'];
  json_out(['order' => $o, 'items' => $items, 'settings' => $settings]);
}
