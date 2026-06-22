-- ═══════════════════════════════════════════════════
--  TransitFlow · Ajout table DOSSIERS DE TRANSIT
--  Coller dans : Supabase Dashboard > SQL Editor
--  (À exécuter après le schema.sql initial)
-- ═══════════════════════════════════════════════════

-- ── TABLE DOSSIERS ─────────────────────────────────
create table if not exists public.dossiers (
  id              bigint generated always as identity primary key,
  numero          text not null unique,          -- Ex: TR-001
  client_id       bigint references public.clients(id) on delete set null,
  description     text not null,                 -- Nature de la marchandise
  origine         text not null,                 -- Pays/ville d'origine
  destination     text not null,                 -- Pays/ville de destination
  statut          text not null default 'cree'
                  check (statut in ('cree','transit','livraison','livre','cloture')),
  notes           text,
  date_creation   date not null default current_date,
  created_at      timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────
alter table public.dossiers enable row level security;

create policy "Authentifié — lecture" on public.dossiers
  for select using (auth.role() = 'authenticated');

create policy "Authentifié — écriture" on public.dossiers
  for all using (auth.role() = 'authenticated');

-- ── INDEX pour recherche rapide ────────────────────
create index if not exists idx_dossiers_numero    on public.dossiers(numero);
create index if not exists idx_dossiers_client_id on public.dossiers(client_id);
create index if not exists idx_dossiers_statut    on public.dossiers(statut);

-- ── DONNÉES DE DÉMONSTRATION ───────────────────────
-- (Nécessite que les clients existent déjà)
insert into public.dossiers (numero, client_id, description, origine, destination, statut, notes)
select 'TR-001', id, 'Matériel informatique', 'Chine', 'Douala', 'transit',
       'Conteneur 40 pieds — départ Shanghai 10/06'
from public.clients where nom = 'CAMPORT SARL' limit 1
on conflict do nothing;

insert into public.dossiers (numero, client_id, description, origine, destination, statut, notes)
select 'TR-002', id, 'Vêtements et textiles', 'Turquie', 'Douala', 'livraison',
       'Arrivée port Douala prévue le 18/06'
from public.clients where nom = 'Maisons KOTTO' limit 1
on conflict do nothing;

insert into public.dossiers (numero, client_id, description, origine, destination, statut, notes)
select 'TR-003', id, 'Équipements industriels', 'France', 'Yaoundé', 'livre',
       'Livraison effectuée le 05/06/2026'
from public.clients where nom = 'Société NGOM' limit 1
on conflict do nothing;

insert into public.dossiers (numero, client_id, description, origine, destination, statut, notes)
select 'TR-004', id, 'Produits alimentaires', 'Côte d''Ivoire', 'Douala', 'cree',
       'En attente de confirmation douanière'
from public.clients where nom = 'Alpha Shipping' limit 1
on conflict do nothing;
