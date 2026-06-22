/* ── TransitFlow · search.js ────────────────────────
   Recherche Globale — cherche dans toute l'application
   Modules : Colis · Clients · Dossiers · Missions
             Factures · Paiements · Chauffeurs · Véhicules
─────────────────────────────────────────────────── */

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  injectSearchOverlay();
  bindSearchTriggers();
});

/* ══ INJECTION DE L'OVERLAY ══ */
function injectSearchOverlay() {
  if (document.getElementById('search-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id        = 'search-overlay';
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-box-global" id="search-box-global">
      <div class="search-input-row">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          id="search-global-input"
          class="search-global-input"
          placeholder="Rechercher dans TransitFlow…"
          autocomplete="off"
        />
        <span class="search-kbd">Échap</span>
      </div>
      <div class="search-results" id="search-results">
        <div class="search-empty">
          <i class="fa-solid fa-magnifying-glass"></i>
          <p>Tapez pour rechercher dans toute l'application</p>
        </div>
      </div>
      <div class="search-footer">
        <span class="sf-hint"><kbd>↑↓</kbd> Naviguer</span>
        <span class="sf-hint"><kbd>↵</kbd> Ouvrir</span>
        <span class="sf-hint"><kbd>Échap</kbd> Fermer</span>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Fermer en cliquant sur l'overlay
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeSearch();
  });

  // Input live
  const input = document.getElementById('search-global-input');
  let debounce;
  input?.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(input.value.trim()), 180);
  });

  // Navigation clavier
  document.addEventListener('keydown', handleSearchKeydown);
}

/* ══ DÉCLENCHEURS ══ */
function bindSearchTriggers() {
  // Raccourci clavier : Ctrl+K ou /
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    const inInput = ['INPUT','TEXTAREA','SELECT'].includes(tag);

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === '/' && !inInput && !e.ctrlKey) {
      const overlay = document.getElementById('search-overlay');
      if (!overlay?.classList.contains('show')) {
        e.preventDefault();
        openSearch();
      }
    }
  });

  // Clic sur la barre de recherche de la topbar
  const topbarSearch = document.querySelector('.topbar-search input');
  if (topbarSearch) {
    topbarSearch.addEventListener('focus', e => {
      e.target.blur();
      openSearch();
    });
    topbarSearch.addEventListener('click', e => {
      e.preventDefault();
      openSearch();
    });
  }
}

/* ══ OUVRIR / FERMER ══ */
function openSearch() {
  const overlay = document.getElementById('search-overlay');
  const input   = document.getElementById('search-global-input');
  if (!overlay) return;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => input?.focus(), 50);
}

function closeSearch() {
  const overlay = document.getElementById('search-overlay');
  const input   = document.getElementById('search-global-input');
  if (!overlay) return;
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  if (input) input.value = '';
  resetResults();
}

function resetResults() {
  const container = document.getElementById('search-results');
  if (container) container.innerHTML = `
    <div class="search-empty">
      <i class="fa-solid fa-magnifying-glass"></i>
      <p>Tapez pour rechercher dans toute l'application</p>
    </div>`;
  focusedIndex = -1;
}

/* ══ NAVIGATION CLAVIER ══ */
let focusedIndex = -1;

