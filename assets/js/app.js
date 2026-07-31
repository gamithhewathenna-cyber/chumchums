// ---------- Theme ----------
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('pos_theme', t);
}
applyTheme(localStorage.getItem('pos_theme') || 'dark');

// Show the saved logo on the login screen even before signing in
API.get('/settings/public').then(s => s.logo && applyLogo(s.logo)).catch(() => {});

// ---------- Auth ----------
async function doLogin() {
  const username = $('#loginUser').value.trim();
  const password = $('#loginPass').value;
  try {
    const { token, user } = await API.post('/auth/login', { username, password });
    API.setAuth(token, user);
    startApp();
  } catch (e) { $('#loginErr').textContent = e.message; }
}
$('#loginBtn').onclick = doLogin;
$('#loginPass').addEventListener('keydown', e => e.key === 'Enter' && doLogin());

$('#logoutBtn').onclick = () => { API.clearAuth(); location.reload(); };
$('#themeBtn').onclick = () =>
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
$('#menuToggle').onclick = () => $('#sidebar').classList.toggle('open');

$('#clockBtn').onclick = () => {
  const c = el('div');
  c.append(el('p', { class: 'muted' }, 'Record your shift time:'));
  modal('Clock In / Out', c, [
    { label: 'Clock In', primary: true, onClick: async () => { await API.post('/auth/clock', { type: 'in' }); closeModal(); toast('Clocked in'); } },
    { label: 'Clock Out', onClick: async () => { await API.post('/auth/clock', { type: 'out' }); closeModal(); toast('Clocked out'); } }
  ]);
};

// ---------- Navigation ----------
const NAV = [
  { id: 'dashboard', label: 'Dashboard', ic: '📊', roles: ['admin','manager','cashier','waiter','kitchen'] },
  { id: 'pos', label: 'New Order', ic: '🧾', roles: ['admin','manager','cashier','waiter'] },
  { id: 'orders', label: 'Orders', ic: '📋', roles: ['admin','manager','cashier','waiter'] },
  { id: 'tables', label: 'Tables', ic: '🍽️', roles: ['admin','manager','cashier','waiter'] },
  { id: 'kds', label: 'Kitchen (KDS)', ic: '👨‍🍳', roles: ['admin','manager','kitchen'] },
  { id: 'menu', label: 'Menu', ic: '📖', roles: ['admin','manager'] },
  { id: 'inventory', label: 'Inventory', ic: '📦', roles: ['admin','manager'] },
  { id: 'customers', label: 'Customers', ic: '👥', roles: ['admin','manager','cashier'] },
  { id: 'staff', label: 'Staff', ic: '🧑‍💼', roles: ['admin','manager'] },
  { id: 'reports', label: 'Reports', ic: '📈', roles: ['admin','manager'] },
  { id: 'settings', label: 'Settings', ic: '⚙️', roles: ['admin','manager'] },
];

function buildNav() {
  const nav = $('#nav'); nav.innerHTML = '';
  NAV.filter(n => n.roles.includes(API.user.role)).forEach(n => {
    nav.append(el('div', { class: 'nav-item', 'data-view': n.id, onClick: () => go(n.id) },
      el('span', { class: 'ic' }, n.ic), el('span', {}, n.label)));
  });
}

const VIEWS = {};
async function go(id) {
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === id));
  $('#pageTitle').textContent = NAV.find(n => n.id === id)?.label || id;
  $('#sidebar').classList.remove('open');
  const view = $('#view'); view.innerHTML = '<p class="muted">Loading…</p>';
  try { await VIEWS[id](view); } catch (e) { view.innerHTML = `<p class="err">${e.message}</p>`; }
}

async function startApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#userChip').textContent = `${API.user.name} · ${API.user.role}`;
  try { const s = await API.get('/settings'); CUR = s.currency || '$'; applyLogo(s.logo || ''); } catch {}
  buildNav();
  go('dashboard');
}

