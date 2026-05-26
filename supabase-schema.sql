-- Safe idempotent migration for SD Driver app
-- Run in: https://supabase.com/dashboard/project/pzrgqscjbviufbbdxhyj/sql/new
-- Uses DROP POLICY IF EXISTS before CREATE, and CREATE TABLE IF NOT EXISTS
-- Does NOT touch any customer tables that already exist

-- ─────────────────────────────────────────────
-- DRIVERS
-- ─────────────────────────────────────────────
create table if not exists public.drivers (
  id                   text primary key,
  name                 text not null,
  email                text not null unique,
  phone                text not null,
  password_hash        text not null,
  vehicle_type         text not null check (vehicle_type in ('car','van','motorcycle')),
  vehicle_registration text not null,
  vehicle_photo_uri    text,
  status               text not null default 'pending' check (status in ('pending','verified','suspended')),
  is_online            boolean not null default false,
  created_at           timestamptz not null default now()
);

alter table public.drivers enable row level security;

drop policy if exists "drivers_all" on public.drivers;
create policy "drivers_all" on public.drivers for all using (true) with check (true);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id                text primary key,
  pickup_address    text not null,
  delivery_address  text not null,
  distance          text not null,
  payout            numeric(10,2) not null,
  package_type      text not null,
  customer_phone    text not null,
  package_id        text not null,
  delivery_notes    text not null default '',
  pin               text not null,
  status            text not null default 'pending'
                    check (status in ('pending','driver_assigned','package_collected','en_route','arriving','delivered','cancelled')),
  driver_id         text references public.drivers(id),
  created_at        timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders_all" on public.orders;
create policy "orders_all" on public.orders for all using (true) with check (true);

-- Enable realtime (safe to run even if already added)
do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception when others then
    null; -- already in publication, ignore
  end;
end $$;

-- ─────────────────────────────────────────────
-- DELIVERIES (completed delivery history)
-- ─────────────────────────────────────────────
create table if not exists public.deliveries (
  id               text primary key default gen_random_uuid()::text,
  order_id         text not null references public.orders(id),
  driver_id        text not null references public.drivers(id),
  pickup_address   text not null,
  delivery_address text not null,
  distance         text not null,
  amount           numeric(10,2) not null,
  duration_minutes integer not null,
  route            text not null,
  completed_at     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.deliveries enable row level security;

drop policy if exists "deliveries_all" on public.deliveries;
create policy "deliveries_all" on public.deliveries for all using (true) with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.deliveries;
  exception when others then
    null;
  end;
end $$;

-- ─────────────────────────────────────────────
-- SEED — 5 pending Belfast orders (skip duplicates)
-- ─────────────────────────────────────────────

on conflict (id) do nothing;