function handleSearchKeydown(e) {
  const overlay = document.getElementById('search-overlay');
  if (!overlay?.classList.contains('show')) return;

  if (e.key === 'Escape') { closeSearch(); return; }

  const items = document.querySelectorAll('.search-result-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
    updateFocus(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusedIndex = Math.max(focusedIndex - 1, 0);
    updateFocus(items);
  } else if (e.key === 'Enter' && focusedIndex >= 0) {
    e.preventDefault();
    items[focusedIndex]?.click();
  }
}

function updateFocus(items) {
  items.forEach((item, i) => item.classList.toggle('focused', i === focusedIndex));
  items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
}

/* ══ MOTEUR DE RECHERCHE ══ */
function runSearch(query) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (!query || query.length < 2) { resetResults(); return; }

  const q       = query.toLowerCase();
  const results = [];

  // ── COLIS ──
  const colis = getData('tf_colis_v1');
  colis.forEach(c => {
    if (matches(q, c.ref, c.client, c.origine, c.destination, c.description)) {
      results.push({
        section : 'Colis',
        icon    : 'fa-boxes-stacked',
        iconCls : 'navy',
        title   : c.ref,
        sub     : `${c.client} · ${c.origine} → ${c.destination}`,
        badge   : statusLabel(c.status, 'colis'),
        badgeCls: statusColor(c.status),
        url     : 'colis.html',
      });
    }
  });

  // ── CLIENTS ──
  const clients = getData('tf_clients_v1');
  clients.forEach(c => {
    if (matches(q, c.nom, c.ville, c.email, c.tel)) {
      results.push({
        section : 'Clients',
        icon    : 'fa-users',
        iconCls : 'green',
        title   : c.nom,
        sub     : `${c.type} · ${c.ville}`,
        badge   : c.status === 'active' ? 'Actif' : 'Inactif',
        badgeCls: c.status === 'active' ? 'background:#F0FDF4;color:#15803D' : 'background:#F3F4F6;color:#6B7280',
        url     : 'clients.html',
      });
    }
  });

  // ── DOSSIERS ──
  const dossiers = getData('tf_dossiers_v1');
  dossiers.forEach(d => {
    if (matches(q, d.numero, d.clientNom, d.origine, d.destination, d.description)) {
      results.push({
        section : 'Dossiers de Transit',
        icon    : 'fa-folder-open',
        iconCls : 'navy',
        title   : `${d.numero} · ${d.clientNom}`,
        sub     : `${d.origine} → ${d.destination} · ${d.description}`,
        badge   : d.statut,
        badgeCls: dosStatutStyle(d.statut),
        url     : 'dossiers.html',
      });
    }
  });

  // ── FACTURES ──
  const factures = getData('tf_factures_v1');
  factures.forEach(f => {
    if (matches(q, f.numero, f.clientNom, f.dossierNumero)) {
      results.push({
        section : 'Factures',
        icon    : 'fa-file-invoice-dollar',
        iconCls : 'orange',
        title   : `${f.numero} · ${f.clientNom}`,
        sub     : `${formatMontantS(f.montantTTC)} · Échéance ${formatDateS(f.dateEcheance)}`,
        badge   : facStatutLabel(f.statut),
        badgeCls: facStatutStyle(f.statut),
        url     : 'factures.html',
      });
    }
  });

  // ── PAIEMENTS ──
  const paiements = getData('tf_paiements_v1');
  paiements.forEach(p => {
    if (matches(q, p.reference, p.factureNumero, p.clientNom, p.refTransaction)) {
      results.push({
        section : 'Paiements',
        icon    : 'fa-money-bill-wave',
        iconCls : 'green',
        title   : `${p.reference} · ${formatMontantS(p.montant)}`,
        sub     : `Facture ${p.factureNumero} · ${p.clientNom}`,
        badge   : payStatutLabel(p.statut),
        badgeCls: payStatutStyle(p.statut),
        url     : 'paiements.html',
      });
    }
  });

  // ── CHAUFFEURS ──
  const chauffeurs = getData('tf_chauffeurs_v1');
  chauffeurs.forEach(c => {
    if (matches(q, c.prenom, c.nom, c.tel, c.permis)) {
      results.push({
        section : 'Chauffeurs',
        icon    : 'fa-id-card',
        iconCls : 'purple',
        title   : `${c.prenom} ${c.nom}`,
        sub     : `Permis ${c.permis} · ${c.tel}`,
        badge   : c.status === 'disponible' ? 'Disponible' : c.status === 'en_mission' ? 'En mission' : 'Congé',
        badgeCls: c.status === 'disponible' ? 'background:#F0FDF4;color:#15803D' : 'background:#FFF7ED;color:#C2410C',
        url     : 'chauffeurs.html',
      });
    }
  });

  // ── VÉHICULES ──
  const vehicules = getData('tf_vehicules_v1');
  vehicules.forEach(v => {
    if (matches(q, v.plaque, v.type)) {
      results.push({
        section : 'Véhicules',
        icon    : 'fa-truck',
        iconCls : 'gray',
        title   : v.plaque,
        sub     : `${v.type} · ${(v.km||0).toLocaleString('fr-FR')} km`,
        badge   : v.status === 'disponible' ? 'Disponible' : v.status === 'en_mission' ? 'En mission' : 'Maintenance',
        badgeCls: v.status === 'disponible' ? 'background:#F0FDF4;color:#15803D' : v.status === 'maintenance' ? 'background:#FEF2F2;color:#DC2626' : 'background:#FFF7ED;color:#C2410C',
        url     : 'vehicules.html',
      });
    }
  });

  renderResults(results, query);
  focusedIndex = -1;
}

