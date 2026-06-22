/* ── TransitFlow · dashboard.js ─────────────────────
   Module Dashboard — Étape 4
   Lit les données depuis TFStore (store.js partagé)
─────────────────────────────────────────────────── */

const STATUS_BADGES_DASH = {
  delivered : '<span class="badge b-delivered"><i class="fa-solid fa-circle-check"></i>Livré</span>',
  transit   : '<span class="badge b-transit"><i class="fa-solid fa-truck"></i>En route</span>',
  port      : '<span class="badge b-port"><i class="fa-solid fa-anchor"></i>Au port</span>',
  pending   : '<span class="badge b-pending"><i class="fa-solid fa-clock"></i>En attente</span>',
};

// CHART_DATA sera généré dynamiquement depuis le store
let CHART_DATA = { labels: [], values: [] };

// DONUT_DATA sera généré dynamiquement depuis le store
let DONUT_DATA = [];

const ACTIVITY_DATA = [
  { icon:'fa-circle-check',        type:'ok',   text:'Colis <b>TF-0198</b> marqué comme livré',     time:'il y a 12 min', isNew:true  },
  { icon:'fa-user-plus',           type:'info', text:'Nouveau client <b>CAMPORT SARL</b> enregistré',time:'il y a 34 min', isNew:true  },
  { icon:'fa-file-arrow-up',       type:'',     text:'Document douanier <b>DC-224</b> importé',      time:'il y a 1h 02',  isNew:false },
  { icon:'fa-truck',               type:'warn', text:'Véhicule <b>LT-4821</b> en départ · Douala',   time:'il y a 2h 15',  isNew:false },
  { icon:'fa-triangle-exclamation',type:'warn', text:'Colis <b>TF-0192</b> en retard de 2 jours',   time:'il y a 3h',     isNew:false },
];

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  startClock();

  // Chargement des données (Supabase ou localStorage)
  if (typeof TFStore !== 'undefined') {
    await TFStore.hydrate();
  }

  refreshDashboard();
  renderBarChart();
  renderDonut();
  renderActivity();
  initColisFilters();
  initSortTable();
  initStoreListeners();
});

/* ════════════════════════════════════════════════
   RAFRAÎCHISSEMENT GLOBAL (appelé à chaque maj)
════════════════════════════════════════════════ */
function refreshDashboard() {
  updateStatCards();
  renderColisTable(currentFilter || 'all');
  syncFilterPill(currentFilter || 'all');
  buildLiveChartData();
  renderBarChart();
  buildLiveDonutData();
  renderDonut();
  renderLiveActivity();
  updateFinanceCards();
  updateDossiersWidget();
  updateNotifBadge();
}

