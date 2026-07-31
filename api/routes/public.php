<?php
// Public, unauthenticated routes for customer-facing dine-in ordering (QR / tablet)
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

function online_ordering_enabled() {
  $r = one("SELECT svalue FROM settings WHERE skey='online_ordering_enabled'");
  return $r && $r['svalue'] === '1';
}

// ---- GET /public/menu ----
if ($sub === 'menu' && $method === 'GET') {
  $s = [];
  foreach (all("SELECT skey,svalue FROM settings WHERE skey IN ('restaurant_name','logo','currency','online_ordering_enabled','stripe_mode')") as $r) $s[$r['skey']] = $r['svalue'];
  if (($s['online_ordering_enabled'] ?? '') !== '1') json_out(['enabled' => false]);
  $cats = all("SELECT id,name,sort FROM categories WHERE active=1 ORDER BY sort,name");
  $items = all("SELECT id,category_id,name,description,price,image,variations,addons FROM menu_items WHERE available=1 AND show_online=1 ORDER BY name");
  foreach ($items as &$i) {
    $i['variations'] = $i['variations'] ? json_decode($i['variations'], true) : null;
    $i['addons'] = $i['addons'] ? json_decode($i['addons'], true) : null;
  }
  unset($i);
  json_out(['enabled' => true, 'restaurant_name' => $s['restaurant_name'] ?? 'Restaurant',
    'logo' => $s['logo'] ?? '', 'currency' => $s['currency'] ?? '$',
    'test_mode' => ($s['stripe_mode'] ?? 'test') !== 'live',
    'categories' => $cats, 'items' => $items]);
}

// ---- GET /public/tables ----
if ($sub === 'tables' && $method === 'GET') {
  if (!online_ordering_enabled()) json_out(['error' => 'Online ordering is currently unavailable'], 403);
  json_out(all("SELECT id,name,seats,zone FROM restaurant_tables ORDER BY name"));
}

// ---- POST /public/checkout ----
if ($sub === 'checkout' && $method === 'POST') {
  if (!online_ordering_enabled()) json_out(['error' => 'Online ordering is currently unavailable'], 403);

  $tableId = (int)inp('table_id', 0);
  $name = trim(inp('customer_name', ''));
  $email = trim(inp('customer_email', ''));
  $phone = trim(inp('customer_phone', ''));
  $notes = trim(inp('notes', ''));
  $cartItems = inp('items', []);

  if (!$tableId) json_out(['error' => 'Please select a table'], 400);
  if (!$name) json_out(['error' => 'Please enter your name'], 400);
  if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['error' => 'Please enter a valid email'], 400);
  if (!$cartItems) json_out(['error' => 'Your cart is empty'], 400);

  $table = one("SELECT * FROM restaurant_tables WHERE id=?", [$tableId]);
  if (!$table) json_out(['error' => 'Invalid table'], 400);

  // Recompute every price from the DB — never trust client-submitted prices
  $verified = [];
  foreach ($cartItems as $ci) {
    $mid = (int)($ci['menu_item_id'] ?? 0);
    $qty = max(1, min(20, (int)($ci['qty'] ?? 1)));
    $mi = one("SELECT * FROM menu_items WHERE id=? AND available=1 AND show_online=1", [$mid]);
    if (!$mi) continue;
    $verified[] = ['menu_item_id' => $mi['id'], 'name' => $mi['name'], 'price' => (float)$mi['price'], 'qty' => $qty];
  }
  if (!$verified) json_out(['error' => 'None of the selected items are available'], 400);

  $subtotal = 0; foreach ($verified as $v) $subtotal += $v['price'] * $v['qty'];

  $code = 'ORD-' . (1001 + (int)one("SELECT COUNT(*) c FROM orders")['c']);
  $oid = insert("INSERT INTO orders (code,type,table_id,status,kitchen_status,notes,subtotal,total,paid,source,customer_name,customer_email,customer_phone)
    VALUES (?,?,?,?,?,?,?,?,0,'online',?,?,?)",
    [$code, 'dine-in', $tableId, 'awaiting_payment', 'pending', $notes, $subtotal, $subtotal, $name, $email, $phone ?: null]);
  foreach ($verified as $v) {
    insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price) VALUES (?,?,?,?,?)",
      [$oid, $v['menu_item_id'], $v['name'], $v['qty'], $v['price']]);
  }

  $raw = [];
  foreach (all("SELECT skey,svalue FROM settings WHERE skey IN ('stripe_mode','stripe_secret_key_live','stripe_secret_key_test','stripe_currency')") as $r) $raw[$r['skey']] = $r['svalue'];
  $mode = ($raw['stripe_mode'] ?? 'test') === 'live' ? 'live' : 'test';
  $cfg = ['stripe_secret_key' => $raw['stripe_secret_key_' . $mode] ?? '', 'stripe_currency' => $raw['stripe_currency'] ?? 'usd'];

  $origin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '');
  $successUrl = $origin . '/order.html?order=' . $oid . '&code=' . urlencode($code) . '&paid=1';
  $cancelUrl = $origin . '/order.html?table=' . $tableId . '&cancelled=1';

  require __DIR__ . '/../lib/stripe.php';
  $lineItems = array_map(function ($v) {
    return ['name' => $v['name'], 'amount' => round($v['price'] * 100), 'qty' => $v['qty']];
  }, $verified);
  [$ok, $sessionId, $checkoutUrl, $err] = stripe_create_checkout_session($cfg, $lineItems, $successUrl, $cancelUrl,
    ['order_id' => $oid, 'customer_email' => $email]);

  if (!$ok) {
    q("UPDATE orders SET status='cancelled' WHERE id=?", [$oid]);
    json_out(['error' => $err], 400);
  }
  q("UPDATE orders SET stripe_session_id=? WHERE id=?", [$sessionId, $oid]);
  json_out(['checkout_url' => $checkoutUrl, 'order_id' => $oid, 'code' => $code]);
}