/* ══ RENDU DES RÉSULTATS ══ */
function renderResults(results, query) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = `
      <div class="search-empty">
        <i class="fa-solid fa-circle-xmark"></i>
        <p>Aucun résultat pour "<strong>${escHtml(query)}</strong>"</p>
      </div>`;
    return;
  }

  // Grouper par section
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.section]) grouped[r.section] = [];
    grouped[r.section].push(r);
  });

  let html = '';
  Object.entries(grouped).forEach(([section, items]) => {
    html += `<p class="search-section-lbl"><i class="fa-solid ${getSectionIcon(section)}" style="margin-right:5px"></i>${section} <span style="opacity:.5">(${items.length})</span></p>`;
    html += items.slice(0, 4).map(r => `
      <a class="search-result-item" href="${r.url}" onclick="closeSearch()">
        <div class="sri-icon ${r.iconCls}"><i class="fa-solid ${r.icon}"></i></div>
        <div class="sri-body">
          <p class="sri-title">${highlight(r.title, query)}</p>
          <p class="sri-sub">${highlight(r.sub, query)}</p>
        </div>
        <span class="sri-badge" style="${r.badgeCls}">${r.badge}</span>
      </a>`).join('');
  });

  const total = results.length;
  if (total > 0) {
    html += `<div style="padding:8px 20px 10px;font-size:11px;color:#9e9e9a;border-top:1px solid #f2f2f0;margin-top:4px">
      <i class="fa-solid fa-layer-group" style="margin-right:4px"></i>${total} résultat${total>1?'s':''} trouvé${total>1?'s':''}
    </div>`;
  }

  container.innerHTML = html;
}

/* ══ UTILITAIRES ══ */
function getData(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function matches(q, ...fields) {
  return fields.some(f => f && String(f).toLowerCase().includes(q));
}

function highlight(text, query) {
  if (!query || !text) return escHtml(String(text || ''));
  const escaped = escHtml(String(text));
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return escaped.replace(re, '<span class="search-highlight">$1</span>');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatDateS(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatMontantS(v) {
  if (!v) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
}

function getSectionIcon(s) {
  const map = {
    'Colis':'fa-boxes-stacked', 'Clients':'fa-users',
    'Dossiers de Transit':'fa-folder-open', 'Factures':'fa-file-invoice-dollar',
    'Paiements':'fa-money-bill-wave', 'Chauffeurs':'fa-id-card', 'Véhicules':'fa-truck',
  };
  return map[s] || 'fa-search';
}

function statusLabel(s, type) {
  const map = { delivered:'Livré', transit:'En route', port:'Au port', pending:'En attente' };
  return map[s] || s;
}
function statusColor(s) {
  const map = {
    delivered: 'background:#F0FDF4;color:#15803D',
    transit  : 'background:#FFF7ED;color:#C2410C',
    port     : 'background:#EFF6FF;color:#1D4ED8',
    pending  : 'background:#F3F4F6;color:#6B7280',
  };
  return map[s] || 'background:#F3F4F6;color:#6B7280';
}
function dosStatutStyle(s) {
  const map = {
    cree:'background:#EFF6FF;color:#1D4ED8', transit:'background:#FFF7ED;color:#C2410C',
    livraison:'background:#F5F3FF;color:#6D28D9', livre:'background:#F0FDF4;color:#15803D',
    cloture:'background:#F3F4F6;color:#6B7280',
  };
  return map[s] || 'background:#F3F4F6;color:#6B7280';
}
function facStatutLabel(s) {
  const map = { brouillon:'Brouillon', envoyee:'Envoyée', payee:'Payée', en_retard:'En retard', annulee:'Annulée' };
  return map[s] || s;
}
function facStatutStyle(s) {
  const map = {
    brouillon:'background:#F3F4F6;color:#6B7280', envoyee:'background:#EFF6FF;color:#1D4ED8',
    payee:'background:#F0FDF4;color:#15803D', en_retard:'background:#FEF2F2;color:#DC2626',
    annulee:'background:#F3F4F6;color:#9CA3AF',
  };
  return map[s] || 'background:#F3F4F6;color:#6B7280';
}
function payStatutLabel(s) {
  const map = { confirme:'Confirmé', en_attente:'En attente', echoue:'Échoué', rembourse:'Remboursé' };
  return map[s] || s;
}
function payStatutStyle(s) {
  const map = {
    confirme:'background:#F0FDF4;color:#15803D', en_attente:'background:#FFF7ED;color:#C2410C',
    echoue:'background:#FEF2F2;color:#DC2626', rembourse:'background:#F5F3FF;color:#6D28D9',
  };
  return map[s] || 'background:#F3F4F6;color:#6B7280';
}