/* ════════════════════════════════════════════════
   DONNÉES LIVE — GRAPHIQUE EN BARRES
   Colis créés par mois sur les 6 derniers mois
════════════════════════════════════════════════ */
function buildLiveChartData() {
  const colis  = TFStore.getColis ? TFStore.getColis() : [];
  const now    = new Date();
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Juil','Aoû','Sep','Oct','Nov','Déc'];
  const labels = [], values = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(MONTHS[d.getMonth()]);
    const count = colis.filter(c => {
      if (!c.date) return false;
      const cd = new Date(c.date);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    values.push(count);
  }

  // Si aucune donnée réelle, utiliser des valeurs démo
  const hasData = values.some(v => v > 0);
  if (!hasData) {
    CHART_DATA = { labels: ['Jan','Fév','Mar','Avr','Mai','Jun'], values: [12, 19, 8, 25, 17, 22] };
  } else {
    CHART_DATA = { labels, values };
  }
}

/* ════════════════════════════════════════════════
   DONNÉES LIVE — DONUT STATUTS COLIS
════════════════════════════════════════════════ */
function buildLiveDonutData() {
  const s = TFStore.getStats ? TFStore.getStats() : {};
  const total = s.colis?.total || 1;
  DONUT_DATA = [
    { label:'Livrés',     pct: Math.round((s.colis?.delivered || 0) / total * 100), color:'#1E3A5F' },
    { label:'En transit', pct: Math.round((s.colis?.transit   || 0) / total * 100), color:'#F97316' },
    { label:'Au port',    pct: Math.round((s.colis?.port      || 0) / total * 100), color:'#2563EB' },
    { label:'En attente', pct: Math.round((s.colis?.pending   || 0) / total * 100), color:'#E5E7EB' },
  ];
  // Ajuster pour que le total = 100%
  const sum  = DONUT_DATA.reduce((a, b) => a + b.pct, 0);
  if (sum > 0 && sum !== 100) DONUT_DATA[0].pct += (100 - sum);
  if (sum === 0) DONUT_DATA = [
    { label:'Livrés',     pct:42, color:'#1E3A5F' },
    { label:'En transit', pct:20, color:'#F97316' },
    { label:'Au port',    pct:16, color:'#2563EB' },
    { label:'En attente', pct:22, color:'#E5E7EB' },
  ];
}

/* ════════════════════════════════════════════════
   CARTES FINANCE LIVE (Factures + Paiements)
════════════════════════════════════════════════ */
function updateFinanceCards() {
  const factures  = JSON.parse(localStorage.getItem('tf_factures_v1')  || '[]');
  const paiements = JSON.parse(localStorage.getItem('tf_paiements_v1') || '[]');

  const totalFac   = factures.length;
  const payees     = factures.filter(f => f.statut === 'payee');
  const enRetard   = factures.filter(f => f.statut === 'en_retard');
  const totalEnc   = paiements
    .filter(p => p.statut === 'confirme')
    .reduce((s, p) => s + (p.montant || 0), 0);

  const fmt = v => new Intl.NumberFormat('fr-FR').format(Math.round(v));

  const up = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  up('kpi-factures',   totalFac);
  up('kpi-payees',     payees.length);
  up('kpi-retard',     enRetard.length);
  up('kpi-encaisse',   fmt(totalEnc) + ' FCFA');
}

/* ════════════════════════════════════════════════
   WIDGET DOSSIERS LIVE
════════════════════════════════════════════════ */
function updateDossiersWidget() {
  const dossiers  = JSON.parse(localStorage.getItem('tf_dossiers_v1')  || '[]');
  const missions  = JSON.parse(localStorage.getItem('tf_missions_v1')  || '[]');

  const up = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  up('kpi-dossiers',   dossiers.length);
  up('kpi-transit',    dossiers.filter(d => d.statut === 'transit').length);
  up('kpi-missions',   missions.filter(m => m.statut === 'en_cours').length);

  // Liste des 3 derniers dossiers
  const listEl = document.getElementById('dossiers-list');
  if (!listEl) return;
  const last3 = [...dossiers].sort((a,b) => new Date(b.dateCreation)-new Date(a.dateCreation)).slice(0,3);
  if (!last3.length) {
    listEl.innerHTML = '<p style="color:#9e9e9a;font-size:12px;padding:12px 0">Aucun dossier</p>';
    return;
  }
  const STATUT_COLORS = { cree:'#2563EB', transit:'#F97316', livraison:'#6D28D9', livre:'#15803D', cloture:'#9CA3AF' };
  const STATUT_ICONS  = { cree:'fa-file-circle-plus', transit:'fa-plane-departure', livraison:'fa-truck-fast', livre:'fa-circle-check', cloture:'fa-folder-closed' };
  listEl.innerHTML = last3.map(d => `
    <div class="dos-mini-row" onclick="window.location.href='dossiers.html'">
      <div class="dos-mini-ico" style="color:${STATUT_COLORS[d.statut]||'#6B7280'}">
        <i class="fa-solid ${STATUT_ICONS[d.statut]||'fa-folder'}"></i>
      </div>
      <div class="dos-mini-info">
        <p class="dos-mini-num">${d.numero} · ${d.clientNom}</p>
        <p class="dos-mini-route">${d.origine} → ${d.destination}</p>
      </div>
      <span class="dos-mini-statut" style="background:${STATUT_COLORS[d.statut]||'#6B7280'}22;color:${STATUT_COLORS[d.statut]||'#6B7280'}">${d.statut}</span>
    </div>`).join('');
}

/* ════════════════════════════════════════════════
   ACTIVITÉ LIVE (depuis toutes les données)
════════════════════════════════════════════════ */
function renderLiveActivity() {
  const list = document.getElementById('act-list');
  if (!list) return;

  const events = [];
  const now = Date.now();

  // Colis récents
  const colis = TFStore.getColis ? TFStore.getColis() : [];
  colis.slice(-3).reverse().forEach(c => {
    const icons = { delivered:'fa-circle-check', transit:'fa-truck', port:'fa-anchor', pending:'fa-clock' };
    const types = { delivered:'ok', transit:'warn', port:'info', pending:'' };
    events.push({
      icon: icons[c.status] || 'fa-box',
      type: types[c.status] || '',
      text: `Colis <b>${c.ref}</b> — ${c.client}`,
      time: c.date ? formatDate(c.date) : '—',
      isNew: c.status === 'pending',
    });
  });

  // Factures récentes
  const factures = JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
  factures.slice(-2).reverse().forEach(f => {
    const icons = { payee:'fa-circle-check', envoyee:'fa-paper-plane', en_retard:'fa-triangle-exclamation', brouillon:'fa-pen' };
    events.push({
      icon: icons[f.statut] || 'fa-file-invoice-dollar',
      type: f.statut === 'en_retard' ? 'warn' : f.statut === 'payee' ? 'ok' : 'info',
      text: `Facture <b>${f.numero}</b> · ${f.clientNom}`,
      time: formatDate(f.dateEmission),
      isNew: f.statut === 'envoyee',
    });
  });

  // Paiements récents
  const paiements = JSON.parse(localStorage.getItem('tf_paiements_v1') || '[]');
  paiements.slice(-2).reverse().forEach(p => {
    events.push({
      icon: 'fa-money-bill-wave',
      type: p.statut === 'confirme' ? 'ok' : 'warn',
      text: `Paiement <b>${p.reference}</b> · ${formatMontant(p.montant)}`,
      time: formatDate(p.date),
      isNew: p.statut === 'confirme',
    });
  });

  // Fallback si aucune donnée
  if (!events.length) {
    events.push(
      { icon:'fa-circle-check', type:'ok',   text:'Colis <b>TF-0198</b> marqué comme livré',      time:'12/06/2026', isNew:true  },
      { icon:'fa-user-plus',    type:'info',  text:'Nouveau client <b>CAMPORT SARL</b> enregistré', time:'12/06/2026', isNew:false },
      { icon:'fa-truck',        type:'warn',  text:'Véhicule <b>LT-4821</b> en départ · Douala',    time:'11/06/2026', isNew:false }
    );
  }

  list.innerHTML = events.slice(0,5).map(a => `
    <div class="act-item ${a.isNew ? 'new' : ''}">
      <div class="act-av ${a.type}"><i class="fa-solid ${a.icon}"></i></div>
      <div class="act-body">
        <p class="act-txt">${a.text}</p>
        <p class="act-time"><i class="fa-regular fa-clock" style="font-size:10px;margin-right:3px"></i>${a.time}</p>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════
   BADGE NOTIFICATIONS DYNAMIQUE
════════════════════════════════════════════════ */
function updateNotifBadge() {
  const factures  = JSON.parse(localStorage.getItem('tf_factures_v1')  || '[]');
  const paiements = JSON.parse(localStorage.getItem('tf_paiements_v1') || '[]');
  const dossiers  = JSON.parse(localStorage.getItem('tf_dossiers_v1')  || '[]');

  const alertes = [
    ...factures.filter(f => f.statut === 'en_retard'),
    ...paiements.filter(p => p.statut === 'en_attente'),
    ...dossiers.filter(d => d.statut === 'livraison'),
  ].length;

  const cnt = document.querySelector('.notif-cnt');
  const dot = document.querySelector('.notif-dot');
  if (cnt) cnt.textContent = alertes || 0;
  if (dot) dot.style.display = alertes > 0 ? 'block' : 'none';

  // Mettre à jour la liste des notifications
  const notifList = document.querySelector('.notif-list');
  if (!notifList) return;
  const items = [];
  factures.filter(f => f.statut === 'en_retard').forEach(f => {
    items.push(`<div class="notif-item unread"><div class="ni-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div><div class="ni-body"><p class="ni-title">Facture ${f.numero} en retard</p><p class="ni-sub">${f.clientNom}</p></div></div>`);
  });
  paiements.filter(p => p.statut === 'en_attente').forEach(p => {
    items.push(`<div class="notif-item unread"><div class="ni-icon"><i class="fa-solid fa-money-bill-wave"></i></div><div class="ni-body"><p class="ni-title">Paiement ${p.reference} en attente</p><p class="ni-sub">${formatMontant(p.montant)}</p></div></div>`);
  });
  dossiers.filter(d => d.statut === 'livraison').forEach(d => {
    items.push(`<div class="notif-item unread"><div class="ni-icon"><i class="fa-solid fa-truck-fast"></i></div><div class="ni-body"><p class="ni-title">Dossier ${d.numero} en livraison</p><p class="ni-sub">${d.clientNom}</p></div></div>`);
  });
  if (items.length) notifList.innerHTML = items.join('');
}

