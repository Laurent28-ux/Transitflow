/* ── TransitFlow · utilisateurs.js ─────────────────
   Gestion des utilisateurs — Admin seulement
─────────────────────────────────────────────────── */

let usrState    = { search:'', role:'all', editId:null };
let pendingAction = null;  // { type:'delete'|'toggle', id }

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier que c'est bien un admin
  const session = TFAuth.getSession();
  if (!session || session.role !== 'admin') {
    window.location.href = 'acces-refuse.html';
    return;
  }

  renderStats();
  renderGrid();
  initSearch();
  initFilters();
  updateRolePreview();
});

/* ══ STATS ══ */
function renderStats() {
  const users    = TFAuth.getUsers();
  const actifs   = users.filter(u => u.actif !== false).length;
  const inactifs = users.length - actifs;
  const roles    = new Set(users.map(u => u.role)).size;

  const up = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  up('stat-total',   users.length);
  up('stat-actifs',  actifs);
  up('stat-inactifs',inactifs);
  up('stat-roles',   roles);
}

/* ══ FILTRAGE ══ */
function getFiltered() {
  let data = TFAuth.getUsers();
  if (usrState.role !== 'all') data = data.filter(u => u.role === usrState.role);
  if (usrState.search.trim()) {
    const q = usrState.search.toLowerCase();
    data = data.filter(u =>
      u.nom.toLowerCase().includes(q)    ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)  ||
      u.role.toLowerCase().includes(q)
    );
  }
  return data;
}

