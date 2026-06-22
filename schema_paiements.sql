-- ═══════════════════════════════════════════════════
--  TransitFlow · Ajout table PAIEMENTS
--  Coller dans : Supabase Dashboard > SQL Editor
--  (À exécuter après schema_factures.sql)
-- ═══════════════════════════════════════════════════

create table if not exists public.paiements (
  id               bigint generated always as identity primary key,
  reference        text not null unique,           -- Ex: PAY-001
  facture_id       bigint references public.factures(id) on delete set null,
  montant          numeric not null,
  mode             text not null default 'mobile'
                   check (mode in ('mobile','virement','especes','cheque','carte')),
  date_paiement    date not null default current_date,
  ref_transaction  text,
  statut           text not null default 'confirme'
                   check (statut in ('confirme','en_attente','echoue','rembourse')),
  notes            text,
  created_at       timestamptz not null default now()
);

alter table public.paiements enable row level security;

create policy "Authentifié — lecture" on public.paiements
  for select using (auth.role() = 'authenticated');
create policy "Authentifié — écriture" on public.paiements
  for all using (auth.role() = 'authenticated');

create index if not exists idx_paiements_reference  on public.paiements(reference);
create index if not exists idx_paiements_facture_id on public.paiements(facture_id);
create index if not exists idx_paiements_statut     on public.paiements(statut);

-- ── DONNÉES DE DÉMONSTRATION ───────────────────────
insert into public.paiements (reference, facture_id, montant, mode, date_paiement, ref_transaction, statut, notes)
select 'PAY-001', id, montant_ttc, 'virement', current_date - 25, 'VIR-2026-001', 'confirme', 'Virement reçu intégralement'
from public.factures where numero = 'FAC-001' limit 1
on conflict do nothing;

insert into public.paiements (reference, facture_id, montant, mode, date_paiement, ref_transaction, statut, notes)
select 'PAY-002', id, 150000, 'mobile', current_date - 5, 'MTN-2026-4521', 'confirme', 'Acompte Mobile Money'
from public.factures where numero = 'FAC-002' limit 1
on conflict do nothing;

insert into public.paiements (reference, facture_id, montant, mode, date_paiement, ref_transaction, statut, notes)
select 'PAY-003', id, montant_ttc, 'mobile', current_date, 'OM-2026-8834', 'en_attente', 'En attente de confirmation Orange Money'
from public.factures where numero = 'FAC-003' limit 1
on conflict do nothing;