/* ════════════════════════════════════════════════
   STAT CARDS — lues depuis TFStore
════════════════════════════════════════════════ */
function updateStatCards() {
  const s = TFStore.getStats();
  const set = (id, from, to, suffix) => {
    const el = document.getElementById(id);
    if (!el) return;
    animateSingleCounter(el, from, to, suffix);
  };
  set('stat-total',   0, s.colis.total,   '');
  set('stat-transit', 0, s.colis.transit,  '');
  set('stat-clients', 0, s.clients.actifs, '');

  // Revenus depuis les paiements confirmés réels
  const paiements = JSON.parse(localStorage.getItem('tf_paiements_v1') || '[]');
  const totalEnc  = paiements.filter(p => p.statut === 'confirme').reduce((s,p)=>s+(p.montant||0),0);
  const revEl = document.getElementById('stat-revenus');
  if (revEl) {
    const revM = totalEnc > 0 ? (totalEnc / 1000000) : s.revenusM;
    animateSingleCounter(revEl, 0, revM, 'M');
  }

  const taux = s.colis.total ? Math.round(s.colis.delivered / s.colis.total * 100) : 0;
  const set2 = (id, val, suf) => { const el=document.getElementById(id); if(el) animateSingleCounter(el,0,val,suf||''); };
  set2('kpi-taux',     taux, '%');
  set2('kpi-vehicules',s.vehicules.total, '');
}

