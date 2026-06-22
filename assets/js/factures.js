/* ── TransitFlow · factures.js ──────────────────────
   Facturation — CRUD complet
   Lignes de facture · TVA · Totaux auto · Export CSV
─────────────────────────────────────────────────── */

/* ══ ÉTAT ══ */
let facState = {
  search  : '',
  statut  : 'all',
  client  : 'all',
  page    : 1,
  pageSize: 10,
  editId  : null,
};
let pendingDeleteId = null;
let currentDetailId = null;
let lignesData      = [];  // lignes en cours d'édition

/* ══ MÉTA STATUTS ══ */
const STATUT_META = {
  brouillon : { label:'Brouillon',  icon:'fa-pen',                cls:'brouillon' },
  envoyee   : { label:'Envoyée',    icon:'fa-paper-plane',        cls:'envoyee'   },
  payee     : { label:'Payée',      icon:'fa-circle-check',       cls:'payee'     },
  en_retard : { label:'En retard',  icon:'fa-triangle-exclamation',cls:'en_retard'},
  annulee   : { label:'Annulée',    icon:'fa-ban',                cls:'annulee'   },
};

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof TFStore !== 'undefined') await TFStore.hydrate();
  populateSelects();
  setDefaultDates();
  renderStats();
  renderTable();
  initSearch();
  initFilters();
  // Ajouter une ligne vide par défaut
  addLigne();

  window.addEventListener('tf:factures:changed', () => { renderStats(); renderTable(); });
  window.addEventListener('tf:clients:changed',  () => populateSelects());
});

/* ══ DONNÉES ══ */
function getFactures() {
  return JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
}
function saveFactures(data) {
  localStorage.setItem('tf_factures_v1', JSON.stringify(data));
  window.dispatchEvent(new Event('tf:factures:changed'));
}
function nextNumero() {
  const all  = getFactures();
  if (!all.length) return 'FAC-001';
  const nums = all.map(f => parseInt(f.numero.replace('FAC-','')) || 0);
  return 'FAC-' + String(Math.max(...nums) + 1).padStart(3, '0');
}
function getClients() {
  if (typeof TFStore !== 'undefined' && typeof TFStore.getClients === 'function')
    return TFStore.getClients();
  return JSON.parse(localStorage.getItem('tf_clients_v1') || '[]');
}
function getDossiers() {
  return JSON.parse(localStorage.getItem('tf_dossiers_v1') || '[]');
}

/* ══ FILTRAGE ══ */
function getFiltered() {
  let data = getFactures();
  if (facState.statut !== 'all') data = data.filter(f => f.statut === facState.statut);
  if (facState.client !== 'all') data = data.filter(f => f.clientId == facState.client);
  if (facState.search.trim()) {
    const q = facState.search.toLowerCase();
    data = data.filter(f =>
      f.numero.toLowerCase().includes(q) ||
      f.clientNom.toLowerCase().includes(q)
    );
  }
  data.sort((a, b) => new Date(b.dateEmission) - new Date(a.dateEmission));
  return data;
}

/* ══ STATS ══ */
function renderStats() {
  const all = getFactures();
  const sum = arr => arr.reduce((s, f) => s + (f.montantTTC || 0), 0);

  const payees   = all.filter(f => f.statut === 'payee');
  const attente  = all.filter(f => ['envoyee','brouillon'].includes(f.statut));
  const retards  = all.filter(f => f.statut === 'en_retard');

  const up = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  up('fs-total',       all.length);
  up('fs-encaisse',    payees.length);
  up('fs-encaisse-amt', formatMontant(sum(payees)));
  up('fs-attente',     attente.length);
  up('fs-attente-amt', formatMontant(sum(attente)));
  up('fs-retard',      retards.length);
  up('fs-retard-amt',  formatMontant(sum(retards)));
}