// ================= DASHBOARD =================
VIEWS.dashboard = async (v) => {
  const d = await API.get('/dashboard');
  v.innerHTML = '';
  const stats = [
    ['Sales Today', money(d.salesToday), true], ['Orders Today', d.ordersToday],
    ['Active Tables', d.activeTables], ['Total Revenue', money(d.totalRevenue), true],
    ['Pending Kitchen', d.pendingKitchen], ['Low Stock Items', d.lowStock.length],
  ];
  const grid = el('div', { class: 'grid stats' });
  stats.forEach(([label, val, acc]) => grid.append(el('div', { class: 'card stat' },
    el('div', { class: 'label' }, label), el('div', { class: 'val' + (acc ? ' accent' : '') }, String(val)))));
  v.append(grid);

  // chart
  const maxV = Math.max(1, ...d.chart.map(c => c.v));
  const bars = el('div', { class: 'bars' });
  d.chart.forEach(c => bars.append(el('div', { class: 'bar', style: `height:${(c.v / maxV) * 100}%`,
    title: money(c.v) }, el('span', {}, c.d.slice(5)))));
  v.append(el('div', { class: 'section-title' }, 'Sales · Last 7 Days'),
    el('div', { class: 'card' }, d.chart.length ? bars : el('p', { class: 'muted' }, 'No sales yet')));

  // low stock + recent
  const cols = el('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr' });
  const ls = el('div', { class: 'card' }, el('div', { class: 'section-title', style: 'margin-top:0' }, 'Low Stock Alerts'));
  if (d.lowStock.length) {
    const t = el('table'); t.innerHTML = '<tr><th>Item</th><th>Stock</th><th>Reorder</th></tr>';
    d.lowStock.forEach(i => t.insertAdjacentHTML('beforeend',
      `<tr><td>${i.name}</td><td>${i.stock} ${i.unit}</td><td>${i.reorder_level}</td></tr>`));
    ls.append(t);
  } else ls.append(el('p', { class: 'muted' }, 'All stocked up ✔'));

  const rec = el('div', { class: 'card' }, el('div', { class: 'section-title', style: 'margin-top:0' }, 'Recent Transactions'));
  const rt = el('table'); rt.innerHTML = '<tr><th>Code</th><th>Type</th><th>Total</th><th>Status</th></tr>';
  d.recent.forEach(o => rt.insertAdjacentHTML('beforeend',
    `<tr><td>${o.code}</td><td>${o.type}</td><td>${money(o.total)}</td><td>${o.paid ? statusBadge('paid') : statusBadge('unpaid')}</td></tr>`));
  rec.append(rt);
  cols.append(ls, rec); v.append(cols);
};

// ================= POS / NEW ORDER =================
let cart = [], cartCat = null, cartMenu = [], cartType = 'dine-in', cartTable = null, cartCustomer = null;
VIEWS.pos = async (v) => {
  const cats = await API.get('/menu/categories');
  cartMenu = await API.get('/menu/items');
  cart = []; cartCat = null;
  v.innerHTML = '';
  const wrap = el('div', { class: 'pos' });
  const left = el('div', { class: 'pos-menu' });

  // type + table selector
  const bar = el('div', { class: 'toolbar' });
  const typeSel = el('select', { onChange: e => cartType = e.target.value });
  ['dine-in','takeaway','delivery','qr'].forEach(t => typeSel.append(el('option', { value: t }, t)));
  const tbls = await API.get('/tables');
  const tblSel = el('select', { onChange: e => cartTable = e.target.value || null });
  tblSel.append(el('option', { value: '' }, 'No table'));
  tbls.forEach(t => tblSel.append(el('option', { value: t.id }, `${t.name} (${t.status})`)));
  bar.append(el('span', { class: 'muted' }, 'Type:'), typeSel, el('span', { class: 'muted' }, 'Table:'), tblSel);
  left.append(bar);

  const catRow = el('div', { class: 'cats' });
  catRow.append(el('div', { class: 'cat-pill active', onClick: e => filterCat(null, e.target) }, 'All'));
  cats.forEach(c => catRow.append(el('div', { class: 'cat-pill', onClick: e => filterCat(c.id, e.target) }, c.name)));
  left.append(catRow);
  const menuGrid = el('div', { class: 'menu-grid', id: 'menuGrid' });
  left.append(menuGrid);

  const cartBox = el('div', { class: 'cart' },
    el('div', { class: 'cart-head' }, 'Current Order'),
    el('div', { class: 'cart-items', id: 'cartItems' }),
    el('div', { class: 'cart-foot', id: 'cartFoot' }));

  wrap.append(left, cartBox); v.append(wrap);
  window.filterCat = (id, tab) => { cartCat = id; $$('.cat-pill').forEach(p => p.classList.remove('active')); tab.classList.add('active'); renderMenu(); };
  renderMenu(); renderCart();
};
function renderMenu() {
  const g = $('#menuGrid'); g.innerHTML = '';
  cartMenu.filter(m => !cartCat || m.category_id == cartCat).forEach(m => {
    const tile = el('div', { class: 'menu-tile' + (m.available ? '' : ' out'),
      onClick: () => m.available && addToCart(m) },
      el('div', { class: 'nm' }, m.name), el('div', { class: 'pr' }, money(m.price)));
    g.append(tile);
  });
}
function addToCart(m) {
  const line = cart.find(c => c.menu_item_id === m.id && !c.notes);
  if (line) line.qty++;
  else cart.push({ menu_item_id: m.id, name: m.name, price: m.price, qty: 1 });
  renderCart();
}
function renderCart() {
  const box = $('#cartItems'); box.innerHTML = '';
  cart.forEach((c, i) => {
    box.append(el('div', { class: 'cart-line' },
      el('div', {}, el('div', {}, c.name), el('small', { class: 'muted' }, money(c.price))),
      el('div', { class: 'qty' },
        el('button', { onClick: () => { c.qty--; if (c.qty <= 0) cart.splice(i, 1); renderCart(); } }, '−'),
        el('span', {}, String(c.qty)),
        el('button', { onClick: () => { c.qty++; renderCart(); } }, '+'))));
  });
  const total = cart.reduce((s, c) => s + c.qty * c.price, 0);
  const foot = $('#cartFoot'); foot.innerHTML = '';
  foot.append(el('div', { class: 'tot-row big' }, el('span', {}, 'Total'), el('span', {}, money(total))));
  foot.append(el('button', { class: 'btn primary block', style: 'margin-top:10px',
    onClick: sendOrder }, 'Send to Kitchen'));
  foot.append(el('button', { class: 'btn block', style: 'margin-top:6px',
    onClick: () => { cart = []; renderCart(); } }, 'Clear'));
}
async function sendOrder() {
  if (!cart.length) return toast('Cart is empty');
  const order = await API.post('/orders', { type: cartType, table_id: cartTable, items: cart });
  await API.post(`/orders/${order.id}/send-kitchen`);
  toast('Order ' + order.code + ' sent');
  cart = []; renderCart();
}

