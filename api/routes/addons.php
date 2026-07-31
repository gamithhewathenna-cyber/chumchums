<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

function with_addon_items($g) {
  $g['items'] = all("SELECT id,name,price FROM addon_items WHERE group_id=? ORDER BY sort,id", [$g['id']]);
  return $g;
}

// ---- Groups ----  /addons/groups[/:id[/items]]
if ($sub === 'groups') {
  $id = isset($seg[2]) && is_numeric($seg[2]) ? (int)$seg[2] : null;
  $action = $seg[3] ?? '';

  if (!$id && $method === 'GET') {
    require_auth();
    json_out(array_map('with_addon_items', all("SELECT * FROM addon_groups WHERE active=1 ORDER BY name")));
  }
  if (!$id && $method === 'POST') {
    require_role(['admin','manager']);
    $type = inp('selection_type', 'multiple') === 'single' ? 'single' : 'multiple';
    $gid = insert("INSERT INTO addon_groups (name,selection_type) VALUES (?,?)", [inp('name'), $type]);
    json_out(['id' => $gid]);
  }
  if ($id && $action === '' && $method === 'PUT') {
    require_role(['admin','manager']);
    $type = inp('selection_type', 'multiple') === 'single' ? 'single' : 'multiple';
    q("UPDATE addon_groups SET name=?, selection_type=? WHERE id=?", [inp('name'), $type, $id]);
    json_out(['ok' => true]);
  }
  if ($id && $action === '' && $method === 'DELETE') {
    require_role(['admin','manager']);
    q("UPDATE addon_groups SET active=0 WHERE id=?", [$id]);
    json_out(['ok' => true]);
  }
  if ($id && $action === 'items' && $method === 'POST') {
    require_role(['admin','manager']);
    $iid = insert("INSERT INTO addon_items (group_id,name,price) VALUES (?,?,?)", [$id, inp('name'), inp('price', 0)]);
    json_out(['id' => $iid]);
  }
}

// ---- Extra items ----  /addons/items/:id
if ($sub === 'items' && isset($seg[2])) {
  $id = (int)$seg[2];
  if ($method === 'PUT') {
    require_role(['admin','manager']);
    $cur = one("SELECT * FROM addon_items WHERE id=?", [$id]);
    if (!$cur) json_out(['error' => 'Not found'], 404);
    q("UPDATE addon_items SET name=?, price=? WHERE id=?", [inp('name', $cur['name']), inp('price', $cur['price']), $id]);
    json_out(['ok' => true]);
  }
  if ($method === 'DELETE') {
    require_role(['admin','manager']);
    q("DELETE FROM addon_items WHERE id=?", [$id]);
    json_out(['ok' => true]);
  }
}
