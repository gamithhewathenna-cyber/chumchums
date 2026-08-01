// ---------- Theme ----------
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('pos_theme', t);
}
applyTheme(localStorage.getItem('pos_theme') || 'dark');

// Show the saved logo/name on the login screen even before signing in
API.get('/settings/public').then(s => { if (s.logo) applyLogo(s.logo); applyBrandName(s.restaurant_name); }).catch(() => {});

// ---------- Auth ----------
async function doLogin() {
  const username = $('#loginUser').value.trim();
  const password = $('#loginPass').value;
  try {
    const { token, user } = await API.post('/auth/login', { username, password });
    API.setAuth(token, user, $('#rememberMe').checked);
    startApp();
  } catch (e) { $('#loginErr').textContent = e.message; }
}
$('#loginBtn').onclick = doLogin;
$('#loginPass').addEventListener('keydown', e => e.key === 'Enter' && doLogin());

$('#togglePass').onclick = () => {
  const showing = $('#loginPass').type === 'text';
  $('#loginPass').type = showing ? 'password' : 'text';
  $('#togglePass').textContent = showing ? '👁' : '🙈';
  $('#togglePass').setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
};

$('#forgotPass').onclick = (e) => {
  e.preventDefault();
  modal('Forgot Password', el('p', {}, 'Passwords can\'t be reset by email on this system. Please contact your manager or admin — they can set a new password for you from Staff, or an admin can reset it directly in the database.'),
    [{ label: 'Close', primary: true, onClick: closeModal }]);
};

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
const ICON_SVG_WRAP = 'viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  dashboard: `<svg ${ICON_SVG_WRAP}><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>`,
  pos: `<svg ${ICON_SVG_WRAP}><rect x="2" y="2" width="16" height="16" rx="4"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/></svg>`,
  orders: `<svg ${ICON_SVG_WRAP}><rect x="4" y="3" width="12" height="15" rx="1.5"/><rect x="7" y="1.3" width="6" height="3" rx="1"/><polyline points="7,11 9,13 13,8.5"/></svg>`,
  online: `<svg ${ICON_SVG_WRAP}><circle cx="10" cy="15" r="1.3" fill="currentColor" stroke="none"/><path d="M6 12c1.1-1 2.5-1.6 4-1.6s2.9.6 4 1.6"/><path d="M3 9c1.9-1.9 4.4-3 7-3s5.1 1.1 7 3"/></svg>`,
  tables: `<svg ${ICON_SVG_WRAP}><circle cx="10" cy="10" r="5"/><circle cx="10" cy="2.2" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="17.8" r="1" fill="currentColor" stroke="none"/><circle cx="2.2" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="17.8" cy="10" r="1" fill="currentColor" stroke="none"/></svg>`,
  kds: `<svg ${ICON_SVG_WRAP}><rect x="3" y="8" width="14" height="8" rx="1.5"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="17" y1="8" x2="19" y2="8"/><path d="M6 8V6a4 4 0 018 0v2"/></svg>`,
  menu: `<svg ${ICON_SVG_WRAP}><path d="M10 4C8 2.5 5 2 2 2v13c3 0 6 .5 8 2 2-1.5 5-2 8-2V2c-3 0-6 .5-8 2z"/><line x1="10" y1="4" x2="10" y2="17"/></svg>`,
  inventory: `<svg ${ICON_SVG_WRAP}><path d="M10 2l8 4v8l-8 4-8-4V6z"/><polyline points="2,6 10,10 18,6"/><line x1="10" y1="10" x2="10" y2="18"/></svg>`,
  customers: `<svg ${ICON_SVG_WRAP}><circle cx="7" cy="6" r="3"/><path d="M1 18c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="15" cy="7" r="2.3"/><path d="M13.5 12.2c2.6.4 4.5 2.7 4.5 5.3"/></svg>`,
  staff: `<svg ${ICON_SVG_WRAP}><rect x="3" y="2" width="14" height="16" rx="2"/><circle cx="10" cy="8" r="2.5"/><path d="M6 15c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>`,
  reports: `<svg ${ICON_SVG_WRAP}><line x1="2" y1="17" x2="18" y2="17"/><rect x="4" y="11" width="3" height="6"/><rect x="9" y="7" width="3" height="10"/><rect x="14" y="3" width="3" height="14"/></svg>`,
  settings: `<svg ${ICON_SVG_WRAP}><line x1="2" y1="5" x2="18" y2="5"/><circle cx="7" cy="5" r="2"/><line x1="2" y1="10" x2="18" y2="10"/><circle cx="13" cy="10" r="2"/><line x1="2" y1="15" x2="18" y2="15"/><circle cx="9" cy="15" r="2"/></svg>`,
};
const NAV = [
  { id: 'dashboard', label: 'Dashboard', roles: ['admin','manager','cashier','waiter','kitchen'] },
  { id: 'pos', label: 'New Order', roles: ['admin','manager','cashier','waiter'] },
  { id: 'orders', label: 'Orders', roles: ['admin','manager','cashier','waiter'] },
  { id: 'online', label: 'Online Orders', roles: ['admin','manager','cashier','waiter'] },
  { id: 'tables', label: 'Tables', roles: ['admin','manager','cashier','waiter'] },
  { id: 'kds', label: 'Kitchen (KDS)', roles: ['admin','manager','kitchen'] },
  { id: 'menu', label: 'Menu', roles: ['admin','manager'] },
  { id: 'inventory', label: 'Inventory', roles: ['admin','manager'] },
  { id: 'customers', label: 'Customers', roles: ['admin','manager','cashier'] },
  { id: 'staff', label: 'Staff', roles: ['admin','manager'] },
  { id: 'reports', label: 'Reports', roles: ['admin','manager'] },
  { id: 'settings', label: 'Settings', roles: ['admin','manager'] },
];

const NAV_BADGE_IDS = { online: 'onlineBadge', kds: 'kdsBadge', orders: 'ordersBadge' };
function buildNav() {
  const nav = $('#nav'); nav.innerHTML = '';
  NAV.filter(n => n.roles.includes(API.user.role)).forEach(n => {
    const item = el('div', { class: 'nav-item', 'data-view': n.id, onClick: () => go(n.id) },
      el('span', { class: 'ic', html: ICONS[n.id] }), el('span', {}, n.label));
    if (NAV_BADGE_IDS[n.id]) item.append(el('span', { class: 'nav-badge hidden', id: NAV_BADGE_IDS[n.id] }, '0'));
    nav.append(item);
  });
}

// ---------- App-wide notifications: new online orders, new kitchen tickets, ready-to-serve ----------
const NOTIFY_TYPES = {
  online:  { icon: '🔔', view: 'online', label: n => `${n} new online order${n > 1 ? 's' : ''} waiting for review` },
  kitchen: { icon: '👨‍🍳', view: 'kds', cls: 'b-kitchen', label: n => `${n} new order${n > 1 ? 's' : ''} sent to the kitchen` },
  ready:   { icon: '🍽️', view: 'orders', cls: 'b-ready', label: n => `${n} order${n > 1 ? 's' : ''} ready to serve` },
};
const notifyState = { online: { count: null, dismissedAt: 0 }, kitchen: { count: null, dismissedAt: 0 }, ready: { count: null, dismissedAt: 0 } };

function renderNotifyBar() {
  const bar = $('#notifyBar'); bar.innerHTML = '';
  Object.entries(NOTIFY_TYPES).forEach(([key, cfg]) => {
    const st = notifyState[key];
    if (st.count > 0 && st.count > st.dismissedAt) {
      bar.append(el('div', { class: 'notify-row' + (cfg.cls ? ' ' + cfg.cls : '') },
        el('span', {}, cfg.icon + ' ' + cfg.label(st.count)),
        el('div', { class: 'spacer' }),
        el('button', { class: 'btn sm', onClick: () => { renderNotifyBar(); go(cfg.view); } }, 'View'),
        el('button', { class: 'btn sm ghost', onClick: () => { st.dismissedAt = st.count; renderNotifyBar(); } }, '✕')));
    }
  });
  bar.classList.toggle('hidden', !bar.children.length);
}