/* ══ TABLE ══ */
function renderTable() {
  const filtered = getFiltered();
  const total    = filtered.length;
  const pages    = Math.max(1, Math.ceil(total / facState.pageSize));
  facState.page  = Math.min(facState.page, pages);
  const slice    = filtered.slice((facState.page-1)*facState.pageSize, facState.page*facState.pageSize);

  const subEl = document.getElementById('fth-sub');
  if (subEl) subEl.textContent = `${total} facture${total>1?'s':''}`;

  const tbody = document.getElementById('fac-tbody');
  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="fac-empty">
        <i class="fa-solid fa-file-invoice-dollar"></i>
        <p>Aucune facture trouvée</p>
        <button class="btn primary" onclick="openModal()"><i class="fa-solid fa-plus"></i>Créer une facture</button>
      </div>
    </td></tr>`;
  } else {
    tbody.innerHTML = slice.map(f => {
      const sm  = STATUT_META[f.statut] || STATUT_META.brouillon;
      const ini = f.clientNom.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const retardCls = f.statut === 'en_retard' ? 'style="color:#DC2626"' : '';
      return `<tr onclick="openDetail(${f.id})">
        <td class="td-fac-num">${f.numero}</td>
        <td>
          <div class="td-client-cell">
            <div class="td-cl-av">${ini}</div>
            <div>
              <p class="td-cl-name">${f.clientNom}</p>
              <p class="td-cl-ref">${f.dossierNumero || '—'}</p>
            </div>
          </div>
        </td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:#6B7280">${f.dossierNumero || '—'}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:#6B7280">${formatDate(f.dateEmission)}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px" ${retardCls}>${formatDate(f.dateEcheance)}</td>
        <td class="td-montant">${formatMontant(f.montantTTC)}</td>
        <td><span class="fac-badge ${sm.cls}"><i class="fa-solid ${sm.icon}"></i>${sm.label}</span></td>
        <td>
          <div class="fac-row-actions" onclick="event.stopPropagation()">
            <button class="btn sm" onclick="openModal(${f.id})" title="Modifier"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm success" onclick="marquerPayee(${f.id})" title="Marquer payée"><i class="fa-solid fa-circle-check"></i></button>
            <button class="btn sm danger" onclick="openConfirm(${f.id})" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination(total, pages);
}

/* ══ PAGINATION ══ */
function renderPagination(total, pages) {
  const infoEl = document.getElementById('fac-pag-info');
  const btnsEl = document.getElementById('fac-pag-btns');
  if (!infoEl || !btnsEl) return;
  const s = (facState.page-1)*facState.pageSize+1;
  const e = Math.min(facState.page*facState.pageSize, total);
  infoEl.textContent = total ? `${s}–${e} sur ${total}` : '0 résultat';
  let html = `<button class="fac-pag-btn" onclick="goPage(${facState.page-1})" ${facState.page===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let p=1; p<=Math.min(pages,5); p++)
    html += `<button class="fac-pag-btn ${p===facState.page?'active':''}" onclick="goPage(${p})">${p}</button>`;
  html += `<button class="fac-pag-btn" onclick="goPage(${facState.page+1})" ${facState.page===pages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
  btnsEl.innerHTML = html;
}
function goPage(p) {
  const pages = Math.ceil(getFiltered().length / facState.pageSize);
  if (p < 1 || p > pages) return;
  facState.page = p; renderTable();
}

/* ══ SEARCH / FILTERS ══ */
function initSearch() {
  const inp = document.getElementById('fac-search'); if (!inp) return;
  let t;
  inp.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { facState.search = inp.value; facState.page = 1; renderTable(); }, 250);
  });
}
function initFilters() {
  document.getElementById('fac-filter-statut')?.addEventListener('change', e => {
    facState.statut = e.target.value; facState.page = 1; renderTable();
  });
  document.getElementById('fac-filter-client')?.addEventListener('change', e => {
    facState.client = e.target.value; facState.page = 1; renderTable();
  });
}

