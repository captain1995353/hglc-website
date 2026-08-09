-- =====================================================================
-- Dashboard language preference.
--
-- Stored on the profile rather than in a cookie so it follows a teacher
-- between the office machine and their own laptop.
--
-- Run AFTER roles.sql. Safe to re-run.
-- =====================================================================

do $$ begin
  create type dashboard_locale as enum ('en', 'ko');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists dashboard_locale dashboard_locale not null default 'en';