function updateBadge(id, count) {
  const badge = $('#' + id);
  if (!badge) return;
  if (count > 0) { badge.textContent = String(count); badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

async function pollNotifications() {
  const role = API.user.role;
  try {
    if (NAV.find(n => n.id === 'online').roles.includes(role)) {
      const pending = await API.get('/orders?status=pending&source=online');
      updateBadge('onlineBadge', pending.length);
      if (notifyState.online.count !== null && pending.length > notifyState.online.count) toast('🔔 New online order received!');
      notifyState.online.count = pending.length;
      if (pending.length === 0) notifyState.online.dismissedAt = 0;
    }
  } catch (e) { /* ignore transient poll failures */ }

  const canKds = NAV.find(n => n.id === 'kds').roles.includes(role);
  const canOrders = NAV.find(n => n.id === 'orders').roles.includes(role);
  if (canKds || canOrders) {
    try {
      const active = await API.get('/orders/kds/active');
      if (canKds) {
        const newCount = active.filter(o => o.kitchen_status === 'new').length;
        updateBadge('kdsBadge', newCount);
        if (notifyState.kitchen.count !== null && newCount > notifyState.kitchen.count) toast('👨‍🍳 New order sent to the kitchen');
        notifyState.kitchen.count = newCount;
        if (newCount === 0) notifyState.kitchen.dismissedAt = 0;
      }
      if (canOrders) {
        const readyCount = active.filter(o => o.kitchen_status === 'ready').length;
        updateBadge('ordersBadge', readyCount);
        if (notifyState.ready.count !== null && readyCount > notifyState.ready.count) toast('🍽️ Order ready to serve!');
        notifyState.ready.count = readyCount;
        if (readyCount === 0) notifyState.ready.dismissedAt = 0;
      }
    } catch (e) { /* ignore transient poll failures */ }
  }
  renderNotifyBar();
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
  try { const s = await API.get('/settings'); CUR = s.currency || '$'; applyLogo(s.logo || ''); applyBrandName(s.restaurant_name); } catch {}
  buildNav();
  go('dashboard');
  pollNotifications();
  setInterval(pollNotifications, 15000);
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
let cart = [], cartCat = null, cartMenu = [], cartType = 'dine-in', cartTable = null, cartCustomer = null, cartAddonGroups = [];
VIEWS.pos = async (v) => {
  const cats = await API.get('/menu/categories');
  cartMenu = await API.get('/menu/items');
  cartAddonGroups = await API.get('/addons/groups');
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
      onClick: () => m.available && (m.addon_group_id ? openExtrasModal(m) : addToCart(m)) });
    tile.append(m.image ? el('img', { class: 'tile-img', src: m.image, alt: '' }) : el('div', { class: 'tile-img tile-noimg' }, 'No Image'));
    tile.append(el('div', { class: 'nm' }, m.name), el('div', { class: 'pr' }, money(m.price)));
    g.append(tile);
  });
}
function openExtrasModal(m) {
  const group = cartAddonGroups.find(g => g.id === m.addon_group_id);
  if (!group || !group.items.length) { addToCart(m); return; }
  const selected = new Set();
  const list = el('div');
  const totalLine = el('div', { class: 'tot-row big', style: 'margin-top:10px' });
  const updateTotal = () => {
    const extra = group.items.filter(it => selected.has(it.id)).reduce((s, it) => s + Number(it.price), 0);
    totalLine.innerHTML = ''; totalLine.append(el('span', {}, 'Total'), el('span', {}, money(Number(m.price) + extra)));
  };
  group.items.forEach(it => {
    const input = el('input', { type: group.selection_type === 'single' ? 'radio' : 'checkbox', name: 'extras', style: 'width:auto;margin:0' });
    input.onchange = () => {
      if (group.selection_type === 'single') { selected.clear(); if (input.checked) selected.add(it.id); }
      else { input.checked ? selected.add(it.id) : selected.delete(it.id); }
      updateTotal();
    };
    list.append(el('label', { class: 'row', style: 'gap:8px;font-weight:400' }, input, `${it.name} (+${money(it.price)})`));
  });
  updateTotal();
  const c = el('div', {}, el('p', { class: 'muted', style: 'margin-top:0' },
    group.selection_type === 'single' ? 'Choose one:' : 'Choose any:'), list, totalLine);
  modal('Add Extras — ' + m.name, c, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Add to Cart', primary: true, onClick: () => {
      const chosen = group.items.filter(it => selected.has(it.id)).map(it => ({ name: it.name, price: Number(it.price) }));
      const extraTotal = chosen.reduce((s, it) => s + it.price, 0);
      addToCart(m, chosen.length ? chosen : null, extraTotal);
      closeModal();
    } }
  ]);
}
function addToCart(m, modifiers = null, extraPrice = 0) {
  const modKey = modifiers ? JSON.stringify(modifiers) : '';
  const line = cart.find(c => c.menu_item_id === m.id && (c._modKey || '') === modKey);
  if (line) line.qty++;
  else cart.push({ menu_item_id: m.id, name: m.name, price: Number(m.price) + Number(extraPrice), qty: 1, modifiers: modifiers || undefined, _modKey: modKey });
  renderCart();
}
function renderCart() {
  const box = $('#cartItems'); box.innerHTML = '';
  cart.forEach((c, i) => {
    const info = el('div', {}, el('div', {}, c.name));
    if (c.modifiers && c.modifiers.length) info.append(el('small', { class: 'muted', style: 'display:block' }, '+ ' + c.modifiers.map(mo => mo.name).join(', +')));
    info.append(el('small', { class: 'muted' }, money(c.price)));
    box.append(el('div', { class: 'cart-line' }, info,
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
    onClick: payFirstAndSend }, '💳 Pay First, Then Send'));
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
async function payFirstAndSend() {
  if (!cart.length) return toast('Cart is empty');
  const order = await API.post('/orders', { type: cartType, table_id: cartTable, items: cart, hold: true });
  cart = []; renderCart();
  payOrder(order.id, true);
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
    `<tr><td>${i.name}${i.modifiers && i.modifiers.length ? `<br><small class="muted">+ ${i.modifiers.map(mo => mo.name).join(', +')}</small>` : ''}</td><td>${i.qty}</td><td>${money(i.qty * i.price)}</td></tr>`));
  c.append(t, el('p', { style: 'margin-top:10px', html: `Total: ${money(o.total)} · ${o.type} · ${statusBadge(o.status)}` }));
  const acts = [{ label: 'Close', onClick: closeModal }];
  if (o.paid) acts.push({ label: '🖨️ Print Receipt', onClick: () => printReceipt(o) });
  if (o.kitchen_status === 'held')
    acts.push({ label: 'Send to Kitchen', onClick: async () => { await API.post(`/orders/${id}/send-kitchen`); closeModal(); toast('Sent to kitchen'); go('orders'); } });
  if (!o.paid && o.status !== 'cancelled') acts.push({ label: 'Pay', primary: true, onClick: () => { closeModal(); payOrder(id); } });
  modal('Order ' + o.code, c, acts);
}

