/* ── TransitFlow · clients.js ── */

let CLIENTS = TFStore.getClients();
let viewMode = 'table';
let clientState = { search:'', filter:'all', page:1, pageSize:9, editId:null };
let pendingDeleteId = null;

const TYPE_COLORS = { 'Entreprise':'#0a0a0a','PME':'#2c5ce0','Particulier':'#1a8a4a' };

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof TFStore !== 'undefined') await TFStore.hydrate();
  renderStats();
  renderView();
  initSearch();
  initFilters();
  initForm();
  window.addEventListener('tf:clients:changed', () => { CLIENTS = TFStore.getClients(); renderStats(); renderView(); });
  window.addEventListener('tf:colis:added',    () => renderStats());
});

/* ── STATS ── */
function renderStats() {
  const s = TFStore.getStats();
  const up = (id, v) => { const e = document.getElementById(id); if(e) animCount(e, parseInt(e.textContent)||0, v); };
  up('cl-stat-total',   s.clients.total);
  up('cl-stat-actifs',  s.clients.actifs);
  up('cl-stat-inactifs',s.clients.inactifs);
  const colis = TFStore.getColis();
  const avg   = s.clients.total ? (colis.length / s.clients.total).toFixed(1) : '0';
  const avgEl = document.getElementById('cl-stat-avg'); if(avgEl) avgEl.textContent = avg;
}

