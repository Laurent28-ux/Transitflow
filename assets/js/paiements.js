/* ── TransitFlow · paiements.js ─────────────────────
   Gestion des Paiements — CRUD complet
   Lié aux Factures · Modes de paiement · Export CSV
─────────────────────────────────────────────────── */

/* ══ ÉTAT ══ */
let payState = {
  search  : '',
  statut  : 'all',
  mode    : 'all',
  page    : 1,
  pageSize: 10,
  editId  : null,
};
let pendingDeleteId = null;
let currentDetailId = null;

/* ══ MÉTA STATUTS ══ */
const STATUT_META = {
  confirme  : { label:'Confirmé',   icon:'fa-circle-check',        cls:'confirme'   },
  en_attente: { label:'En attente', icon:'fa-hourglass-half',       cls:'en_attente' },
  echoue    : { label:'Échoué',     icon:'fa-circle-xmark',         cls:'echoue'     },
  rembourse : { label:'Remboursé',  icon:'fa-rotate-left',          cls:'rembourse'  },
};

/* ══ MÉTA MODES ══ */
const MODE_META = {
  mobile   : { label:'Mobile Money',     icon:'fa-mobile-screen-button', cls:'mobile'   },
  virement : { label:'Virement bancaire',icon:'fa-building-columns',     cls:'virement' },
  especes  : { label:'Espèces',          icon:'fa-money-bills',          cls:'especes'  },
  cheque   : { label:'Chèque',           icon:'fa-money-check',          cls:'cheque'   },
  carte    : { label:'Carte bancaire',   icon:'fa-credit-card',          cls:'carte'    },
};

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof TFStore !== 'undefined') await TFStore.hydrate();
  populateFacturesSelect();
  setDefaultDate();
  renderStats();
  renderTable();
  initSearch();
  initFilters();

  window.addEventListener('tf:paiements:changed', () => { renderStats(); renderTable(); });
  window.addEventListener('tf:factures:changed',  () => populateFacturesSelect());
});

/* ══ DONNÉES ══ */
function getPaiements() {
  return JSON.parse(localStorage.getItem('tf_paiements_v1') || '[]');
}
function savePaiements(data) {
  localStorage.setItem('tf_paiements_v1', JSON.stringify(data));
  window.dispatchEvent(new Event('tf:paiements:changed'));
}
function nextRef() {
  const all  = getPaiements();
  if (!all.length) return 'PAY-001';
  const nums = all.map(p => parseInt(p.reference.replace('PAY-','')) || 0);
  return 'PAY-' + String(Math.max(...nums) + 1).padStart(3, '0');
}
function getFactures() {
  return JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
}

/* ══ CALCUL RESTE À PAYER ══ */
function calcReste(factureId) {
  const facture  = getFactures().find(f => f.id == factureId);
  if (!facture) return 0;
  const dejaPaye = getPaiements()
    .filter(p => p.factureId == factureId && p.statut === 'confirme')
    .reduce((s, p) => s + (p.montant || 0), 0);
  return Math.max(0, (facture.montantTTC || 0) - dejaPaye);
}

/* ══ FILTRAGE ══ */
function getFiltered() {
  let data = getPaiements();
  if (payState.statut !== 'all') data = data.filter(p => p.statut === payState.statut);
  if (payState.mode   !== 'all') data = data.filter(p => p.mode   === payState.mode);
  if (payState.search.trim()) {
    const q = payState.search.toLowerCase();
    data = data.filter(p =>
      p.reference.toLowerCase().includes(q) ||
      p.factureNumero.toLowerCase().includes(q) ||
      p.clientNom.toLowerCase().includes(q) ||
      (p.refTransaction||'').toLowerCase().includes(q)
    );
  }
  data.sort((a, b) => new Date(b.date) - new Date(a.date));
  return data;
}

/* ══ STATS ══ */
function renderStats() {
  const all       = getPaiements();
  const confirmes = all.filter(p => p.statut === 'confirme');
  const attente   = all.filter(p => p.statut === 'en_attente');
  const mobile    = all.filter(p => p.mode   === 'mobile');
  const sumAmt    = arr => arr.reduce((s, p) => s + (p.montant || 0), 0);

  const up = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  up('ps-total',         all.length);
  up('ps-confirmes',     confirmes.length);
  up('ps-confirmes-amt', formatMontant(sumAmt(confirmes)));
  up('ps-attente',       attente.length);
  up('ps-attente-amt',   formatMontant(sumAmt(attente)));
  up('ps-mobile',        mobile.length);
}