// ================= ORDERS =================
VIEWS.orders = async (v) => {
  const orders = await API.get('/orders?today=1');
  v.innerHTML = '';
  const toolbar = el('div', { class: 'toolbar' },
    el('span', { class: 'section-title', style: 'margin:0' }, "Today's Orders"), el('div', { class: 'spacer' }),
    el('button', { class: 'btn', onClick: () => go('pos') }, '+ New Order'));
  v.append(toolbar);
  const card = el('div', { class: 'card' });
  const t = el('table');
  t.innerHTML = '<tr><th>Code</th><th>Type</th><th>Items</th><th>Total</th><th>Status</th><th>Paid</th><th></th></tr>';
  orders.forEach(o => {
    const tr = el('tr');
    tr.innerHTML = `<td>${o.code}</td><td>${o.type}</td><td>${o.items.length}</td>
      <td>${money(o.total)}</td><td>${statusBadge(o.status)}</td><td>${o.paid ? '✔' : '—'}</td>`;
    const td = el('td', { class: 'row' });
    td.append(el('button', { class: 'btn sm', onClick: () => viewOrder(o.id) }, 'View'));
    if (!o.paid && o.status !== 'cancelled')
      td.append(el('button', { class: 'btn sm primary', onClick: () => payOrder(o.id) }, 'Pay'));
    tr.append(td); t.append(tr);
  });
  card.append(t); v.append(card);
};

async function viewOrder(id) {
  const o = await API.get('/orders/' + id);
  const c = el('div');
  const t = el('table'); t.innerHTML = '<tr><th>Item</th><th>Qty</th><th>Price</th></tr>';
  o.items.forEach(i => t.insertAdjacentHTML('beforeend',
    `<tr><td>${i.name}</td><td>${i.qty}</td><td>${money(i.qty * i.price)}</td></tr>`));
  c.append(t, el('p', { style: 'margin-top:10px' }, `Total: ${money(o.total)} · ${o.type} · `, statusBadge(o.status)));
  const acts = [{ label: 'Close', onClick: closeModal }];
  if (!o.paid && o.status !== 'cancelled') acts.push({ label: 'Pay', primary: true, onClick: () => { closeModal(); payOrder(id); } });
  modal('Order ' + o.code, c, acts);
}

async function payOrder(id) {
  const o = await API.get('/orders/' + id);
  const c = el('div');
  c.innerHTML = `<div class="tot-row big"><span>Amount Due</span><span>${money(o.total)}</span></div>`;
  const methodSel = el('select'); ['cash','card','qr'].forEach(m => methodSel.append(el('option', { value: m }, m.toUpperCase())));
  const disc = el('input', { type: 'number', placeholder: '0', value: o.discount || 0 });
  const tip = el('input', { type: 'number', placeholder: '0', value: o.tip || 0 });
  c.append(el('label', {}, 'Payment Method'), methodSel,
    el('label', {}, 'Discount'), disc, el('label', {}, 'Tip'), tip);
  modal('Take Payment', c, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Refund', danger: true, onClick: async () => { await API.post('/payments/refund', { order_id: id, amount: o.total }); closeModal(); toast('Refunded'); go('orders'); } },
    { label: 'Charge', primary: true, onClick: async () => {
      const total = Math.max(0, o.subtotal - Number(disc.value)) + Number(tip.value);
      await API.post('/payments', { order_id: id, method: methodSel.value, amount: total,
        discount: Number(disc.value), tip: Number(tip.value), close: true });
      closeModal(); toast('Payment complete'); go('orders');
    } }
  ]);
}

