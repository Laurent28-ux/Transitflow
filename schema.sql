-- ═══════════════════════════════════════════════════
--  TransitFlow · Schéma Supabase — Étape 8
--  Coller dans : Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════

-- ── Extension UUID (déjà active sur Supabase) ──
create extension if not exists "uuid-ossp";

-- ── VÉHICULES ──────────────────────────────────
create table if not exists public.vehicules (
  id              bigint generated always as identity primary key,
  plaque          text not null unique,
  type            text not null default 'Camion 10T',
  status          text not null default 'disponible'
                  check (status in ('disponible','en_mission','maintenance')),
  km              int  not null default 0,
  km_entretien    int  not null default 50000,
  chauffeur_id    bigint,
  created_at      timestamptz not null default now()
);

-- ── CHAUFFEURS ─────────────────────────────────
create table if not exists public.chauffeurs (
  id              bigint generated always as identity primary key,
  prenom          text not null,
  nom             text not null,
  tel             text,
  permis          text,
  experience      int  not null default 0,
  status          text not null default 'disponible'
                  check (status in ('disponible','en_mission','conge')),
  vehicule_id     bigint references public.vehicules(id) on delete set null,
  date_embauche   date not null default current_date,
  created_at      timestamptz not null default now()
);

-- Clé étrangère inverse véhicule → chauffeur
alter table public.vehicules
  add constraint fk_vehicules_chauffeur
  foreign key (chauffeur_id) references public.chauffeurs(id) on delete set null;

-- ── CLIENTS ────────────────────────────────────
create table if not exists public.clients (
  id              bigint generated always as identity primary key,
  nom             text not null,
  type            text not null default 'Entreprise',
  tel             text,
  email           text,
  ville           text,
  status          text not null default 'active'
                  check (status in ('active','inactive')),
  date_creation   date not null default current_date,
  created_at      timestamptz not null default now()
);

-- ── COLIS ──────────────────────────────────────
create table if not exists public.colis (
  id              bigint generated always as identity primary key,
  ref             text not null unique,
  client          text not null,
  origine         text not null,
  destination     text not null,
  poids           numeric not null default 0,
  prix            numeric not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending','transit','port','delivered')),
  date            date not null default current_date,
  description     text,
  created_at      timestamptz not null default now()
);

-- ── DOCUMENTS ──────────────────────────────────
create table if not exists public.documents (
  id              bigint generated always as identity primary key,
  nom             text not null,
  type            text not null default 'pdf'
                  check (type in ('facture','douane','livraison','contrat','pdf','autre')),
  taille          text,
  date            date not null default current_date,
  colis_ref       text references public.colis(ref) on delete set null,
  description     text,
  storage_path    text,
  created_at      timestamptz not null default now()
);

-- ══════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  Seuls les utilisateurs authentifiés ont accès
-- ══════════════════════════════════════════════
alter table public.vehicules  enable row level security;
alter table public.chauffeurs enable row level security;
alter table public.clients    enable row level security;
alter table public.colis      enable row level security;
alter table public.documents  enable row level security;

-- Politique : lecture pour tous les utilisateurs connectés
create policy "Authentifié — lecture" on public.vehicules
  for select using (auth.role() = 'authenticated');
create policy "Authentifié — lecture" on public.chauffeurs
  for select using (auth.role() = 'authenticated');
create policy "Authentifié — lecture" on public.clients
  for select using (auth.role() = 'authenticated');
create policy "Authentifié — lecture" on public.colis
  for select using (auth.role() = 'authenticated');
create policy "Authentifié — lecture" on public.documents
  for select using (auth.role() = 'authenticated');

-- Politique : écriture complète pour les utilisateurs connectés
create policy "Authentifié — écriture" on public.vehicules
  for all using (auth.role() = 'authenticated');
create policy "Authentifié — écriture" on public.chauffeurs
  for all using (auth.role() = 'authenticated');
create policy "Authentifié — écriture" on public.clients
  for all using (auth.role() = 'authenticated');
create policy "Authentifié — écriture" on public.colis
  for all using (auth.role() = 'authenticated');
create policy "Authentifié — écriture" on public.documents
  for all using (auth.role() = 'authenticated');

-- ══════════════════════════════════════════════
--  DONNÉES INITIALES (facultatif)
-- ══════════════════════════════════════════════
insert into public.clients (nom,type,tel,email,ville,status) values
  ('Maisons KOTTO','Entreprise','+237 699 001 001','kotto@mail.cm','Douala','active'),
  ('Société NGOM','PME','+237 677 002 002','ngom@transit.cm','Yaoundé','active'),
  ('Transit BIYA','Entreprise','+237 655 003 003','biya@transit.cm','Douala','active'),
  ('CAMPORT SARL','Entreprise','+237 699 005 005','camport@sarl.cm','Douala','active'),
  ('Alpha Shipping','Entreprise','+237 699 009 009','alpha@shipping.cm','Limbé','active')
on conflict do nothing;

insert into public.vehicules (plaque,type,status,km,km_entretien) values
  ('LT-4821-CM','Camion 10T','en_mission',234500,250000),
  ('DL-2230-CM','Fourgon 5T','disponible',189200,200000),
  ('YD-0091-CM','Camion 15T','disponible',310800,320000),
  ('KM-3310-CM','Semi-remorque','en_mission',445600,460000),
  ('DL-7701-CM','Véhicule léger','maintenance',98300,100000)
on conflict do nothing;