/* ══ TABLE ══ */
function renderTable() {
  const filtered  = getFiltered();
  const total     = filtered.length;
  const pages     = Math.max(1, Math.ceil(total / payState.pageSize));
  payState.page   = Math.min(payState.page, pages);
  const slice     = filtered.slice((payState.page-1)*payState.pageSize, payState.page*payState.pageSize);

  const subEl = document.getElementById('pth-sub');
  if (subEl) subEl.textContent = `${total} paiement${total>1?'s':''}`;

  const tbody = document.getElementById('pay-tbody');
  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="pay-empty">
        <i class="fa-solid fa-money-bill-wave"></i>
        <p>Aucun paiement trouvé</p>
        <button class="btn primary" onclick="openModal()"><i class="fa-solid fa-plus"></i>Enregistrer un paiement</button>
      </div>
    </td></tr>`;
  } else {
    tbody.innerHTML = slice.map(p => {
      const sm = STATUT_META[p.statut] || STATUT_META.en_attente;
      const mm = MODE_META[p.mode]     || MODE_META.especes;
      return `<tr onclick="openDetail(${p.id})">
        <td class="td-pay-ref">${p.reference}</td>
        <td>
          <div class="td-fac-cell">
            <div class="td-fac-ico"><i class="fa-solid fa-file-invoice-dollar"></i></div>
            <div>
              <p class="td-fac-num">${p.factureNumero}</p>
              <p class="td-fac-cli">${p.clientNom}</p>
            </div>
          </div>
        </td>
        <td class="td-montant">${formatMontant(p.montant)}</td>
        <td>
          <div class="pay-mode-cell">
            <div class="pay-mode-ico ${mm.cls}"><i class="fa-solid ${mm.icon}"></i></div>
            <span>${mm.label}</span>
          </div>
        </td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:#6B7280">${formatDate(p.date)}</td>
        <td><span class="pay-badge ${sm.cls}"><i class="fa-solid ${sm.icon}"></i>${sm.label}</span></td>
        <td>
          <div class="pay-row-actions" onclick="event.stopPropagation()">
            <button class="btn sm" onclick="openModal(${p.id})" title="Modifier"><i class="fa-solid fa-pen"></i></button>
            <button class="btn sm danger" onclick="openConfirm(${p.id})" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination(total, pages);
}

/* ══ PAGINATION ══ */
function renderPagination(total, pages) {
  const infoEl = document.getElementById('pay-pag-info');
  const btnsEl = document.getElementById('pay-pag-btns');
  if (!infoEl || !btnsEl) return;
  const s = (payState.page-1)*payState.pageSize+1;
  const e = Math.min(payState.page*payState.pageSize, total);
  infoEl.textContent = total ? `${s}–${e} sur ${total}` : '0 résultat';
  let html = `<button class="pay-pag-btn" onclick="goPage(${payState.page-1})" ${payState.page===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let p=1; p<=Math.min(pages,5); p++)
    html += `<button class="pay-pag-btn ${p===payState.page?'active':''}" onclick="goPage(${p})">${p}</button>`;
  html += `<button class="pay-pag-btn" onclick="goPage(${payState.page+1})" ${payState.page===pages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
  btnsEl.innerHTML = html;
}
function goPage(p) {
  const pages = Math.ceil(getFiltered().length / payState.pageSize);
  if (p < 1 || p > pages) return;
  payState.page = p; renderTable();
}

/* ══ SEARCH / FILTERS ══ */
function initSearch() {
  const inp = document.getElementById('pay-search'); if (!inp) return;
  let t;
  inp.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { payState.search = inp.value; payState.page = 1; renderTable(); }, 250);
  });
}
function initFilters() {
  document.getElementById('pay-filter-statut')?.addEventListener('change', e => {
    payState.statut = e.target.value; payState.page = 1; renderTable();
  });
  document.getElementById('pay-filter-mode')?.addEventListener('change', e => {
    payState.mode = e.target.value; payState.page = 1; renderTable();
  });
}

