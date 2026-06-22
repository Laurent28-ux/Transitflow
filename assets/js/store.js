/* ── TransitFlow · store.js ── Étape 8 ─────────────
   Source unique de données
   → Mode SUPABASE  si SUPABASE_URL est configuré
   → Mode LOCALSTORAGE sinon (développement)
─────────────────────────────────────────────────── */

/* ════════════════════════════════════════════════
   INIT CLIENT SUPABASE
════════════════════════════════════════════════ */
let _sb        = null;
let _useSB     = false;

(function initSupabase() {
  const hasUrl  = typeof SUPABASE_URL     !== 'undefined' && SUPABASE_URL     !== '';
  const hasKey  = typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY !== '';
  const hasSdk  = typeof supabase          !== 'undefined';

  if (hasUrl && hasKey && hasSdk) {
    _sb     = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    _useSB  = true;
    console.log('%c TransitFlow › Mode SUPABASE activé ✓', 'color:#1a8a4a;font-weight:bold');
  } else {
    console.log('%c TransitFlow › Mode LOCALSTORAGE (développement)', 'color:#a06800;font-weight:bold');
  }
})();

/* ════════════════════════════════════════════════
   CLÉS LOCALSTORAGE (fallback)
════════════════════════════════════════════════ */
const TF_COLIS_KEY      = 'tf_colis_v1';
const TF_CLIENTS_KEY    = 'tf_clients_v1';
const TF_CHAUFFEURS_KEY = 'tf_chauffeurs_v1';
const TF_VEHICULES_KEY  = 'tf_vehicules_v1';

/* ════════════════════════════════════════════════
   DONNÉES PAR DÉFAUT (localStorage uniquement)
════════════════════════════════════════════════ */
const DEFAULT_COLIS = [
  { id:1,  ref:'TF-2024-0198', client:'Maisons KOTTO',  origine:'Douala',    destination:'Paris',     poids:340,  prix:680000,  date:'2024-12-18', status:'delivered', description:'Mobilier et décoration' },
  { id:2,  ref:'TF-2024-0197', client:'Société NGOM',   origine:'Abidjan',   destination:'Lyon',      poids:820,  prix:1230000, date:'2024-12-17', status:'transit',   description:'Produits alimentaires' },
  { id:3,  ref:'TF-2024-0196', client:'Transit BIYA',   origine:'Douala',    destination:'Marseille', poids:1200, prix:1800000, date:'2024-12-16', status:'port',      description:'Matières premières' },
  { id:4,  ref:'TF-2024-0195', client:'Export MVONDO',  origine:'Yaoundé',   destination:'Bordeaux',  poids:560,  prix:840000,  date:'2024-12-15', status:'pending',   description:'Artisanat et textiles' },
  { id:5,  ref:'TF-2024-0194', client:'CAMPORT SARL',   origine:'Douala',    destination:'Anvers',    poids:2100, prix:3150000, date:'2024-12-14', status:'delivered', description:'Bois et produits forestiers' },
  { id:6,  ref:'TF-2024-0193', client:'LogiTrans CM',   origine:'Douala',    destination:'Rotterdam', poids:3400, prix:5100000, date:'2024-12-13', status:'transit',   description:'Conteneur divers' },
  { id:7,  ref:'TF-2024-0192', client:'Fret Africa',    origine:'Yaoundé',   destination:'Paris',     poids:780,  prix:1170000, date:'2024-12-12', status:'pending',   description:'Pièces auto' },
  { id:8,  ref:'TF-2024-0191', client:'NKOSI Import',   origine:'Douala',    destination:'Le Havre',  poids:1050, prix:1575000, date:'2024-12-11', status:'port',      description:'Produits chimiques' },
  { id:9,  ref:'TF-2024-0190', client:'Maisons KOTTO',  origine:'Douala',    destination:'Paris',     poids:490,  prix:735000,  date:'2024-12-10', status:'delivered', description:'Électroménager' },
  { id:10, ref:'TF-2024-0189', client:'Alpha Shipping', origine:'Limbé',     destination:'Hambourg',  poids:6200, prix:9300000, date:'2024-12-09', status:'delivered', description:'Cacao et café' },
  { id:11, ref:'TF-2024-0188', client:'BetaTrans',      origine:'Douala',    destination:'Gênes',     poids:1800, prix:2700000, date:'2024-12-08', status:'transit',   description:'Huile de palme' },
  { id:12, ref:'TF-2024-0187', client:'CAMPORT SARL',   origine:'Kribi',     destination:'Anvers',    poids:4100, prix:6150000, date:'2024-12-07', status:'port',      description:'Minerais' },
  { id:13, ref:'TF-2024-0186', client:'Société NGOM',   origine:'Douala',    destination:'Barcelone', poids:920,  prix:1380000, date:'2024-12-06', status:'pending',   description:'Vêtements' },
  { id:14, ref:'TF-2024-0185', client:'Export MVONDO',  origine:'Bafoussam', destination:'Lyon',      poids:340,  prix:510000,  date:'2024-12-05', status:'delivered', description:'Équipements sportifs' },
  { id:15, ref:'TF-2024-0184', client:'Fret Africa',    origine:'Douala',    destination:'Marseille', poids:2700, prix:4050000, date:'2024-12-04', status:'delivered', description:'Matériaux construction' },
];