/* ══ SELECTS ══ */
function populateSelects() {
  const clients  = getClients();
  const dossiers = getDossiers();

  const selCl = document.getElementById('f-client');
  if (selCl) {
    selCl.innerHTML = '<option value="">— Sélectionner un client —</option>' +
      clients.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
  }

  const selDos = document.getElementById('f-dossier');
  if (selDos) {
    selDos.innerHTML = '<option value="">— Aucun dossier —</option>' +
      dossiers.map(d => `<option value="${d.id}" data-num="${d.numero}">${d.numero} · ${d.clientNom}</option>`).join('');
  }

  const filtCl = document.getElementById('fac-filter-client');
  if (filtCl) {
    const saved = filtCl.value;
    filtCl.innerHTML = '<option value="all">Tous les clients</option>' +
      clients.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
    filtCl.value = saved;
  }
}

/* ══ DATES PAR DÉFAUT ══ */
function setDefaultDates() {
  const today   = new Date().toISOString().slice(0,10);
  const plus30  = new Date(Date.now() + 30*864e5).toISOString().slice(0,10);
  const de = document.getElementById('f-date-emission');
  const ec = document.getElementById('f-date-echeance');
  if (de && !de.value) de.value = today;
  if (ec && !ec.value) ec.value = plus30;
}

/* ══ LIGNES DE FACTURE ══ */
function addLigne(desc='', qte=1, pu=0) {
  const id = Date.now() + Math.random();
  lignesData.push({ id, desc, qte, pu });
  renderLignes();
}

