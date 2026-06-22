/* ── TransitFlow · base.js ──────────────────────────
   Sidebar · Navigation · Notifications · Mobile
─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  initDarkMode();
  // Vérifier l'authentification (no-op en mode dev sans Supabase)
  if (typeof TFStore !== 'undefined') {
    await TFStore.requireAuth();
  }

  initSidebar();
  initNotifPanel();
  initMobileNav();
  initKeyboardShortcuts();
  initPageTransition();
  setStepProgress();
  fixModalPositioning();
  loadProfileGlobal();
  applyRoleUI();  // Masquer les menus selon le rôle
});

/* ── INTERFACE PAR RÔLE ── */
function applyRoleUI() {
  if (typeof TFAuth === 'undefined') return;
  const session = TFAuth.getSession();
  if (!session) return;

  // Masquer le lien Utilisateurs si pas admin
  const navUsr = document.getElementById('nav-utilisateurs');
  if (navUsr && session.role !== 'admin') {
    navUsr.closest('p.nav-group-lbl')?.remove();  // groupe Administration
    navUsr.remove();
  }

  // Afficher le rôle dans le foot sidebar
  const footRole = document.querySelector('.foot-role');
  const ROLE_LABELS = { admin:'Administrateur', transitaire:'Transitaire', comptable:'Comptable', directeur:'Directeur' };
  if (footRole) footRole.textContent = ROLE_LABELS[session.role] || session.role;

  // Nom dans sidebar
  const footName = document.querySelector('.foot-name');
  if (footName && session.nom) footName.textContent = `${session.prenom} ${session.nom}`;

  // Nom topbar
  const profName = document.querySelector('.prof-name');
  if (profName && session.prenom) profName.textContent = session.prenom;

  // Initiales avatars
  const ini = `${(session.prenom||'A')[0]}${(session.nom||'D')[0]}`.toUpperCase();
  document.querySelectorAll('.foot-avatar, .prof-av').forEach(el => {
    if (!el.style.backgroundImage) el.textContent = ini;
  });
}

/* ── PROFIL GLOBAL (photo + nom sur toutes les pages) ── */
function loadProfileGlobal() {
  const profile = JSON.parse(localStorage.getItem('tf_profile') || '{}');
  const prenom  = profile.prenom || 'Administrateur';
  const nom     = profile.nom    || '';
  const poste   = profile.poste  || 'Transit Manager';
  const initials = [prenom[0], nom[0]].filter(Boolean).join('').toUpperCase() || 'AD';
  const fullName = [prenom, nom].filter(Boolean).join(' ');

  // Mettre à jour les initiales / noms
  document.querySelectorAll('.foot-name').forEach(el => el.textContent = fullName);
  document.querySelectorAll('.foot-role').forEach(el => el.textContent = poste);
  document.querySelectorAll('.prof-name').forEach(el => el.textContent = prenom);

  // Photo de profil si elle existe
  if (profile.photo) {
    const imgStyle = `background-image:url('${profile.photo}');background-size:cover;background-position:center;color:transparent;font-size:0;`;
    document.querySelectorAll('.foot-avatar, .prof-av').forEach(el => {
      el.style.cssText = imgStyle;
      el.textContent   = '';
    });
  } else {
    document.querySelectorAll('.foot-avatar, .prof-av').forEach(el => {
      if (!el.style.backgroundImage) el.textContent = initials;
    });
  }
}

/* ── SIDEBAR ── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const saved = localStorage.getItem('tf_sidebar');
  if (saved === 'open' || saved === null) {
    sidebar.classList.add('open');
  }
  setTimeout(() => { sidebar.style.transition = 'width .3s cubic-bezier(.4,0,.2,1)'; }, 50);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    toggleMobileSidebar();
  } else {
    sidebar.classList.toggle('open');
    localStorage.setItem('tf_sidebar', sidebar.classList.contains('open') ? 'open' : 'closed');
  }
}

/* ── MOBILE SIDEBAR ── */
function initMobileNav() {
  const overlay = document.getElementById('mob-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mob-overlay');
  if (!sidebar) return;
  const isOpen  = sidebar.classList.contains('mob-open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('mob-open');
    // Forcer l'affichage des textes nav
    sidebar.querySelectorAll('.nav-txt, .nav-group-lbl, .nav-badge, .brand-label, .foot-info')
      .forEach(el => { el.style.opacity = '1'; });
    if (overlay) overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mob-overlay');
  if (!sidebar) return;
  sidebar.classList.remove('mob-open');
  // Remettre l'opacité en CSS (sidebar fermée = textes cachés)
  sidebar.querySelectorAll('.nav-txt, .nav-group-lbl, .nav-badge, .brand-label, .foot-info')
    .forEach(el => { el.style.opacity = ''; });
  if (overlay) overlay.classList.remove('show');
  document.body.style.overflow = '';
}

/* ── NOTIFICATION PANEL ── */
function initNotifPanel() {
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    if (panel.classList.contains('show')
        && !panel.contains(e.target)
        && !e.target.closest('[data-notif-btn]')) {
      panel.classList.remove('show');
    }
  });
}