async function printReceipt(o) {
  let s = {};
  try { s = await API.get('/settings'); } catch (e) {}
  const lines = o.items.map(i => {
    const mods = i.modifiers && i.modifiers.length
      ? `<div class="rc-line" style="font-size:11px;padding-left:10px"><span>+ ${i.modifiers.map(mo => mo.name).join(', +')}</span><span></span></div>` : '';
    return `<div class="rc-line"><span>${i.qty}× ${i.name}</span><span>${money(i.qty * i.price)}</span></div>${mods}`;
  }).join('');
  const billLogo = s.receipt_logo || s.logo;
  $('#receiptArea').innerHTML = `
    <div class="rc-head">
      ${billLogo ? `<img class="rc-logo" src="${billLogo}" />` : ''}
      <h2>${s.restaurant_name || 'Receipt'}</h2>
      ${s.address ? `<div>${s.address}</div>` : ''}
      ${s.phone ? `<div>${s.phone}</div>` : ''}
    </div>
    <hr/>
    <div class="rc-meta"><span>Order ${o.code}</span><span>${fmtDate(o.created_at)}</span></div>
    <div class="rc-meta"><span>${o.type}</span><span>${o.table_id ? 'Table ' + o.table_id : ''}</span></div>
    <hr/>
    ${lines}
    <hr/>
    <div class="rc-line"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
    ${o.discount ? `<div class="rc-line"><span>Discount</span><span>-${money(o.discount)}</span></div>` : ''}
    ${o.tip ? `<div class="rc-line"><span>Tip</span><span>${money(o.tip)}</span></div>` : ''}
    <div class="rc-line rc-total"><span>Total</span><span>${money(o.total)}</span></div>
    ${o.payment_method ? `<div class="rc-meta"><span>Payment</span><span>${o.payment_method.toUpperCase()}</span></div>` : ''}
    <hr/>
    <div class="rc-footer">${s.receipt_footer || 'Thank you!'}</div>
  `;
  setTimeout(() => window.print(), 50);
}

async function payOrder(id, sendToKitchenAfter = false) {
  const o = await API.get('/orders/' + id);
  const c = el('div');
  c.innerHTML = `<div class="tot-row big"><span>Amount Due</span><span>${money(o.total)}</span></div>`;
  if (sendToKitchenAfter) c.append(el('p', { class: 'muted' }, 'This order will be sent to the kitchen once payment is charged.'));
  const methodSel = el('select'); ['cash','card','qr'].forEach(m => methodSel.append(el('option', { value: m }, m.toUpperCase())));
  const disc = el('input', { type: 'number', placeholder: '0', value: o.discount || 0 });
  const tip = el('input', { type: 'number', placeholder: '0', value: o.tip || 0 });
  c.append(el('label', {}, 'Payment Method'), methodSel,
    el('label', {}, 'Discount'), disc, el('label', {}, 'Tip'), tip);
  const acts = [{ label: 'Cancel', onClick: closeModal }];
  if (!sendToKitchenAfter) acts.push({ label: 'Refund', danger: true, onClick: async () => { await API.post('/payments/refund', { order_id: id, amount: o.total }); closeModal(); toast('Refunded'); go('orders'); } });
  acts.push({ label: sendToKitchenAfter ? 'Charge & Send to Kitchen' : 'Charge', primary: true, onClick: async () => {
    const total = Math.max(0, o.subtotal - Number(disc.value)) + Number(tip.value);
    await API.post('/payments', { order_id: id, method: methodSel.value, amount: total,
      discount: Number(disc.value), tip: Number(tip.value), close: true });
    if (sendToKitchenAfter) await API.post(`/orders/${id}/send-kitchen`);
    toast(sendToKitchenAfter ? 'Paid and sent to kitchen' : 'Payment complete'); go('orders');
    const paid = await API.get('/orders/' + id);
    modal('Payment Complete', el('p', {}, `Order ${paid.code} · ${money(paid.total)} paid.`),
      [{ label: 'Close', onClick: closeModal }, { label: '🖨️ Print Receipt', primary: true, onClick: () => printReceipt(paid) }]);
  } });
  modal('Take Payment', c, acts);
}