const DEFAULT_CLIENTS = [
  { id:1,  nom:'Maisons KOTTO',  type:'Entreprise', tel:'+237 699 001 001', email:'kotto@mail.cm',    ville:'Douala',    status:'active',   date_creation:'2023-01-15' },
  { id:2,  nom:'Société NGOM',   type:'PME',        tel:'+237 677 002 002', email:'ngom@transit.cm',  ville:'Yaoundé',   status:'active',   date_creation:'2023-03-20' },
  { id:3,  nom:'Transit BIYA',   type:'Entreprise', tel:'+237 655 003 003', email:'biya@transit.cm',  ville:'Douala',    status:'active',   date_creation:'2022-11-10' },
  { id:4,  nom:'Export MVONDO',  type:'Particulier',tel:'+237 690 004 004', email:'mvondo@mail.cm',   ville:'Bafoussam', status:'inactive', date_creation:'2023-06-01' },
  { id:5,  nom:'CAMPORT SARL',   type:'Entreprise', tel:'+237 699 005 005', email:'camport@sarl.cm',  ville:'Douala',    status:'active',   date_creation:'2021-08-25' },
  { id:6,  nom:'LogiTrans CM',   type:'PME',        tel:'+237 677 006 006', email:'logitrans@cm.net', ville:'Douala',    status:'active',   date_creation:'2022-05-14' },
  { id:7,  nom:'Fret Africa',    type:'Entreprise', tel:'+237 699 007 007', email:'fret@africa.cm',   ville:'Douala',    status:'active',   date_creation:'2021-12-03' },
  { id:8,  nom:'NKOSI Import',   type:'PME',        tel:'+237 655 008 008', email:'nkosi@import.cm',  ville:'Kribi',     status:'active',   date_creation:'2023-02-18' },
  { id:9,  nom:'Alpha Shipping', type:'Entreprise', tel:'+237 699 009 009', email:'alpha@shipping.cm',ville:'Limbé',     status:'active',   date_creation:'2020-07-30' },
  { id:10, nom:'BetaTrans',      type:'PME',        tel:'+237 677 010 010', email:'beta@trans.cm',    ville:'Douala',    status:'inactive', date_creation:'2023-09-12' },
];

