/* ---------- i18n ---------- */
const I18N = {
  fr: {
    subtitle: 'Inventaire de véhicule',
    tabInventory: 'Inventaire',
    tabNeeds: 'Besoins',
    filterUrgent: '⚠️ À surveiller',
    addPlaceholder: "Nom de l'article...",
    needsPlaceholder: 'Ajouter un besoin...',
    autoFlagged: "Généré automatiquement depuis l'inventaire",
    manualNeeds: 'Mes besoins',
    statusOk: 'OK',
    statusWatch: 'SURVEILLER',
    statusLow: 'BAS',
    lowLabel: 'Seuil bas',
    watchLabel: 'Seuil surveillance',
    emptyInventory: 'Aucun article. Ajoute tes essentiels ci-dessus.',
    emptyUrgent: 'Tout est au complet! 🎉',
    emptyAutoNeeds: 'Rien à signaler pour le moment.',
    emptyManualNeeds: 'Aucun besoin ajouté.',
    langBtn: 'EN'
  },
  en: {
    subtitle: 'Vehicle inventory',
    tabInventory: 'Inventory',
    tabNeeds: 'Needs',
    filterUrgent: '⚠️ To watch',
    addPlaceholder: 'Item name...',
    needsPlaceholder: 'Add a need...',
    autoFlagged: 'Auto-generated from inventory',
    manualNeeds: 'My needs',
    statusOk: 'OK',
    statusWatch: 'WATCH',
    statusLow: 'LOW',
    lowLabel: 'Low threshold',
    watchLabel: 'Watch threshold',
    emptyInventory: 'No items yet. Add your essentials above.',
    emptyUrgent: 'All stocked up! 🎉',
    emptyAutoNeeds: 'Nothing to report right now.',
    emptyManualNeeds: 'No needs added yet.',
    langBtn: 'FR'
  }
};

let lang = localStorage.getItem('mmstock_lang') || 'fr';
function t(key) { return I18N[lang][key] || key; }

/* ---------- state ---------- */
const ITEMS_KEY = 'mmstock_items';
const NEEDS_KEY = 'mmstock_needs';

function loadItems() {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Stockage local indisponible.', e); }
  return [
    { id: 1, name: 'Victor souris', qty: 144, low: 20, watch: 50 },
    { id: 2, name: 'Bases engluées', qty: 100, low: 15, watch: 40 },
    { id: 3, name: 'Boîtes noires MM', qty: 50, low: 8, watch: 20 },
    { id: 4, name: '72TC', qty: 144, low: 20, watch: 50 },
    { id: 5, name: 'Fluos 25W', qty: 48, low: 8, watch: 20 },
    { id: 6, name: 'EZ secure', qty: 4, low: 1, watch: 2 }
  ];
}

function loadNeeds() {
  try {
    const raw = localStorage.getItem(NEEDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Stockage local indisponible.', e); }
  return [];
}

let items = loadItems();
let needs = loadNeeds();
let showOnlyUrgent = false;
let activeTab = 'inventory';

function saveItems() { persist(ITEMS_KEY, items); renderInventory(); renderNeeds(); }
function saveNeeds() { persist(NEEDS_KEY, needs); renderNeeds(); }
function persist(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.warn('Impossible de sauvegarder localement.', e); }
}

/* ---------- helpers ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function statusOf(item) {
  if (item.qty <= item.low) return 'rouge';
  if (item.qty <= item.watch) return 'jaune';
  return 'vert';
}

function statusLabel(status) {
  return status === 'rouge' ? t('statusLow') : status === 'jaune' ? t('statusWatch') : t('statusOk');
}

/* ---------- inventory actions ---------- */
function addItem(name, qty) {
  items.unshift({ id: Date.now(), name, qty: Math.max(0, qty), low: 1, watch: 3 });
  saveItems();
}
function changeQty(id, delta) {
  items = items.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i);
  saveItems();
}
function setQty(id, value) {
  const qty = Math.max(0, Number(value) || 0);
  items = items.map(i => i.id === id ? { ...i, qty } : i);
  saveItems();
}
function setThreshold(id, field, value) {
  const v = Math.max(0, Number(value) || 0);
  items = items.map(i => i.id === id ? { ...i, [field]: v } : i);
  saveItems();
}
function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
}

/* ---------- needs actions ---------- */
function addNeed(text) {
  needs.unshift({ id: Date.now(), text, done: false });
  saveNeeds();
}
function toggleNeed(id) {
  needs = needs.map(n => n.id === id ? { ...n, done: !n.done } : n);
  saveNeeds();
}
function deleteNeed(id) {
  needs = needs.filter(n => n.id !== id);
  saveNeeds();
}

/* ---------- rendering ---------- */
function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById('lang-btn').textContent = t('langBtn');
  document.getElementById('filter-btn').classList.toggle('active', showOnlyUrgent);
}

