/* ── TransitFlow · login-new.js ─────────────────────
   Connexion avec système de rôles
─────────────────────────────────────────────────── */

let selectedRole  = 'transitaire';  // défaut = 1er élément combo
let isAdminMode   = false;

document.addEventListener('DOMContentLoaded', () => {
  // ── Pas de connexion automatique ──
  // On efface systématiquement la session au chargement de la page login
  // L'utilisateur doit toujours entrer son mot de passe
  TFAuth.clearSession();

  // Afficher la combo box (mode utilisateur par défaut)
  showUserMode();
  initForm();
  initTogglePwd();
});

/* ══ MODE UTILISATEUR (avec combo box) ══ */
function showUserMode() {
  isAdminMode  = false;
  selectedRole = document.getElementById('role-select')?.value || 'transitaire';

  const selector = document.getElementById('role-selector');
  const badge    = document.getElementById('admin-badge');
  if (selector) { selector.classList.remove('hidden'); selector.classList.add('visible'); }
  if (badge)    badge.classList.remove('show');

  const emailInp = document.getElementById('email');
  if (emailInp) emailInp.placeholder = 'votre@email.cm';
}

/* ══ MODE ADMIN (sans combo box) ══ */
function toggleAdminMode(e) {
  e.preventDefault();
  if (isAdminMode) {
    showUserMode();
    return;
  }
  isAdminMode  = true;
  selectedRole = '';  // pas de rôle → cherche admin

  const selector = document.getElementById('role-selector');
  const badge    = document.getElementById('admin-badge');
  if (selector) { selector.classList.remove('visible'); selector.classList.add('hidden'); }
  if (badge)    badge.classList.add('show');

  const emailInp = document.getElementById('email');
  if (emailInp) {
    emailInp.placeholder = 'admin@transitflow.cm';
    emailInp.focus();
  }

  const msg = document.getElementById('message');
  if (msg) { msg.textContent = ''; msg.className = ''; }
}

/* ══ SÉLECTION DU RÔLE (combo box) ══ */
function selectRole(role) {
  selectedRole = role;
  const msg = document.getElementById('message');
  if (msg) { msg.textContent = ''; msg.className = ''; }
}

/* ══ TOGGLE MOT DE PASSE ══ */
function initTogglePwd() {
  const btn = document.getElementById('toggle-pwd');
  const inp = document.getElementById('password');
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    const hidden = inp.type === 'password';
    inp.type     = hidden ? 'text' : 'password';
    btn.innerHTML = hidden
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });
}

/* ══ FORMULAIRE ══ */
function initForm() {
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('login-btn');
    const msg      = document.getElementById('message');

    if (!email || !password) {
      showMsg(msg, 'Veuillez remplir tous les champs.', 'error');
      return;
    }

    // Loading
    btn.disabled   = true;
    btn.innerHTML  = '<span class="spinner"></span> Connexion…';
    msg.textContent = '';
    msg.className   = '';

    // Petite pause pour l'UX
    await delay(500);

    // Tentative de connexion locale (auth.js)
    const session = TFAuth.login(email, password, selectedRole || undefined);

    if (!session) {
      btn.disabled  = false;
      btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter';

      // Message d'erreur adapté
      if (isAdminMode) {
        showMsg(msg, 'Identifiants administrateur incorrects.', 'error');
      } else {
        showMsg(msg,
          `Identifiants incorrects pour le profil <strong>${getRoleLabel(selectedRole)}</strong>.<br>Vérifiez vos identifiants ou contactez l'administrateur.`,
          'error'
        );
      }
      return;
    }

    // Succès
    showMsg(msg, `Bienvenue, <strong>${session.prenom} ${session.nom}</strong> !`, 'success');
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Connecté !';

    await delay(800);
    window.location.href = TFAuth.getDashboardUrl(session.role);
  });
}

/* ══ UTILITAIRES ══ */
function showMsg(el, html, type) {
  el.innerHTML  = html;
  el.className  = type;
}

function getRoleLabel(role) {
  const labels = { transitaire:'Transitaire', comptable:'Comptable', directeur:'Directeur', admin:'Administrateur' };
  return labels[role] || role;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
