-- =====================================================================
-- Payment receipts: a private bucket students upload proof of transfer to,
-- and admins read while verifying.
--
-- Run AFTER schema.sql / admin.sql / roles.sql. Safe to re-run.
-- =====================================================================

-- Where the uploaded file lives, kept next to the payment it belongs to.
alter table public.payments
  add column if not exists receipt_path text;

-- ---------------------------------------------------------------------
-- Private bucket. Nothing here is world-readable; the dashboard reads it
-- through short-lived signed URLs.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,                                        -- 5 MB is plenty for a screenshot
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Access
--
-- Files are stored as `<user-id>/<payment-reference>.<ext>`, so the first
-- path segment is the owner and the rules below key off it.
-- ---------------------------------------------------------------------
drop policy if exists "receipts: student uploads own" on storage.objects;
create policy "receipts: student uploads own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts: student reads own" on storage.objects;
create policy "receipts: student reads own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
    )
  );

drop policy if exists "receipts: staff manage" on storage.objects;
create policy "receipts: staff manage" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and public.is_staff())
  with check (bucket_id = 'receipts' and public.is_staff());