const DEFAULT_CHAUFFEURS = [
  { id:1, prenom:'Jean',   nom:'MBIDA', tel:'+237 699 100 100', permis:'B+C',   experience:12, vehicule_id:1, status:'en_mission',  date_embauche:'2015-03-10' },
  { id:2, prenom:'Pierre', nom:'ATEBA', tel:'+237 677 200 200', permis:'B+C+E', experience:8,  vehicule_id:2, status:'disponible',  date_embauche:'2018-06-15' },
  { id:3, prenom:'Samuel', nom:'ENOW',  tel:'+237 655 300 300', permis:'B+C',   experience:5,  vehicule_id:3, status:'disponible',  date_embauche:'2021-01-20' },
  { id:4, prenom:'Roger',  nom:'FOUDA', tel:'+237 690 400 400', permis:'B+C',   experience:15, vehicule_id:null, status:'conge',   date_embauche:'2012-09-05' },
  { id:5, prenom:'Basile', nom:'NZOMO', tel:'+237 699 500 500', permis:'C+E',   experience:10, vehicule_id:4, status:'en_mission',  date_embauche:'2016-11-12' },
  { id:6, prenom:'Martin', nom:'LOBE',  tel:'+237 677 600 600', permis:'B+C',   experience:3,  vehicule_id:null, status:'disponible',date_embauche:'2023-04-08' },
];

const DEFAULT_VEHICULES = [
  { id:1, plaque:'LT-4821-CM', type:'Camion 10T',    chauffeur_id:1, status:'en_mission',  km:234500, km_entretien:250000 },
  { id:2, plaque:'DL-2230-CM', type:'Fourgon 5T',    chauffeur_id:2, status:'disponible',  km:189200, km_entretien:200000 },
  { id:3, plaque:'YD-0091-CM', type:'Camion 15T',    chauffeur_id:3, status:'disponible',  km:310800, km_entretien:320000 },
  { id:4, plaque:'KM-3310-CM', type:'Semi-remorque', chauffeur_id:5, status:'en_mission',  km:445600, km_entretien:460000 },
  { id:5, plaque:'DL-7701-CM', type:'Véhicule léger',chauffeur_id:4, status:'maintenance', km:98300,  km_entretien:100000 },
  { id:6, plaque:'YD-4420-CM', type:'Camion 8T',     chauffeur_id:null, status:'disponible', km:156000, km_entretien:175000 },
  { id:7, plaque:'LT-9901-CM', type:'Fourgon 3T',    chauffeur_id:null, status:'disponible', km:67400,  km_entretien:80000  },
  { id:8, plaque:'KM-0022-CM', type:'Camion 12T',    chauffeur_id:null, status:'disponible', km:201000, km_entretien:220000 },
];

/* ════════════════════════════════════════════════
   CACHE LOCAL (hydraté au chargement)
════════════════════════════════════════════════ */
const _cache = { colis: null, clients: null, chauffeurs: null, vehicules: null };