/* ════════════════════════════════════════════════
   HORLOGE TEMPS RÉEL
════════════════════════════════════════════════ */
function startClock() {
  const clockEl = document.getElementById('hero-clock');
  const dateEl  = document.getElementById('hero-date');
  if (!clockEl) return;
  const DAYS   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  function tick() {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2,'0');
    const m   = String(now.getMinutes()).padStart(2,'0');
    const s   = String(now.getSeconds()).padStart(2,'0');
    clockEl.textContent = `${h}:${m}:${s}`;
    if (dateEl) dateEl.textContent = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ════════════════════════════════════════════════
   COMPTEURS ANIMÉS
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-count]').forEach(el => {
    animateSingleCounter(el, 0, parseFloat(el.dataset.count));
  });
});

function animateSingleCounter(el, from, to, suffix) {
  suffix = suffix !== undefined ? suffix : (el.dataset.suffix || '');
  const duration = 900;
  const start    = performance.now();
  const isFloat  = to % 1 !== 0;
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const val      = from + (to - from) * eased;
    el.textContent = (isFloat ? val.toFixed(1) : Math.floor(val).toLocaleString('fr-FR')) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ════════════════════════════════════════════════
   TABLEAU COLIS — LIT DEPUIS LE STORE
════════════════════════════════════════════════ */
let currentFilter = 'all';

function renderColisTable(filter) {
  currentFilter       = filter;
  const allColis      = TFStore.getColis();          // ← STORE (pas une variable locale)
  const filtered      = filter === 'all'
    ? allColis
    : allColis.filter(c => c.status === filter);
  const slice         = filtered.slice(0, 8);       // 8 derniers sur le dashboard

  const tbody         = document.getElementById('colis-tbody');
  const info          = document.getElementById('colis-info');
  if (!tbody) return;

  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--g400)">
      <i class="fa-solid fa-box-open" style="font-size:28px;margin-bottom:8px;display:block;color:var(--g200)"></i>
      Aucun colis trouvé</td></tr>`;
  } else {
    tbody.innerHTML = slice.map(c => `
      <tr onclick="window.location.href='colis.html'" title="Voir dans Colis">
        <td class="td-ref">${c.ref}</td>
        <td class="td-client">${c.client}</td>
        <td class="td-route">${c.origine} → ${c.destination}</td>
        <td class="td-poids">${c.poids.toLocaleString('fr-FR')} kg</td>
        <td class="td-date">${formatDate(c.date)}</td>
        <td>${STATUS_BADGES_DASH[c.status] || ''}</td>
      </tr>`).join('');
  }

  if (info) {
    info.textContent = filter === 'all'
      ? `${allColis.length} colis · ${slice.length} affichés`
      : `${filtered.length} colis · filtre "${filter}"`;
  }

  syncFilterPill(filter);
}

function syncFilterPill(filter) {
  document.querySelectorAll('.fpill').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
}

function initColisFilters() {
  document.querySelectorAll('.fpill').forEach(btn => {
    btn.addEventListener('click', () => renderColisTable(btn.dataset.filter));
  });
}

/* ════════════════════════════════════════════════
   TRI DU TABLEAU (dashboard)
════════════════════════════════════════════════ */
let sortState = { col: 'date', dir: -1 };

function initSortTable() {
  document.querySelectorAll('.sortable-th').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      sortState.col = col;
      sortState.dir = sortState.col === col ? sortState.dir * -1 : 1;
      renderColisTable(currentFilter);
    });
  });
}

/* ════════════════════════════════════════════════
   ÉCOUTE DES ÉVÉNEMENTS DU STORE
   → Mise à jour automatique quand colis.js modifie
════════════════════════════════════════════════ */
function initStoreListeners() {
  // Événements émis par store.js lors de modifications
  window.addEventListener('tf:colis:added',   onColisChanged);
  window.addEventListener('tf:colis:updated', onColisChanged);
  window.addEventListener('tf:colis:deleted', onColisChanged);
  window.addEventListener('tf:store:reset',   onColisChanged);

  // Nouveaux modules
  window.addEventListener('tf:dossiers:changed',  refreshDashboard);
  window.addEventListener('tf:factures:changed',  refreshDashboard);
  window.addEventListener('tf:paiements:changed', refreshDashboard);
  window.addEventListener('tf:missions:changed',  refreshDashboard);

  // Synchronisation via storage event (onglets différents)
  window.addEventListener('storage', (e) => {
    const WATCHED = ['tf_colis_v1','tf_dossiers_v1','tf_factures_v1','tf_paiements_v1','tf_missions_v1'];
    if (WATCHED.includes(e.key)) refreshDashboard();
  });
}

function onColisChanged() {
  refreshDashboard();
  // Flash discret sur le tableau pour indiquer la mise à jour
  const card = document.querySelector('.dash-two .card');
  if (card) {
    card.style.transition = 'box-shadow .2s';
    card.style.boxShadow  = '0 0 0 2px var(--black)';
    setTimeout(() => { card.style.boxShadow = ''; }, 600);
  }
}

/* ════════════════════════════════════════════════
   GRAPHIQUE EN BARRES
════════════════════════════════════════════════ */
function renderBarChart() {
  const container = document.getElementById('bar-chart-inner');
  if (!container) return;
  const max = Math.max(...CHART_DATA.values);
  container.innerHTML = CHART_DATA.labels.map((lbl, i) => {
    const val   = CHART_DATA.values[i];
    const pct   = (val / max * 100).toFixed(1);
    const isCur = i === CHART_DATA.labels.length - 1;
    return `
      <div class="bc ${isCur ? 'current' : ''}" onclick="selectBar(this, ${i})" title="${lbl} : ${val} colis">
        <span class="bval">${val}</span>
        <div class="bar ${isCur ? 'current' : ''}">
          <div class="bar-fill" data-pct="${pct}" style="height:0"></div>
        </div>
        <span class="blbl">${lbl}</span>
      </div>`;
  }).join('');

  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach((fill, i) => {
      setTimeout(() => { fill.style.height = fill.dataset.pct + '%'; }, i * 80);
    });
  }, 300);

  const total = document.getElementById('chart-total');
  if (total) {
    const sum = CHART_DATA.values.reduce((a, b) => a + b, 0);
    total.innerHTML = `Total sur 7 mois : <strong>${sum.toLocaleString('fr-FR')}</strong> colis`;
  }
}

function selectBar(el, idx) {
  document.querySelectorAll('.bc').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const tooltip = document.getElementById('bar-tooltip');
  if (tooltip) {
    tooltip.textContent = `${CHART_DATA.labels[idx]} : ${CHART_DATA.values[idx]} colis`;
    tooltip.style.opacity = '1';
    setTimeout(() => { tooltip.style.opacity = '0'; }, 2500);
  }
}

/* ════════════════════════════════════════════════
   GRAPHIQUE DONUT (SVG)
════════════════════════════════════════════════ */
function renderDonut() {
  const svg = document.getElementById('donut-svg');
  const leg = document.getElementById('donut-legend');
  if (!svg || !leg) return;
  const R = 32, CX = 45, CY = 45, CIRC = 2 * Math.PI * R, GAP = 1.5;
  const COLORS = DONUT_DATA.map(d => d.color);
  let offset = -90, svgHTML = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f2f2f0" stroke-width="14"/>`;
  DONUT_DATA.forEach((item, i) => {
    const len  = (item.pct / 100) * CIRC - GAP;
    svgHTML += `<circle class="donut-ring" cx="${CX}" cy="${CY}" r="${R}"
      stroke="${COLORS[i]}" stroke-dasharray="${len} ${CIRC - len}"
      stroke-dashoffset="${CIRC}" transform="rotate(${offset} ${CX} ${CY})"
      data-dash="${len}" data-circ="${CIRC}" id="donut-seg-${i}" fill="none" stroke-width="14"/>`;
    offset += (item.pct / 100) * 360;
  });
  svg.innerHTML = svgHTML;
  leg.innerHTML = DONUT_DATA.map((item, i) => `
    <div class="dl-item" onclick="highlightDonut(${i})">
      <div class="dl-dot" style="background:${COLORS[i]};${i===3?'border:1px solid var(--g300)':''}"></div>
      <span class="dl-lbl">${item.label}</span>
      <span class="dl-val">${item.pct}%</span>
    </div>`).join('');
  setTimeout(() => {
    DONUT_DATA.forEach((_, i) => {
      const seg = document.getElementById(`donut-seg-${i}`);
      if (!seg) return;
      setTimeout(() => {
        seg.style.transition = 'stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)';
        seg.style.strokeDashoffset = parseFloat(seg.dataset.circ) - parseFloat(seg.dataset.dash);
      }, i * 120);
    });
  }, 400);
}