// ================= ONLINE ORDERS =================
let onlineTimer = null, onlineViewSig = null;
VIEWS.online = async (v) => {
  clearInterval(onlineTimer);
  onlineViewSig = null;
  const render = async () => {
    const [orders, tables] = await Promise.all([API.get('/orders?status=pending&source=online'), API.get('/tables')]);
    const sig = orders.map(o => o.id).join(',');
    if (sig === onlineViewSig) return; // nothing changed — skip the rebuild so the screen doesn't flicker
    onlineViewSig = sig;
    v.innerHTML = '';
    v.append(el('div', { class: 'toolbar' }, el('span', { class: 'section-title', style: 'margin:0' }, 'Online Orders'),
      el('span', { class: 'muted' }, ' · auto-refresh 8s'), el('div', { class: 'spacer' }),
      el('button', { class: 'btn', onClick: () => window.open('/order.html', '_blank') }, '🔗 View Public Ordering Page')));
    if (!orders.length) { v.append(el('p', { class: 'muted' }, 'No pending online orders 🎉')); return; }
    const grid = el('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(300px,1fr))' });
    orders.forEach(o => {
      const tbl = tables.find(t => t.id === o.table_id);
      const mins = Math.floor((Date.now() - new Date(o.created_at.replace(' ', 'T') + 'Z')) / 60000);
      const card = el('div', { class: 'card' });
      card.append(el('div', { class: 'row between' }, el('strong', {}, o.code), el('span', { class: 'muted' }, mins + 'm ago')));
      card.append(el('p', {}, '🍽️ Table ' + (tbl ? tbl.name : '—')));
      card.append(el('p', {}, o.customer_name || '—', el('br', {}),
        el('small', { class: 'muted' }, [o.customer_email, o.customer_phone].filter(Boolean).join(' · '))));
      const ul = el('ul', { style: 'margin:8px 0;padding-left:18px' });
      o.items.forEach(i => ul.append(el('li', { html: `${i.qty}× ${i.name}` + (i.modifiers && i.modifiers.length ? ` <small class="muted">(+ ${i.modifiers.map(mo => mo.name).join(', +')})</small>` : '') })));
      card.append(ul);
      if (o.notes) card.append(el('p', { class: 'muted' }, '📝 ' + o.notes));
      card.append(el('div', { class: 'tot-row big' }, el('span', {}, 'Total'), el('span', {}, money(o.total))));
      const acts = el('div', { class: 'row', style: 'margin-top:10px' });
      acts.append(el('button', { class: 'btn primary', onClick: async () => {
        await API.post(`/orders/${o.id}/send-kitchen`); toast('Order accepted'); render();
      } }, '✔ Accept'));
      acts.append(el('button', { class: 'btn danger', onClick: () => confirmDialog('Reject this order?', async () => {
        await API.post(`/orders/${o.id}/reject`); toast('Order rejected'); render();
      }) }, '✕ Reject'));
      card.append(acts);
      grid.append(card);
    });
    v.append(grid);
  };
  await render();
  onlineTimer = setInterval(render, 8000);
};

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
  const linkBox = el('input', { type: 'text', readOnly: true, value: location.origin + '/order.html?table=' + t.id });
  c.append(el('label', {}, 'Ordering Link (QR / tablet)'),
    el('div', { class: 'row' }, linkBox, el('button', { class: 'btn sm', onClick: () => copyToClipboard(linkBox.value) }, 'Copy')),
    el('p', { class: 'muted', style: 'font-size:12px;margin-top:4px' }, 'Encode this link with any QR generator and print it for this table.'));
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
let kdsTimer = null, kdsSig = null;
VIEWS.kds = async (v) => {
  clearInterval(kdsTimer);
  kdsSig = null;
  const render = async () => {
    const orders = await API.get('/orders/kds/active');
    const sig = orders.map(o => `${o.id}:${o.kitchen_status}`).join('|');
    if (sig === kdsSig) return; // nothing changed — skip the rebuild so the screen doesn't flicker
    kdsSig = sig;
    v.innerHTML = '';
    const toolbar = el('div', { class: 'toolbar' }, el('span', { class: 'section-title', style: 'margin:0' }, 'Kitchen Display'),
      el('span', { class: 'muted' }, ' · auto-refresh 5s'));
    if (API.user.role === 'admin')
      toolbar.append(el('div', { class: 'spacer' }), el('button', { class: 'btn', onClick: () => showKdsSummary(orders) }, '📋 Summary'));
    v.append(toolbar);
    const grid = el('div', { class: 'kds-grid' });
    if (!orders.length) grid.append(el('p', { class: 'muted' }, 'No active kitchen orders 🎉'));
    orders.forEach(o => {
      const mins = Math.floor((Date.now() - new Date(o.created_at.replace(' ', 'T') + 'Z')) / 60000);
      const tk = el('div', { class: 'ticket ' + o.kitchen_status });
      tk.append(el('div', { class: 'ticket-head' },
        el('strong', {}, o.code + ' · ' + o.type), el('span', { class: 'muted' }, mins + 'm')));
      const ul = el('ul', { class: 'ticket-body' });
      o.items.forEach(i => ul.append(el('li', { html: `${i.qty}× ${i.name}` + (i.modifiers && i.modifiers.length ? ` <small class="muted">(+ ${i.modifiers.map(mo => mo.name).join(', +')})</small>` : '') })));
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
function showKdsSummary(orders) {
  const counts = {};
  orders.forEach(o => o.items.forEach(i => {
    const key = i.name + (i.modifiers && i.modifiers.length ? ' (+ ' + i.modifiers.map(mo => mo.name).join(', +') + ')' : '');
    counts[key] = (counts[key] || 0) + i.qty;
  }));
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const c = el('div');
  if (!rows.length) c.append(el('p', { class: 'muted' }, 'No active items to prepare'));
  else {
    const t = el('table'); t.innerHTML = '<tr><th>Item</th><th>Total Qty</th></tr>';
    rows.forEach(([name, qty]) => t.insertAdjacentHTML('beforeend', `<tr><td>${name}</td><td>${qty}</td></tr>`));
    c.append(t);
  }
  modal('Kitchen Summary · Prep Sheet', c, [{ label: 'Close', onClick: closeModal }]);
}

// ================= MENU MANAGEMENT =================
VIEWS.menu = async (v) => {
  const [cats, items, groups] = await Promise.all([API.get('/menu/categories'), API.get('/menu/items'), API.get('/addons/groups')]);
  v.innerHTML = '';
  const toolbar = el('div', { class: 'toolbar' },
    el('span', { class: 'section-title', style: 'margin:0' }, 'Menu'), el('div', { class: 'spacer' }),
    el('button', { class: 'btn', onClick: manageCategories }, '🗂️ Manage Categories'),
    el('button', { class: 'btn', onClick: manageAddonGroups }, '🧩 Add-on Groups'),
    el('button', { class: 'btn', onClick: () => editCategory() }, '+ Category'),
    el('button', { class: 'btn', onClick: () => bulkAddItems(cats) }, '📋 Bulk Add Items'),
    el('button', { class: 'btn primary', onClick: () => editItem(null, cats, groups) }, '+ Item'));
  v.append(toolbar);

  let activeCat = 'all';
  const selected = new Set();
  const catRow = el('div', { class: 'cats' });
  const pill = (id, label) => el('div', { class: 'cat-pill' + (id === activeCat ? ' active' : ''), onClick: (e) => {
    activeCat = id; selected.clear(); $$('.cats .cat-pill').forEach(p => p.classList.remove('active')); e.target.classList.add('active'); renderTable();
  } }, label);
  catRow.append(pill('all', 'All'));
  cats.forEach(c => catRow.append(pill(c.id, c.name)));
  v.append(catRow);

  const bulkBar = el('div', { class: 'toolbar hidden' });
  v.append(bulkBar);
  const card = el('div', { class: 'card' });
  v.append(card);

  function renderBulkBar() {
    bulkBar.innerHTML = '';
    bulkBar.classList.toggle('hidden', selected.size === 0);
    if (!selected.size) return;
    const setVisibility = async (showOnline) => {
      await Promise.all([...selected].map(id => API.patch(`/menu/items/${id}/visibility`, { show_online: showOnline })));
      toast('Updated ' + selected.size + ' item' + (selected.size > 1 ? 's' : ''));
      go('menu');
    };
    const deleteSelected = () => confirmDialog(`Delete ${selected.size} selected item${selected.size > 1 ? 's' : ''}?`, async () => {
      await Promise.all([...selected].map(id => API.del('/menu/items/' + id)));
      toast('Deleted ' + selected.size + ' item' + (selected.size > 1 ? 's' : ''));
      go('menu');
    });
    const groupSel = el('select', { style: 'width:auto;min-width:160px' });
    groupSel.append(el('option', { value: '' }, 'No extras'));
    groups.forEach(g => groupSel.append(el('option', { value: g.id }, g.name)));
    const assignGroup = async () => {
      await Promise.all([...selected].map(id => API.patch(`/menu/items/${id}/addon-group`, { addon_group_id: groupSel.value || null })));
      toast('Updated ' + selected.size + ' item' + (selected.size > 1 ? 's' : ''));
      go('menu');
    };
    bulkBar.append(
      el('span', { class: 'muted' }, `${selected.size} selected`),
      el('button', { class: 'btn sm', onClick: () => setVisibility(1) }, '🌐 Set Website Live'),
      el('button', { class: 'btn sm', onClick: () => setVisibility(0) }, '🏠 Set Only In Restaurant'),
      groupSel,
      el('button', { class: 'btn sm', onClick: assignGroup }, '🧩 Assign Add-on Group'),
      el('button', { class: 'btn sm danger', onClick: deleteSelected }, '🗑️ Delete Selected'),
      el('button', { class: 'btn sm ghost', onClick: () => { selected.clear(); renderBulkBar(); $$('.menu-row-check').forEach(c => c.checked = false); $('#menuSelectAll').checked = false; } }, 'Clear'));
  }

  function renderTable() {
    card.innerHTML = ''; renderBulkBar();
    const filtered = activeCat === 'all' ? items : items.filter(i => i.category_id === activeCat);
    if (!filtered.length) { card.append(el('p', { class: 'muted' }, 'No items in this category')); return; }
    const t = el('table');
    const selectAll = el('input', { type: 'checkbox', id: 'menuSelectAll', style: 'width:auto;margin:0' });
    selectAll.onchange = () => {
      filtered.forEach(i => selectAll.checked ? selected.add(i.id) : selected.delete(i.id));
      $$('.menu-row-check').forEach(c => c.checked = selectAll.checked);
      renderBulkBar();
    };
    t.append(el('tr', {}, el('th', {}, selectAll), el('th', {}, 'Image'), el('th', {}, 'Item'), el('th', {}, 'Category'),
      el('th', {}, 'Price'), el('th', {}, 'Available'), el('th', {}, 'Visibility'), el('th', {})));
    filtered.forEach(i => {
      const cat = cats.find(c => c.id === i.category_id)?.name || '—';
      const tr = el('tr');
      const check = el('input', { type: 'checkbox', class: 'menu-row-check', style: 'width:auto;margin:0' });
      check.checked = selected.has(i.id);
      check.onchange = () => { check.checked ? selected.add(i.id) : selected.delete(i.id); renderBulkBar(); };
      tr.append(el('td', {}, check));
      tr.append(el('td', {}, i.image ? el('img', { class: 'menu-thumb', src: i.image }) : el('div', { class: 'menu-thumb menu-thumb-empty' }, 'No Image')));
      tr.append(el('td', {}, i.name), el('td', {}, cat), el('td', {}, money(i.price)));
      const avail = el('td'); const toggle = el('button', { class: 'btn sm ' + (i.available ? 'primary' : ''),
        onClick: async () => { await API.patch(`/menu/items/${i.id}/availability`, { available: i.available ? 0 : 1 }); go('menu'); } },
        i.available ? 'On' : 'Off'); avail.append(toggle); tr.append(avail);
      tr.append(el('td', { html: i.show_online ? statusBadge('available').replace('available', '🌐 Live') : statusBadge('cancelled').replace('cancelled', '🏠 In-Store') }));
      tr.append(el('td', { class: 'row' },
        el('button', { class: 'btn sm', onClick: () => editItem(i, cats, groups) }, 'Edit'),
        el('button', { class: 'btn sm danger', onClick: () => confirmDialog(`Delete "${i.name}"?`, async () => {
          await API.del('/menu/items/' + i.id); toast('Deleted'); go('menu');
        }) }, 'Delete')));
      t.append(tr);
    });
    card.append(t);
  }
  renderTable();
};
function editCategory(c = {}) {
  const name = el('input', { placeholder: 'Category name', value: c.name || '' });
  const acts = [{ label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      if (c.id) await API.put('/menu/categories/' + c.id, { name: name.value });
      else await API.post('/menu/categories', { name: name.value });
      closeModal(); toast('Saved'); go('menu');
    } }];
  if (c.id) acts.splice(1, 0, { label: 'Delete', danger: true, onClick: () => confirmDialog(`Delete category "${c.name}"? Items in it will become uncategorized.`, async () => {
    await API.del('/menu/categories/' + c.id); closeModal(); toast('Deleted'); go('menu');
  }) });
  modal(c.id ? 'Edit Category' : 'New Category', el('div', {}, el('label', {}, 'Name'), name), acts);
}
async function manageCategories() {
  const cats = await API.get('/menu/categories');
  const c = el('div');
  const selected = new Set();
  if (!cats.length) c.append(el('p', { class: 'muted' }, 'No categories yet'));
  else {
    const bulkBar = el('div', { class: 'toolbar hidden', style: 'margin-bottom:10px' });
    const renderBulk = () => {
      bulkBar.innerHTML = '';
      bulkBar.classList.toggle('hidden', !selected.size);
      if (!selected.size) return;
      bulkBar.append(
        el('span', { class: 'muted' }, `${selected.size} selected`),
        el('button', { class: 'btn sm danger', onClick: () => confirmDialog(`Delete ${selected.size} selected categor${selected.size > 1 ? 'ies' : 'y'}? Items in them will become uncategorized.`, async () => {
          await Promise.all([...selected].map(id => API.del('/menu/categories/' + id)));
          toast('Deleted'); await go('menu'); manageCategories();
        }) }, '🗑️ Delete Selected'),
        el('button', { class: 'btn sm ghost', onClick: () => { selected.clear(); $$('.cat-row-check').forEach(x => x.checked = false); $('#catSelectAll').checked = false; renderBulk(); } }, 'Clear'));
    };
    c.append(bulkBar);
    const t = el('table');
    const selectAll = el('input', { type: 'checkbox', id: 'catSelectAll', style: 'width:auto;margin:0' });
    selectAll.onchange = () => {
      cats.forEach(cat => selectAll.checked ? selected.add(cat.id) : selected.delete(cat.id));
      $$('.cat-row-check').forEach(x => x.checked = selectAll.checked);
      renderBulk();
    };
    t.append(el('tr', {}, el('th', {}, selectAll), el('th', {}, 'Name'), el('th', {})));
    cats.forEach(cat => {
      const tr = el('tr');
      const check = el('input', { type: 'checkbox', class: 'cat-row-check', style: 'width:auto;margin:0' });
      check.onchange = () => { check.checked ? selected.add(cat.id) : selected.delete(cat.id); renderBulk(); };
      tr.append(el('td', {}, check));
      tr.append(el('td', {}, cat.name));
      tr.append(el('td', { class: 'row' },
        el('button', { class: 'btn sm', onClick: () => { closeModal(); editCategory(cat); } }, 'Edit'),
        el('button', { class: 'btn sm danger', onClick: () => confirmDialog(`Delete category "${cat.name}"? Items in it will become uncategorized.`, async () => {
          await API.del('/menu/categories/' + cat.id); toast('Deleted'); await go('menu'); manageCategories();
        }) }, 'Delete')));
      t.append(tr);
    });
    c.append(t);
  }
  modal('Manage Categories', c, [
    { label: 'Close', onClick: closeModal },
    { label: '+ New Category', primary: true, onClick: () => { closeModal(); editCategory(); } },
  ]);
}

// ---- Add-on Groups (extras like "Kottu Extras") ----
async function manageAddonGroups() {
  const groups = await API.get('/addons/groups');
  const c = el('div');
  if (!groups.length) c.append(el('p', { class: 'muted' }, 'No add-on groups yet — create one, e.g. "Kottu Extras"'));
  else {
    const t = el('table'); t.innerHTML = '<tr><th>Group</th><th>Selection</th><th>Extras</th><th></th></tr>';
    groups.forEach(g => {
      const tr = el('tr');
      tr.append(el('td', {}, g.name));
      tr.append(el('td', {}, g.selection_type === 'single' ? 'Choose one' : 'Choose multiple'));
      tr.append(el('td', {}, `${g.items.length} extra${g.items.length === 1 ? '' : 's'}`));
      tr.append(el('td', { class: 'row' },
        el('button', { class: 'btn sm', onClick: () => { closeModal(); editAddonGroup(g); } }, 'Edit'),
        el('button', { class: 'btn sm', onClick: () => { closeModal(); manageAddonExtras(g); } }, 'Extras'),
        el('button', { class: 'btn sm danger', onClick: () => confirmDialog(`Delete group "${g.name}"? Items using it will lose their extras.`, async () => {
          await API.del('/addons/groups/' + g.id); toast('Deleted'); manageAddonGroups();
        }) }, 'Delete')));
      t.append(tr);
    });
    c.append(t);
  }
  modal('Add-on Groups', c, [
    { label: 'Close', onClick: closeModal },
    { label: '+ New Group', primary: true, onClick: () => { closeModal(); editAddonGroup(); } },
  ]);
}
function editAddonGroup(g = {}) {
  const name = el('input', { placeholder: 'Group name, e.g. Kottu Extras', value: g.name || '' });
  const typeSel = el('select');
  [['multiple','Customers can choose multiple'], ['single','Customers choose only one']].forEach(([val, lbl]) =>
    typeSel.append(el('option', { value: val, selected: (g.selection_type || 'multiple') === val }, lbl)));
  const c = el('div', {}, el('label', {}, 'Group Name'), name, el('label', {}, 'Selection Type'), typeSel);
  const acts = [{ label: 'Cancel', onClick: () => { closeModal(); manageAddonGroups(); } },
    { label: 'Save', primary: true, onClick: async () => {
      if (g.id) await API.put('/addons/groups/' + g.id, { name: name.value, selection_type: typeSel.value });
      else await API.post('/addons/groups', { name: name.value, selection_type: typeSel.value });
      closeModal(); toast('Saved'); manageAddonGroups();
    } }];
  if (g.id) acts.splice(1, 0, { label: 'Delete', danger: true, onClick: () => confirmDialog(`Delete group "${g.name}"? Items using it will lose their extras.`, async () => {
    await API.del('/addons/groups/' + g.id); closeModal(); toast('Deleted'); manageAddonGroups();
  }) });
  modal(g.id ? 'Edit Add-on Group' : 'New Add-on Group', c, acts);
}
async function manageAddonExtras(group) {
  const groups = await API.get('/addons/groups');
  const g = groups.find(x => x.id === group.id) || group;
  const c = el('div');
  c.append(el('p', { class: 'muted', style: 'margin-top:0' },
    g.selection_type === 'single' ? 'Customers choose ONE of these on the order page' : 'Customers can choose MULTIPLE of these on the order page'));
  if (!g.items.length) c.append(el('p', { class: 'muted' }, 'No extras yet'));
  else {
    const t = el('table'); t.innerHTML = '<tr><th>Extra</th><th>Price</th><th></th></tr>';
    g.items.forEach(it => {
      const tr = el('tr');
      tr.append(el('td', {}, it.name), el('td', {}, money(it.price)));
      tr.append(el('td', { class: 'row' },
        el('button', { class: 'btn sm', onClick: () => { closeModal(); editAddonExtra(g, it); } }, 'Edit'),
        el('button', { class: 'btn sm danger', onClick: () => confirmDialog(`Delete "${it.name}"?`, async () => {
          await API.del('/addons/items/' + it.id); toast('Deleted'); manageAddonExtras(g);
        }) }, 'Delete')));
      t.append(tr);
    });
    c.append(t);
  }
  modal('Extras — ' + g.name, c, [
    { label: '← Back', onClick: () => { closeModal(); manageAddonGroups(); } },
    { label: '📋 Bulk Add', onClick: () => { closeModal(); bulkAddExtras(g); } },
    { label: '+ Add Extra', primary: true, onClick: () => { closeModal(); editAddonExtra(g); } },
  ]);
}
function parseBulkExtraLine(line) {
  const cleaned = line.replace(/[–—]/g, ' ').trim();
  const m = cleaned.match(/^(.+?)\s+\+?\s*(?:Rs\.?|LKR|\$|₹|£|€)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i);
  if (!m) return null;
  return { name: m[1].trim(), price: parseFloat(m[2].replace(/,/g, '')) };
}
function bulkAddExtras(group) {
  const textarea = el('textarea', { rows: 10,
    placeholder: 'One extra per line — name then price, e.g.\nHomemade Chilli Paste – +Rs. 150\nFresh Chilli – +Rs. 100\nExtra Chicken – +Rs. 350\nExtra Cheese – +Rs. 250\nExtra Egg – +Rs. 100' });
  const preview = el('div', { class: 'muted', style: 'margin-top:8px;font-size:13px' });
  const err = el('div', { class: 'err' });
  const parse = () => {
    const lines = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [], failed = [];
    lines.forEach(line => {
      const r = parseBulkExtraLine(line);
      if (r) parsed.push(r); else failed.push(line);
    });
    preview.textContent = parsed.length ? `✔ ${parsed.length} extra${parsed.length > 1 ? 's' : ''} ready to add` : '';
    err.textContent = failed.length ? `Couldn't read: ${failed.join(' · ')}` : '';
    return parsed;
  };
  textarea.addEventListener('input', parse);
  const c = el('div', {}, el('p', { class: 'muted', style: 'margin-top:0' }, `Adding to "${group.name}"`),
    el('label', {}, 'Extras — one per line, name then price'), textarea, preview, err);
  modal('Bulk Add Extras', c, [
    { label: 'Cancel', onClick: () => { closeModal(); manageAddonExtras(group); } },
    { label: 'Add Extras', primary: true, onClick: async () => {
      const parsed = parse();
      if (!parsed.length) { err.textContent = 'No valid extras to add — check the format'; return; }
      try {
        await Promise.all(parsed.map(p => API.post('/addons/groups/' + group.id + '/items', { name: p.name, price: p.price })));
        closeModal(); toast(`Added ${parsed.length} extra${parsed.length > 1 ? 's' : ''}`); manageAddonExtras(group);
      } catch (apiErr) { err.textContent = apiErr.message || 'Failed to add extras'; }
    } }
  ]);
}
function editAddonExtra(group, item = {}) {
  const name = el('input', { placeholder: 'Extra name, e.g. Extra Cheese', value: item.name || '' });
  const price = el('input', { type: 'number', step: '0.01', placeholder: 'Price', value: item.price || '' });
  const c = el('div', {}, el('label', {}, 'Name'), name, el('label', {}, 'Price'), price);
  const acts = [{ label: 'Cancel', onClick: () => { closeModal(); manageAddonExtras(group); } },
    { label: 'Save', primary: true, onClick: async () => {
      if (item.id) await API.put('/addons/items/' + item.id, { name: name.value, price: +price.value });
      else await API.post('/addons/groups/' + group.id + '/items', { name: name.value, price: +price.value });
      closeModal(); toast('Saved'); manageAddonExtras(group);
    } }];
  if (item.id) acts.splice(1, 0, { label: 'Delete', danger: true, onClick: () => confirmDialog(`Delete "${item.name}"?`, async () => {
    await API.del('/addons/items/' + item.id); closeModal(); toast('Deleted'); manageAddonExtras(group);
  }) });
  modal(item.id ? 'Edit Extra' : 'New Extra', c, acts);
}
function bulkAddItems(cats) {
  if (!cats.length) { toast('Create a category first'); return; }
  const catSel = el('select'); cats.forEach(c => catSel.append(el('option', { value: c.id }, c.name)));
  const textarea = el('textarea', { rows: 10,
    placeholder: 'One item per line — name then price, e.g.\nParata  $3.95\nChicken Pan Roll $4.95\nFish Pan Roll $4.95\nLavariya $6.95' });
  const preview = el('div', { class: 'muted', style: 'margin-top:8px;font-size:13px' });
  const err = el('div', { class: 'err' });
  const parse = () => {
    const lines = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [], failed = [];
    lines.forEach(line => {
      const m = line.match(/^(.+?)\s+\$?(\d+(?:\.\d{1,2})?)\s*$/);
      if (m) parsed.push({ name: m[1].trim(), price: parseFloat(m[2]) });
      else failed.push(line);
    });
    preview.textContent = parsed.length ? `✔ ${parsed.length} item${parsed.length > 1 ? 's' : ''} ready to add — images can be added later from Edit` : '';
    err.textContent = failed.length ? `Couldn't read: ${failed.join(' · ')}` : '';
    return parsed;
  };
  textarea.addEventListener('input', parse);
  const c = el('div', {},
    el('label', {}, 'Category (all items below will be added to this category)'), catSel,
    el('label', {}, 'Items — one per line, name then price'), textarea, preview, err);
  modal('Bulk Add Menu Items', c, [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Add Items', primary: true, onClick: async () => {
      const parsed = parse();
      if (!parsed.length) { err.textContent = 'No valid items to add — check the format'; return; }
      try {
        await Promise.all(parsed.map(p => API.post('/menu/items',
          { name: p.name, price: p.price, category_id: +catSel.value, description: '', show_online: 1 })));
        closeModal(); toast(`Added ${parsed.length} item${parsed.length > 1 ? 's' : ''}`); go('menu');
      } catch (apiErr) { err.textContent = apiErr.message || 'Failed to add items'; }
    } }
  ]);
}
function editItem(i, cats, groups = []) {
  i = i || {};
  const name = el('input', { placeholder: 'Item name', value: i.name || '' });
  const desc = el('input', { placeholder: 'Description', value: i.description || '' });
  const price = el('input', { type: 'number', step: '0.01', placeholder: 'Price', value: i.price || '' });
  const catSel = el('select'); cats.forEach(c => catSel.append(el('option', { value: c.id, selected: c.id === i.category_id }, c.name)));

  let image = i.image || '';
  const IMG_W = 300, IMG_H = 200;
  const preview = el('img', { class: 'preview', style: `width:${IMG_W}px;height:${IMG_H}px;object-fit:cover`, src: image });
  const emptyState = el('div', { class: 'preview-empty', style: `width:${IMG_W}px;height:${IMG_H}px` }, '🍔');
  preview.style.display = image ? '' : 'none';
  emptyState.style.display = image ? 'none' : '';
  const fileInput = el('input', { type: 'file', accept: 'image/*', style: 'width:auto' });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = IMG_W; canvas.height = IMG_H;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(IMG_W / img.width, IMG_H / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (IMG_W - w) / 2, (IMG_H - h) / 2, w, h);
        const out = canvas.toDataURL('image/jpeg', 0.82);
        if (out.length > 150000) { toast('Photo too large — pick a simpler image'); return; }
        image = out;
        preview.src = image; preview.style.display = ''; emptyState.style.display = 'none';
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const removeImgBtn = el('button', { class: 'btn sm', onClick: () => {
    image = ''; preview.style.display = 'none'; emptyState.style.display = ''; fileInput.value = '';
  } }, 'Remove');

  const visSel = el('select');
  [[1,'🌐 Website Live — shown on online ordering'], [0,'🏠 Only In Restaurant — hidden from website']].forEach(([val, lbl]) =>
    visSel.append(el('option', { value: val, selected: (i.show_online ?? 1) == val }, lbl)));

  const groupSel = el('select');
  groupSel.append(el('option', { value: '' }, 'No extras'));
  groups.forEach(g => groupSel.append(el('option', { value: g.id, selected: g.id === i.addon_group_id }, g.name)));

  const c = el('div', {}, el('label', {}, 'Name'), name, el('label', {}, 'Description'), desc,
    el('label', {}, 'Category'), catSel, el('label', {}, 'Price'), price,
    el('label', {}, 'Photo (300×200)'), el('div', { class: 'logo-upload' }, preview, emptyState, fileInput, removeImgBtn),
    el('label', {}, 'Website Visibility'), visSel,
    el('label', {}, 'Extras / Add-ons Group'), groupSel);
  const acts = [{ label: 'Cancel', onClick: closeModal },
    { label: 'Save', primary: true, onClick: async () => {
      const body = { name: name.value, description: desc.value, price: +price.value, category_id: +catSel.value, image,
        show_online: +visSel.value, addon_group_id: groupSel.value || null };
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

  let receiptLogo = s.receipt_logo || '';
  const receiptLogoCard = el('div', { class: 'card', style: 'max-width:520px;margin-bottom:16px' },
    el('div', { class: 'section-title', style: 'margin-top:0' }, 'Receipt Logo'),
    el('p', { class: 'muted', style: 'margin:0 0 10px;font-size:12px' },
      'Shown at the top of printed bills. Leave blank to use your Restaurant Logo above instead.'));
  const rPreview = el('img', { class: 'preview', src: receiptLogo });
  const rEmptyState = el('div', { class: 'preview-empty' }, '🧾');
  rPreview.style.display = receiptLogo ? '' : 'none';
  rEmptyState.style.display = receiptLogo ? 'none' : '';
  const rFileInput = el('input', { type: 'file', accept: 'image/*', style: 'width:auto' });
  rFileInput.addEventListener('change', () => {
    const file = rFileInput.files[0];
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
        receiptLogo = out;
        rPreview.src = receiptLogo; rPreview.style.display = ''; rEmptyState.style.display = 'none';
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const rRemoveBtn = el('button', { class: 'btn sm', onClick: () => {
    receiptLogo = ''; rPreview.style.display = 'none'; rEmptyState.style.display = ''; rFileInput.value = '';
  } }, 'Remove');
  receiptLogoCard.append(el('div', { class: 'logo-upload' }, rPreview, rEmptyState, rFileInput, rRemoveBtn));

  const fieldsBefore = [['restaurant_name','Restaurant Name'],['admin_email','Admin Email'],['address','Address'],['phone','Phone']];
  const fieldsAfter = [['language','Language'],['receipt_footer','Receipt Footer']];
  const card = el('div', { class: 'card', style: 'max-width:520px' });
  const inputs = {};
  const addInput = ([k, l]) => { const i = el('input', { type: k === 'admin_email' ? 'email' : 'text', value: s[k] || '' }); inputs[k] = i; card.append(el('label', {}, l), i); };
  fieldsBefore.forEach(addInput);

  const CURRENCIES = [
    ['$','USD ($) — US Dollar'], ['A$','AUD (A$) — Australian Dollar'], ['£','GBP (£) — British Pound'],
    ['€','EUR (€) — Euro'], ['C$','CAD (C$) — Canadian Dollar'], ['NZ$','NZD (NZ$) — New Zealand Dollar'],
    ['¥','JPY (¥) — Japanese Yen'], ['S$','SGD (S$) — Singapore Dollar'], ['Rs','LKR (Rs) — Sri Lankan Rupee'],
    ['₹','INR (₹) — Indian Rupee'], ['R','ZAR (R) — South African Rand'], ['฿','THB (฿) — Thai Baht'],
    ['RM','MYR (RM) — Malaysian Ringgit'], ['₱','PHP (₱) — Philippine Peso'], ['₦','NGN (₦) — Nigerian Naira'],
    ['₩','KRW (₩) — South Korean Won'], ['د.إ','AED (د.إ) — UAE Dirham'],
  ];
  const currencySel = el('select');
  CURRENCIES.forEach(([sym, lbl]) => currencySel.append(el('option', { value: sym, selected: (s.currency || '$') === sym }, lbl)));
  card.append(el('label', {}, 'Currency'), currencySel);

  const timezoneList = (() => { try { const l = Intl.supportedValuesOf('timeZone'); if (l && l.length) return l; } catch (e) {}
    return ['UTC','Pacific/Auckland','Australia/Sydney','Australia/Melbourne','Australia/Brisbane','Australia/Perth',
      'Asia/Colombo','Asia/Kolkata','Asia/Dubai','Asia/Singapore','Asia/Tokyo','Asia/Shanghai',
      'Europe/London','Europe/Paris','Europe/Berlin','Africa/Johannesburg',
      'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto']; })();
  const timezoneSel = el('select');
  timezoneList.forEach(tz => timezoneSel.append(el('option', { value: tz, selected: (s.timezone || 'UTC') === tz }, tz)));
  card.append(el('label', {}, 'Time Zone'), timezoneSel);

  fieldsAfter.forEach(addInput);
  const settingsErr = el('div', { class: 'err' });
  card.append(el('button', { class: 'btn primary', style: 'margin-top:16px', onClick: async (e) => {
    settingsErr.textContent = '';
    const btn = e.target; btn.disabled = true;
    try {
      const body = {}; Object.entries(inputs).forEach(([k, i]) => body[k] = i.value);
      body.currency = currencySel.value; body.timezone = timezoneSel.value;
      body.logo = logo; body.receipt_logo = receiptLogo;
      await API.put('/settings', body);
      CUR = body.currency || '$'; applyLogo(logo); applyBrandName(body.restaurant_name);
      toast('Settings saved');
    } catch (err) {
      settingsErr.textContent = err.message || 'Save failed';
    } finally {
      btn.disabled = false;
    }
  } }, 'Save Settings'), settingsErr);

  const onlineEnabled = el('input', { type: 'checkbox', style: 'width:auto;margin:0' });
  onlineEnabled.checked = s.online_ordering_enabled === '1';
  const modeSel = el('select');
  [['test','🧪 Sandbox (Test Mode)'], ['live','🔴 Live (Real Payments)']].forEach(([val, lbl]) =>
    modeSel.append(el('option', { value: val, selected: (s.stripe_mode || 'test') === val }, lbl)));
  const testSecret = el('input', { type: 'password',
    placeholder: s.stripe_secret_key_test_set ? 'Saved — leave blank to keep' : 'sk_test_…' });
  const testWebhook = el('input', { type: 'password',
    placeholder: s.stripe_webhook_secret_test_set ? 'Saved — leave blank to keep' : 'whsec_…' });
  const liveSecret = el('input', { type: 'password',
    placeholder: s.stripe_secret_key_live_set ? 'Saved — leave blank to keep' : 'sk_live_…' });
  const liveWebhook = el('input', { type: 'password',
    placeholder: s.stripe_webhook_secret_live_set ? 'Saved — leave blank to keep' : 'whsec_…' });
  const stripeCurrency = el('input', { type: 'text', value: s.stripe_currency || 'usd', placeholder: 'usd' });
  const webhookUrlBox = el('input', { type: 'text', readOnly: true, value: location.origin + '/api/public/stripe-webhook' });
  const onlineErr = el('div', { class: 'err' });
  const onlineCard = el('div', { class: 'card', style: 'max-width:520px;margin-top:16px' },
    el('div', { class: 'section-title', style: 'margin-top:0' }, 'Online Dine-In Ordering'),
    el('label', { class: 'row', style: 'gap:8px' }, onlineEnabled, 'Enable online ordering (QR / tablet)'),
    el('p', { class: 'muted', style: 'margin:8px 0' },
      'Customers order via each table\'s link (see Tables) and pay through Stripe Checkout before it reaches your Online Orders queue.'),
    el('label', {}, 'Active Mode'), modeSel,
    el('p', { class: 'muted', style: 'font-size:12px;margin:4px 0 10px' },
      'Sandbox uses Stripe test cards (e.g. 4242 4242 4242 4242) — no real money moves. Switch to Live only once you\'ve tested the full flow end to end.'),
    el('div', { class: 'section-title', style: 'font-size:13px' }, '🧪 Sandbox (Test) Keys'),
    el('label', {}, 'Test Secret Key'), testSecret,
    el('label', {}, 'Test Webhook Secret'), testWebhook,
    el('div', { class: 'section-title', style: 'font-size:13px' }, '🔴 Live Keys'),
    el('label', {}, 'Live Secret Key'), liveSecret,
    el('label', {}, 'Live Webhook Secret'), liveWebhook,
    el('label', {}, 'Currency Code (ISO, e.g. usd)'), stripeCurrency,
    el('label', {}, 'Webhook URL — register this same URL as both a Test and a Live endpoint in Stripe, subscribed to checkout.session.completed'),
    el('div', { class: 'row' }, webhookUrlBox, el('button', { class: 'btn sm', onClick: () => copyToClipboard(webhookUrlBox.value) }, 'Copy')),
    el('button', { class: 'btn primary', style: 'margin-top:16px', onClick: async (e) => {
      onlineErr.textContent = '';
      const btn = e.target; btn.disabled = true;
      try {
        const body = { online_ordering_enabled: onlineEnabled.checked ? '1' : '0', stripe_mode: modeSel.value, stripe_currency: stripeCurrency.value };
        if (testSecret.value) body.stripe_secret_key_test = testSecret.value;
        if (testWebhook.value) body.stripe_webhook_secret_test = testWebhook.value;
        if (liveSecret.value) body.stripe_secret_key_live = liveSecret.value;
        if (liveWebhook.value) body.stripe_webhook_secret_live = liveWebhook.value;
        await API.put('/settings', body);
        toast('Online ordering settings saved');
      } catch (err) { onlineErr.textContent = err.message; }
      finally { btn.disabled = false; }
    } }, 'Save Online Ordering Settings'),
    onlineErr);

  const smtpInputs = {};
  const smtpCard = el('div', { class: 'card', style: 'max-width:520px;margin-top:16px' },
    el('div', { class: 'section-title', style: 'margin-top:0' }, 'Email (SMTP) Configuration'));
  const hostInput = el('input', { type: 'text', value: s.smtp_host || '' });
  smtpInputs.smtp_host = hostInput;
  const secureSel = el('select');
  [['ssl','SSL (port 465)'],['tls','TLS / STARTTLS (port 587)'],['none','None']].forEach(([val, lbl]) =>
    secureSel.append(el('option', { value: val, selected: (s.smtp_secure || 'ssl') === val }, lbl)));
  const userInput = el('input', { type: 'text', value: s.smtp_user || '' });
  smtpInputs.smtp_user = userInput;
  const smtpPass = el('input', { type: 'password',
    placeholder: s.smtp_pass_set ? 'Saved — leave blank to keep' : 'SMTP Password' });
  const fromEmailInput = el('input', { type: 'email', value: s.smtp_from_email || '' });
  smtpInputs.smtp_from_email = fromEmailInput;
  const fromNameInput = el('input', { type: 'text', value: s.smtp_from_name || '' });
  smtpInputs.smtp_from_name = fromNameInput;
  const testTo = el('input', { type: 'email', placeholder: 'Send test to…', value: s.admin_email || '' });
  const smtpErr = el('div', { class: 'err' });
  smtpCard.append(
    el('label', {}, 'SMTP Host'), hostInput,
    el('label', {}, 'Encryption'), secureSel,
    el('label', {}, 'SMTP Username'), userInput,
    el('label', {}, 'SMTP Password'), smtpPass,
    el('label', {}, 'From Email'), fromEmailInput,
    el('label', {}, 'From Name'), fromNameInput,
    el('label', {}, 'Test Recipient'), testTo,
    el('div', { class: 'row', style: 'margin-top:16px' },
      el('button', { class: 'btn primary', onClick: async (e) => {
        smtpErr.textContent = '';
        const btn = e.target; btn.disabled = true;
        try {
          const body = {}; Object.entries(smtpInputs).forEach(([k, i]) => body[k] = i.value);
          body.smtp_secure = secureSel.value;
          if (smtpPass.value) body.smtp_pass = smtpPass.value;
          await API.put('/settings', body);
          toast('Email settings saved');
        } catch (err) { smtpErr.textContent = err.message; }
        finally { btn.disabled = false; }
      } }, 'Save Email Settings'),
      el('button', { class: 'btn', onClick: async (e) => {
        smtpErr.textContent = '';
        if (!testTo.value) { smtpErr.textContent = 'Enter a recipient for the test email'; return; }
        const btn = e.target; btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Sending…';
        try {
          const body = {}; Object.entries(smtpInputs).forEach(([k, i]) => body[k] = i.value);
          body.smtp_secure = secureSel.value;
          if (smtpPass.value) body.smtp_pass = smtpPass.value;
          body.test_to = testTo.value;
          await API.post('/settings/test-email', body);
          toast('Test email sent — check the inbox');
        } catch (err) { smtpErr.textContent = err.message; }
        finally { btn.disabled = false; btn.textContent = orig; }
      } }, '✉ Send Test Email')),
    smtpErr);

  const backup = el('div', { class: 'card', style: 'max-width:520px;margin-top:16px' },
    el('div', { class: 'section-title', style: 'margin-top:0' }, 'Backup & Restore'),
    el('p', { class: 'muted', style: 'margin-bottom:10px' }, 'Download a full JSON backup of your data.'));
  if (API.user.role === 'admin')
    backup.append(el('button', { class: 'btn', onClick: async () => {
      const data = await API.get('/backup');
      const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
        download: 'pos-backup-' + new Date().toISOString().slice(0, 10) + '.json' }); a.click();
    } }, '⬇ Download Backup'));

  const curPass = el('input', { type: 'password', placeholder: 'Current password' });
  const newPass = el('input', { type: 'password', placeholder: 'New password (min 6 characters)' });
  const confPass = el('input', { type: 'password', placeholder: 'Confirm new password' });
  const passErr = el('div', { class: 'err' });
  const passCard = el('div', { class: 'card', style: 'max-width:520px;margin-top:16px' },
    el('div', { class: 'section-title', style: 'margin-top:0' }, 'Change My Password'),
    el('label', {}, 'Current Password'), curPass,
    el('label', {}, 'New Password'), newPass,
    el('label', {}, 'Confirm New Password'), confPass, passErr,
    el('button', { class: 'btn primary', style: 'margin-top:16px', onClick: async () => {
      passErr.textContent = '';
      if (newPass.value !== confPass.value) { passErr.textContent = 'New passwords do not match'; return; }
      try {
        await API.put('/auth/password', { current_password: curPass.value, new_password: newPass.value });
        curPass.value = ''; newPass.value = ''; confPass.value = '';
        toast('Password updated');
      } catch (e) { passErr.textContent = e.message; }
    } }, 'Update Password'));

  v.append(logoCard, receiptLogoCard, card, onlineCard, smtpCard, passCard, backup);
};

// ---------- Boot ----------
if (API.token && API.user) startApp();