function renderLignes() {
  const tbody = document.getElementById('lignes-tbody'); if (!tbody) return;
  tbody.innerHTML = lignesData.map(l => `
    <tr data-id="${l.id}">
      <td><input type="text" placeholder="Description de la prestation…" value="${escHtml(l.desc)}"
          oninput="updateLigne(${l.id},'desc',this.value)"/></td>
      <td><input type="number" min="1" value="${l.qte}" style="text-align:center"
          oninput="updateLigne(${l.id},'qte',this.value)"/></td>
      <td><input type="number" min="0" value="${l.pu}" placeholder="0"
          oninput="updateLigne(${l.id},'pu',this.value)"/></td>
      <td><input class="montant-ligne" readonly value="${formatMontant(l.qte * l.pu)}" tabindex="-1"/></td>
      <td><button class="fac-del-ligne" onclick="delLigne(${l.id})"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('');
  recalcTotaux();
}

function updateLigne(id, field, val) {
  const l = lignesData.find(x => x.id === id);
  if (!l) return;
  if (field === 'qte') l.qte = parseFloat(val) || 0;
  else if (field === 'pu') l.pu = parseFloat(val) || 0;
  else l.desc = val;
  // Mettre à jour le montant de cette ligne
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (row) {
    const inp = row.querySelector('.montant-ligne');
    if (inp) inp.value = formatMontant(l.qte * l.pu);
  }
  recalcTotaux();
}

function delLigne(id) {
  lignesData = lignesData.filter(l => l.id !== id);
  renderLignes();
}

function recalcTotaux() {
  const ht  = lignesData.reduce((s, l) => s + (l.qte * l.pu), 0);
  const tva = parseFloat(document.getElementById('f-tva')?.value || 19.25) / 100;
  const montantTva = ht * tva;
  const ttc = ht + montantTva;

  const up = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  up('total-ht',  formatMontant(ht));
  up('total-tva', formatMontant(montantTva));
  up('total-ttc', formatMontant(ttc));
  const tvaLbl = document.getElementById('tva-label');
  if (tvaLbl) tvaLbl.textContent = (tva*100).toFixed(2).replace('.00','');
}

/* ══ MODAL CRÉATION / ÉDITION ══ */
function openModal(id = null) {
  facState.editId = id;
  lignesData = [];
  populateSelects();
  setDefaultDates();

  const titleEl = document.getElementById('modal-title');
  const subEl   = document.getElementById('modal-sub');

  if (id) {
    const f = getFactures().find(x => x.id === id);
    if (!f) return;
    if (titleEl) titleEl.textContent = `Modifier ${f.numero}`;
    if (subEl)   subEl.textContent   = f.clientNom;

    document.getElementById('f-client').value        = f.clientId || '';
    document.getElementById('f-dossier').value       = f.dossierId || '';
    document.getElementById('f-date-emission').value = f.dateEmission || '';
    document.getElementById('f-date-echeance').value = f.dateEcheance || '';
    document.getElementById('f-tva').value           = f.tauxTva || 19.25;
    document.getElementById('f-statut').value        = f.statut;
    document.getElementById('f-notes').value         = f.notes || '';

    lignesData = (f.lignes || []).map(l => ({ ...l, id: Date.now() + Math.random() }));
    if (!lignesData.length) addLigne();
    else renderLignes();
  } else {
    if (titleEl) titleEl.textContent = 'Nouvelle facture';
    if (subEl)   subEl.textContent   = 'Renseignez les informations de la facture';
    ['f-client','f-dossier','f-notes'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('f-statut').value = 'brouillon';
    document.getElementById('f-tva').value    = '19.25';
    lignesData = [];
    addLigne();
  }

  document.getElementById('modal-form')?.classList.add('show');
}

function closeModal() {
  document.getElementById('modal-form')?.classList.remove('show');
  facState.editId = null;
  lignesData = [];
}

function saveModal() {
  const clientId = document.getElementById('f-client').value;
  if (!clientId) { showToast('Sélectionner un client', 'error'); return; }

  const dateEm = document.getElementById('f-date-emission').value;
  const dateEc = document.getElementById('f-date-echeance').value;
  if (!dateEm || !dateEc) { showToast('Les dates sont obligatoires', 'error'); return; }

  const clients  = getClients();
  const dossiers = getDossiers();
  const client   = clients.find(c => c.id == clientId) || {};
  const dossierId = document.getElementById('f-dossier').value;
  const dossier   = dossiers.find(d => d.id == dossierId) || {};
  const tauxTva   = parseFloat(document.getElementById('f-tva').value) || 19.25;

  const ht         = lignesData.reduce((s, l) => s + (l.qte * l.pu), 0);
  const montantTva = ht * tauxTva / 100;
  const ttc        = ht + montantTva;

  const f = {
    clientId      : parseInt(clientId),
    clientNom     : client.nom || '—',
    dossierId     : parseInt(dossierId) || null,
    dossierNumero : dossier.numero || '',
    dateEmission  : dateEm,
    dateEcheance  : dateEc,
    tauxTva,
    montantHT     : ht,
    montantTva,
    montantTTC    : ttc,
    statut        : document.getElementById('f-statut').value,
    notes         : document.getElementById('f-notes').value.trim(),
    lignes        : lignesData.map(({ desc, qte, pu }) => ({ desc, qte, pu })),
  };

  const all = getFactures();
  if (facState.editId) {
    const idx = all.findIndex(x => x.id === facState.editId);
    if (idx !== -1) all[idx] = { ...all[idx], ...f };
    showToast('Facture modifiée', 'success');
  } else {
    all.push({ id: Date.now(), numero: nextNumero(), dateCreation: dateEm, ...f });
    showToast(`Facture ${nextNumeroPreview(all)} créée`, 'success');
  }

  saveFactures(all);
  closeModal();
}

function nextNumeroPreview(all) { return all[all.length-1]?.numero || ''; }

/* ══ MODAL DÉTAIL ══ */
function openDetail(id) {
  const f = getFactures().find(x => x.id === id);
  if (!f) return;
  currentDetailId = id;
  const sm = STATUT_META[f.statut] || STATUT_META.brouillon;

  document.getElementById('detail-num').textContent          = f.numero;
  document.getElementById('detail-client').textContent       = f.clientNom;
  document.getElementById('detail-dossier-ref').textContent  = f.dossierNumero ? `Dossier ${f.dossierNumero}` : 'Aucun dossier lié';
  document.getElementById('detail-date-emission').textContent = formatDate(f.dateEmission);
  document.getElementById('detail-date-echeance').textContent = formatDate(f.dateEcheance);
  document.getElementById('detail-statut').innerHTML          = `<span class="fac-badge ${sm.cls}"><i class="fa-solid ${sm.icon}"></i>${sm.label}</span>`;

  // Lignes
  const lbody = document.getElementById('detail-lignes-body');
  if (lbody) {
    lbody.innerHTML = (f.lignes || []).map(l => `
      <tr>
        <td>${escHtml(l.desc || '—')}</td>
        <td class="td-right">${l.qte}</td>
        <td class="td-right">${formatMontant(l.pu)}</td>
        <td class="td-right">${formatMontant(l.qte * l.pu)}</td>
      </tr>`).join('');
  }

  document.getElementById('detail-ht').textContent  = formatMontant(f.montantHT);
  document.getElementById('detail-tva-lbl').textContent = `TVA (${f.tauxTva}%)`;
  document.getElementById('detail-tva').textContent  = formatMontant(f.montantTva);
  document.getElementById('detail-ttc').textContent  = formatMontant(f.montantTTC);

  const notesBlock = document.getElementById('detail-notes-block');
  const notesEl    = document.getElementById('detail-notes');
  if (f.notes) {
    notesBlock.style.display = 'block';
    notesEl.textContent = f.notes;
  } else {
    notesBlock.style.display = 'none';
  }

  document.getElementById('detail-edit-btn').onclick = () => { closeDetail(); openModal(id); };
  document.getElementById('detail-del-btn').onclick  = () => { closeDetail(); openConfirm(id); };
  document.getElementById('detail-pay-btn').onclick  = () => { marquerPayee(id); closeDetail(); };
  const pdfBtn = document.getElementById('detail-pdf-btn');
  if (pdfBtn) pdfBtn.onclick = () => exportFacturePDF(id);

  // Masquer "marquer payée" si déjà payée
  document.getElementById('detail-pay-btn').style.display = f.statut === 'payee' ? 'none' : '';

  document.getElementById('modal-detail')?.classList.add('show');
}

function closeDetail() {
  document.getElementById('modal-detail')?.classList.remove('show');
  currentDetailId = null;
}

/* ══ MARQUER PAYÉE ══ */
function marquerPayee(id) {
  const all = getFactures();
  const idx = all.findIndex(f => f.id === id);
  if (idx !== -1) {
    all[idx].statut = 'payee';
    saveFactures(all);
    showToast('Facture marquée comme payée', 'success');
  }
}

/* ══ CONFIRMATION SUPPRESSION ══ */
function openConfirm(id) {
  pendingDeleteId = id;
  const f = getFactures().find(x => x.id === id);
  if (!f) return;
  const el = document.getElementById('confirm-msg');
  if (el) el.innerHTML = `Supprimer la facture <strong>${f.numero}</strong> (${f.clientNom}) ? Action irréversible.`;
  document.getElementById('modal-confirm')?.classList.add('show');
}
function closeConfirm() {
  document.getElementById('modal-confirm')?.classList.remove('show');
  pendingDeleteId = null;
}
function confirmDelete() {
  if (!pendingDeleteId) return;
  saveFactures(getFactures().filter(f => f.id !== pendingDeleteId));
  closeConfirm();
  showToast('Facture supprimée', 'success');
}

/* ══ EXPORT CSV ══ */
function exportFactures() {
  const data = getFactures();
  if (!data.length) { showToast('Aucune facture à exporter', 'error'); return; }
  const headers = ['N° Facture','Client','Dossier','Date émission','Échéance','HT','TVA','TTC','Statut'];
  const rows = data.map(f => [
    f.numero, f.clientNom, f.dossierNumero||'',
    f.dateEmission, f.dateEcheance,
    f.montantHT?.toFixed(0)||0,
    f.montantTva?.toFixed(0)||0,
    f.montantTTC?.toFixed(0)||0,
    STATUT_META[f.statut]?.label || f.statut
  ].join(';'));
  const csv  = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href:url, download:'transitflow-factures.csv' }).click();
  URL.revokeObjectURL(url);
  showToast('Export CSV généré', 'success');
}

/* ══ UTILITAIRES ══ */
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function formatMontant(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg, type = 'info') {
  document.querySelector('.tf-toast')?.remove();
  const t = document.createElement('div');
  t.className = `tf-toast tf-toast-${type}`;
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  t.innerHTML = `<i class="fa-solid ${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeDetail(); closeConfirm(); }
});
