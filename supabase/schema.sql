-- =====================================================================
-- Hangeul Global Learning Center — database schema
-- Run this in Supabase → SQL Editor (once, on a fresh project).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type course_track as enum ('korean', 'english');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_mode as enum ('online', 'offline', 'hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('pending_payment', 'active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_provider as enum ('sslcommerz', 'stripe', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  -- initiated  : gateway session created, user redirected
  -- pending_review : manual transfer submitted, waiting on admin
  -- paid       : money confirmed
  -- failed / cancelled / refunded : self explanatory
  create type payment_status as enum ('initiated', 'pending_review', 'paid', 'failed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- auto-create a profile row whenever someone signs up
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
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  track           course_track not null,
  title_en        text not null,
  title_ko        text not null,
  summary_en      text not null default '',
  summary_ko      text not null default '',
  description_en  text not null default '',
  description_ko  text not null default '',
  level           text not null default '',           -- e.g. 'Beginner (A1)', 'TOPIK I'
  outcomes_en     text[] not null default '{}',
  outcomes_ko     text[] not null default '{}',
  duration_weeks  int not null default 12,
  hours_per_week  numeric(4,1) not null default 4.0,
  price_bdt       numeric(10,2) not null default 0,
  price_usd       numeric(10,2) not null default 0,
  sort_order      int not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- batches — a course runs many times; online vs offline lives here
-- ---------------------------------------------------------------------
create table if not exists public.batches (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  name          text not null,                         -- 'Batch 14 — Morning'
  mode          delivery_mode not null default 'offline',
  start_date    date not null,
  end_date      date,
  schedule_text text not null default '',              -- 'Sat/Mon/Wed · 7:00–9:00 PM'
  room_or_link  text not null default '',              -- classroom no. or meeting link
  seats_total   int not null default 20,
  seats_taken   int not null default 0,
  is_open       boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists batches_course_idx on public.batches(course_id);

-- ---------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------
create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete restrict,
  batch_id    uuid references public.batches(id) on delete set null,
  status      enrollment_status not null default 'pending_payment',
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- one live enrollment per user per batch
  unique (user_id, batch_id)
);

create index if not exists enrollments_user_idx on public.enrollments(user_id);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid not null references public.enrollments(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       payment_provider not null,
  status         payment_status not null default 'initiated',
  amount         numeric(10,2) not null,
  currency       text not null default 'BDT',
  -- our own reference, sent to the gateway and echoed back
  tran_id        text unique not null,
  -- gateway's id: val_id (SSLCommerz), session id (Stripe), trx id (bKash slip)
  provider_ref   text,
  sender_number  text,                                  -- manual transfers only
  meta           jsonb not null default '{}'::jsonb,
  verified_at    timestamptz,
  verified_by    uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists payments_enrollment_idx on public.payments(enrollment_id);
create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);

-- ---------------------------------------------------------------------
-- contact form messages
-- ---------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text not null default '',
  subject    text not null default '',
  message    text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at touch trigger
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_enrollments on public.enrollments;
create trigger touch_enrollments before update on public.enrollments
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_payments on public.payments;
create trigger touch_payments before update on public.payments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.courses          enable row level security;
alter table public.batches          enable row level security;
alter table public.enrollments      enable row level security;
alter table public.payments         enable row level security;
alter table public.contact_messages enable row level security;

-- helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- profiles ------------------------------------------------------------
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- courses / batches are public catalogue data ------------------------
drop policy if exists "courses: public read" on public.courses;
create policy "courses: public read" on public.courses
  for select using (is_active or public.is_admin());

drop policy if exists "batches: public read" on public.batches;
create policy "batches: public read" on public.batches
  for select using (true);

-- enrollments ---------------------------------------------------------
drop policy if exists "enrollments: read own" on public.enrollments;
create policy "enrollments: read own" on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments: insert own" on public.enrollments;
create policy "enrollments: insert own" on public.enrollments
  for insert with check (user_id = auth.uid());

drop policy if exists "enrollments: cancel own" on public.enrollments;
create policy "enrollments: cancel own" on public.enrollments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- payments ------------------------------------------------------------
-- Students may read their own rows and create a row, but NEVER flip a
-- status to 'paid' — that only happens through the service-role key in
-- gateway callbacks / admin approval.
drop policy if exists "payments: read own" on public.payments;
create policy "payments: read own" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payments: insert own" on public.payments;
create policy "payments: insert own" on public.payments
  for insert with check (
    user_id = auth.uid()
    and status in ('initiated', 'pending_review')
  );

-- no student UPDATE policy on payments — intentional.

-- contact messages: anyone may write, only admins may read ------------
drop policy if exists "contact: anyone insert" on public.contact_messages;
create policy "contact: anyone insert" on public.contact_messages
  for insert with check (true);

drop policy if exists "contact: admin read" on public.contact_messages;
create policy "contact: admin read" on public.contact_messages
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- Seat counter — keeps batches.seats_taken honest
-- ---------------------------------------------------------------------
create or replace function public.sync_batch_seats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.batch_id is not null and new.status = 'active' then
      update public.batches set seats_taken = seats_taken + 1 where id = new.batch_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if coalesce(old.status::text,'') <> 'active' and new.status = 'active' and new.batch_id is not null then
      update public.batches set seats_taken = seats_taken + 1 where id = new.batch_id;
    elsif old.status = 'active' and new.status <> 'active' and old.batch_id is not null then
      update public.batches set seats_taken = greatest(seats_taken - 1, 0) where id = old.batch_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'active' and old.batch_id is not null then
      update public.batches set seats_taken = greatest(seats_taken - 1, 0) where id = old.batch_id;
    end if;
  end if;
  return null;
end; $$;

drop trigger if exists sync_seats on public.enrollments;
create trigger sync_seats
  after insert or update or delete on public.enrollments
  for each row execute function public.sync_batch_seats();