/* ════════════════════════════════════════════════
   STORE — API publique
════════════════════════════════════════════════ */
const TFStore = {

  /* ──────────────────────────────────────────────
     HYDRATATION — à appeler au DOMContentLoaded
     Charge toutes les données (Supabase ou LS)
  ────────────────────────────────────────────── */
  async hydrate() {
    if (_useSB) {
      try {
        const [c, cl, ch, v] = await Promise.all([
          _sb.from('colis').select('*').order('created_at', { ascending: false }),
          _sb.from('clients').select('*').order('created_at', { ascending: false }),
          _sb.from('chauffeurs').select('*').order('created_at', { ascending: false }),
          _sb.from('vehicules').select('*').order('created_at', { ascending: false }),
        ]);
        _cache.colis      = c.data  || [];
        _cache.clients    = cl.data || [];
        _cache.chauffeurs = ch.data || [];
        _cache.vehicules  = v.data  || [];

        // ── Appliquer les suppressions locales en attente ──
        // Si un ID est dans la liste des supprimés locaux,
        // on le retire du cache Supabase (en attente de sync)
        const deletedClients = this._getDeletedIds('tf_deleted_clients');
        const deletedColis   = this._getDeletedIds('tf_deleted_colis');
        const deletedCh      = this._getDeletedIds('tf_deleted_chauffeurs');
        const deletedVeh     = this._getDeletedIds('tf_deleted_vehicules');

        if (deletedClients.size) _cache.clients    = _cache.clients.filter(x => !deletedClients.has(x.id));
        if (deletedColis.size)   _cache.colis       = _cache.colis.filter(x => !deletedColis.has(x.id));
        if (deletedCh.size)      _cache.chauffeurs  = _cache.chauffeurs.filter(x => !deletedCh.has(x.id));
        if (deletedVeh.size)     _cache.vehicules   = _cache.vehicules.filter(x => !deletedVeh.has(x.id));

        // Sauvegarder le cache nettoyé en localStorage
        this._lsSave(TF_CLIENTS_KEY,    _cache.clients);
        this._lsSave(TF_COLIS_KEY,      _cache.colis);
        this._lsSave(TF_CHAUFFEURS_KEY, _cache.chauffeurs);
        this._lsSave(TF_VEHICULES_KEY,  _cache.vehicules);

      } catch (err) {
        console.error('TFStore.hydrate error:', err);
        this._hydrateLS();   // fallback localStorage
      }
    } else {
      this._hydrateLS();
    }
    this._dispatch('tf:store:hydrated', {});
  },

  _hydrateLS() {
    _cache.colis      = this._lsGet(TF_COLIS_KEY,      DEFAULT_COLIS);
    _cache.clients    = this._lsGet(TF_CLIENTS_KEY,    DEFAULT_CLIENTS);
    _cache.chauffeurs = this._lsGet(TF_CHAUFFEURS_KEY, DEFAULT_CHAUFFEURS);
    _cache.vehicules  = this._lsGet(TF_VEHICULES_KEY,  DEFAULT_VEHICULES);
  },

  /* ──────────────────────────────────────────────
     LECTURES SYNCHRONES (depuis le cache)
  ────────────────────────────────────────────── */
  getColis()      { return _cache.colis      || []; },
  getClients()    { return _cache.clients    || []; },
  getChauffeurs() { return _cache.chauffeurs || []; },
  getVehicules()  { return _cache.vehicules  || []; },

  /* ──────────────────────────────────────────────
     COLIS — mutations async
  ────────────────────────────────────────────── */
  async addColis(data) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('colis').insert(data).select().single();
      if (error) throw error;
      _cache.colis.unshift(item);
      this._dispatch('tf:colis:added', item);
      return item;
    }
    const item = { id: this._nextId(_cache.colis), prix: 500000, ...data };
    _cache.colis.unshift(item);
    this._lsSave(TF_COLIS_KEY, _cache.colis);
    this._dispatch('tf:colis:added', item);
    return item;
  },

  async updateColis(id, updates) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('colis').update(updates).eq('id', id).select().single();
      if (error) throw error;
      const idx = _cache.colis.findIndex(c => c.id === id);
      if (idx > -1) _cache.colis[idx] = item;
      this._dispatch('tf:colis:updated', item);
      return item;
    }
    const idx = _cache.colis.findIndex(c => c.id === id);
    if (idx > -1) _cache.colis[idx] = { ..._cache.colis[idx], ...updates };
    this._lsSave(TF_COLIS_KEY, _cache.colis);
    this._dispatch('tf:colis:updated', _cache.colis[idx]);
    return _cache.colis[idx];
  },

  async deleteColis(id) {
    if (_useSB) {
      const { error } = await _sb.from('colis').delete().eq('id', id);
      if (error) throw error;
    }
    _cache.colis = _cache.colis.filter(c => c.id !== id);
    this._lsSave(TF_COLIS_KEY, _cache.colis);
    this._addDeletedId('tf_deleted_colis', id);
    this._dispatch('tf:colis:deleted', { id });
  },

  async deleteManyIds(ids) {
    const s = new Set(ids);
    if (_useSB) {
      const { error } = await _sb.from('colis').delete().in('id', [...ids]);
      if (error) throw error;
    }
    _cache.colis = _cache.colis.filter(c => !s.has(c.id));
    this._lsSave(TF_COLIS_KEY, _cache.colis);
    this._dispatch('tf:colis:deleted', { ids });
  },

  async updateManyStatus(ids, status) {
    const s = new Set(ids);
    if (_useSB) {
      const { error } = await _sb.from('colis').update({ status }).in('id', [...ids]);
      if (error) throw error;
    }
    _cache.colis = _cache.colis.map(c => s.has(c.id) ? { ...c, status } : c);
    this._lsSave(TF_COLIS_KEY, _cache.colis);
    this._dispatch('tf:colis:updated', { ids, status });
  },

  nextRef() {
    const data = _cache.colis || [];
    if (!data.length) return 'TF-2024-0199';
    const nums = data.map(c => parseInt(c.ref.split('-').pop())).filter(n => !isNaN(n));
    return `TF-2024-0${Math.max(...nums) + 1}`;
  },

  /* ──────────────────────────────────────────────
     CLIENTS — mutations async
  ────────────────────────────────────────────── */
  async addClient(data) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('clients').insert(data).select().single();
      if (error) throw error;
      _cache.clients.unshift(item);
      this._dispatch('tf:clients:changed', item);
      return item;
    }
    const item = { id: this._nextId(_cache.clients), date_creation: new Date().toISOString().slice(0,10), ...data };
    _cache.clients.unshift(item);
    this._lsSave(TF_CLIENTS_KEY, _cache.clients);
    this._dispatch('tf:clients:changed', item);
    return item;
  },

  async updateClient(id, updates) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('clients').update(updates).eq('id', id).select().single();
      if (error) throw error;
      const idx = _cache.clients.findIndex(c => c.id === id);
      if (idx > -1) _cache.clients[idx] = item;
      this._dispatch('tf:clients:changed', {});
      return item;
    }
    const idx = _cache.clients.findIndex(c => c.id === id);
    if (idx > -1) _cache.clients[idx] = { ..._cache.clients[idx], ...updates };
    this._lsSave(TF_CLIENTS_KEY, _cache.clients);
    this._dispatch('tf:clients:changed', {});
    return _cache.clients[idx];
  },

  async deleteClient(id) {
    // 1. Supprimer dans Supabase si connecté
    if (_useSB) {
      const { error } = await _sb.from('clients').delete().eq('id', id);
      if (error) throw error;

      // Annuler aussi les factures liées dans Supabase
      await _sb.from('factures')
        .update({ statut: 'annulee' })
        .eq('client_id', id)
        .neq('statut', 'annulee');

      // Clôturer les dossiers liés dans Supabase
      await _sb.from('dossiers')
        .update({ statut: 'cloture' })
        .eq('client_id', id)
        .neq('statut', 'cloture');
    }

    // 2. Retirer du cache mémoire
    _cache.clients = _cache.clients.filter(c => c.id !== id);
    this._lsSave(TF_CLIENTS_KEY, _cache.clients);

    // 3. Mémoriser cet ID comme "supprimé" pour résister au hydrate()
    this._addDeletedId('tf_deleted_clients', id);

    // 4. Nettoyer les données liées en localStorage
    this._cleanLinkedData(id);

    this._dispatch('tf:clients:changed', { id });
  },

  /* ──────────────────────────────────────────────
     CHAUFFEURS — mutations async
  ────────────────────────────────────────────── */
  async addChauffeur(data) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('chauffeurs').insert(data).select().single();
      if (error) throw error;
      _cache.chauffeurs.unshift(item);
      this._dispatch('tf:chauffeurs:changed', item);
      return item;
    }
    const item = { id: this._nextId(_cache.chauffeurs), date_embauche: new Date().toISOString().slice(0,10), vehicule_id: null, ...data };
    _cache.chauffeurs.unshift(item);
    this._lsSave(TF_CHAUFFEURS_KEY, _cache.chauffeurs);
    this._dispatch('tf:chauffeurs:changed', item);
    return item;
  },

  async updateChauffeur(id, updates) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('chauffeurs').update(updates).eq('id', id).select().single();
      if (error) throw error;
      const idx = _cache.chauffeurs.findIndex(c => c.id === id);
      if (idx > -1) _cache.chauffeurs[idx] = item;
      this._dispatch('tf:chauffeurs:changed', {});
      return item;
    }
    const idx = _cache.chauffeurs.findIndex(c => c.id === id);
    if (idx > -1) _cache.chauffeurs[idx] = { ..._cache.chauffeurs[idx], ...updates };
    this._lsSave(TF_CHAUFFEURS_KEY, _cache.chauffeurs);
    this._dispatch('tf:chauffeurs:changed', {});
    return _cache.chauffeurs[idx];
  },

  async deleteChauffeur(id) {
    if (_useSB) {
      const { error } = await _sb.from('chauffeurs').delete().eq('id', id);
      if (error) throw error;
    }
    _cache.chauffeurs = _cache.chauffeurs.filter(c => c.id !== id);
    this._lsSave(TF_CHAUFFEURS_KEY, _cache.chauffeurs);
    this._addDeletedId('tf_deleted_chauffeurs', id);
    this._dispatch('tf:chauffeurs:changed', { id });
  },

  /* ──────────────────────────────────────────────
     VÉHICULES — mutations async
  ────────────────────────────────────────────── */
  async addVehicule(data) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('vehicules').insert(data).select().single();
      if (error) throw error;
      _cache.vehicules.unshift(item);
      this._dispatch('tf:vehicules:changed', item);
      return item;
    }
    const item = { id: this._nextId(_cache.vehicules), chauffeur_id: null, km: 0, km_entretien: 50000, ...data };
    _cache.vehicules.unshift(item);
    this._lsSave(TF_VEHICULES_KEY, _cache.vehicules);
    this._dispatch('tf:vehicules:changed', item);
    return item;
  },

  async updateVehicule(id, updates) {
    if (_useSB) {
      const { data: item, error } = await _sb.from('vehicules').update(updates).eq('id', id).select().single();
      if (error) throw error;
      const idx = _cache.vehicules.findIndex(v => v.id === id);
      if (idx > -1) _cache.vehicules[idx] = item;
      this._dispatch('tf:vehicules:changed', {});
      return item;
    }
    const idx = _cache.vehicules.findIndex(v => v.id === id);
    if (idx > -1) _cache.vehicules[idx] = { ..._cache.vehicules[idx], ...updates };
    this._lsSave(TF_VEHICULES_KEY, _cache.vehicules);
    this._dispatch('tf:vehicules:changed', {});
    return _cache.vehicules[idx];
  },

  async deleteVehicule(id) {
    if (_useSB) {
      const { error } = await _sb.from('vehicules').delete().eq('id', id);
      if (error) throw error;
    }
    _cache.vehicules = _cache.vehicules.filter(v => v.id !== id);
    this._lsSave(TF_VEHICULES_KEY, _cache.vehicules);
    this._addDeletedId('tf_deleted_vehicules', id);
    this._dispatch('tf:vehicules:changed', { id });
  },

  /* ──────────────────────────────────────────────
     STATISTIQUES GLOBALES
  ────────────────────────────────────────────── */
  getStats() {
    const colis      = _cache.colis      || [];
    const clients    = _cache.clients    || [];
    const chauffeurs = _cache.chauffeurs || [];
    const vehicules  = _cache.vehicules  || [];
    const revenus    = colis.filter(c => c.status === 'delivered').reduce((s, c) => s + (c.prix || 0), 0);
    return {
      colis : {
        total    : colis.length,
        pending  : colis.filter(c => c.status === 'pending').length,
        transit  : colis.filter(c => c.status === 'transit').length,
        port     : colis.filter(c => c.status === 'port').length,
        delivered: colis.filter(c => c.status === 'delivered').length,
      },
      clients : {
        total  : clients.length,
        actifs : clients.filter(c => c.status === 'active').length,
        inactifs: clients.filter(c => c.status === 'inactive').length,
      },
      chauffeurs : {
        total      : chauffeurs.length,
        disponibles: chauffeurs.filter(c => c.status === 'disponible').length,
        en_mission : chauffeurs.filter(c => c.status === 'en_mission').length,
        conge      : chauffeurs.filter(c => c.status === 'conge').length,
      },
      vehicules : {
        total      : vehicules.length,
        disponibles: vehicules.filter(v => v.status === 'disponible').length,
        en_mission : vehicules.filter(v => v.status === 'en_mission').length,
        maintenance: vehicules.filter(v => v.status === 'maintenance').length,
      },
      revenus,
      revenusM: Math.round(revenus / 100000) / 10,
    };
  },

  /* ──────────────────────────────────────────────
     AUTHENTIFICATION SUPABASE
  ────────────────────────────────────────────── */
  async signIn(email, password) {
    if (!_useSB) throw new Error('Supabase non configuré');
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (_useSB) await _sb.auth.signOut();
    window.location.replace('login.html');
  },

  async getUser() {
    if (!_useSB) return { email: 'admin@transitflow.cm', role: 'admin' };
    const { data: { user } } = await _sb.auth.getUser();
    return user;
  },

  async requireAuth() {
    if (!_useSB) return true;   // dev mode : pas de vérif
    const user = await this.getUser();
    if (!user) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  },

  /* ──────────────────────────────────────────────
     RÉINITIALISATION
  ────────────────────────────────────────────── */
  reset() {
    [
      TF_COLIS_KEY, TF_CLIENTS_KEY, TF_CHAUFFEURS_KEY, TF_VEHICULES_KEY,
      'tf_deleted_clients', 'tf_deleted_colis', 'tf_deleted_chauffeurs', 'tf_deleted_vehicules',
      'tf_factures_v1', 'tf_dossiers_v1', 'tf_paiements_v1', 'tf_missions_v1',
    ].forEach(k => localStorage.removeItem(k));
    _cache.colis = _cache.clients = _cache.chauffeurs = _cache.vehicules = null;
    this._dispatch('tf:store:reset', {});
  },

  /* ──────────────────────────────────────────────
     PRIVÉ
  ────────────────────────────────────────────── */
  _nextId(arr) { return arr && arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; },
  _lsGet(key, def) {
    try { const r = localStorage.getItem(key); if (!r) { this._lsSave(key, def); return [...def]; } return JSON.parse(r); }
    catch { return [...def]; }
  },
  _lsSave(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} },
  _dispatch(event, detail) { window.dispatchEvent(new CustomEvent(event, { detail })); },

  /* ── Gestion des IDs supprimés (persist après hydrate) ── */
  _addDeletedId(key, id) {
    try {
      const ids = JSON.parse(localStorage.getItem(key) || '[]');
      if (!ids.includes(id)) { ids.push(id); localStorage.setItem(key, JSON.stringify(ids)); }
    } catch {}
  },
  _getDeletedIds(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { return new Set(); }
  },
  _clearDeletedIds(key) {
    localStorage.removeItem(key);
  },

  /* ── Nettoyage des données liées à un client supprimé ── */
  _cleanLinkedData(clientId) {
    // Factures → annuler
    try {
      const facs = JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
      const updated = facs.map(f =>
        f.clientId === clientId
          ? { ...f, clientId: null, clientNom: '[Client supprimé]', statut: 'annulee' }
          : f
      );
      localStorage.setItem('tf_factures_v1', JSON.stringify(updated));
    } catch {}

    // Dossiers → clôturer
    try {
      const dos = JSON.parse(localStorage.getItem('tf_dossiers_v1') || '[]');
      const updated = dos.map(d =>
        d.clientId === clientId
          ? { ...d, clientId: null, clientNom: '[Client supprimé]', statut: 'cloture' }
          : d
      );
      localStorage.setItem('tf_dossiers_v1', JSON.stringify(updated));
    } catch {}

    // Paiements → mentionner client supprimé
    try {
      const pays = JSON.parse(localStorage.getItem('tf_paiements_v1') || '[]');
      localStorage.setItem('tf_paiements_v1', JSON.stringify(pays));
    } catch {}

    // Missions → laisser mais sans client
    try {
      const mis = JSON.parse(localStorage.getItem('tf_missions_v1') || '[]');
      localStorage.setItem('tf_missions_v1', JSON.stringify(mis));
    } catch {}
  },
};

window.TFStore = TFStore;
