-- ═══════════════════════════════════════════════════
--  TransitFlow · Ajout table FACTURES
--  Coller dans : Supabase Dashboard > SQL Editor
--  (À exécuter après schema.sql, schema_dossiers.sql,
--   schema_missions.sql)
-- ═══════════════════════════════════════════════════

-- ── TABLE FACTURES ─────────────────────────────────
create table if not exists public.factures (
  id               bigint generated always as identity primary key,
  numero           text not null unique,           -- Ex: FAC-001
  client_id        bigint references public.clients(id) on delete set null,
  dossier_id       bigint references public.dossiers(id) on delete set null,
  date_emission    date not null default current_date,
  date_echeance    date not null,
  taux_tva         numeric not null default 19.25,
  montant_ht       numeric not null default 0,
  montant_tva      numeric not null default 0,
  montant_ttc      numeric not null default 0,
  statut           text not null default 'brouillon'
                   check (statut in ('brouillon','envoyee','payee','en_retard','annulee')),
  notes            text,
  date_creation    date not null default current_date,
  created_at       timestamptz not null default now()
);

-- ── TABLE LIGNES DE FACTURE ────────────────────────
create table if not exists public.facture_lignes (
  id           bigint generated always as identity primary key,
  facture_id   bigint not null references public.factures(id) on delete cascade,
  description  text not null,
  quantite     numeric not null default 1,
  prix_unitaire numeric not null default 0,
  montant_ht   numeric generated always as (quantite * prix_unitaire) stored,
  created_at   timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────
alter table public.factures       enable row level security;
alter table public.facture_lignes enable row level security;

create policy "Authentifié — lecture" on public.factures
  for select using (auth.role() = 'authenticated');
create policy "Authentifié — écriture" on public.factures
  for all using (auth.role() = 'authenticated');

create policy "Authentifié — lecture" on public.facture_lignes
  for select using (auth.role() = 'authenticated');
create policy "Authentifié — écriture" on public.facture_lignes
  for all using (auth.role() = 'authenticated');

-- ── INDEX ──────────────────────────────────────────
create index if not exists idx_factures_numero    on public.factures(numero);
create index if not exists idx_factures_client_id on public.factures(client_id);
create index if not exists idx_factures_statut    on public.factures(statut);
create index if not exists idx_facture_lignes_fac on public.facture_lignes(facture_id);

-- ── DONNÉES DE DÉMONSTRATION ───────────────────────
do $$
declare
  v_client1 bigint;
  v_client2 bigint;
  v_client3 bigint;
  v_dossier1 bigint;
  v_dossier2 bigint;
  v_fac1 bigint;
  v_fac2 bigint;
  v_fac3 bigint;
begin
  select id into v_client1 from public.clients where nom = 'CAMPORT SARL' limit 1;
  select id into v_client2 from public.clients where nom = 'Maisons KOTTO' limit 1;
  select id into v_client3 from public.clients where nom = 'Société NGOM'  limit 1;
  select id into v_dossier1 from public.dossiers where numero = 'TR-001' limit 1;
  select id into v_dossier2 from public.dossiers where numero = 'TR-002' limit 1;

  -- Facture 1 — Payée
  if v_client1 is not null then
    insert into public.factures
      (numero, client_id, dossier_id, date_emission, date_echeance, taux_tva,
       montant_ht, montant_tva, montant_ttc, statut, notes)
    values
      ('FAC-001', v_client1, v_dossier1, current_date - 30, current_date - 2,
       19.25, 420000, 80850, 500850, 'payee',
       'Paiement reçu par virement bancaire')
    returning id into v_fac1;

    insert into public.facture_lignes (facture_id, description, quantite, prix_unitaire) values
      (v_fac1, 'Frais de transit international', 1, 300000),
      (v_fac1, 'Dédouanement et formalités', 1, 80000),
      (v_fac1, 'Transport Douala - livraison finale', 1, 40000);
  end if;

  -- Facture 2 — Envoyée
  if v_client2 is not null then
    insert into public.factures
      (numero, client_id, dossier_id, date_emission, date_echeance, taux_tva,
       montant_ht, montant_tva, montant_ttc, statut, notes)
    values
      ('FAC-002', v_client2, v_dossier2, current_date - 10, current_date + 20,
       19.25, 252100, 48529, 300629, 'envoyee',
       'Paiement attendu sous 30 jours')
    returning id into v_fac2;

    insert into public.facture_lignes (facture_id, description, quantite, prix_unitaire) values
      (v_fac2, 'Frais de transit Turquie-Cameroun', 1, 200000),
      (v_fac2, 'Assurance marchandise', 1, 32100),
      (v_fac2, 'Manutention et stockage', 3, 6666);
  end if;

  -- Facture 3 — En retard
  if v_client3 is not null then
    insert into public.factures
      (numero, client_id, dossier_id, date_emission, date_echeance, taux_tva,
       montant_ht, montant_tva, montant_ttc, statut, notes)
    values
      ('FAC-003', v_client3, null, current_date - 45, current_date - 15,
       19.25, 167364, 32218, 199582, 'en_retard',
       'Relance envoyée le 01/06/2026')
    returning id into v_fac3;

    insert into public.facture_lignes (facture_id, description, quantite, prix_unitaire) values
      (v_fac3, 'Prestations logistiques France-Yaoundé', 1, 150000),
      (v_fac3, 'Frais de manutention', 2, 8682);
  end if;
end $$;
