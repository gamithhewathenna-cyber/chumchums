<?php
// Run once after creating the DB + config.php.
// Usage (browser): visit /api/seed.php?key=YOUR_JWT_SECRET
// Usage (CLI):     php api/seed.php --force
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/helpers.php';

$cli = php_sapi_name() === 'cli';
if (!$cli) {
  header('Content-Type: text/plain');
  $c = config();
  if (($_GET['key'] ?? '') !== $c['jwt_secret']) {
    http_response_code(403);
    exit("Forbidden. Pass ?key=<your jwt_secret> to run the seed.\n");
  }
}

// Load schema first
$schema = file_get_contents(__DIR__ . '/../sql/schema.sql');
db()->exec($schema);

// Clear existing data
$tables = ['payments','order_items','orders','stock_movements','ingredients','suppliers',
  'reservations','menu_items','categories','restaurant_tables','customers',
  'clock_events','audit_logs','settings','users'];
db()->exec("SET foreign_key_checks=0");
foreach ($tables as $t) db()->exec("DELETE FROM $t");
db()->exec("SET foreign_key_checks=1");

// Users
$users = [
  ['Admin User','admin','admin123','admin'],
  ['Manager Mia','manager','manager123','manager'],
  ['Cashier Carl','cashier','cashier123','cashier'],
  ['Waiter Wendy','wendy','waiter123','waiter'],
  ['Kitchen Ken','kitchen','kitchen123','kitchen'],
];
foreach ($users as $u)
  insert("INSERT INTO users (name,username,password,role) VALUES (?,?,?,?)",
    [$u[0], $u[1], password_hash($u[2], PASSWORD_DEFAULT), $u[3]]);

// Categories
$cats = ['Starters','Mains','Pizza','Burgers','Drinks','Desserts'];
foreach ($cats as $i => $c) insert("INSERT INTO categories (name,sort) VALUES (?,?)", [$c, $i]);

// Items  [category_id, name, desc, price]
$items = [
  [2,'Grilled Chicken','Herb-marinated grilled chicken',12.5],
  [1,'Spring Rolls','Crispy veg spring rolls (4pc)',5.0],
  [1,'Garlic Bread','Toasted with garlic butter',4.0],
  [3,'Margherita Pizza','Tomato, mozzarella, basil',9.0],
  [3,'Pepperoni Pizza','Loaded pepperoni',11.0],
  [4,'Classic Burger','Beef patty, lettuce, cheese',8.5],
  [4,'Chicken Burger','Crispy chicken fillet',8.0],
  [5,'Coca Cola','330ml can',2.0],
  [5,'Fresh Lime','Iced lime juice',2.5],
  [6,'Chocolate Lava Cake','Warm molten center',5.5],
];
foreach ($items as $it) {
  $var = in_array($it[0], [3,4])
    ? json_encode([['name'=>'Small','price'=>0],['name'=>'Medium','price'=>2],['name'=>'Large','price'=>4]])
    : null;
  $add = $it[0] === 4 ? json_encode([['name'=>'Extra Cheese','price'=>1],['name'=>'Bacon','price'=>1.5]]) : null;
  insert("INSERT INTO menu_items (category_id,name,description,price,available,variations,addons)
    VALUES (?,?,?,?,1,?,?)", [$it[0], $it[1], $it[2], $it[3], $var, $add]);
}

// Tables
$statuses = ['available','occupied','reserved','cleaning'];
for ($i = 1; $i <= 12; $i++) {
  $seats = [2,4,4,6][$i % 4];
  insert("INSERT INTO restaurant_tables (name,seats,zone,pos_x,pos_y,status) VALUES (?,?,?,?,?,?)",
    ['T'.$i, $seats, $i <= 6 ? 'Main' : 'Terrace',
     ($i % 4) * 120 + 20, intdiv($i - 1, 4) * 120 + 20, $statuses[$i % 4]]);
}

// Customers
insert("INSERT INTO customers (name,phone,email,loyalty_points,membership,birthday) VALUES (?,?,?,?,?,?)",
  ['John Silva','0771234567','john@mail.com',120,'Gold','1990-05-12']);
insert("INSERT INTO customers (name,phone,email,loyalty_points,membership,birthday) VALUES (?,?,?,?,?,?)",
  ['Aisha Khan','0779876543','aisha@mail.com',45,'Silver','1995-11-03']);

// Suppliers + ingredients
$sid = insert("INSERT INTO suppliers (name,phone,email) VALUES (?,?,?)",
  ['Fresh Farms','0112233445','sales@freshfarms.lk']);
$ings = [['Chicken Breast','kg',3,5,4.5],['Mozzarella','kg',2,4,6],['Tomato','kg',8,3,1.2],
  ['Beef Patty','pc',40,20,1.0],['Buns','pc',15,30,0.3],['Cola Cans','pc',60,24,0.5]];
foreach ($ings as $g)
  insert("INSERT INTO ingredients (name,unit,stock,reorder_level,cost,supplier_id) VALUES (?,?,?,?,?,?)",
    [$g[0],$g[1],$g[2],$g[3],$g[4],$sid]);

// Settings
$settings = ['restaurant_name'=>'The Good Fork','currency'=>'$','timezone'=>'Asia/Colombo',
  'language'=>'en','address'=>'123 Main St, Colombo','phone'=>'0112000000',
  'receipt_footer'=>'Thank you! Visit again.'];
foreach ($settings as $k => $v)
  insert("INSERT INTO settings (skey,svalue) VALUES (?,?)", [$k, $v]);

// Demo orders
$o1 = insert("INSERT INTO orders (code,type,table_id,status,kitchen_status,subtotal,total,paid,waiter_id)
  VALUES ('ORD-1001','dine-in',2,'kitchen','preparing',21.5,21.5,0,4)");
insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price) VALUES (?,?,?,?,?)", [$o1,1,'Grilled Chicken',1,12.5]);
insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price) VALUES (?,?,?,?,?)", [$o1,6,'Classic Burger',1,8.5]);
insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price) VALUES (?,?,?,?,?)", [$o1,8,'Coca Cola',1,2.0]);
$o2 = insert("INSERT INTO orders (code,type,status,kitchen_status,subtotal,total,paid,waiter_id)
  VALUES ('ORD-1002','takeaway','completed','completed',13.0,13.0,1,3)");
insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price) VALUES (?,?,?,?,?)", [$o2,5,'Pepperoni Pizza',1,11.0]);
insert("INSERT INTO order_items (order_id,menu_item_id,name,qty,price) VALUES (?,?,?,?,?)", [$o2,8,'Coca Cola',1,2.0]);

echo "✅ Seed complete. Login with admin / admin123\n";
echo "IMPORTANT: delete api/seed.php now, or it can be re-run.\n";
