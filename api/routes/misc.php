<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$resource = $seg[0] ?? '';

// ================= CUSTOMERS =================
if ($resource === 'customers') {
  $id = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
  $action = $seg[2] ?? '';

  if (!$id && $method === 'GET') {
    require_auth();
    $sql = "SELECT * FROM customers"; $p = [];
    if ($qq = query_param('q')) { $sql .= " WHERE name LIKE ? OR phone LIKE ?"; $p = ["%$qq%","%$qq%"]; }
    $sql .= " ORDER BY name";
    json_out(all($sql, $p));
  }
  if (!$id && $method === 'POST') {
    require_auth();
    json_out(['id' => insert("INSERT INTO customers (name,phone,email,membership,birthday,notes)
      VALUES (?,?,?,?,?,?)", [inp('name'), inp('phone',''), inp('email',''),
      inp('membership','Standard'), inp('birthday') ?: null, inp('notes','')])]);
  }
  if ($id && $action === '' && $method === 'PUT') {
    require_auth();
    $cur = one("SELECT * FROM customers WHERE id=?", [$id]);
    if (!$cur) json_out(['error'=>'Not found'],404);
    q("UPDATE customers SET name=?,phone=?,email=?,membership=?,birthday=?,notes=?,loyalty_points=? WHERE id=?", [
      inp('name',$cur['name']), inp('phone',$cur['phone']), inp('email',$cur['email']),
      inp('membership',$cur['membership']), inp('birthday') ?: $cur['birthday'],
      inp('notes',$cur['notes']), inp('loyalty_points',$cur['loyalty_points']), $id]);
    json_out(['ok' => true]);
  }
  if ($id && $action === 'orders' && $method === 'GET') {
    require_auth();
    json_out(all("SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC", [$id]));
  }
}

// ================= DASHBOARD =================
if ($resource === 'dashboard' && $method === 'GET') {
  require_auth();
  $salesToday = one("SELECT COALESCE(SUM(total),0) v FROM orders WHERE paid=1 AND DATE(created_at)=CURDATE()")['v'];
  $ordersToday = one("SELECT COUNT(*) c FROM orders WHERE DATE(created_at)=CURDATE()")['c'];
  $activeTables = one("SELECT COUNT(*) c FROM restaurant_tables WHERE status='occupied'")['c'];
  $totalRevenue = one("SELECT COALESCE(SUM(total),0) v FROM orders WHERE paid=1")['v'];
  $pendingKitchen = one("SELECT COUNT(*) c FROM orders WHERE kitchen_status IN ('new','preparing')")['c'];
  $pendingOnline = one("SELECT COUNT(*) c FROM orders WHERE source='online' AND status='pending'")['c'];
  $lowStock = all("SELECT name,stock,reorder_level,unit FROM ingredients WHERE stock<=reorder_level");
  $recent = all("SELECT id,code,type,total,paid,created_at FROM orders ORDER BY created_at DESC LIMIT 8");
  $chart = all("SELECT DATE(created_at) d, COALESCE(SUM(total),0) v FROM orders
    WHERE paid=1 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at) ORDER BY d");
  json_out(compact('salesToday','ordersToday','activeTables','totalRevenue',
    'pendingKitchen','pendingOnline','lowStock','recent','chart'));
}