// ================= TABLES =================
VIEWS.tables = async (v) => {
  const tables = await API.get('/tables');
  v.innerHTML = '';
  const toolbar = el('div', { class: 'toolbar' },
    el('span', { class: 'section-title', style: 'margin:0' }, 'Floor Plan'), el('div', { class: 'spacer' }));
  if (['admin','manager'].includes(API.user.role))
    toolbar.append(el('button', { class: 'btn', onClick: () => editTable() }, '+ Add Table'),
      el('button', { class: 'btn', onClick: reservations }, '📅 Reservations'));
  v.append(toolbar);

  const legend = el('div', { class: 'row', style: 'margin-bottom:12px' });
  [['available','Available'],['occupied','Occupied'],['reserved','Reserved'],['cleaning','Cleaning']]
    .forEach(([s, l]) => legend.append(el('span', { class: 'badge ' + statusBadge(s).match(/b-\w+/)[0] }, l)));
  v.append(legend);

  const floor = el('div', { class: 'floor' });
  tables.forEach(t => {
    floor.append(el('div', { class: 'tbl ' + t.status, style: `left:${t.pos_x}px;top:${t.pos_y}px`,
      onClick: () => tableActions(t) },
      el('div', {}, t.name), el('small', {}, t.seats + ' seats'), el('small', {}, t.status)));
  });
  v.append(floor);
};

function tableActions(t) {
  const c = el('div');
  c.append(el('p', { class: 'muted' }, `${t.name} · ${t.zone} · ${t.seats} seats · ${t.status}`));
  const statusSel = el('select');
  ['available','occupied','reserved','cleaning'].forEach(s => statusSel.append(el('option', { value: s, selected: s === t.status }, s)));
  c.append(el('label', {}, 'Set Status'), statusSel);
  const acts = [{ label: 'Close', onClick: closeModal },
    { label: 'New Order', primary: true, onClick: () => { closeModal(); cartTable = t.id; go('pos'); } },
    { label: 'Save', onClick: async () => { await API.put('/tables/' + t.id, { status: statusSel.value }); closeModal(); toast('Updated'); go('tables'); } }];
  if (['admin','manager'].includes(API.user.role))
    acts.splice(1, 0, { label: 'Edit', onClick: () => { closeModal(); editTable(t); } });
  modal(t.name, c, acts);
}

function editTable(t = {}) {
  const c = el('div');
  const name = el('input', { placeholder: 'Table name', value: t.name || '' });
  const seats = el('input', { type: 'number', placeholder: 'Seats', value: t.seats || 4 });
  const zone = el('input', { placeholder: 'Zone', value: t.zone || 'Main' });
  const x = el('input', { type: 'number', placeholder: 'X', value: t.pos_x || 20 });
  const y = el('input', { type: 'number', placeholder: 'Y', value: t.pos_y || 20 });
  c.append(el('label', {}, 'Name'), name, el('label', {}, 'Seats'), seats, el('label', {}, 'Zone'), zone,
    el('div', { class: 'row' }, el('div', { style: 'flex:1' }, el('label', {}, 'X'), x), el('div', { style: 'flex:1' }, el('label', {}, 'Y'), y)));
  const acts = [{ label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      const body = { name: name.value, seats: +seats.value, zone: zone.value, pos_x: +x.value, pos_y: +y.value };
      if (t.id) await API.put('/tables/' + t.id, body); else await API.post('/tables', body);
      closeModal(); toast('Saved'); go('tables');
    } }];
  if (t.id) acts.splice(1, 0, { label: 'Delete', danger: true, onClick: () => confirmDialog('Delete table?', async () => { await API.del('/tables/' + t.id); closeModal(); go('tables'); }) });
  modal(t.id ? 'Edit Table' : 'Add Table', c, acts);
}

async function reservations() {
  const [res, tables] = await Promise.all([API.get('/tables/reservations/all'), API.get('/tables')]);
  const c = el('div');
  const t = el('table'); t.innerHTML = '<tr><th>Name</th><th>Party</th><th>Status</th></tr>';
  res.forEach(r => t.insertAdjacentHTML('beforeend',
    `<tr><td>${r.customer_name}</td><td>${r.party_size}</td><td>${statusBadge(r.status)}</td></tr>`));
  c.append(el('div', { class: 'section-title', style: 'margin-top:0' }, 'Reservations & Waiting List'), t);
  const name = el('input', { placeholder: 'Customer name' });
  const party = el('input', { type: 'number', placeholder: 'Party size', value: 2 });
  const tsel = el('select'); tsel.append(el('option', { value: '' }, 'No table (waiting list)'));
  tables.forEach(x => tsel.append(el('option', { value: x.id }, x.name)));
  c.append(el('div', { class: 'section-title' }, 'New Reservation'), name, party, tsel);
  modal('Reservations', c, [{ label: 'Close', onClick: closeModal },
    { label: 'Add', primary: true, onClick: async () => {
      await API.post('/tables/reservations', { customer_name: name.value, party_size: +party.value,
        table_id: tsel.value || null, status: tsel.value ? 'booked' : 'waiting' });
      closeModal(); toast('Reservation added');
    } }]);
}