/* ══ SELECT FACTURES ══ */
function populateFacturesSelect() {
  const factures = getFactures().filter(f => f.statut !== 'annulee');
  const sel = document.getElementById('f-facture');
  if (!sel) return;
  const saved = sel.value;
  sel.innerHTML = '<option value="">— Sélectionner une facture —</option>' +
    factures.map(f =>
      `<option value="${f.id}" data-num="${f.fac}" data-client="${f.clientNom}" data-ttc="${f.montantTTC}">` +
      `${f.numero} · ${f.clientNom} · ${formatMontant(f.montantTTC)}</option>`
    ).join('');
  if (saved) sel.value = saved;
}

/* ══ APERÇU FACTURE DANS MODAL ══ */
function onFactureChange() {
  const sel     = document.getElementById('f-facture');
  const preview = document.getElementById('fac-preview');
  const factureId = sel?.value;

  if (!factureId) {
    if (preview) preview.classList.remove('show');
    return;
  }

  const facture = getFactures().find(f => f.id == factureId);
  if (!facture) return;

  const reste = calcReste(factureId);
  // Pré-remplir le montant avec le reste à payer
  const montantInp = document.getElementById('f-montant');
  if (montantInp && !payState.editId) montantInp.value = Math.round(reste);

  document.getElementById('prev-num').textContent    = facture.numero;
  document.getElementById('prev-client').textContent = facture.clientNom;
  document.getElementById('prev-ttc').textContent    = formatMontant(facture.montantTTC);
  document.getElementById('prev-reste').textContent  = formatMontant(reste);

  if (preview) preview.classList.add('show');
}

/* ══ DATE PAR DÉFAUT ══ */
function setDefaultDate() {
  const inp = document.getElementById('f-date');
  if (inp && !inp.value) inp.value = new Date().toISOString().slice(0,10);
}

/* ══ MODAL CRÉATION / ÉDITION ══ */
function openModal(id = null) {
  payState.editId = id;
  populateFacturesSelect();
  setDefaultDate();

  const titleEl = document.getElementById('modal-title');
  const subEl   = document.getElementById('modal-sub');
  const preview = document.getElementById('fac-preview');
  if (preview) preview.classList.remove('show');

  if (id) {
    const p = getPaiements().find(x => x.id === id);
    if (!p) return;
    if (titleEl) titleEl.textContent = `Modifier ${p.reference}`;
    if (subEl)   subEl.textContent   = p.clientNom;
    document.getElementById('f-facture').value         = p.factureId || '';
    document.getElementById('f-montant').value         = p.montant || '';
    document.getElementById('f-mode').value            = p.mode;
    document.getElementById('f-date').value            = p.date;
    document.getElementById('f-ref-transaction').value = p.refTransaction || '';
    document.getElementById('f-statut').value          = p.statut;
    document.getElementById('f-notes').value           = p.notes || '';
    onFactureChange();
  } else {
    if (titleEl) titleEl.textContent = 'Nouveau paiement';
    if (subEl)   subEl.textContent   = 'Enregistrer un encaissement';
    ['f-facture','f-montant','f-ref-transaction','f-notes'].forEach(fid => {
      const el = document.getElementById(fid); if (el) el.value = '';
    });
    document.getElementById('f-mode').value   = 'mobile';
    document.getElementById('f-statut').value = 'confirme';
    setDefaultDate();
  }
  document.getElementById('modal-form')?.classList.add('show');
}

function closeModal() {
  document.getElementById('modal-form')?.classList.remove('show');
  payState.editId = null;
}

function saveModal() {
  const factureId = document.getElementById('f-facture').value;
  const montant   = parseFloat(document.getElementById('f-montant').value);
  const date      = document.getElementById('f-date').value;

  if (!factureId) { showToast('Sélectionner une facture', 'error'); return; }
  if (!montant || montant <= 0) { showToast('Le montant doit être supérieur à 0', 'error'); return; }
  if (!date)    { showToast('La date est obligatoire', 'error'); return; }

  const facture = getFactures().find(f => f.id == factureId) || {};

  const p = {
    factureId      : parseInt(factureId),
    factureNumero  : facture.numero      || '—',
    clientNom      : facture.clientNom   || '—',
    montant,
    mode           : document.getElementById('f-mode').value,
    date,
    refTransaction : document.getElementById('f-ref-transaction').value.trim(),
    statut         : document.getElementById('f-statut').value,
    notes          : document.getElementById('f-notes').value.trim(),
  };

  const all = getPaiements();
  if (payState.editId) {
    const idx = all.findIndex(x => x.id === payState.editId);
    if (idx !== -1) all[idx] = { ...all[idx], ...p };
    showToast('Paiement modifié', 'success');
  } else {
    const nouveau = { id: Date.now(), reference: nextRef(), dateCreation: date, ...p };
    all.push(nouveau);
    // Si paiement confirmé → mettre la facture à "payée" si reste = 0
    if (p.statut === 'confirme') {
      const reste = calcReste(factureId) - montant;
      if (reste <= 0) autoMarquerFacturePayee(factureId);
    }
    showToast(`Paiement ${nouveau.reference} enregistré`, 'success');
  }

  savePaiements(all);
  closeModal();
}

