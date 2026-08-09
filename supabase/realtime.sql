-- =====================================================================
-- Live messaging.
--
-- Realtime only broadcasts tables that are in its publication, and it
-- applies the same row-level policies as a normal read — a student is
-- pushed their own threads and nobody else's.
--
-- Run AFTER messaging.sql. Safe to re-run.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- Realtime sends the whole row on update/delete only when the table has a
-- full replica identity; without it an update arrives with just the key.
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
