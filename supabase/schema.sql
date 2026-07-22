-- ============================================================================
-- ruhaforgó – adatbázis séma (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Futtasd le a Supabase projektedben: Dashboard → SQL Editor → New query →
-- másold be ezt az egészet → Run.  Idempotens, többször is lefuttatható, és
-- NEM töröl adatot.
--
-- Modell:
--   * public.profiles       – MINDEN vásárló, akár van fiókja, akár nincs.
--                             Tündi hozza létre az admin felületen.
--                             user_id IS NULL → nincs belépésre alkalmas fiók
--                             (telefonos vásárló), csak Tündi látja.
--   * auth.users            – Supabase Auth; csak azoknak, akiknek van e-mail
--                             címük és meghívót kaptak.  Publikus regisztráció
--                             NINCS.
--   * public.point_transactions  – MINDEN pontmozgás egy-egy sor (ledger):
--                                  delta > 0 → jóváírás (behozott ruha után)
--                                  delta < 0 → levonás  (vásárláskor beváltva)
--   * public.user_point_balances – nézet: aktuális egyenleg = SUM(delta)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users (id) on delete set null,
  full_name  text not null,
  email      text,
  phone      text,
  role       text not null default 'customer'
             check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  -- Puha törlés: NULL = aktív. Kitöltve = törölve, de az admin visszaállíthatja.
  deleted_at timestamptz,
  -- Az e-mail az elsődleges, de telefonszám is elég: e-mail nélkül a vásárló
  -- nem tud belépni, a pontjait Tündi vezeti.
  constraint profiles_email_or_phone check (email is not null or phone is not null)
);

-- Régebbi adatbázisokhoz: az oszlop utólagos felvétele (idempotens).
alter table public.profiles add column if not exists deleted_at timestamptz;

comment on table public.profiles is 'Vásárlók. user_id IS NULL → nincs belépésre alkalmas fiók, csak Tündi kezeli.';

-- Egy e-mail cím csak egy vásárlóhoz tartozhat (kis/nagybetűtől függetlenül).
create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email)) where email is not null;

-- ---------------------------------------------------------------------------
-- 2. POINT TRANSACTIONS (ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.point_transactions (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  delta      integer not null,                 -- + jóváírás / - levonás
  reason     text,                             -- pl. "Levi's farmerdzseki", "Vásárlás 2026-07-08"
  created_by uuid references public.profiles (id),  -- ki rögzítette (admin)
  created_at timestamptz not null default now(),
  constraint delta_not_zero check (delta <> 0)
);

comment on table public.point_transactions is 'Pontmozgások naplója; az egyenleg ezek összege.';

create index if not exists point_transactions_profile_id_idx
  on public.point_transactions (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. HELPEREK  (SECURITY DEFINER, hogy ne legyen RLS-rekurzió)
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles
  where user_id = auth.uid() and deleted_at is null;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. EGYENLEG NÉZET  (security_invoker → az RLS a hívóra érvényes)
-- ---------------------------------------------------------------------------
create or replace view public.user_point_balances
with (security_invoker = on) as
  select
    p.id                           as profile_id,
    coalesce(sum(t.delta), 0)::int as balance
  from public.profiles p
  left join public.point_transactions t on t.profile_id = p.id
  group by p.id;

-- ---------------------------------------------------------------------------
-- 5. RÉGI, MÁR NEM KELLŐ AUTOMATIZMUSOK ELTÁVOLÍTÁSA
-- ---------------------------------------------------------------------------
-- Régen a publikus regisztráció hozta létre a profilt egy auth.users trigger-rel.
-- Most Tündi hozza létre a profilt ELŐBB, és az auth-fiók (ha van e-mail) utólag
-- kapcsolódik hozzá – a trigger csak duplikált profilt csinálna.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- A szerep-védő trigger fölöslegessé vált: profilt csak admin írhat (7. pont).
drop trigger if exists protect_profile_role on public.profiles;
drop function if exists public.protect_role_change();

-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.point_transactions enable row level security;

-- profiles: mindenki a sajátját látja, admin mindenkiét
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());

-- profiles: írni CSAK admin tud (a vásárló nem szerkeszti magát)
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (public.is_admin());

-- point_transactions: saját mozgások olvashatók, admin mindet látja
drop policy if exists tx_select on public.point_transactions;
create policy tx_select on public.point_transactions
  for select using (
    profile_id = public.current_profile_id() or public.is_admin()
  );

-- point_transactions: CSAK admin írhat/módosíthat/törölhet
drop policy if exists tx_insert on public.point_transactions;
create policy tx_insert on public.point_transactions
  for insert with check (public.is_admin());

drop policy if exists tx_update on public.point_transactions;
create policy tx_update on public.point_transactions
  for update using (public.is_admin());

drop policy if exists tx_delete on public.point_transactions;
create policy tx_delete on public.point_transactions
  for delete using (public.is_admin());

-- ============================================================================
-- KÉSZ.
--
-- Publikus regisztráció nincs, ezért az ELSŐ admint kézzel kell felvenni.
-- Ha az auth-fiókod már létezik (mert korábban regisztráltál), csak jelöld meg:
--
--   update public.profiles set role = 'admin'
--   where user_id = (select id from auth.users where email = 'tundi@example.com');
--
-- Ha még nincs fiókja: Dashboard → Authentication → Users → Add user, majd
--
--   insert into public.profiles (user_id, full_name, email, role)
--   select id, 'Tündi', email, 'admin' from auth.users where email = 'tundi@example.com';
-- ============================================================================