// ================= KDS =================
let kdsTimer = null;
VIEWS.kds = async (v) => {
  clearInterval(kdsTimer);
  const render = async () => {
    const orders = await API.get('/orders/kds/active');
    v.innerHTML = '';
    v.append(el('div', { class: 'toolbar' }, el('span', { class: 'section-title', style: 'margin:0' }, 'Kitchen Display'),
      el('span', { class: 'muted' }, ' · auto-refresh 5s')));
    const grid = el('div', { class: 'kds-grid' });
    if (!orders.length) grid.append(el('p', { class: 'muted' }, 'No active kitchen orders 🎉'));
    orders.forEach(o => {
      const mins = Math.floor((Date.now() - new Date(o.created_at.replace(' ', 'T') + 'Z')) / 60000);
      const tk = el('div', { class: 'ticket ' + o.kitchen_status });
      tk.append(el('div', { class: 'ticket-head' },
        el('strong', {}, o.code + ' · ' + o.type), el('span', { class: 'muted' }, mins + 'm')));
      const ul = el('ul', { class: 'ticket-body' });
      o.items.forEach(i => ul.append(el('li', {}, `${i.qty}× ${i.name}`)));
      if (o.notes) ul.append(el('li', { class: 'muted' }, '📝 ' + o.notes));
      tk.append(ul);
      const foot = el('div', { class: 'ticket-foot' });
      const set = async (s) => { await API.patch('/orders/' + o.id, { kitchen_status: s, status: s === 'completed' ? 'ready' : 'kitchen' }); render(); };
      if (o.kitchen_status === 'new') foot.append(el('button', { class: 'btn sm primary block', onClick: () => set('preparing') }, 'Start Preparing'));
      else if (o.kitchen_status === 'preparing') foot.append(el('button', { class: 'btn sm primary block', onClick: () => set('ready') }, 'Mark Ready'));
      else foot.append(el('button', { class: 'btn sm block', onClick: () => set('completed') }, 'Complete'));
      tk.append(foot); grid.append(tk);
    });
    v.append(grid);
  };
  await render();
  kdsTimer = setInterval(render, 5000);
};

// ================= MENU MANAGEMENT =================
VIEWS.menu = async (v) => {
  const [cats, items] = await Promise.all([API.get('/menu/categories'), API.get('/menu/items')]);
  v.innerHTML = '';
  const toolbar = el('div', { class: 'toolbar' },
    el('span', { class: 'section-title', style: 'margin:0' }, 'Menu'), el('div', { class: 'spacer' }),
    el('button', { class: 'btn', onClick: () => editCategory() }, '+ Category'),
    el('button', { class: 'btn primary', onClick: () => editItem(null, cats) }, '+ Item'));
  v.append(toolbar);
  const card = el('div', { class: 'card' });
  const t = el('table');
  t.innerHTML = '<tr><th>Item</th><th>Category</th><th>Price</th><th>Available</th><th></th></tr>';
  items.forEach(i => {
    const cat = cats.find(c => c.id === i.category_id)?.name || '—';
    const tr = el('tr');
    tr.innerHTML = `<td>${i.name}</td><td>${cat}</td><td>${money(i.price)}</td>`;
    const avail = el('td'); const toggle = el('button', { class: 'btn sm ' + (i.available ? 'primary' : ''),
      onClick: async () => { await API.patch(`/menu/items/${i.id}/availability`, { available: i.available ? 0 : 1 }); go('menu'); } },
      i.available ? 'On' : 'Off'); avail.append(toggle); tr.append(avail);
    tr.append(el('td', {}, el('button', { class: 'btn sm', onClick: () => editItem(i, cats) }, 'Edit')));
    t.append(tr);
  });
  card.append(t); v.append(card);
};
function editCategory(c = {}) {
  const name = el('input', { placeholder: 'Category name', value: c.name || '' });
  modal(c.id ? 'Edit Category' : 'New Category', el('div', {}, el('label', {}, 'Name'), name), [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      if (c.id) await API.put('/menu/categories/' + c.id, { name: name.value });
      else await API.post('/menu/categories', { name: name.value });
      closeModal(); toast('Saved'); go('menu');
    } }]);
}
function editItem(i, cats) {
  i = i || {};
  const name = el('input', { placeholder: 'Item name', value: i.name || '' });
  const desc = el('input', { placeholder: 'Description', value: i.description || '' });
  const price = el('input', { type: 'number', step: '0.01', placeholder: 'Price', value: i.price || '' });
  const catSel = el('select'); cats.forEach(c => catSel.append(el('option', { value: c.id, selected: c.id === i.category_id }, c.name)));
  const c = el('div', {}, el('label', {}, 'Name'), name, el('label', {}, 'Description'), desc,
    el('label', {}, 'Category'), catSel, el('label', {}, 'Price'), price);
  const acts = [{ label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      const body = { name: name.value, description: desc.value, price: +price.value, category_id: +catSel.value };
      if (i.id) await API.put('/menu/items/' + i.id, body); else await API.post('/menu/items', body);
      closeModal(); toast('Saved'); go('menu');
    } }];
  if (i.id) acts.splice(1, 0, { label: 'Delete', danger: true, onClick: () => confirmDialog('Delete item?', async () => { await API.del('/menu/items/' + i.id); closeModal(); go('menu'); }) });
  modal(i.id ? 'Edit Item' : 'New Item', c, acts);
}

