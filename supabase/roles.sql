-- =====================================================================
-- Roles: student, teacher, staff, admin.
-- Run AFTER schema.sql, seed.sql and admin.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles.role
--
-- `is_admin` stays as the single source the existing RLS policies read,
-- and a trigger keeps it in step with the role, so nothing that already
-- works has to change.
-- ---------------------------------------------------------------------
do $$ begin
  create type staff_role as enum ('student', 'teacher', 'staff', 'admin');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role staff_role not null default 'student';

-- Existing admins keep their access.
update public.profiles set role = 'admin' where is_admin and role <> 'admin';

create or replace function public.sync_is_admin()
returns trigger language plpgsql as $$
begin
  new.is_admin := (new.role = 'admin');
  return new;
end; $$;

drop trigger if exists sync_admin_flag on public.profiles;
create trigger sync_admin_flag before insert or update of role on public.profiles
  for each row execute function public.sync_is_admin();

-- ---------------------------------------------------------------------
-- Which teacher runs which batch
-- ---------------------------------------------------------------------
alter table public.batches
  add column if not exists teacher_id uuid references auth.users(id) on delete set null;

create index if not exists batches_teacher_idx on public.batches(teacher_id);

-- ---------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select p.role::text from public.profiles p where p.id = auth.uid()), 'student');
$$;

/** Admin or front-desk staff — the people who run day-to-day operations. */
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role_name() in ('admin', 'staff');
$$;

-- ---------------------------------------------------------------------
-- Teachers may read the batches they run, and the students in them.
-- Everything else stays as it was.
-- ---------------------------------------------------------------------
drop policy if exists "enrollments: teacher reads own batches" on public.enrollments;
create policy "enrollments: teacher reads own batches" on public.enrollments
  for select using (
    exists (
      select 1 from public.batches b
      where b.id = enrollments.batch_id and b.teacher_id = auth.uid()
    )
  );

drop policy if exists "profiles: teacher reads own students" on public.profiles;
create policy "profiles: teacher reads own students" on public.profiles
  for select using (
    exists (
      select 1
      from public.enrollments e
      join public.batches b on b.id = e.batch_id
      where e.user_id = profiles.id and b.teacher_id = auth.uid()
    )
  );

-- Staff need the same operational reach as admins on the tables they work
-- with, but not on courses or settings.
drop policy if exists "enrollments: staff write" on public.enrollments;
create policy "enrollments: staff write" on public.enrollments
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "payments: staff write" on public.payments;
create policy "payments: staff write" on public.payments
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "contact: staff write" on public.contact_messages;
create policy "contact: staff write" on public.contact_messages
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "profiles: staff read" on public.profiles;
create policy "profiles: staff read" on public.profiles
  for select using (public.is_staff());

-- ---------------------------------------------------------------------
-- A teacher's own classes, in one call.
-- ---------------------------------------------------------------------
create or replace function public.teacher_batches(teacher uuid)
returns table (
  batch_id uuid,
  batch_name text,
  mode text,
  start_date date,
  schedule_text text,
  room_or_link text,
  seats_total int,
  seats_taken int,
  is_open boolean,
  course_title text,
  active_students bigint
)
language sql stable security definer set search_path = public
as $$
  select
    b.id, b.name, b.mode::text, b.start_date, b.schedule_text, b.room_or_link,
    b.seats_total, b.seats_taken, b.is_open, c.title_en,
    (select count(*) from public.enrollments e
      where e.batch_id = b.id and e.status = 'active')
  from public.batches b
  join public.courses c on c.id = b.course_id
  where b.teacher_id = teacher
  order by b.start_date desc;
$$;

grant execute on function public.teacher_batches(uuid) to authenticated, service_role;
