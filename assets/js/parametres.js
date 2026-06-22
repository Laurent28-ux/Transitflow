/* ── TransitFlow · parametres.js ── Étape 9 ── */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof TFStore !== 'undefined') await TFStore.hydrate();
  loadProfile();
  initTabs();
  initToggles();
  initThemeCards();
  initPwdStrength();
  initProfileForm();
  loadSavedPhoto();  // Charger la photo sauvegardée
});

/* ── ONGLETS ── */
function initTabs() {
  document.querySelectorAll('.ptab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
    });
  });
}

/* ── PROFIL ── */
function loadProfile() {
  const saved = JSON.parse(localStorage.getItem('tf_profile') || '{}');
  const set = (id, v) => { const e=document.getElementById(id); if(e&&v) e.value=v; };
  set('pf-prenom', saved.prenom || 'Administrateur');
  set('pf-nom',    saved.nom    || '');
  set('pf-email',  saved.email  || 'admin@transitflow.cm');
  set('pf-tel',    saved.tel    || '');
  set('pf-poste',  saved.poste  || 'Transit Manager');
  set('pf-cie',    saved.cie    || 'TransitFlow SARL');

  // Mettre à jour l'affichage du nom et rôle
  const prenom = saved.prenom || 'Administrateur';
  const nom    = saved.nom    || '';
  const poste  = saved.poste  || 'Transit Manager';
  const cie    = saved.cie    || 'TransitFlow';
  const fullName = [prenom, nom].filter(Boolean).join(' ');

  const nameEl = document.getElementById('av-name-display');
  const roleEl = document.getElementById('av-role-display');
  const initEl = document.getElementById('big-av-initials');

  if (nameEl) nameEl.textContent = fullName;
  if (roleEl) roleEl.textContent = `${poste} · ${cie}`;

  // Initiales de l'avatar
  const initials = [prenom[0], nom[0]].filter(Boolean).join('').toUpperCase() || 'AD';
  if (initEl) initEl.textContent = initials;

  // Mettre à jour sidebar et topbar
  document.querySelectorAll('.foot-name').forEach(el => el.textContent = fullName);
  document.querySelectorAll('.foot-role').forEach(el => el.textContent = poste);
  document.querySelectorAll('.prof-name').forEach(el => el.textContent = prenom);
  document.querySelectorAll('.foot-avatar, .prof-av').forEach(el => {
    if (!el.style.backgroundImage) el.textContent = initials;
  });
}

function initProfileForm() {
  document.getElementById('pf-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const profile = JSON.parse(localStorage.getItem('tf_profile') || '{}');
    const data = {
      ...profile,  // conserver la photo
      prenom : document.getElementById('pf-prenom').value.trim(),
      nom    : document.getElementById('pf-nom').value.trim(),
      email  : document.getElementById('pf-email').value.trim(),
      tel    : document.getElementById('pf-tel').value.trim(),
      poste  : document.getElementById('pf-poste').value.trim(),
      cie    : document.getElementById('pf-cie').value.trim(),
    };
    localStorage.setItem('tf_profile', JSON.stringify(data));
    loadProfile();  // Rafraîchir l'affichage
    showToast('Profil sauvegardé avec succès', 'success');
  });
}

/* ── NOTIFICATIONS ── */
function initToggles() {
  const saved = JSON.parse(localStorage.getItem('tf_notif_prefs') || '{}');
  document.querySelectorAll('.notif-toggle').forEach(inp => {
    const key = inp.dataset.key;
    inp.checked = saved[key] !== false; // true par défaut
    inp.addEventListener('change', () => {
      const prefs = JSON.parse(localStorage.getItem('tf_notif_prefs') || '{}');
      prefs[key] = inp.checked;
      localStorage.setItem('tf_notif_prefs', JSON.stringify(prefs));
    });
  });
}

function saveNotifs() { showToast('Préférences de notifications sauvegardées', 'success'); }

/* ── THÈME ── */
function initThemeCards() {
  const current = localStorage.getItem('tf_theme') || 'light';
  document.querySelectorAll('.theme-card').forEach(card => {
    if (card.dataset.theme === current) card.classList.add('active');
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      applyTheme(card.dataset.theme);
    });
  });
}

function applyTheme(theme) {
  localStorage.setItem('tf_theme', theme);
  const effective = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', effective);
  showToast(theme === 'dark' ? 'Mode sombre activé' : theme === 'auto' ? 'Mode automatique activé' : 'Mode clair activé', 'success');
}