// ================= INVENTORY =================
VIEWS.inventory = async (v) => {
  const [ings, suppliers] = await Promise.all([API.get('/inventory/ingredients'), API.get('/inventory/suppliers')]);
  v.innerHTML = '';
  const toolbar = el('div', { class: 'toolbar' }, el('span', { class: 'section-title', style: 'margin:0' }, 'Inventory'),
    el('div', { class: 'spacer' }), el('button', { class: 'btn', onClick: () => editIngredient(null, suppliers) }, '+ Ingredient'));
  v.append(toolbar);
  const card = el('div', { class: 'card' });
  const t = el('table');
  t.innerHTML = '<tr><th>Ingredient</th><th>Stock</th><th>Reorder</th><th>Supplier</th><th></th></tr>';
  ings.forEach(i => {
    const low = i.stock <= i.reorder_level;
    const tr = el('tr');
    tr.innerHTML = `<td>${i.name}</td><td>${i.stock} ${i.unit} ${low ? statusBadge('unpaid').replace('unpaid','LOW') : ''}</td>
      <td>${i.reorder_level}</td><td>${i.supplier || '—'}</td>`;
    const td = el('td', { class: 'row' });
    td.append(el('button', { class: 'btn sm', onClick: () => stockMove(i, 'purchase') }, '+ Stock'));
    td.append(el('button', { class: 'btn sm', onClick: () => stockMove(i, 'waste') }, 'Waste'));
    tr.append(td); t.append(tr);
  });
  card.append(t); v.append(card);
};
function stockMove(i, reason) {
  const amt = el('input', { type: 'number', placeholder: 'Quantity', value: 1 });
  modal(`${reason === 'waste' ? 'Record Waste' : 'Add Stock'} · ${i.name}`,
    el('div', {}, el('label', {}, 'Quantity (' + i.unit + ')'), amt), [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      const change = reason === 'waste' ? -Math.abs(+amt.value) : Math.abs(+amt.value);
      await API.post('/inventory/movement', { ingredient_id: i.id, change, reason });
      closeModal(); toast('Recorded'); go('inventory');
    } }]);
}
function editIngredient(i, suppliers) {
  i = i || {};
  const name = el('input', { placeholder: 'Name', value: i.name || '' });
  const unit = el('input', { placeholder: 'Unit (kg, pc...)', value: i.unit || 'unit' });
  const stock = el('input', { type: 'number', placeholder: 'Initial stock', value: i.stock || 0 });
  const reorder = el('input', { type: 'number', placeholder: 'Reorder level', value: i.reorder_level || 0 });
  const supSel = el('select'); supSel.append(el('option', { value: '' }, 'No supplier'));
  suppliers.forEach(s => supSel.append(el('option', { value: s.id }, s.name)));
  modal('New Ingredient', el('div', {}, el('label', {}, 'Name'), name, el('label', {}, 'Unit'), unit,
    el('label', {}, 'Stock'), stock, el('label', {}, 'Reorder level'), reorder, el('label', {}, 'Supplier'), supSel), [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      await API.post('/inventory/ingredients', { name: name.value, unit: unit.value, stock: +stock.value,
        reorder_level: +reorder.value, supplier_id: supSel.value || null });
      closeModal(); toast('Saved'); go('inventory');
    } }]);
}

