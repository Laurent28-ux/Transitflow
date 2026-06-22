-- ═══════════════════════════════════════════════════
--  TransitFlow · Ajout table MISSIONS (Affectation Livraisons)
--  Coller dans : Supabase Dashboard > SQL Editor
--  (À exécuter après schema.sql et schema_dossiers.sql)
-- ═══════════════════════════════════════════════════

-- ── TABLE MISSIONS ─────────────────────────────────
create table if not exists public.missions (
  id               bigint generated always as identity primary key,
  numero           text not null unique,           -- Ex: MIS-001
  dossier_id       bigint references public.dossiers(id) on delete set null,
  chauffeur_id     bigint references public.chauffeurs(id) on delete set null,
  vehicule_id      bigint references public.vehicules(id) on delete set null,
  date_prevue      date not null,
  statut           text not null default 'planifie'
                   check (statut in ('planifie','en_cours','termine','annule')),
  notes            text,
  date_creation    date not null default current_date,
  created_at       timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────
alter table public.missions enable row level security;

create policy "Authentifié — lecture" on public.missions
  for select using (auth.role() = 'authenticated');

create policy "Authentifié — écriture" on public.missions
  for all using (auth.role() = 'authenticated');

-- ── INDEX ──────────────────────────────────────────
create index if not exists idx_missions_numero      on public.missions(numero);
create index if not exists idx_missions_dossier_id  on public.missions(dossier_id);
create index if not exists idx_missions_chauffeur_id on public.missions(chauffeur_id);
create index if not exists idx_missions_statut      on public.missions(statut);

-- ── DONNÉES DE DÉMONSTRATION ───────────────────────
-- Nécessite que dossiers, chauffeurs et véhicules existent
insert into public.missions (numero, dossier_id, chauffeur_id, vehicule_id, date_prevue, statut, notes)
select
  'MIS-001',
  (select id from public.dossiers where numero = 'TR-001' limit 1),
  (select id from public.chauffeurs limit 1 offset 0),
  (select id from public.vehicules  where status = 'en_mission' limit 1),
  current_date + 2,
  'en_cours',
  'Livraison urgente — client prioritaire'
where exists (select 1 from public.dossiers where numero = 'TR-001')
on conflict do nothing;

insert into public.missions (numero, dossier_id, chauffeur_id, vehicule_id, date_prevue, statut, notes)
select
  'MIS-002',
  (select id from public.dossiers where numero = 'TR-002' limit 1),
  (select id from public.chauffeurs limit 1 offset 1),
  (select id from public.vehicules  where status = 'disponible' limit 1),
  current_date + 5,
  'planifie',
  'Prévue la semaine prochaine'
where exists (select 1 from public.dossiers where numero = 'TR-002')
on conflict do nothing;

insert into public.missions (numero, dossier_id, chauffeur_id, vehicule_id, date_prevue, statut, notes)
select
  'MIS-003',
  (select id from public.dossiers where numero = 'TR-003' limit 1),
  (select id from public.chauffeurs limit 1 offset 0),
  (select id from public.vehicules  limit 1 offset 2),
  current_date - 3,
  'termine',
  'Terminée sans incident'
where exists (select 1 from public.dossiers where numero = 'TR-003')
on conflict do nothing;