/* ── SÉCURITÉ ── */
function initPwdStrength() {
  const inp = document.getElementById('pwd-new'); if (!inp) return;
  inp.addEventListener('input', () => {
    const v = inp.value;
    let score = 0;
    if (v.length >= 8)                   score++;
    if (/[A-Z]/.test(v))                 score++;
    if (/[0-9]/.test(v))                 score++;
    if (/[^A-Za-z0-9]/.test(v))         score++;
    const lvl = score<=1?'weak':score<=2?'weak':score===3?'medium':'strong';
    const lbl = score<=1?'Faible':score<=2?'Faible':score===3?'Moyen':'Fort';
    document.querySelectorAll('.ps-b').forEach((b,i) => {
      b.className = 'ps-b' + (i<score ? ` filled ${lvl}` : '');
    });
    const txtEl = document.getElementById('ps-txt'); if(txtEl) txtEl.textContent = v ? lbl : '';
  });
}

function updatePassword() {
  const cur  = document.getElementById('pwd-cur')?.value;
  const nw   = document.getElementById('pwd-new')?.value;
  const conf = document.getElementById('pwd-conf')?.value;
  if (!cur || !nw || !conf)        { showToast('Remplissez tous les champs','error'); return; }
  if (nw !== conf)                  { showToast('Les mots de passe ne correspondent pas','error'); return; }
  if (nw.length < 8)                { showToast('Mot de passe trop court (min 8 caractères)','error'); return; }
  showToast('Mot de passe mis à jour (connectez-vous à Supabase pour l\'activer réellement)','success');
}

function signOut() {
  if (typeof TFStore !== 'undefined') TFStore.signOut();
  else window.location.href = 'login.html';
}

function showToast(msg,type='info') {
  document.querySelector('.tf-toast')?.remove();
  const t=document.createElement('div'); t.className=`tf-toast tf-toast-${type}`;
  const icons={success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'};
  t.innerHTML=`<i class="fa-solid ${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},3000);
}

/* ── PHOTO DE PROFIL ── */
function triggerPhotoUpload() {
  document.getElementById('photo-input')?.click();
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Vérifier la taille (max 2 Mo)
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image trop lourde (max 2 Mo)', 'error');
    return;
  }

  // Vérifier le type
  if (!file.type.startsWith('image/')) {
    showToast('Fichier non supporté. Utilisez JPG, PNG ou GIF', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;

    // Sauvegarder en localStorage (base64)
    const profile = JSON.parse(localStorage.getItem('tf_profile') || '{}');
    profile.photo = base64;
    localStorage.setItem('tf_profile', JSON.stringify(profile));

    // Afficher la photo
    applyProfilePhoto(base64);
    showToast('Photo de profil mise à jour', 'success');

    // Mettre à jour partout dans la page
    updateAvatarsInPage(base64);
  };
  reader.readAsDataURL(file);
}

function applyProfilePhoto(base64) {
  const img      = document.getElementById('big-av-photo');
  const initials = document.getElementById('big-av-initials');
  const removeBtn = document.getElementById('btn-remove-photo');

  if (img) {
    img.src = base64;
    img.style.display = 'block';
  }
  if (initials) initials.style.display = 'none';
  if (removeBtn) removeBtn.style.display = '';
}

function removePhoto() {
  const profile = JSON.parse(localStorage.getItem('tf_profile') || '{}');
  delete profile.photo;
  localStorage.setItem('tf_profile', JSON.stringify(profile));

  const img      = document.getElementById('big-av-photo');
  const initials = document.getElementById('big-av-initials');
  const removeBtn = document.getElementById('btn-remove-photo');

  if (img)      { img.src = ''; img.style.display = 'none'; }
  if (initials) initials.style.display = '';
  if (removeBtn) removeBtn.style.display = 'none';

  // Remettre les initiales dans la sidebar et topbar
  updateAvatarsInPage(null);
  showToast('Photo de profil supprimée', 'success');
}

function updateAvatarsInPage(base64) {
  // Avatar sidebar
  const footAv = document.querySelector('.foot-avatar');
  // Avatar topbar
  const profAv = document.querySelector('.prof-av');

  if (base64) {
    const imgStyle = `
      background-image: url('${base64}');
      background-size: cover;
      background-position: center;
      color: transparent;
      font-size: 0;
    `;
    if (footAv) footAv.style.cssText = imgStyle;
    if (profAv) profAv.style.cssText = imgStyle;
  } else {
    if (footAv) { footAv.style.cssText = ''; }
    if (profAv) { profAv.style.cssText = ''; }
  }
}

function loadSavedPhoto() {
  const profile = JSON.parse(localStorage.getItem('tf_profile') || '{}');
  if (profile.photo) {
    applyProfilePhoto(profile.photo);
    updateAvatarsInPage(profile.photo);
  }
}