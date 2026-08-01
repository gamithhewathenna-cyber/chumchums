// ---------- Minimal fetch helpers (no auth — this is the public ordering page) ----------
async function apiGet(path) {
  const res = await fetch('/api' + path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function apiPost(path, body) {
  const res = await fetch('/api' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

let CATS = [], ITEMS = [], TABLES = [], CART = [], ACTIVE_CAT = null, ADDON_GROUPS = [];
const params = new URLSearchParams(location.search);
const PRESET_TABLE = params.get('table');

function showScreen(id) {
  $$('.order-screen').forEach(s => s.classList.add('hidden'));
  $('#' + id).classList.remove('hidden');
}

async function boot() {
  let menu;
  try { menu = await apiGet('/public/menu'); } catch (e) { showScreen('scrDisabled'); return; }
  if (!menu.enabled) { showScreen('scrDisabled'); return; }

  applyBrand(menu.logo, menu.restaurant_name);
  $('#testModeBar').classList.toggle('hidden', !menu.test_mode);
  CUR = menu.currency || '$';

  // Returning from Stripe after a successful payment — skip straight to the waiting screen
  if (params.get('paid') === '1' && params.get('order') && params.get('code')) {
    showScreen('scrWait');
    pollStatus(params.get('order'), params.get('code'));
    return;
  }

  CATS = menu.categories; ITEMS = menu.items; ADDON_GROUPS = menu.addon_groups || [];
  try { TABLES = await apiGet('/public/tables'); } catch (e) { TABLES = []; }

  if (params.get('cancelled') === '1') toast('Payment cancelled — you can try again');

  renderCats(); renderMenu(); renderCart();
  showScreen('scrMenu');
}

function applyBrand(logo, name) {
  const l = $('#orderLogo'); if (logo) { l.innerHTML = ''; l.append(el('img', { src: logo, alt: 'Logo' })); }
  if (name) { document.title = 'Order — ' + name; $('#orderBrandName').textContent = name; }
}

function renderCats() {
  const row = $('#orderCats'); row.innerHTML = '';
  row.append(el('div', { class: 'cat-pill' + (ACTIVE_CAT === null ? ' active' : ''),
    onClick: (e) => { ACTIVE_CAT = null; $$('#orderCats .cat-pill').forEach(p => p.classList.remove('active')); e.target.classList.add('active'); renderMenu(); } }, 'All'));
  CATS.forEach(c => row.append(el('div', { class: 'cat-pill' + (ACTIVE_CAT === c.id ? ' active' : ''),
    onClick: (e) => { ACTIVE_CAT = c.id; $$('#orderCats .cat-pill').forEach(p => p.classList.remove('active')); e.target.classList.add('active'); renderMenu(); } }, c.name)));
}

function renderMenu() {
  const g = $('#orderMenuGrid'); g.innerHTML = '';
  const items = ITEMS.filter(m => ACTIVE_CAT === null || m.category_id === ACTIVE_CAT);
  if (!items.length) { g.append(el('p', { class: 'muted' }, 'No items in this category')); return; }
  items.forEach(m => {
    const tile = el('div', { class: 'menu-tile', onClick: () => m.addon_group_id ? openExtrasModal(m) : addToCart(m) });
    tile.append(m.image ? el('img', { class: 'tile-img', src: m.image, alt: '' }) : el('div', { class: 'tile-img tile-noimg' }, 'No Image'));
    tile.append(el('div', { class: 'nm' }, m.name), el('div', { class: 'pr' }, money(m.price)));
    g.append(tile);
  });
}

function openExtrasModal(m) {
  const group = ADDON_GROUPS.find(g => g.id === m.addon_group_id);
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
      const chosen = group.items.filter(it => selected.has(it.id)).map(it => ({ id: it.id, name: it.name, price: Number(it.price) }));
      const extraTotal = chosen.reduce((s, it) => s + it.price, 0);
      addToCart(m, chosen, extraTotal);
      closeModal();
    } }
  ]);
}

function addToCart(m, modifiers = null, extraPrice = 0) {
  const modKey = modifiers ? JSON.stringify(modifiers.map(x => x.id)) : '';
  const line = CART.find(c => c.menu_item_id === m.id && (c._modKey || '') === modKey);
  if (line) line.qty++;
  else CART.push({ menu_item_id: m.id, name: m.name, price: Number(m.price) + Number(extraPrice), qty: 1, modifiers: modifiers || undefined, _modKey: modKey });
  renderCart();
}