/* ══ GRILLE ══ */
function renderGrid() {
  const filtered = getFiltered();
  const grid     = document.getElementById('usr-grid');
  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:52px 20px;color:#9e9e9a">
        <i class="fa-solid fa-users" style="font-size:36px;display:block;margin-bottom:12px;color:#e4e4e1"></i>
        <p>Aucun utilisateur trouvé</p>
      </div>`;
    return;
  }

  const ROLE_ICONS = {
    admin:'fa-shield-halved', transitaire:'fa-truck-fast',
    comptable:'fa-calculator', directeur:'fa-briefcase',
  };
  const ROLE_LABELS = {
    admin:'Administrateur', transitaire:'Transitaire',
    comptable:'Comptable', directeur:'Directeur',
  };

  grid.innerHTML = filtered.map(u => {
    const ini     = `${u.prenom[0]}${u.nom[0]}`.toUpperCase();
    const actif   = u.actif !== false;
    const perms   = ROLE_PERMISSIONS[u.role] || {};
    const pages   = (perms.pages || []).slice(0, 5);
    const isAdmin = u.id === 1;

    return `
    <div class="usr-card ${u.role}">
      <div class="usr-card-top">
        <div class="usr-av ${u.role}">${ini}</div>
        <div style="flex:1;min-width:0">
          <p class="usr-name">${u.prenom} ${u.nom}</p>
          <p class="usr-email">${u.email}</p>
        </div>
        <span class="usr-role-badge ${u.role}">
          <i class="fa-solid ${ROLE_ICONS[u.role] || 'fa-user'}"></i>
          ${ROLE_LABELS[u.role] || u.role}
        </span>
      </div>
      <div class="usr-card-body">
        <div class="usr-info-row">
          <i class="fa-solid fa-calendar-plus"></i>
          Créé le ${formatDate(u.createdAt)}
          ${u.createdBy ? `· par <strong>${u.createdBy}</strong>` : ''}
        </div>
        <div class="usr-info-row">
          <i class="fa-solid fa-lock-open"></i>
          ${perms.canWrite ? '<span style="color:#15803D">Écriture autorisée</span>' : '<span style="color:#9e9e9a">Lecture seule</span>'}
          · ${perms.canDelete ? '<span style="color:#DC2626">Suppression autorisée</span>' : 'Pas de suppression'}
        </div>
        <div class="usr-pages">
          ${pages.map(p => `<span class="usr-page-pill"><i class="fa-solid fa-file" style="font-size:9px;margin-right:3px"></i>${p}</span>`).join('')}
          ${perms.pages?.length > 5 ? `<span class="usr-page-pill">+${perms.pages.length - 5}</span>` : ''}
        </div>
      </div>
      <div class="usr-card-foot">
        <span class="usr-actif-badge ${actif ? 'actif' : 'inactif'}">
          <i class="fa-solid ${actif ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          ${actif ? 'Actif' : 'Inactif'}
        </span>
        <div class="usr-actions">
          ${!isAdmin ? `
          <button class="btn sm" onclick="openModal(${u.id})" title="Modifier">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn sm ${actif ? 'danger' : ''}" onclick="openToggle(${u.id}, ${actif})"
            title="${actif ? 'Désactiver' : 'Réactiver'}">
            <i class="fa-solid ${actif ? 'fa-ban' : 'fa-rotate-left'}"></i>
          </button>
          <button class="btn sm danger" onclick="openDelete(${u.id})" title="Supprimer">
            <i class="fa-solid fa-trash"></i>
          </button>` : `
          <span style="font-size:11px;color:#9e9e9a;padding:0 4px">
            <i class="fa-solid fa-shield-halved" style="margin-right:3px;color:#1E3A5F"></i>Super Admin
          </span>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ══ SEARCH & FILTERS ══ */
function initSearch() {
  const inp = document.getElementById('usr-search'); if (!inp) return;
  let t;
  inp.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { usrState.search = inp.value; renderGrid(); }, 250);
  });
}
function initFilters() {
  document.getElementById('usr-filter-role')?.addEventListener('change', e => {
    usrState.role = e.target.value; renderGrid();
  });
}

/* ══ APERÇU PAGES PAR RÔLE ══ */
function updateRolePreview() {
  const role  = document.getElementById('f-role')?.value;
  const perms = ROLE_PERMISSIONS[role] || {};
  const pages = perms.pages || [];
  const el    = document.getElementById('rpp-pages');
  if (!el) return;
  const PAGE_ICONS = {
    dashboard:'fa-gauge-high', colis:'fa-boxes-stacked', clients:'fa-users',
    dossiers:'fa-folder-open', livraisons:'fa-truck-fast', factures:'fa-file-invoice-dollar',
    paiements:'fa-money-bill-wave', chauffeurs:'fa-id-card', vehicules:'fa-truck',
    documents:'fa-file-contract', rapports:'fa-chart-line', parametres:'fa-gear',
    utilisateurs:'fa-users-gear',
  };
  el.innerHTML = pages.map(p =>
    `<span class="rpp-page"><i class="fa-solid ${PAGE_ICONS[p]||'fa-file'}" style="margin-right:3px;font-size:10px"></i>${p}</span>`
  ).join('');
}

/* ══ GÉNÉRER MOT DE PASSE ══ */
function generatePwd() {
  const chars  = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  const length = 10;
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  const inp = document.getElementById('f-password');
  if (inp) inp.value = pwd;
}

/* ══ MODAL CRÉATION / ÉDITION ══ */
function openModal(id = null) {
  usrState.editId = id;
  const titleEl = document.getElementById('modal-title');
  const subEl   = document.getElementById('modal-sub');
  const saveBtn = document.querySelector('#modal-form .usr-modal-foot .btn.primary');

  if (id) {
    const u = TFAuth.getUsers().find(x => x.id === id);
    if (!u) return;
    if (titleEl) titleEl.textContent = `Modifier ${u.prenom} ${u.nom}`;
    if (subEl)   subEl.textContent   = u.email;
    if (saveBtn) saveBtn.innerHTML   = '<i class="fa-solid fa-check"></i>Enregistrer';
    document.getElementById('f-prenom').value   = u.prenom;
    document.getElementById('f-nom').value      = u.nom;
    document.getElementById('f-email').value    = u.email;
    document.getElementById('f-role').value     = u.role;
    document.getElementById('f-password').value = u.password;
  } else {
    if (titleEl) titleEl.textContent = 'Nouvel utilisateur';
    if (subEl)   subEl.textContent   = 'Créer un accès à TransitFlow';
    if (saveBtn) saveBtn.innerHTML   = '<i class="fa-solid fa-check"></i>Créer l\'accès';
    ['f-prenom','f-nom','f-email','f-password'].forEach(fid => {
      const el = document.getElementById(fid); if (el) el.value = '';
    });
    document.getElementById('f-role').value = 'transitaire';
    generatePwd();
  }
  updateRolePreview();
  document.getElementById('modal-form')?.classList.add('show');
}

function closeModal() {
  document.getElementById('modal-form')?.classList.remove('show');
  usrState.editId = null;
}

function saveModal() {
  const prenom   = document.getElementById('f-prenom').value.trim();
  const nom      = document.getElementById('f-nom').value.trim();
  const email    = document.getElementById('f-email').value.trim();
  const role     = document.getElementById('f-role').value;
  const password = document.getElementById('f-password').value.trim();

  if (!prenom || !nom)  { showToast('Prénom et nom obligatoires', 'error'); return; }
  if (!email)           { showToast('Email obligatoire', 'error'); return; }
  if (!password || password.length < 6) { showToast('Mot de passe min. 6 caractères', 'error'); return; }

  try {
    if (usrState.editId) {
      TFAuth.updateUser(usrState.editId, { prenom, nom, email, role, password });
      showToast('Utilisateur modifié', 'success');
    } else {
      const u = TFAuth.addUser({ prenom, nom, email, role, password });
      showToast(`Accès créé pour ${u.prenom} ${u.nom}`, 'success');
    }
    closeModal();
    renderStats();
    renderGrid();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ══ TOGGLE ACTIF / INACTIF ══ */
function openToggle(id, isActif) {
  const u = TFAuth.getUsers().find(x => x.id === id);
  if (!u) return;
  pendingAction = { type:'toggle', id, isActif };
  document.getElementById('confirm-title').textContent = isActif ? 'Désactiver cet utilisateur ?' : 'Réactiver cet utilisateur ?';
  document.getElementById('confirm-msg').innerHTML = `
    <strong>${u.prenom} ${u.nom}</strong> ne pourra ${isActif ? 'plus' : 'à nouveau'} se connecter à TransitFlow.`;
  const btn = document.getElementById('confirm-ok-btn');
  btn.innerHTML = isActif
    ? '<i class="fa-solid fa-ban"></i>Désactiver'
    : '<i class="fa-solid fa-rotate-left"></i>Réactiver';
  btn.className = isActif ? 'btn danger' : 'btn primary';
  btn.style.flex = '1';
  document.getElementById('modal-confirm')?.classList.add('show');
}

/* ══ SUPPRESSION ══ */
function openDelete(id) {
  const u = TFAuth.getUsers().find(x => x.id === id);
  if (!u) return;
  pendingAction = { type:'delete', id };
  document.getElementById('confirm-title').textContent = 'Supprimer cet utilisateur ?';
  document.getElementById('confirm-msg').innerHTML = `
    Supprimer <strong>${u.prenom} ${u.nom}</strong> (${u.email}) ?<br>
    <span style="color:#DC2626;font-size:12px">Cette action est irréversible.</span>`;
  const btn = document.getElementById('confirm-ok-btn');
  btn.innerHTML = '<i class="fa-solid fa-trash"></i>Supprimer';
  btn.className = 'btn danger'; btn.style.flex = '1';
  document.getElementById('modal-confirm')?.classList.add('show');
}

function closeConfirm() {
  document.getElementById('modal-confirm')?.classList.remove('show');
  pendingAction = null;
}

function confirmAction() {
  if (!pendingAction) return;
  try {
    if (pendingAction.type === 'delete') {
      TFAuth.deleteUser(pendingAction.id);
      showToast('Utilisateur supprimé', 'success');
    } else if (pendingAction.type === 'toggle') {
      if (pendingAction.isActif) {
        TFAuth.deactivateUser(pendingAction.id);
        showToast('Utilisateur désactivé', 'success');
      } else {
        TFAuth.activateUser(pendingAction.id);
        showToast('Utilisateur réactivé', 'success');
      }
    }
    closeConfirm();
    renderStats();
    renderGrid();
  } catch (err) {
    showToast(err.message, 'error');
    closeConfirm();
  }
}

/* ══ UTILITAIRES ══ */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function showToast(msg, type = 'info') {
  document.querySelector('.tf-toast')?.remove();
  const t = document.createElement('div');
  t.className = `tf-toast tf-toast-${type}`;
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  t.innerHTML = `<i class="fa-solid ${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeConfirm(); }
});
