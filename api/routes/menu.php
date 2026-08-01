<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

// ---- Categories ----  /menu/categories[/:id]
if ($sub === 'categories') {
  $id = isset($seg[2]) ? (int)$seg[2] : null;
  if ($method === 'GET') {
    require_auth();
    json_out(all("SELECT * FROM categories WHERE active=1 ORDER BY sort,name"));
  }
  if ($method === 'POST') {
    require_role(['admin','manager']);
    json_out(['id' => insert("INSERT INTO categories (name,sort) VALUES (?,?)", [inp('name'), inp('sort',0)])]);
  }
  if ($method === 'PUT' && $id) {
    require_role(['admin','manager']);
    q("UPDATE categories SET name=?, sort=? WHERE id=?", [inp('name'), inp('sort',0), $id]);
    json_out(['ok' => true]);
  }
  if ($method === 'DELETE' && $id) {
    require_role(['admin','manager']);
    q("UPDATE categories SET active=0 WHERE id=?", [$id]);
    json_out(['ok' => true]);
  }
}

// ---- Items ----  /menu/items[/:id[/availability|image]]
if ($sub === 'items') {
  $id = isset($seg[2]) ? (int)$seg[2] : null;
  $action = $seg[3] ?? '';

  if ($method === 'GET' && !$id) {
    require_auth();
    $sql = "SELECT * FROM menu_items WHERE 1=1"; $p = [];
    if ($cat = query_param('category')) { $sql .= " AND category_id=?"; $p[] = $cat; }
    if (($av = query_param('available')) !== null && $av !== '') { $sql .= " AND available=?"; $p[] = $av; }
    if ($qq = query_param('q')) { $sql .= " AND name LIKE ?"; $p[] = "%$qq%"; }
    $sql .= " ORDER BY name";
    $rows = array_map(function($r){
      $r['variations'] = $r['variations'] ? json_decode($r['variations'], true) : [];
      $r['addons'] = $r['addons'] ? json_decode($r['addons'], true) : [];
      return $r;
    }, all($sql, $p));
    json_out($rows);
  }

  if ($method === 'POST' && !$id) {
    require_role(['admin','manager']);
    $nid = insert("INSERT INTO menu_items (category_id,name,description,price,image,show_online,addon_group_id,variations,addons,is_combo)
      VALUES (?,?,?,?,?,?,?,?,?,?)", [
      inp('category_id'), inp('name'), inp('description',''), inp('price',0), inp('image') ?: null,
      inp('show_online', 1) ? 1 : 0, inp('addon_group_id') ?: null,
      inp('variations') ? json_encode(inp('variations')) : null,
      inp('addons') ? json_encode(inp('addons')) : null, inp('is_combo') ? 1 : 0]);
    json_out(['id' => $nid]);
  }

  if ($id && $action === 'availability' && $method === 'PATCH') {
    require_role(['admin','manager','cashier']);
    q("UPDATE menu_items SET available=? WHERE id=?", [inp('available') ? 1 : 0, $id]);
    json_out(['ok' => true]);
  }

  if ($id && $action === 'visibility' && $method === 'PATCH') {
    require_role(['admin','manager']);
    q("UPDATE menu_items SET show_online=? WHERE id=?", [inp('show_online') ? 1 : 0, $id]);
    json_out(['ok' => true]);
  }

  if ($id && $action === 'addon-group' && $method === 'PATCH') {
    require_role(['admin','manager']);
    q("UPDATE menu_items SET addon_group_id=? WHERE id=?", [inp('addon_group_id') ?: null, $id]);
    json_out(['ok' => true]);
  }

  if ($id && $action === '' && $method === 'PUT') {
    require_role(['admin','manager']);
    $cur = one("SELECT * FROM menu_items WHERE id=?", [$id]);
    if (!$cur) json_out(['error'=>'Not found'],404);
    q("UPDATE menu_items SET category_id=?,name=?,description=?,price=?,image=?,available=?,show_online=?,addon_group_id=?,variations=?,addons=?,is_combo=? WHERE id=?", [
      inp('category_id', $cur['category_id']), inp('name', $cur['name']),
      inp('description', $cur['description']), inp('price', $cur['price']),
      inp('image', $cur['image']), inp('available', $cur['available']),
      inp('show_online', $cur['show_online']),
      inp('addon_group_id', $cur['addon_group_id']) ?: null,
      inp('variations') !== null ? json_encode(inp('variations')) : $cur['variations'],
      inp('addons') ? json_encode(inp('addons')) : $cur['addons'],
      inp('is_combo', $cur['is_combo']), $id]);
    json_out(['ok' => true]);
  }

  if ($id && $action === '' && $method === 'DELETE') {
    require_role(['admin','manager']);
    q("DELETE FROM menu_items WHERE id=?", [$id]);
    json_out(['ok' => true]);
  }
}