function highlightDonut(idx) {
  document.querySelectorAll('.donut-ring').forEach((s, i) => { s.style.opacity = i === idx ? '1' : '.25'; });
  setTimeout(() => { document.querySelectorAll('.donut-ring').forEach(s => s.style.opacity = '1'); }, 1800);
}

/* ════════════════════════════════════════════════
   ACTIVITÉ RÉCENTE
════════════════════════════════════════════════ */
function renderActivity() {
  const list = document.getElementById('act-list');
  if (!list) return;
  list.innerHTML = ACTIVITY_DATA.map(a => `
    <div class="act-item ${a.isNew ? 'new' : ''}">
      <div class="act-av ${a.type}"><i class="fa-solid ${a.icon}"></i></div>
      <div class="act-body">
        <p class="act-txt">${a.text}</p>
        <p class="act-time"><i class="fa-regular fa-clock" style="font-size:10px;margin-right:3px"></i>${a.time}</p>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════
   UTILITAIRES
════════════════════════════════════════════════ */
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
  const existing = document.querySelector('.tf-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = `tf-toast tf-toast-${type}`;
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  t.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// Simulation bouton + topbar
window.simulateLiveUpdate = function () {
  TFStore.addColis({
    ref         : TFStore.nextRef(),
    client      : 'Client Simulé',
    origine     : 'Douala',
    destination : 'Paris',
    poids       : Math.floor(Math.random() * 900 + 100),
    date        : new Date().toISOString().slice(0, 10),
    status      : 'pending',
    description : 'Colis simulé en direct',
  });
  showToast('Nouveau colis simulé ajouté !', 'success');
};