// ================= CUSTOMERS =================
VIEWS.customers = async (v) => {
  v.innerHTML = '';
  const search = el('input', { placeholder: 'Search name or phone…', style: 'max-width:280px' });
  const toolbar = el('div', { class: 'toolbar' }, el('span', { class: 'section-title', style: 'margin:0' }, 'Customers'),
    search, el('div', { class: 'spacer' }), el('button', { class: 'btn primary', onClick: () => editCustomer() }, '+ Customer'));
  v.append(toolbar);
  const card = el('div', { class: 'card', id: 'custCard' });
  v.append(card);
  const load = async () => {
    const list = await API.get('/customers?q=' + encodeURIComponent(search.value));
    const t = el('table');
    t.innerHTML = '<tr><th>Name</th><th>Phone</th><th>Points</th><th>Level</th><th></th></tr>';
    list.forEach(c => {
      const tr = el('tr');
      tr.innerHTML = `<td>${c.name}</td><td>${c.phone || '—'}</td><td>${c.loyalty_points}</td><td>${c.membership}</td>`;
      tr.append(el('td', {}, el('button', { class: 'btn sm', onClick: () => editCustomer(c) }, 'Edit')));
      t.append(tr);
    });
    card.innerHTML = ''; card.append(t);
  };
  search.addEventListener('input', load); await load();
};
function editCustomer(c = {}) {
  const name = el('input', { placeholder: 'Name', value: c.name || '' });
  const phone = el('input', { placeholder: 'Phone', value: c.phone || '' });
  const email = el('input', { placeholder: 'Email', value: c.email || '' });
  const bday = el('input', { type: 'date', value: c.birthday || '' });
  const notes = el('textarea', { placeholder: 'Notes' }); notes.value = c.notes || '';
  modal(c.id ? 'Edit Customer' : 'New Customer', el('div', {}, el('label', {}, 'Name'), name,
    el('label', {}, 'Phone'), phone, el('label', {}, 'Email'), email, el('label', {}, 'Birthday'), bday,
    el('label', {}, 'Notes'), notes), [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      const body = { name: name.value, phone: phone.value, email: email.value, birthday: bday.value, notes: notes.value };
      if (c.id) await API.put('/customers/' + c.id, body); else await API.post('/customers', body);
      closeModal(); toast('Saved'); go('customers');
    } }]);
}

// ================= STAFF =================
VIEWS.staff = async (v) => {
  const users = await API.get('/auth/users');
  v.innerHTML = '';
  const toolbar = el('div', { class: 'toolbar' }, el('span', { class: 'section-title', style: 'margin:0' }, 'Staff'),
    el('div', { class: 'spacer' }),
    el('button', { class: 'btn', onClick: showAudit }, '📜 Activity Log'),
    el('button', { class: 'btn primary', onClick: () => editUser() }, '+ Employee'));
  v.append(toolbar);
  const card = el('div', { class: 'card' });
  const t = el('table');
  t.innerHTML = '<tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr>';
  users.forEach(u => {
    const tr = el('tr');
    tr.innerHTML = `<td>${u.name}</td><td>${u.username}</td><td>${u.role}</td>
      <td>${u.active ? statusBadge('available').replace('available','active') : statusBadge('cancelled').replace('cancelled','inactive')}</td>`;
    tr.append(el('td', {}, el('button', { class: 'btn sm', onClick: () => editUser(u) }, 'Edit')));
    t.append(tr);
  });
  card.append(t); v.append(card);
};
function editUser(u = {}) {
  const name = el('input', { placeholder: 'Full name', value: u.name || '' });
  const username = el('input', { placeholder: 'Username', value: u.username || '' });
  const pass = el('input', { type: 'password', placeholder: u.id ? 'New password (blank = keep)' : 'Password' });
  const roleSel = el('select'); ['admin','manager','cashier','waiter','kitchen'].forEach(r => roleSel.append(el('option', { value: r, selected: r === u.role }, r)));
  const c = el('div', {}, el('label', {}, 'Name'), name, el('label', {}, 'Username'), username,
    el('label', {}, 'Password'), pass, el('label', {}, 'Role'), roleSel);
  const acts = [{ label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      if (u.id) await API.put('/auth/users/' + u.id, { name: name.value, role: roleSel.value, active: 1, password: pass.value || undefined });
      else await API.post('/auth/users', { name: name.value, username: username.value, password: pass.value, role: roleSel.value });
      closeModal(); toast('Saved'); go('staff');
    } }];
  modal(u.id ? 'Edit Employee' : 'New Employee', c, acts);
}
async function showAudit() {
  const logs = await API.get('/auth/audit');
  const t = el('table'); t.innerHTML = '<tr><th>User</th><th>Action</th><th>When</th></tr>';
  logs.forEach(l => t.insertAdjacentHTML('beforeend',
    `<tr><td>${l.name || '—'}</td><td>${l.action}</td><td>${fmtDate(l.ts)}</td></tr>`));
  modal('Activity Log', t, [{ label: 'Close', onClick: closeModal }]);
}