// ================= REPORTS =================
if ($resource === 'reports' && $method === 'GET') {
  require_role(['admin','manager']);
  $kind = $seg[1] ?? '';
  if ($kind === 'sales') {
    $period = query_param('period','day');
    $fmt = $period === 'month' ? '%Y-%m' : ($period === 'week' ? '%Y-%u' : '%Y-%m-%d');
    json_out(all("SELECT DATE_FORMAT(created_at,'$fmt') period, COUNT(*) orders,
      COALESCE(SUM(total),0) revenue FROM orders WHERE paid=1
      GROUP BY period ORDER BY period DESC LIMIT 30"));
  }
  if ($kind === 'products') {
    json_out(all("SELECT oi.name, SUM(oi.qty) qty, SUM(oi.qty*oi.price) revenue
      FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.paid=1
      GROUP BY oi.name ORDER BY qty DESC"));
  }
  if ($kind === 'categories') {
    json_out(all("SELECT c.name, SUM(oi.qty) qty, SUM(oi.qty*oi.price) revenue
      FROM order_items oi JOIN menu_items mi ON mi.id=oi.menu_item_id
      JOIN categories c ON c.id=mi.category_id JOIN orders o ON o.id=oi.order_id
      WHERE o.paid=1 GROUP BY c.id ORDER BY revenue DESC"));
  }
  if ($kind === 'staff') {
    json_out(all("SELECT u.name, COUNT(o.id) orders, COALESCE(SUM(o.total),0) sales
      FROM users u LEFT JOIN orders o ON o.waiter_id=u.id AND o.paid=1
      GROUP BY u.id ORDER BY sales DESC"));
  }
}

// ================= SETTINGS =================
if ($resource === 'settings') {
  if (($seg[1] ?? '') === 'public' && $method === 'GET') {
    $s = [];
    foreach (all("SELECT skey,svalue FROM settings WHERE skey IN ('logo','restaurant_name')") as $r) $s[$r['skey']] = $r['svalue'];
    json_out($s);
  }
  if (($seg[1] ?? '') === 'test-email' && $method === 'POST') {
    require_role(['admin','manager']);
    require __DIR__ . '/../lib/mailer.php';
    $saved = [];
    foreach (all("SELECT skey,svalue FROM settings") as $r) $saved[$r['skey']] = $r['svalue'];
    $b = body();
    $cfg = $saved;
    foreach (['smtp_host','smtp_port','smtp_user','smtp_pass','smtp_secure','smtp_from_email','smtp_from_name'] as $k) {
      if (array_key_exists($k, $b) && $b[$k] !== '') $cfg[$k] = $b[$k];
    }
    $to = trim($b['test_to'] ?? '');
    if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) json_out(['error' => 'Enter a valid test recipient email'], 400);
    [$ok, $msg] = smtp_send($cfg, $to, 'Fork POS — Test Email',
      "This is a test email from your Fork POS system.\n\nIf you received this, your SMTP settings are working correctly.");
    if (!$ok) json_out(['error' => $msg], 400);
    audit('send_test_email', $to);
    json_out(['ok' => true]);
  }
  if ($method === 'GET') {
    require_auth();
    $s = [];
    foreach (all("SELECT skey,svalue FROM settings") as $r) $s[$r['skey']] = $r['svalue'];
    if (isset($s['smtp_pass'])) { $s['smtp_pass_set'] = $s['smtp_pass'] !== ''; unset($s['smtp_pass']); }
    foreach (['stripe_secret_key_live','stripe_secret_key_test','stripe_webhook_secret_live','stripe_webhook_secret_test'] as $k) {
      if (isset($s[$k])) { $s[$k . '_set'] = $s[$k] !== ''; unset($s[$k]); }
    }
    json_out($s);
  }
  if ($method === 'PUT') {
    require_role(['admin','manager']);
    foreach (body() as $k => $v) {
      q("INSERT INTO settings (skey,svalue) VALUES (?,?)
         ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)", [$k, (string)$v]);
    }
    json_out(['ok' => true]);
  }
}

// ================= BACKUP =================
if ($resource === 'backup' && $method === 'GET') {
  require_role(['admin']);
  $tables = ['users','categories','menu_items','restaurant_tables','customers','orders',
    'order_items','ingredients','suppliers','stock_movements','reservations','payments','settings'];
  $dump = [];
  foreach ($tables as $t) $dump[$t] = all("SELECT * FROM $t");
  header('Content-Disposition: attachment; filename=pos-backup.json');
  json_out($dump);
}
