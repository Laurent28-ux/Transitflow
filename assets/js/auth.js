/* ── TransitFlow · auth.js ──────────────────────────
   Système d'authentification par rôles
   Rôles : admin · transitaire · comptable · directeur
─────────────────────────────────────────────────── */

const TF_AUTH_KEY  = 'tf_auth_session';
const TF_USERS_KEY = 'tf_users_v1';

/* ══ UTILISATEURS PAR DÉFAUT ══
   L'admin existe toujours, les autres sont créés par l'admin
════════════════════════════════════════════════════ */
const DEFAULT_ADMIN = {
  id       : 1,
  nom      : 'Administrateur',
  prenom   : 'Super',
  email    : 'admin@transitflow.cm',
  password : 'admin2026',   // En production → hash côté Supabase
  role     : 'admin',
  actif    : true,
  createdAt: new Date().toISOString(),
};

/* ══ PERMISSIONS PAR RÔLE ══ */
const ROLE_PERMISSIONS = {
  admin: {
    label   : 'Administrateur',
    icon    : 'fa-shield-halved',
    color   : '#1E3A5F',
    pages   : ['dashboard','colis','clients','dossiers','livraisons',
               'factures','paiements','chauffeurs','vehicules',
               'documents','rapports','parametres','utilisateurs'],
    canWrite: true,
    canDelete: true,
  },
  transitaire: {
    label   : 'Transitaire',
    icon    : 'fa-truck-fast',
    color   : '#F97316',
    pages   : ['dashboard','colis','clients','dossiers',
               'livraisons','documents','chauffeurs','vehicules'],
    canWrite: true,
    canDelete: false,
  },
  comptable: {
    label   : 'Comptable',
    icon    : 'fa-calculator',
    color   : '#2563EB',
    pages   : ['dashboard','factures','paiements','rapports','clients'],
    canWrite: true,
    canDelete: false,
  },
  directeur: {
    label   : 'Directeur',
    icon    : 'fa-briefcase',
    color   : '#15803D',
    pages   : ['dashboard','rapports','clients','colis','factures'],
    canWrite: false,
    canDelete: false,
  },
};

/* ══ API AUTH ══ */
const TFAuth = {

  /* ── Récupérer tous les utilisateurs ── */
  getUsers() {
    try {
      const stored = localStorage.getItem(TF_USERS_KEY);
      if (!stored) {
        const defaults = [DEFAULT_ADMIN];
        localStorage.setItem(TF_USERS_KEY, JSON.stringify(defaults));
        return defaults;
      }
      const users = JSON.parse(stored);
      // S'assurer que l'admin existe toujours
      if (!users.find(u => u.role === 'admin')) {
        users.unshift(DEFAULT_ADMIN);
        localStorage.setItem(TF_USERS_KEY, JSON.stringify(users));
      }
      return users;
    } catch { return [DEFAULT_ADMIN]; }
  },

  /* ── Connexion ── */
  login(email, password, role) {
    const users = this.getUsers();
    const user  = users.find(u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password            === password &&
      u.actif               !== false &&
      (role ? u.role === role : true)
    );
    if (!user) return null;

    const session = {
      userId   : user.id,
      email    : user.email,
      nom      : user.nom,
      prenom   : user.prenom,
      role     : user.role,
      loginAt  : new Date().toISOString(),
    };
    localStorage.setItem(TF_AUTH_KEY, JSON.stringify(session));
    return session;
  },

  /* ── Session courante ── */
  getSession() {
    try { return JSON.parse(localStorage.getItem(TF_AUTH_KEY) || 'null'); }
    catch { return null; }
  },

  /* ── Déconnexion ── */
  logout() {
    this.clearSession();
    window.location.replace('login.html');
  },

  /* ── Effacer la session (sans rediriger) ── */
  clearSession() {
    localStorage.removeItem(TF_AUTH_KEY);
    sessionStorage.removeItem('tf_just_logged_out');
  },

  /* ── Vérifier accès à une page ── */
  canAccess(page) {
    const session = this.getSession();
    if (!session) return false;
    const perms = ROLE_PERMISSIONS[session.role];
    if (!perms) return false;
    return perms.pages.includes(page);
  },

  /* ── Vérifier permission d'écriture ── */
  canWrite() {
    const session = this.getSession();
    if (!session) return false;
    return ROLE_PERMISSIONS[session.role]?.canWrite || false;
  },

  /* ── Vérifier permission de suppression ── */
  canDelete() {
    const session = this.getSession();
    if (!session) return false;
    return ROLE_PERMISSIONS[session.role]?.canDelete || false;
  },

  /* ── Permissions du rôle courant ── */
  getPerms() {
    const session = this.getSession();
    if (!session) return null;
    return ROLE_PERMISSIONS[session.role] || null;
  },

  /* ── Ajouter un utilisateur (admin seulement) ── */
  addUser(data) {
    const session = this.getSession();
    if (!session || session.role !== 'admin') throw new Error('Non autorisé');
    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Cet email est déjà utilisé');
    }
    const newUser = {
      id       : Date.now(),
      nom      : data.nom,
      prenom   : data.prenom,
      email    : data.email,
      password : data.password,
      role     : data.role,
      actif    : true,
      createdAt: new Date().toISOString(),
      createdBy: session.email,
    };
    users.push(newUser);
    localStorage.setItem(TF_USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  /* ── Modifier un utilisateur ── */
  updateUser(id, updates) {
    const session = this.getSession();
    if (!session || session.role !== 'admin') throw new Error('Non autorisé');
    const users = this.getUsers();
    const idx   = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Utilisateur introuvable');
    // Protéger l'admin principal
    if (users[idx].id === 1 && updates.role && updates.role !== 'admin') {
      throw new Error('Impossible de modifier le rôle du super admin');
    }
    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem(TF_USERS_KEY, JSON.stringify(users));
    return users[idx];
  },

  /* ── Désactiver un utilisateur ── */
  deactivateUser(id) {
    if (id === 1) throw new Error('Impossible de désactiver le super admin');
    return this.updateUser(id, { actif: false });
  },

  /* ── Réactiver un utilisateur ── */
  activateUser(id) {
    return this.updateUser(id, { actif: true });
  },

  /* ── Supprimer un utilisateur ── */
  deleteUser(id) {
    if (id === 1) throw new Error('Impossible de supprimer le super admin');
    const session = this.getSession();
    if (!session || session.role !== 'admin') throw new Error('Non autorisé');
    const users = this.getUsers().filter(u => u.id !== id);
    localStorage.setItem(TF_USERS_KEY, JSON.stringify(users));
  },

  /* ── Redirection selon rôle ── */
  getDashboardUrl(role) {
    const urls = {
      admin      : 'dashboard.html',
      transitaire: 'dashboard.html',
      comptable  : 'dashboard.html',
      directeur  : 'dashboard.html',
    };
    return urls[role] || 'dashboard.html';
  },

  /* ── Protection de page (à appeler au DOMContentLoaded) ── */
  requireAuth(page) {
    const session = this.getSession();
    if (!session) {
      window.location.replace('login.html');
      return false;
    }
    if (page && !this.canAccess(page)) {
      window.location.replace('acces-refuse.html');
      return false;
    }
    return true;
  },
};

window.TFAuth = TFAuth;
window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
