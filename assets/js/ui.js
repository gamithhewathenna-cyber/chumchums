const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  kids.flat().forEach(k => e.append(k?.nodeType ? k : document.createTextNode(k ?? '')));
  return e;
};

let CUR = '$';
const money = n => CUR + Number(n || 0).toFixed(2);
const fmtDate = s => s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString() : '';

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function statusBadge(s) {
  const map = { available: 'b-green', occupied: 'b-red', reserved: 'b-amber', cleaning: 'b-blue',
    open: 'b-blue', held: 'b-gray', kitchen: 'b-amber', ready: 'b-green', completed: 'b-green',
    cancelled: 'b-gray', refunded: 'b-red', new: 'b-amber', preparing: 'b-blue',
    paid: 'b-green', unpaid: 'b-red' };
  return `<span class="badge ${map[s] || 'b-gray'}">${s}</span>`;
}

function modal(title, contentEl, actions = []) {
  const box = $('#modalBox');
  box.innerHTML = '';
  box.append(el('h3', {}, title), contentEl);
  const act = el('div', { class: 'modal-actions' });
  actions.forEach(a => act.append(el('button', {
    class: 'btn ' + (a.primary ? 'primary' : a.danger ? 'danger' : ''),
    onClick: () => a.onClick && a.onClick()
  }, a.label)));
  box.append(act);
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }
$('#modal')?.addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

function confirmDialog(msg, onYes) {
  modal('Confirm', el('p', {}, msg), [
    { label: 'Cancel', onClick: closeModal },
    { label: 'Yes', danger: true, onClick: () => { closeModal(); onYes(); } }
  ]);
}