// ---- POST /public/stripe-webhook ----
if ($sub === 'stripe-webhook' && $method === 'POST') {
  require __DIR__ . '/../lib/stripe.php';
  $payload = file_get_contents('php://input');
  $sig = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
  $cfg = [];
  foreach (all("SELECT skey,svalue FROM settings WHERE skey IN ('stripe_webhook_secret_live','stripe_webhook_secret_test')") as $r) $cfg[$r['skey']] = $r['svalue'];
  // One shared URL is registered as both a live and a test webhook endpoint in Stripe — try whichever secret matches
  $verified = stripe_verify_webhook_sig($payload, $sig, $cfg['stripe_webhook_secret_live'] ?? '')
    || stripe_verify_webhook_sig($payload, $sig, $cfg['stripe_webhook_secret_test'] ?? '');
  if (!$verified) json_out(['error' => 'Invalid signature'], 400);
  $event = json_decode($payload, true);
  $type = $event['type'] ?? '';
  if ($type === 'checkout.session.completed' || $type === 'checkout.session.async_payment_succeeded') {
    $session = $event['data']['object'] ?? [];
    $sessionId = $session['id'] ?? '';
    if ($sessionId) {
      $order = one("SELECT * FROM orders WHERE stripe_session_id=?", [$sessionId]);
      if ($order && $order['status'] === 'awaiting_payment') {
        q("UPDATE orders SET paid=1, status='pending' WHERE id=?", [$order['id']]);
      }
    }
  }
  json_out(['received' => true]);
}

// ---- GET /public/orders/:id ----
if ($sub === 'orders' && isset($seg[2]) && $method === 'GET') {
  $id = (int)$seg[2];
  $token = query_param('token', '');
  $o = one("SELECT id,code,status,paid,table_id FROM orders WHERE id=? AND source='online'", [$id]);
  if (!$o || $o['code'] !== $token) json_out(['error' => 'Not found'], 404);
  json_out(['code' => $o['code'], 'status' => $o['status'], 'paid' => (bool)$o['paid']]);
}