function animCount(el, from, to) {
  const dur = 700, start = performance.now();
  const run = now => {
    const p = Math.min((now-start)/dur,1), e = 1-Math.pow(1-p,3);
    el.textContent = Math.floor(from+(to-from)*e);
    if(p<1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

/* ── FILTRAGE ── */
function getFiltered() {
  let data = TFStore.getClients();
  if (clientState.filter !== 'all') data = data.filter(c => c.status === clientState.filter);
  if (clientState.search.trim()) {
    const q = clientState.search.toLowerCase();
    data = data.filter(c => c.nom.toLowerCase().includes(q) || c.ville.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }
  return data;
}

/* ── RENDER ── */
function renderView() {
  CLIENTS = TFStore.getClients();
  const tableWrap = document.getElementById('table-view');
  const gridWrap  = document.getElementById('grid-view');
  if (!tableWrap || !gridWrap) return;
  if (viewMode === 'table') { tableWrap.style.display=''; gridWrap.style.display='none'; renderTable(); }
  else                      { tableWrap.style.display='none'; gridWrap.style.display=''; renderGrid(); }
}

function renderTable() {
  const filtered = getFiltered();
  const total    = filtered.length;
  const pages    = Math.max(1, Math.ceil(total / clientState.pageSize));
  clientState.page = Math.min(clientState.page, pages);
  const slice    = filtered.slice((clientState.page-1)*clientState.pageSize, clientState.page*clientState.pageSize);

  const hdr = document.getElementById('tch-sub');
  if (hdr) hdr.textContent = `${total} client${total>1?'s':''}`;

  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#9e9e9a"><i class="fa-solid fa-users" style="font-size:32px;display:block;margin-bottom:8px;color:#e4e4e1"></i>Aucun client trouvé</td></tr>`;
  } else {
    const colisList = TFStore.getColis();
    tbody.innerHTML = slice.map(c => {
      const colisCount = colisList.filter(co => co.client === c.nom).length;
      const initials   = c.nom.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const statusBadge = c.status === 'active'
        ? '<span class="badge b-active"><i class="fa-solid fa-circle-check"></i>Actif</span>'
        : '<span class="badge b-inactive"><i class="fa-solid fa-circle-xmark"></i>Inactif</span>';
      return `<tr>
        <td><div class="client-cell"><div class="cl-av">${initials}</div><div><p class="cl-name">${c.nom}</p><p class="cl-type-lbl">${c.type}</p></div></div></td>
        <td><div class="cl-contact"><span><i class="fa-solid fa-phone"></i>${c.tel}</span><span><i class="fa-regular fa-envelope"></i>${c.email}</span></div></td>
        <td>${c.ville}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:#6e6e6a">${colisCount}</td>
        <td>${statusBadge}</td>
        <td><div class="row-actions">
          <button class="ra-btn" onclick="openModal(${c.id})" title="Modifier"><i class="fa-solid fa-pen"></i></button>
          <button class="ra-btn danger" onclick="openConfirm(${c.id})" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }
  renderPagination(total, pages, 'pag-info', 'pag-btns');
}

function renderGrid() {
  const filtered   = getFiltered();
  const grid       = document.getElementById('grid-view');
  const colisList  = TFStore.getColis();
  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9e9e9a"><i class="fa-solid fa-users" style="font-size:32px;display:block;margin-bottom:8px;color:#e4e4e1"></i>Aucun client trouvé</div>`;
    return;
  }
  grid.innerHTML = filtered.map(c => {
    const colisCount = colisList.filter(co => co.client === c.nom).length;
    const initials   = c.nom.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const statusBadge = c.status === 'active'
      ? '<span class="badge b-active"><i class="fa-solid fa-circle-check"></i>Actif</span>'
      : '<span class="badge b-inactive"><i class="fa-solid fa-circle-xmark"></i>Inactif</span>';
    return `<div class="cl-card">
      <div class="cl-card-av" style="background:${TYPE_COLORS[c.type]||'#0a0a0a'}">${initials}</div>
      <p class="cl-card-name">${c.nom}</p>
      <p class="cl-card-type">${c.type} · ${c.ville}</p>
      <div class="cl-card-stats"><span><i class="fa-solid fa-boxes-stacked"></i>${colisCount} colis</span></div>
      <div style="margin-top:10px">${statusBadge}</div>
      <div class="cl-card-actions">
        <button class="btn sm" onclick="openModal(${c.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn sm danger" onclick="openConfirm(${c.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ── PAGINATION ── */
function renderPagination(total, pages, infoId, btnsId) {
  const infoEl = document.getElementById(infoId);
  const btnsEl = document.getElementById(btnsId);
  if (!infoEl || !btnsEl) return;
  const s = (clientState.page-1)*clientState.pageSize+1;
  const e = Math.min(clientState.page*clientState.pageSize, total);
  infoEl.textContent = total ? `${s}–${e} sur ${total}` : '0 résultat';
  let html = `<button class="pag-btn" onclick="goPage(${clientState.page-1})" ${clientState.page===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let p=1; p<=Math.min(pages,5); p++) html += `<button class="pag-btn ${p===clientState.page?'active':''}" onclick="goPage(${p})">${p}</button>`;
  html += `<button class="pag-btn" onclick="goPage(${clientState.page+1})" ${clientState.page===pages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
  btnsEl.innerHTML = html;
}

function goPage(p) {
  const pages = Math.ceil(getFiltered().length / clientState.pageSize);
  if (p < 1 || p > pages) return;
  clientState.page = p; renderView();
}

/* ── SEARCH & FILTER ── */
function initSearch() {
  const inp = document.getElementById('client-search');
  if (!inp) return;
  let t;
  inp.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { clientState.search = inp.value; clientState.page=1; renderView(); }, 250);
  });
}

function initFilters() {
  document.getElementById('client-filter')?.addEventListener('change', e => {
    clientState.filter = e.target.value; clientState.page=1; renderView();
  });
}

/* ── VIEW TOGGLE ── */
function setView(v) {
  viewMode = v;
  document.getElementById('vt-table')?.classList.toggle('active', v==='table');
  document.getElementById('vt-grid')?.classList.toggle('active', v==='grid');
  renderView();
}

/* ── MODAL ── */
function initForm() {
  document.getElementById('client-form')?.addEventListener('submit', e => { e.preventDefault(); saveModal(); });
}

function openModal(id=null) {
  clientState.editId = id;
  const modal = document.getElementById('modal');
  const t = document.getElementById('modal-title');
  const s = document.getElementById('modal-sub');
  if (id) {
    const c = TFStore.getClients().find(x => x.id===id);
    if (!c) return;
    t.textContent='Modifier le client'; s.textContent=c.nom;
    document.getElementById('f-nom').value    = c.nom;
    document.getElementById('f-type').value   = c.type;
    document.getElementById('f-tel').value    = c.tel;
    document.getElementById('f-email').value  = c.email;
    document.getElementById('f-ville').value  = c.ville;
    document.getElementById('f-status').value = c.status;
  } else {
    t.textContent='Nouveau client'; s.textContent='Informations du client';
    ['f-nom','f-tel','f-email','f-ville'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('f-type').value   = 'Entreprise';
    document.getElementById('f-status').value = 'active';
  }
  modal?.classList.add('show');
}

function closeModal() { document.getElementById('modal')?.classList.remove('show'); }

async function saveModal() {
  const f = {
    nom   : document.getElementById('f-nom').value.trim(),
    type  : document.getElementById('f-type').value,
    tel   : document.getElementById('f-tel').value.trim(),
    email : document.getElementById('f-email').value.trim(),
    ville : document.getElementById('f-ville').value.trim(),
    status: document.getElementById('f-status').value,
  };
  if (!f.nom || !f.ville) { showToast('Nom et ville obligatoires','error'); return; }
  if (clientState.editId) { await TFStore.updateClient(clientState.editId, f); showToast('Client modifié','success'); }
  else                    { await TFStore.addClient(f); showToast('Client ajouté','success'); }
  closeModal();
}

/* ── CONFIRM DELETE ── */
function openConfirm(id) {
  pendingDeleteId = id;
  const c = TFStore.getClients().find(x => x.id===id);
  if (!c) return;
  const m = document.getElementById('confirm-msg');
  // Compter les données liées
  const factures = JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
  const dossiers = JSON.parse(localStorage.getItem('tf_dossiers_v1') || '[]');
  const facCount = factures.filter(f => f.clientId === id).length;
  const dosCount = dossiers.filter(d => d.clientId === id).length;
  let details = '';
  if (facCount > 0) details += `<br><span style="color:#DC2626;font-size:12px"><i class="fa-solid fa-file-invoice-dollar"></i> ${facCount} facture${facCount>1?'s':''} seront annulée${facCount>1?'s':''}</span>`;
  if (dosCount > 0) details += `<br><span style="color:#F97316;font-size:12px"><i class="fa-solid fa-folder-open"></i> ${dosCount} dossier${dosCount>1?'s':''} seront clôturé${dosCount>1?'s':''}</span>`;
  if (m) m.innerHTML = `Supprimer <strong>${c.nom}</strong> ? Cette action est irréversible.${details}`;
  document.getElementById('confirm-modal')?.classList.add('show');
}
function closeConfirm() { document.getElementById('confirm-modal')?.classList.remove('show'); pendingDeleteId=null; }
async function confirmDelete() {
  if (!pendingDeleteId) return;
  const clientId = pendingDeleteId;
  const client   = TFStore.getClients().find(c => c.id === clientId);
  const nom      = client?.nom || 'ce client';

  // 1. Supprimer le client
  await TFStore.deleteClient(clientId);

  // 2. Nettoyer les factures liées → passer clientNom à "Client supprimé"
  const factures = JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
  let facCount = 0;
  const newFac = factures.map(f => {
    if (f.clientId === clientId) {
      facCount++;
      return { ...f, clientId: null, clientNom: '[Client supprimé]', statut: 'annulee' };
    }
    return f;
  });
  localStorage.setItem('tf_factures_v1', JSON.stringify(newFac));

  // 3. Nettoyer les dossiers liés → passer clientNom à "Client supprimé"
  const dossiers = JSON.parse(localStorage.getItem('tf_dossiers_v1') || '[]');
  let dosCount = 0;
  const newDos = dossiers.map(d => {
    if (d.clientId === clientId) {
      dosCount++;
      return { ...d, clientId: null, clientNom: '[Client supprimé]', statut: 'cloture' };
    }
    return d;
  });
  localStorage.setItem('tf_dossiers_v1', JSON.stringify(newDos));

  // 4. Nettoyer les paiements liés → mention client supprimé
  const paiements = JSON.parse(localStorage.getItem('tf_paiements_v1') || '[]');
  const newPay = paiements.map(p => {
    if (p.clientId === clientId || p.clientNom === nom) {
      return { ...p, clientNom: '[Client supprimé]' };
    }
    return p;
  });
  localStorage.setItem('tf_paiements_v1', JSON.stringify(newPay));

  closeConfirm();

  // Message détaillé
  let msg = `Client "${nom}" supprimé`;
  if (facCount > 0) msg += ` · ${facCount} facture${facCount>1?'s':''} annulée${facCount>1?'s':''}`;
  if (dosCount > 0) msg += ` · ${dosCount} dossier${dosCount>1?'s':''} clôturé${dosCount>1?'s':''}`;
  showToast(msg, 'success');
}

/* ── TOAST ── */
function showToast(msg, type='info') {
  document.querySelector('.tf-toast')?.remove();
  const t = document.createElement('div');
  t.className = `tf-toast tf-toast-${type}`;
  const icons = {success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'};
  t.innerHTML = `<i class="fa-solid ${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(),300); }, 3000);
}

document.addEventListener('keydown', e => { if(e.key==='Escape'){closeModal();closeConfirm();} });
