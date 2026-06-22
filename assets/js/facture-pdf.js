/* ── TransitFlow · facture-pdf.js ───────────────────
   Export PDF / Impression des factures
   Génère une page HTML propre et lance window.print()
─────────────────────────────────────────────────── */

function exportFacturePDF(factureId) {
  const factures = JSON.parse(localStorage.getItem('tf_factures_v1') || '[]');
  const f = factures.find(x => x.id == factureId);
  if (!f) { showToast('Facture introuvable', 'error'); return; }

  const html = buildFactureHTML(f);
  const win  = window.open('', '_blank', 'width=900,height=700');
  if (!win) { showToast('Autorisez les popups pour exporter le PDF', 'error'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}

function buildFactureHTML(f) {
  const lignes = (f.lignes || []).map(l => `
    <tr>
      <td>${escH(l.desc || '—')}</td>
      <td style="text-align:center">${l.qte}</td>
      <td style="text-align:right">${fmt(l.pu)}</td>
      <td style="text-align:right;font-weight:600">${fmt(l.qte * l.pu)}</td>
    </tr>`).join('');

  const statutColors = {
    payee     : '#15803D', envoyee   : '#1D4ED8',
    en_retard : '#DC2626', brouillon : '#6B7280', annulee: '#9CA3AF',
  };
  const statutLabels = {
    payee:'Payée', envoyee:'Envoyée', en_retard:'En retard',
    brouillon:'Brouillon', annulee:'Annulée',
  };
  const statColor = statutColors[f.statut] || '#6B7280';
  const statLabel = statutLabels[f.statut] || f.statut;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture ${f.numero} — TransitFlow</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      padding: 0;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 16mm 18mm;
      position: relative;
    }

    /* ── EN-TÊTE ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 3px solid #1E3A5F;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-mark {
      width: 44px; height: 44px;
      background: #F97316;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; color: #fff; font-weight: 900;
    }
    .brand-name { font-size: 22px; font-weight: 900; color: #1E3A5F; }
    .brand-sub  { font-size: 10px; color: #6B7280; letter-spacing: .1em; text-transform: uppercase; margin-top: 2px; }

    .header-right { text-align: right; }
    .fac-title { font-size: 28px; font-weight: 900; color: #1E3A5F; letter-spacing: -1px; }
    .fac-num   { font-size: 13px; color: #6B7280; margin-top: 4px; }
    .fac-statut {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: ${statColor};
      border: 1.5px solid ${statColor};
    }

    /* ── INFOS FACTURE + CLIENT ── */
    .info-row {
      display: flex;
      gap: 40px;
      margin-bottom: 28px;
    }
    .info-block { flex: 1; }
    .info-lbl {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #9CA3AF;
      margin-bottom: 6px;
    }
    .info-name { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .info-sub  { font-size: 12px; color: #6B7280; line-height: 1.6; }

    .dates-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      background: #F3F4F6;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    .date-item-lbl { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 3px; }
    .date-item-val { font-size: 13px; font-weight: 600; color: #111827; }

    /* ── TABLE LIGNES ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    thead th {
      background: #1E3A5F;
      color: #fff;
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .05em;
    }
    thead th:not(:first-child) { text-align: right; }
    tbody td {
      padding: 11px 14px;
      border-bottom: 1px solid #E5E7EB;
      font-size: 12px;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) td { background: #F9FAFB; }

    /* ── TOTAUX ── */
    .totaux {
      width: 280px;
      margin-left: auto;
      margin-bottom: 28px;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
      color: #374151;
      border-bottom: 1px solid #F3F4F6;
    }
    .tot-row.ht   { font-weight: 600; color: #111827; }
    .tot-row.ttc  {
      font-size: 15px; font-weight: 900;
      color: #1E3A5F;
      border-top: 2px solid #1E3A5F;
      border-bottom: none;
      margin-top: 6px;
      padding-top: 10px;
    }

    /* ── NOTES ── */
    .notes-block {
      background: #FFF7ED;
      border-left: 4px solid #F97316;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin-bottom: 28px;
      font-size: 12px;
      color: #374151;
      line-height: 1.6;
    }
    .notes-lbl { font-weight: 700; color: #F97316; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }

    /* ── PIED DE PAGE ── */
    .footer {
      position: absolute;
      bottom: 16mm;
      left: 18mm; right: 18mm;
      border-top: 1px solid #E5E7EB;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #9CA3AF;
    }
    .footer-brand { font-weight: 700; color: #1E3A5F; }

    /* ── PRINT ── */
    @media print {
      body { padding: 0; }
      .page { width: 100%; padding: 12mm 14mm; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- EN-TÊTE -->
  <div class="header">
    <div class="brand">
      <div class="brand-mark">T</div>
      <div>
        <p class="brand-name">TransitFlow</p>
        <p class="brand-sub">ERP Logistique</p>
      </div>
    </div>
    <div class="header-right">
      <p class="fac-title">FACTURE</p>
      <p class="fac-num">${escH(f.numero)}</p>
      <span class="fac-statut">${statLabel}</span>
    </div>
  </div>

  <!-- INFOS -->
  <div class="info-row">
    <div class="info-block">
      <p class="info-lbl">Émetteur</p>
      <p class="info-name">TransitFlow ERP</p>
      <p class="info-sub">Douala, Cameroun<br/>contact@transitflow.cm</p>
    </div>
    <div class="info-block">
      <p class="info-lbl">Facturé à</p>
      <p class="info-name">${escH(f.clientNom)}</p>
      <p class="info-sub">${f.dossierNumero ? 'Dossier : ' + escH(f.dossierNumero) : 'Client direct'}</p>
    </div>
  </div>

  <!-- DATES -->
  <div class="dates-grid">
    <div>
      <p class="date-item-lbl">Date d'émission</p>
      <p class="date-item-val">${formatD(f.dateEmission)}</p>
    </div>
    <div>
      <p class="date-item-lbl">Date d'échéance</p>
      <p class="date-item-val">${formatD(f.dateEcheance)}</p>
    </div>
    <div>
      <p class="date-item-lbl">TVA applicable</p>
      <p class="date-item-val">${f.tauxTva || 19.25} %</p>
    </div>
  </div>

  <!-- LIGNES -->
  <table>
    <thead>
      <tr>
        <th style="width:50%">Description</th>
        <th style="width:10%;text-align:center">Qté</th>
        <th style="width:20%">Prix unitaire</th>
        <th style="width:20%">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignes || '<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:20px">Aucune ligne</td></tr>'}
    </tbody>
  </table>

  <!-- TOTAUX -->
  <div class="totaux">
    <div class="tot-row ht">
      <span>Sous-total HT</span>
      <span>${fmt(f.montantHT)}</span>
    </div>
    <div class="tot-row">
      <span>TVA (${f.tauxTva || 19.25}%)</span>
      <span>${fmt(f.montantTva)}</span>
    </div>
    <div class="tot-row ttc">
      <span>Total TTC</span>
      <span>${fmt(f.montantTTC)}</span>
    </div>
  </div>

  ${f.notes ? `
  <!-- NOTES -->
  <div class="notes-block">
    <p class="notes-lbl">Conditions de paiement</p>
    <p>${escH(f.notes)}</p>
  </div>` : ''}

  <!-- PIED DE PAGE -->
  <div class="footer">
    <span class="footer-brand">TransitFlow ERP Logistique</span>
    <span>Facture ${escH(f.numero)} · Générée le ${new Date().toLocaleDateString('fr-FR')}</span>
    <span>Douala, Cameroun</span>
  </div>

</div>
</body>
</html>`;
}

/* ── UTILITAIRES ── */
function fmt(v)      { if (!v && v!==0) return '—'; return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA'; }
function formatD(iso){ if (!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function escH(s)     { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function showToast(msg, type='info') {
  const existing = document.querySelector('.tf-toast'); if(existing) existing.remove();
  const t = document.createElement('div');
  t.className = `tf-toast tf-toast-${type}`;
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  t.innerHTML = `<i class="fa-solid ${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(),300); }, 3500);
}
