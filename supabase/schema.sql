-- ============================================================================
-- ruhaforgó – adatbázis séma (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Futtasd le a Supabase projektedben: Dashboard → SQL Editor → New query →
-- másold be ezt az egészet → Run.  Idempotens, többször is lefuttatható.
--
-- Modell:
--   * auth.users            – Supabase Auth kezeli (e-mail/jelszó regisztráció)
--   * public.profiles       – felhasználói adatok + szerep (customer | admin)
--   * public.point_transactions – MINDEN pontmozgás egy-egy sor (ledger):
--                                 delta > 0  → jóváírás (behozott ruha után)
--                                 delta < 0  → levonás  (vásárláskor beváltva)
--   * public.user_point_balances – nézet: aktuális egyenleg = SUM(delta)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'customer'
             check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Regisztrált felhasználók profilja; 1:1 az auth.users-szel.';

-- ---------------------------------------------------------------------------
-- 2. POINT TRANSACTIONS (ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.point_transactions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  delta      integer not null,                 -- + jóváírás / - levonás
  reason     text,                             -- pl. "Levi's farmerdzseki", "Vásárlás 2026-07-08"
  created_by uuid references public.profiles (id),  -- ki rögzítette (admin)
  created_at timestamptz not null default now(),
  constraint delta_not_zero check (delta <> 0)
);

comment on table public.point_transactions is 'Pontmozgások naplója; az egyenleg ezek összege.';

create index if not exists point_transactions_user_id_idx
  on public.point_transactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. HELPER: is_admin()  (SECURITY DEFINER, hogy ne legyen RLS-rekurzió)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. EGYENLEG NÉZET  (security_invoker → az RLS a hívóra érvényes)
-- ---------------------------------------------------------------------------
create or replace view public.user_point_balances
with (security_invoker = on) as
  select
    p.id                          as user_id,
    coalesce(sum(t.delta), 0)::int as balance
  from public.profiles p
  left join public.point_transactions t on t.user_id = p.id
  group by p.id;

-- ---------------------------------------------------------------------------
-- 5. ÚJ FELHASZNÁLÓ → automatikus profil létrehozása
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. SZEREP-VÉDELEM: ügyfél ne tudja saját magát adminná tenni
-- ---------------------------------------------------------------------------
create or replace function public.protect_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Csak admin változtathat szerepet';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_role_change();

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.point_transactions enable row level security;

-- profiles: mindenki a sajátját látja, admin mindenkiét
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- profiles: saját profil frissítése (a role-t a 6. pont trigger védi), admin bárkit
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- point_transactions: saját mozgások olvashatók, admin mindet látja
drop policy if exists tx_select on public.point_transactions;
create policy tx_select on public.point_transactions
  for select using (user_id = auth.uid() or public.is_admin());

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
-- KÉSZ.  Miután Tündi regisztrált az appban, tedd adminná (cseréld ki az e-mailt):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'tundi@example.com');
-- ============================================================================