// ================= REPORTS =================
VIEWS.reports = async (v) => {
  v.innerHTML = '';
  const tabs = el('div', { class: 'toolbar' });
  const box = el('div', { class: 'card', id: 'reportBox' });
  const loaders = {
    'Sales (Daily)': () => API.get('/reports/sales?period=day'),
    'Sales (Monthly)': () => API.get('/reports/sales?period=month'),
    'Products': () => API.get('/reports/products'),
    'Categories': () => API.get('/reports/categories'),
    'Staff': () => API.get('/reports/staff'),
  };
  const show = async (name) => {
    const rows = await loaders[name]();
    const t = el('table');
    if (!rows.length) { box.innerHTML = ''; box.append(el('p', { class: 'muted' }, 'No data')); return; }
    t.innerHTML = '<tr>' + Object.keys(rows[0]).map(k => `<th>${k}</th>`).join('') + '</tr>';
    rows.forEach(r => t.insertAdjacentHTML('beforeend',
      '<tr>' + Object.entries(r).map(([k, val]) =>
        `<td>${/revenue|sales|total/i.test(k) ? money(val) : val}</td>`).join('') + '</tr>'));
    box.innerHTML = '';
    const exp = el('div', { class: 'toolbar' }, el('div', { class: 'spacer' }),
      el('button', { class: 'btn sm', onClick: () => exportCSV(name, rows) }, '⬇ Export CSV'));
    box.append(exp, t);
  };
  Object.keys(loaders).forEach((name, i) => tabs.append(el('button', { class: 'btn' + (i === 0 ? ' primary' : ''),
    onClick: e => { $$('#view .toolbar .btn').forEach(b => b.classList.remove('primary')); e.target.classList.add('primary'); show(name); } }, name)));
  v.append(tabs, box);
  show('Sales (Daily)');
};
function exportCSV(name, rows) {
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k]}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = el('a', { href: URL.createObjectURL(blob), download: name.replace(/\W+/g, '_') + '.csv' });
  a.click();
}

// ================= SETTINGS =================
VIEWS.settings = async (v) => {
  const s = await API.get('/settings');
  v.innerHTML = '';
  let logo = s.logo || '';

  const logoCard = el('div', { class: 'card', style: 'max-width:520px;margin-bottom:16px' },
    el('div', { class: 'section-title', style: 'margin-top:0' }, 'Restaurant Logo'));
  const preview = el('img', { class: 'preview', src: logo });
  const emptyState = el('div', { class: 'preview-empty' }, '🍽️');
  preview.style.display = logo ? '' : 'none';
  emptyState.style.display = logo ? 'none' : '';
  const fileInput = el('input', { type: 'file', accept: 'image/*', style: 'width:auto' });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        const out = canvas.toDataURL('image/png');
        if (out.length > 60000) { toast('Logo too large — pick a simpler image'); return; }
        logo = out;
        preview.src = logo; preview.style.display = ''; emptyState.style.display = 'none';
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const removeBtn = el('button', { class: 'btn sm', onClick: () => {
    logo = ''; preview.style.display = 'none'; emptyState.style.display = ''; fileInput.value = '';
  } }, 'Remove');
  logoCard.append(el('div', { class: 'logo-upload' }, preview, emptyState, fileInput, removeBtn));

  const fields = [['restaurant_name','Restaurant Name'],['address','Address'],['phone','Phone'],
    ['currency','Currency Symbol'],['timezone','Time Zone'],['language','Language'],['receipt_footer','Receipt Footer']];
  const card = el('div', { class: 'card', style: 'max-width:520px' });
  const inputs = {};
  fields.forEach(([k, l]) => { const i = el('input', { value: s[k] || '' }); inputs[k] = i; card.append(el('label', {}, l), i); });
  card.append(el('button', { class: 'btn primary', style: 'margin-top:16px', onClick: async () => {
    const body = {}; Object.entries(inputs).forEach(([k, i]) => body[k] = i.value);
    body.logo = logo;
    await API.put('/settings', body); CUR = body.currency || '$'; applyLogo(logo); toast('Settings saved');
  } }, 'Save Settings'));

  const backup = el('div', { class: 'card', style: 'max-width:520px;margin-top:16px' },
    el('div', { class: 'section-title', style: 'margin-top:0' }, 'Backup & Restore'),
    el('p', { class: 'muted', style: 'margin-bottom:10px' }, 'Download a full JSON backup of your data.'));
  if (API.user.role === 'admin')
    backup.append(el('button', { class: 'btn', onClick: async () => {
      const data = await API.get('/backup');
      const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
        download: 'pos-backup-' + new Date().toISOString().slice(0, 10) + '.json' }); a.click();
    } }, '⬇ Download Backup'));
  v.append(logoCard, card, backup);
};

// ---------- Boot ----------
if (API.token && API.user) startApp();
