-- =====================================================================
-- Invoice numbers for confirmed payments.
-- Run AFTER schema.sql / admin.sql / roles.sql / receipts.sql. Re-runnable.
-- =====================================================================

alter table public.payments
  add column if not exists invoice_no text unique;

-- A per-year counter, so invoices read HGLC-2026-0001 rather than a uuid.
create sequence if not exists public.invoice_seq;

/**
 * Assigns the next invoice number to a payment, once. Calling it again for a
 * payment that already has one returns the existing number rather than
 * burning a second — approving twice must not produce two invoices.
 */
create or replace function public.assign_invoice_no(payment uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing text;
  next_no  bigint;
  issued   text;
begin
  select invoice_no into existing from public.payments where id = payment;
  if existing is not null then
    return existing;
  end if;

  next_no := nextval('public.invoice_seq');
  issued := 'HGLC-' || to_char(now(), 'YYYY') || '-' || lpad(next_no::text, 4, '0');

  update public.payments set invoice_no = issued where id = payment;
  return issued;
end;
$$;

grant execute on function public.assign_invoice_no(uuid) to service_role;

-- ---------------------------------------------------------------------
-- A record of what we emailed, so nobody has to guess whether a student
-- was told about their payment.
-- ---------------------------------------------------------------------
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  subject     text not null,
  kind        text not null default 'general',
  payment_id  uuid references public.payments(id) on delete set null,
  ok          boolean not null default true,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists email_log_created_idx on public.email_log(created_at desc);

alter table public.email_log enable row level security;

drop policy if exists "email log: staff read" on public.email_log;
create policy "email log: staff read" on public.email_log
  for select using (public.is_staff());
