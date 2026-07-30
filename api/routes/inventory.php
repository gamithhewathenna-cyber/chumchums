<?php
$seg = $GLOBALS['SEG']; $method = $GLOBALS['METHOD'];
$sub = $seg[1] ?? '';

// ---- Ingredients ----  /inventory/ingredients[/:id]
if ($sub === 'ingredients') {
  $id = isset($seg[2]) ? (int)$seg[2] : null;
  if ($method === 'GET' && !$id) {
    require_auth();
    json_out(all("SELECT i.*, s.name AS supplier FROM ingredients i
      LEFT JOIN suppliers s ON s.id=i.supplier_id ORDER BY i.name"));
  }
  if ($method === 'POST' && !$id) {
    require_role(['admin','manager']);
    json_out(['id' => insert("INSERT INTO ingredients (name,unit,stock,reorder_level,cost,supplier_id)
      VALUES (?,?,?,?,?,?)", [inp('name'), inp('unit','unit'), inp('stock',0),
      inp('reorder_level',0), inp('cost',0), inp('supplier_id') ?: null])]);
  }
  if ($method === 'PUT' && $id) {
    require_role(['admin','manager']);
    $cur = one("SELECT * FROM ingredients WHERE id=?", [$id]);
    if (!$cur) json_out(['error'=>'Not found'],404);
    q("UPDATE ingredients SET name=?,unit=?,reorder_level=?,cost=?,supplier_id=? WHERE id=?", [
      inp('name',$cur['name']), inp('unit',$cur['unit']), inp('reorder_level',$cur['reorder_level']),
      inp('cost',$cur['cost']), inp('supplier_id',$cur['supplier_id']), $id]);
    json_out(['ok' => true]);
  }
  if ($method === 'DELETE' && $id) {
    require_role(['admin','manager']);
    q("DELETE FROM ingredients WHERE id=?", [$id]);
    json_out(['ok' => true]);
  }
}

// ---- Low stock ----
if ($sub === 'low-stock' && $method === 'GET') {
  require_auth();
  json_out(all("SELECT * FROM ingredients WHERE stock<=reorder_level ORDER BY stock"));
}

// ---- Movement (purchase / waste / adjustment) ----
if ($sub === 'movement' && $method === 'POST') {
  require_role(['admin','manager']);
  $ing = (int)inp('ingredient_id'); $change = (float)inp('change');
  q("INSERT INTO stock_movements (ingredient_id,change_amt,reason) VALUES (?,?,?)",
    [$ing, $change, inp('reason','adjustment')]);
  q("UPDATE ingredients SET stock=stock+? WHERE id=?", [$change, $ing]);
  json_out(['ok' => true]);
}

if ($sub === 'movements' && $method === 'GET') {
  require_auth();
  json_out(all("SELECT m.*, i.name FROM stock_movements m
    JOIN ingredients i ON i.id=m.ingredient_id ORDER BY m.ts DESC LIMIT 200"));
}

// ---- Suppliers ----  /inventory/suppliers[/:id]
if ($sub === 'suppliers') {
  $id = isset($seg[2]) ? (int)$seg[2] : null;
  if ($method === 'GET' && !$id) {
    require_auth();
    json_out(all("SELECT * FROM suppliers ORDER BY name"));
  }
  if ($method === 'POST' && !$id) {
    require_role(['admin','manager']);
    json_out(['id' => insert("INSERT INTO suppliers (name,phone,email) VALUES (?,?,?)",
      [inp('name'), inp('phone',''), inp('email','')])]);
  }
  if ($method === 'DELETE' && $id) {
    require_role(['admin','manager']);
    q("DELETE FROM suppliers WHERE id=?", [$id]);
    json_out(['ok' => true]);
  }
}