function renderInventory() {
  const list = document.getElementById('item-list');
  list.innerHTML = '';

  const filtered = showOnlyUrgent
    ? items.filter(i => statusOf(i) !== 'vert')
    : items;

  if (filtered.length === 0) {
    list.innerHTML = `<p class="empty-state">${showOnlyUrgent ? t('emptyUrgent') : t('emptyInventory')}</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(item => {
    const status = statusOf(item);
    const card = document.createElement('div');
    card.className = `item-card ${status}`;
    card.dataset.id = item.id;
    card.innerHTML = `
      <div class="item-top">
        <span class="item-name">${escapeHtml(item.name)}</span>
        <div class="qty-controls">
          <button class="qty-btn" data-action="dec">−</button>
          <input type="number" class="qty-input" min="0" value="${item.qty}" data-action="set-qty" inputmode="numeric">
          <button class="qty-btn" data-action="inc">+</button>
        </div>
      </div>
      <div class="item-bottom">
        <span class="status-badge ${status}">${statusLabel(status)}</span>
        <div class="item-actions">
          <button class="icon-btn" data-action="toggle-thresholds">⚙</button>
          <button class="icon-btn" data-action="del">✕</button>
        </div>
      </div>
      <div class="thresholds-row" data-thresholds>
        <div class="threshold-field">
          <label>${t('watchLabel')}</label>
          <input type="number" min="0" value="${item.watch}" data-action="set-watch">
        </div>
        <div class="threshold-field">
          <label>${t('lowLabel')}</label>
          <input type="number" min="0" value="${item.low}" data-action="set-low">
        </div>
      </div>
    `;
    fragment.appendChild(card);
  });
  list.appendChild(fragment);
}

function renderNeeds() {
  const auto = document.getElementById('auto-needs');
  const manual = document.getElementById('manual-needs');

  const flagged = items.filter(i => statusOf(i) !== 'vert');
  auto.innerHTML = flagged.length
    ? flagged.map(i => `
        <div class="need-card readonly">
          <span class="need-text">${escapeHtml(i.name)} — ${i.qty}</span>
          <span class="status-badge ${statusOf(i)}">${statusLabel(statusOf(i))}</span>
        </div>`).join('')
    : `<p class="empty-state">${t('emptyAutoNeeds')}</p>`;

  manual.innerHTML = needs.length
    ? needs.map(n => `
        <div class="need-card ${n.done ? 'done' : ''}" data-id="${n.id}">
          <input type="checkbox" class="need-check" data-action="toggle-need" ${n.done ? 'checked' : ''}>
          <span class="need-text">${escapeHtml(n.text)}</span>
          <button class="icon-btn" data-action="del-need">✕</button>
        </div>`).join('')
    : `<p class="empty-state">${t('emptyManualNeeds')}</p>`;
}

function renderAll() {
  applyStaticTranslations();
  renderInventory();
  renderNeeds();
}

/* ---------- tabs & lang ---------- */
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('tab-inventory').classList.toggle('active', tab === 'inventory');
  document.getElementById('tab-needs').classList.toggle('active', tab === 'needs');
}

function switchLang() {
  lang = lang === 'fr' ? 'en' : 'fr';
  localStorage.setItem('mmstock_lang', lang);
  renderAll();
}

/* ---------- event wiring ---------- */
document.getElementById('lang-btn').addEventListener('click', switchLang);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.getElementById('filter-btn').addEventListener('click', () => {
  showOnlyUrgent = !showOnlyUrgent;
  applyStaticTranslations();
  renderInventory();
});

document.getElementById('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('item-name');
  const qtyInput = document.getElementById('item-qty');
  const name = nameInput.value.trim();
  if (!name) return;
  addItem(name, Number(qtyInput.value) || 0);
  nameInput.value = '';
  qtyInput.value = '1';
});

document.getElementById('needs-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('need-text');
  const text = input.value.trim();
  if (!text) return;
  addNeed(text);
  input.value = '';
});

document.getElementById('item-list').addEventListener('click', (e) => {
  const card = e.target.closest('.item-card');
  if (!card) return;
  const id = Number(card.dataset.id);
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'inc') changeQty(id, 1);
  else if (action === 'dec') changeQty(id, -1);
  else if (action === 'del') deleteItem(id);
  else if (action === 'toggle-thresholds') {
    card.querySelector('[data-thresholds]').classList.toggle('open');
  }
});

document.getElementById('item-list').addEventListener('change', (e) => {
  const card = e.target.closest('.item-card');
  if (!card) return;
  const id = Number(card.dataset.id);
  const action = e.target.dataset.action;
  if (action === 'set-low') setThreshold(id, 'low', e.target.value);
  else if (action === 'set-watch') setThreshold(id, 'watch', e.target.value);
  else if (action === 'set-qty') setQty(id, e.target.value);
});

// Sélectionne le contenu du champ quantité au focus, pour remplacer facilement
document.getElementById('item-list').addEventListener('focus', (e) => {
  if (e.target.classList.contains('qty-input')) e.target.select();
}, true);

document.getElementById('manual-needs').addEventListener('click', (e) => {
  const card = e.target.closest('.need-card');
  if (!card) return;
  const id = Number(card.dataset.id);
  const action = e.target.dataset.action;
  if (action === 'del-need') deleteNeed(id);
});

document.getElementById('manual-needs').addEventListener('change', (e) => {
  const card = e.target.closest('.need-card');
  if (!card) return;
  const id = Number(card.dataset.id);
  if (e.target.dataset.action === 'toggle-need') toggleNeed(id);
});

/* ---------- premier affichage ---------- */
renderAll();
