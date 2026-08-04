-- =====================================================================
-- Admin dashboard support.
-- Run AFTER schema.sql and seed.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- site_settings — everything editable from the dashboard that is not a
-- course or a batch: contact details, payment accounts, homepage copy.
-- One row per setting, bilingual, grouped for the editor UI.
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  key         text primary key,
  value_en    text not null default '',
  value_ko    text not null default '',
  group_name  text not null default 'general',
  label       text not null default '',
  hint        text not null default '',
  is_long     boolean not null default false,   -- render a textarea
  bilingual   boolean not null default true,    -- false = single value (phone, URL)
  sort_order  int not null default 100,
  updated_at  timestamptz not null default now()
);

drop trigger if exists touch_site_settings on public.site_settings;
create trigger touch_site_settings before update on public.site_settings
  for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "settings: public read" on public.site_settings;
create policy "settings: public read" on public.site_settings
  for select using (true);

drop policy if exists "settings: admin write" on public.site_settings;
create policy "settings: admin write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Default settings. `on conflict do nothing` keeps edited values intact
-- when this file is re-run.
-- ---------------------------------------------------------------------
insert into public.site_settings
  (key, value_en, value_ko, group_name, label, hint, is_long, bilingual, sort_order)
values
  -- contact ----------------------------------------------------------
  ('contact_phone', '+880 1XXX-XXXXXX', '', 'contact', 'Phone number', 'Shown in the header, footer and contact page.', false, false, 10),
  ('contact_whatsapp', '', '', 'contact', 'WhatsApp number', 'Optional. Digits with country code, e.g. 8801XXXXXXXXX.', false, false, 15),
  ('contact_email', 'info@hangeulglobal.com', '', 'contact', 'Email address', '', false, false, 20),
  ('address', 'Dhaka, Bangladesh', '방글라데시 다카', 'contact', 'Street address', 'Full address as you want it printed.', true, true, 30),
  ('opening_hours', 'Saturday–Thursday · 9:00 AM – 8:30 PM · Friday closed', '토–목 · 오전 9:00 – 오후 8:30 · 금요일 휴무', 'contact', 'Opening hours', '', false, true, 40),
  ('maps_url', 'https://www.google.com/maps/place/Hangeul+Global+Learning+Center/@23.7488382,90.3774251,17z', '', 'contact', 'Google Maps link', 'The "Share" link from your Google Maps listing.', false, false, 50),
  ('facebook_url', '', '', 'contact', 'Facebook page', 'Optional.', false, false, 60),

  -- payment ----------------------------------------------------------
  ('bkash_number', '', '', 'payment', 'bKash number', 'Personal or merchant number students send fees to.', false, false, 10),
  ('nagad_number', '', '', 'payment', 'Nagad number', '', false, false, 20),
  ('bank_details', '', '', 'payment', 'Bank account details', 'Bank name, account name, account number, branch.', true, false, 30),
  ('payment_note', 'Send the exact course fee, then enter the transaction ID below.', '정확한 수강료를 송금한 뒤 아래에 거래번호를 입력하세요.', 'payment', 'Note on the checkout page', '', true, true, 40),

  -- homepage ---------------------------------------------------------
  ('home_eyebrow', 'Dhaka · On campus & online', '다카 · 현장 수업 및 온라인', 'home', 'Small label above the headline', '', false, true, 10),
  ('home_title', '', '', 'home', 'Homepage headline', 'Leave empty to use the built-in wording.', true, true, 20),
  ('home_body', '', '', 'home', 'Homepage intro paragraph', 'Leave empty to use the built-in wording.', true, true, 30),
  ('tagline', 'Korean & English, taught properly — in Dhaka and online.', '제대로 가르치는 한국어와 영어 — 다카 현장 수업과 온라인.', 'home', 'Footer tagline', '', true, true, 40),
  ('announcement', '', '', 'home', 'Announcement bar', 'Shown as a strip at the top of every page. Leave empty to hide it.', true, true, 50)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Admin write policies on the existing tables. Server actions use the
-- service-role key, which bypasses RLS anyway; these exist so an admin
-- signed in through the dashboard is never blocked by policy either.
-- ---------------------------------------------------------------------
drop policy if exists "courses: admin write" on public.courses;
create policy "courses: admin write" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "batches: admin write" on public.batches;
create policy "batches: admin write" on public.batches
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "enrollments: admin write" on public.enrollments;
create policy "enrollments: admin write" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "payments: admin write" on public.payments;
create policy "payments: admin write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles: admin write" on public.profiles;
create policy "profiles: admin write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contact: admin write" on public.contact_messages;
create policy "contact: admin write" on public.contact_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Dashboard counters in one round trip.
-- ---------------------------------------------------------------------
create or replace function public.admin_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'students',            (select count(*) from public.profiles),
    'courses',             (select count(*) from public.courses where is_active),
    'open_batches',        (select count(*) from public.batches where is_open),
    'active_enrolments',   (select count(*) from public.enrollments where status = 'active'),
    'pending_enrolments',  (select count(*) from public.enrollments where status = 'pending_payment'),
    'payments_to_review',  (select count(*) from public.payments where status = 'pending_review'),
    'unread_messages',     (select count(*) from public.contact_messages where not handled),
    'revenue_bdt',         (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and currency = 'BDT'),
    'revenue_usd',         (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and currency = 'USD'),
    'revenue_bdt_30d',     (select coalesce(sum(amount), 0) from public.payments
                              where status = 'paid' and currency = 'BDT'
                                and created_at > now() - interval '30 days')
  );
$$;

revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated, service_role;