function renderCart() {
  const box = $('#orderCartItems'); box.innerHTML = '';
  if (!CART.length) box.append(el('p', { class: 'muted' }, 'Tap a menu item to add it'));
  CART.forEach((c, i) => {
    const info = el('div', {}, el('div', {}, c.name));
    if (c.modifiers && c.modifiers.length) info.append(el('small', { class: 'muted', style: 'display:block' }, '+ ' + c.modifiers.map(mo => mo.name).join(', +')));
    info.append(el('small', { class: 'muted' }, money(c.price)));
    box.append(el('div', { class: 'cart-line' }, info,
      el('div', { class: 'qty' },
        el('button', { onClick: () => { c.qty--; if (c.qty <= 0) CART.splice(i, 1); renderCart(); } }, '−'),
        el('span', {}, String(c.qty)),
        el('button', { onClick: () => { c.qty++; renderCart(); } }, '+'))));
  });
  const total = CART.reduce((s, c) => s + c.qty * c.price, 0);
  const foot = $('#orderCartFoot'); foot.innerHTML = '';
  foot.append(el('div', { class: 'tot-row big' }, el('span', {}, 'Total'), el('span', {}, money(total))));
  const checkoutBtn = el('button', { class: 'btn primary block', style: 'margin-top:10px',
    onClick: () => { if (CART.length) openDetails(); } }, 'Checkout');
  checkoutBtn.disabled = !CART.length;
  foot.append(checkoutBtn);
}

function openDetails() {
  const tsel = $('#dTable'); tsel.innerHTML = '';
  tsel.append(el('option', { value: '' }, 'Select your table…'));
  TABLES.forEach(t => tsel.append(el('option', { value: t.id, selected: String(t.id) === String(PRESET_TABLE) }, `${t.name} (${t.zone})`)));
  if (PRESET_TABLE) tsel.disabled = true; else tsel.disabled = false;

  const summary = $('#orderSummary'); summary.innerHTML = '';
  CART.forEach(c => {
    summary.append(el('div', { class: 'tot-row' }, el('span', {}, `${c.qty}× ${c.name}`), el('span', {}, money(c.qty * c.price))));
    if (c.modifiers && c.modifiers.length)
      summary.append(el('div', { class: 'tot-row' }, el('small', { class: 'muted' }, '  + ' + c.modifiers.map(mo => mo.name).join(', +')), el('span', {})));
  });
  const total = CART.reduce((s, c) => s + c.qty * c.price, 0);
  summary.append(el('div', { class: 'tot-row big' }, el('span', {}, 'Total'), el('span', {}, money(total))));

  $('#detailsErr').textContent = '';
  showScreen('scrDetails');
}

$('#backToMenu').onclick = () => showScreen('scrMenu');

$('#payBtn').onclick = async () => {
  const err = $('#detailsErr'); err.textContent = '';
  const tableId = $('#dTable').value;
  const name = $('#dName').value.trim();
  const email = $('#dEmail').value.trim();
  const phone = $('#dPhone').value.trim();
  const notes = $('#dNotes').value.trim();
  if (!tableId) { err.textContent = 'Please select your table'; return; }
  if (!name) { err.textContent = 'Please enter your name'; return; }
  if (!email) { err.textContent = 'Please enter your email'; return; }

  const btn = $('#payBtn'); btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Please wait…';
  try {
    const res = await apiPost('/public/checkout', {
      table_id: tableId, customer_name: name, customer_email: email, customer_phone: phone, notes,
      items: CART.map(c => ({ menu_item_id: c.menu_item_id, qty: c.qty, addon_item_ids: (c.modifiers || []).map(mo => mo.id) })),
    });
    location.href = res.checkout_url;
  } catch (e) {
    err.textContent = e.message; btn.disabled = false; btn.textContent = orig;
  }
};

let waitTimer = null;
async function pollStatus(orderId, code) {
  clearInterval(waitTimer);
  const tick = async () => {
    try {
      const s = await apiGet(`/public/orders/${orderId}?token=${encodeURIComponent(code)}`);
      $('#waitCode').textContent = 'Order ' + s.code;
      if (s.status === 'pending') {
        $('#waitIcon').textContent = '✅'; $('#waitTitle').textContent = 'Payment received!';
        $('#waitMsg').textContent = 'Waiting for the restaurant to confirm your order…';
      } else if (s.status === 'kitchen' || s.status === 'ready' || s.status === 'completed') {
        $('#waitIcon').textContent = '🎉'; $('#waitTitle').textContent = 'Order accepted!';
        $('#waitMsg').textContent = 'Your food is being prepared. Enjoy!';
        clearInterval(waitTimer);
      } else if (s.status === 'cancelled') {
        $('#waitIcon').textContent = '❌'; $('#waitTitle').textContent = 'Order declined';
        $('#waitMsg').textContent = 'Sorry, the restaurant was unable to accept your order. Please speak to a staff member.';
        clearInterval(waitTimer);
      } else {
        $('#waitIcon').textContent = '⏳'; $('#waitTitle').textContent = 'Confirming payment…';
        $('#waitMsg').textContent = 'This should only take a moment.';
      }
    } catch (e) { /* keep waiting, transient network errors are fine to retry */ }
  };
  await tick();
  waitTimer = setInterval(tick, 3000);
}

boot();