/* ══ AUTO MARQUER FACTURE PAYÉE ══ */
function autoMarquerFacturePayee(factureId) {
  const factures = JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
  const idx = factures.findIndex(f => f.id == factureId);
  if (idx !== -1 && factures[idx].statut !== 'payee') {
    factures[idx].statut = 'payee';
    localStorage.setItem('tf_factures_v1', JSON.stringify(factures));
    window.dispatchEvent(new Event('tf:factures:changed'));
    showToast('Facture automatiquement marquée comme payée', 'info');
  }
}

/* ══ MODAL DÉTAIL ══ */
function openDetail(id) {
  const p = getPaiements().find(x => x.id === id);
  if (!p) return;
  currentDetailId = id;
  const sm = STATUT_META[p.statut] || STATUT_META.en_attente;
  const mm = MODE_META[p.mode]     || MODE_META.especes;

  document.getElementById('detail-ref').textContent      = p.reference;
  document.getElementById('detail-amt').textContent      = formatMontant(p.montant);
  document.getElementById('detail-date').textContent     = formatDate(p.date);
  document.getElementById('detail-facture').textContent  = `${p.factureNumero}`;
  document.getElementById('detail-client').textContent   = p.clientNom;
  document.getElementById('detail-ref-trans').textContent = p.refTransaction || '—';
  document.getElementById('detail-notes').textContent    = p.notes || 'Aucune note';

  document.getElementById('detail-statut-pill').innerHTML =
    `<i class="fa-solid ${sm.icon}"></i>${sm.label}`;
  document.getElementById('detail-mode-pill').innerHTML  =
    `<i class="fa-solid ${mm.icon}"></i>${mm.label}`;

  document.getElementById('detail-edit-btn').onclick = () => { closeDetail(); openModal(id); };
  document.getElementById('detail-del-btn').onclick  = () => { closeDetail(); openConfirm(id); };

  document.getElementById('modal-detail')?.classList.add('show');
}
function closeDetail() {
  document.getElementById('modal-detail')?.classList.remove('show');
  currentDetailId = null;
}

/* ══ CONFIRMATION SUPPRESSION ══ */
function openConfirm(id) {
  pendingDeleteId = id;
  const p = getPaiements().find(x => x.id === id);
  if (!p) return;
  const el = document.getElementById('confirm-msg');
  if (el) el.innerHTML = `Supprimer le paiement <strong>${p.reference}</strong> (${formatMontant(p.montant)}) ? Action irréversible.`;
  document.getElementById('modal-confirm')?.classList.add('show');
}
function closeConfirm() {
  document.getElementById('modal-confirm')?.classList.remove('show');
  pendingDeleteId = null;
}
function confirmDelete() {
  if (!pendingDeleteId) return;
  savePaiements(getPaiements().filter(p => p.id !== pendingDeleteId));
  closeConfirm();
  showToast('Paiement supprimé', 'success');
}

/* ══ EXPORT CSV ══ */
function exportPaiements() {
  const data = getPaiements();
  if (!data.length) { showToast('Aucun paiement à exporter', 'error'); return; }
  const headers = ['Référence','Facture','Client','Montant','Mode','Date','Ref. Transaction','Statut','Notes'];
  const rows = data.map(p => [
    p.reference, p.factureNumero, p.clientNom,
    p.montant, MODE_META[p.mode]?.label || p.mode,
    p.date, p.refTransaction||'',
    STATUT_META[p.statut]?.label || p.statut, p.notes||''
  ].join(';'));
  const csv  = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href:url, download:'transitflow-paiements.csv' }).click();
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