function toggleNotif() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.toggle('show');
}

/* ── KEYBOARD SHORTCUTS ── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // [ → toggle sidebar
    if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
      const tag = document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        toggleSidebar();
      }
    }
    // Escape → close modals / notif
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
      document.getElementById('notifPanel')?.classList.remove('show');
      closeMobileSidebar();
    }
    // / → focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const tag = document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        document.querySelector('.topbar-search input')?.focus();
      }
    }
  });
}

/* ── PAGE TRANSITION ── */
function initPageTransition() {
  const content = document.getElementById('content');
  if (content) content.classList.add('page-enter');

  // Intercept nav links for smooth transition
  document.querySelectorAll('.nav-item[href]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      e.preventDefault();
      if (content) {
        content.style.animation = 'none';
        content.style.opacity   = '0';
        content.style.transform = 'translateY(4px)';
        content.style.transition = 'opacity .15s, transform .15s';
      }
      setTimeout(() => { window.location.href = href; }, 150);
    });
  });
}

/* ── STEP PROGRESS BAR ── */
function setStepProgress() {
  const PAGE_STEPS = {
    'dashboard.html'  : '10',
    'colis.html'      : '20',
    'clients.html'    : '28',
    'dossiers.html'   : '36',
    'livraisons.html' : '44',
    'factures.html'   : '52',
    'paiements.html'  : '60',
    'chauffeurs.html' : '68',
    'vehicules.html'  : '74',
    'documents.html'  : '82',
    'rapports.html'   : '90',
    'parametres.html' : '96',
  };
  const file = window.location.pathname.split('/').pop() || 'dashboard.html';
  const pct  = PAGE_STEPS[file] || '10';
  const fill = document.getElementById('step-bar-fill');
  if (fill) {
    setTimeout(() => { fill.style.width = pct + '%'; }, 200);
  }
}

/* ── TOAST NOTIFICATIONS ── */
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `tf-toast tf-toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ── CORRECTIF CENTRAGE MODALS ────────────────────────────────
   Problème : les .modal-overlay sont dans <main class="content">
   qui a overflow-y:auto. Certains navigateurs traitent alors
   position:fixed comme position:absolute → le modal apparaît
   en haut du contenu scrollable au lieu du centre de l'écran.

   Solution : on déplace tous les .modal-overlay et .detail-panel
   directement dans <body> au chargement. Ainsi position:fixed
   est bien ancré sur le viewport, quel que soit le scroll.
──────────────────────────────────────────────────────────── */
function fixModalPositioning() {
  const selectors = '.modal-overlay, .detail-panel, .confirm-box-wrap';

  document.querySelectorAll(selectors).forEach(el => {
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
  });

  // Bloquer le scroll du fond quand un modal est ouvert
  const observer = new MutationObserver(() => {
    const anyOpen = document.querySelector('.modal-overlay.show, .detail-panel.show');
    document.body.style.overflow = anyOpen ? 'hidden' : '';
  });

  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
}

/* ── DARK MODE ───────────────────────────────────
   Applique le thème sauvegardé au chargement
   Toggle via le bouton lune/soleil dans la topbar
──────────────────────────────────────────────── */
function initDarkMode() {
  const saved = localStorage.getItem('tf_theme') || 'light';
  const effective = saved === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : saved;
  document.documentElement.setAttribute('data-theme', effective);
  updateThemeIcon(effective);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tf_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
  btn.title = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
}
