-- =====================================================================
-- Classroom management: admissions, groups, attendance, assignments,
-- submissions and batch reports.
--
-- Run AFTER schema.sql, seed.sql, admin.sql and roles.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Admission windows
--
-- Enrolment is only possible while a window is open. Admin opens one, the
-- catalogue starts accepting students, and it shuts on its own at closes_at.
-- ---------------------------------------------------------------------
create table if not exists public.admission_windows (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  note        text not null default '',
  opens_at    timestamptz not null default now(),
  closes_at   timestamptz not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.admission_windows enable row level security;

drop policy if exists "admissions: public read" on public.admission_windows;
create policy "admissions: public read" on public.admission_windows
  for select using (true);

drop policy if exists "admissions: admin write" on public.admission_windows;
create policy "admissions: admin write" on public.admission_windows
  for all using (public.is_admin()) with check (public.is_admin());

/** True while at least one window is live right now. */
create or replace function public.admissions_open()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admission_windows
    where is_active and now() between opens_at and closes_at
  );
$$;

grant execute on function public.admissions_open() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Groups inside a batch
-- ---------------------------------------------------------------------
create table if not exists public.class_groups (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.batches(id) on delete cascade,
  name        text not null,
  note        text not null default '',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.class_group_members (
  group_id      uuid not null references public.class_groups(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  primary key (group_id, enrollment_id)
);

create index if not exists class_groups_batch_idx on public.class_groups(batch_id);

-- ---------------------------------------------------------------------
-- Attendance — one session per class meeting
-- ---------------------------------------------------------------------
do $$ begin
  create type attendance_state as enum ('present', 'absent', 'late', 'excused');
exception when duplicate_object then null; end $$;

create table if not exists public.attendance_sessions (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.batches(id) on delete cascade,
  held_on     date not null default current_date,
  topic       text not null default '',
  note        text not null default '',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (batch_id, held_on)
);

create table if not exists public.attendance_records (
  session_id    uuid not null references public.attendance_sessions(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  state         attendance_state not null default 'present',
  note          text not null default '',
  primary key (session_id, enrollment_id)
);

create index if not exists attendance_sessions_batch_idx
  on public.attendance_sessions(batch_id, held_on desc);

-- ---------------------------------------------------------------------
-- Assignments and submissions
-- ---------------------------------------------------------------------
create table if not exists public.assignments (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references public.batches(id) on delete cascade,
  title         text not null,
  instructions  text not null default '',
  due_at        timestamptz,
  max_score     numeric(5,1) not null default 100,
  is_published  boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists assignments_batch_idx on public.assignments(batch_id, created_at desc);

drop trigger if exists touch_assignments on public.assignments;
create trigger touch_assignments before update on public.assignments
  for each row execute function public.touch_updated_at();

do $$ begin
  create type submission_state as enum ('submitted', 'graded', 'returned');
exception when duplicate_object then null; end $$;

create table if not exists public.assignment_submissions (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  enrollment_id  uuid not null references public.enrollments(id) on delete cascade,
  body           text not null default '',
  link           text not null default '',
  state          submission_state not null default 'submitted',
  score          numeric(5,1),
  feedback       text not null default '',
  submitted_at   timestamptz not null default now(),
  graded_at      timestamptz,
  graded_by      uuid references auth.users(id) on delete set null,
  unique (assignment_id, enrollment_id)
);

create index if not exists submissions_assignment_idx
  on public.assignment_submissions(assignment_id);

-- ---------------------------------------------------------------------
-- Batch reports — a teacher's written summary for a period
-- ---------------------------------------------------------------------
create table if not exists public.batch_reports (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references public.batches(id) on delete cascade,
  title        text not null,
  period_start date,
  period_end   date,
  summary      text not null default '',
  stats        jsonb not null default '{}'::jsonb,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists batch_reports_batch_idx
  on public.batch_reports(batch_id, created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Server actions run with the service-role key behind a role check, so these
-- policies exist for defence in depth and for anything reading with the
-- caller's own session — chiefly students looking at their own work.
-- ---------------------------------------------------------------------
alter table public.class_groups           enable row level security;
alter table public.class_group_members    enable row level security;
alter table public.attendance_sessions    enable row level security;
alter table public.attendance_records     enable row level security;
alter table public.assignments            enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.batch_reports          enable row level security;

/** Does the caller teach this batch? */
create or replace function public.teaches_batch(batch uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.batches b where b.id = batch and b.teacher_id = auth.uid()
  );
$$;

/** Is the caller enrolled in this batch? */
create or replace function public.studies_batch(batch uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.enrollments e
    where e.batch_id = batch and e.user_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$;

-- groups --------------------------------------------------------------
drop policy if exists "groups: batch people read" on public.class_groups;
create policy "groups: batch people read" on public.class_groups
  for select using (
    public.teaches_batch(batch_id) or public.studies_batch(batch_id) or public.is_staff()
  );

drop policy if exists "groups: teacher writes" on public.class_groups;
create policy "groups: teacher writes" on public.class_groups
  for all using (public.teaches_batch(batch_id) or public.is_admin())
  with check (public.teaches_batch(batch_id) or public.is_admin());

drop policy if exists "group members: read" on public.class_group_members;
create policy "group members: read" on public.class_group_members
  for select using (
    exists (
      select 1 from public.class_groups g
      where g.id = group_id
        and (public.teaches_batch(g.batch_id) or public.studies_batch(g.batch_id)
             or public.is_staff())
    )
  );

drop policy if exists "group members: teacher writes" on public.class_group_members;
create policy "group members: teacher writes" on public.class_group_members
  for all using (
    exists (
      select 1 from public.class_groups g
      where g.id = group_id and (public.teaches_batch(g.batch_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.class_groups g
      where g.id = group_id and (public.teaches_batch(g.batch_id) or public.is_admin())
    )
  );

-- attendance ----------------------------------------------------------
drop policy if exists "attendance sessions: read" on public.attendance_sessions;
create policy "attendance sessions: read" on public.attendance_sessions
  for select using (
    public.teaches_batch(batch_id) or public.studies_batch(batch_id) or public.is_staff()
  );

drop policy if exists "attendance sessions: teacher writes" on public.attendance_sessions;
create policy "attendance sessions: teacher writes" on public.attendance_sessions
  for all using (public.teaches_batch(batch_id) or public.is_admin())
  with check (public.teaches_batch(batch_id) or public.is_admin());

-- A student sees only their own attendance line.
drop policy if exists "attendance records: read" on public.attendance_records;
create policy "attendance records: read" on public.attendance_records
  for select using (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id
        and (public.teaches_batch(s.batch_id) or public.is_staff())
    )
    or exists (
      select 1 from public.enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "attendance records: teacher writes" on public.attendance_records;
create policy "attendance records: teacher writes" on public.attendance_records
  for all using (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and (public.teaches_batch(s.batch_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and (public.teaches_batch(s.batch_id) or public.is_admin())
    )
  );

-- assignments ---------------------------------------------------------
drop policy if exists "assignments: read" on public.assignments;
create policy "assignments: read" on public.assignments
  for select using (
    public.teaches_batch(batch_id)
    or public.is_staff()
    or (is_published and public.studies_batch(batch_id))
  );

drop policy if exists "assignments: teacher writes" on public.assignments;
create policy "assignments: teacher writes" on public.assignments
  for all using (public.teaches_batch(batch_id) or public.is_admin())
  with check (public.teaches_batch(batch_id) or public.is_admin());

-- submissions ---------------------------------------------------------
drop policy if exists "submissions: read" on public.assignment_submissions;
create policy "submissions: read" on public.assignment_submissions
  for select using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (public.teaches_batch(a.batch_id) or public.is_staff())
    )
    or exists (
      select 1 from public.enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid()
    )
  );

-- A student may hand work in and revise it, but never touch the score.
drop policy if exists "submissions: student writes own" on public.assignment_submissions;
create policy "submissions: student writes own" on public.assignment_submissions
  for insert with check (
    exists (
      select 1 from public.enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid()
    )
    and score is null
  );

drop policy if exists "submissions: student edits own" on public.assignment_submissions;
create policy "submissions: student edits own" on public.assignment_submissions
  for update using (
    exists (
      select 1 from public.enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid()
    )
    and state = 'submitted'
  )
  with check (score is null);

drop policy if exists "submissions: teacher grades" on public.assignment_submissions;
create policy "submissions: teacher grades" on public.assignment_submissions
  for all using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (public.teaches_batch(a.batch_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (public.teaches_batch(a.batch_id) or public.is_admin())
    )
  );

-- reports -------------------------------------------------------------
drop policy if exists "reports: read" on public.batch_reports;
create policy "reports: read" on public.batch_reports
  for select using (public.teaches_batch(batch_id) or public.is_staff());

drop policy if exists "reports: teacher writes" on public.batch_reports;
create policy "reports: teacher writes" on public.batch_reports
  for all using (public.teaches_batch(batch_id) or public.is_admin())
  with check (public.teaches_batch(batch_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- Batch statistics, used by the class dashboard and the report builder.
-- ---------------------------------------------------------------------
create or replace function public.batch_stats(batch uuid)
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'active_students',
      (select count(*) from public.enrollments e
        where e.batch_id = batch and e.status = 'active'),
    'sessions_held',
      (select count(*) from public.attendance_sessions s where s.batch_id = batch),
    'attendance_rate',
      (select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where r.state in ('present','late'))
                         / count(*), 1) end
         from public.attendance_records r
         join public.attendance_sessions s on s.id = r.session_id
        where s.batch_id = batch),
    'assignments_published',
      (select count(*) from public.assignments a
        where a.batch_id = batch and a.is_published),
    'submissions_received',
      (select count(*) from public.assignment_submissions sub
         join public.assignments a on a.id = sub.assignment_id
        where a.batch_id = batch),
    'submissions_graded',
      (select count(*) from public.assignment_submissions sub
         join public.assignments a on a.id = sub.assignment_id
        where a.batch_id = batch and sub.state = 'graded'),
    'average_score',
      (select round(avg(sub.score), 1)
         from public.assignment_submissions sub
         join public.assignments a on a.id = sub.assignment_id
        where a.batch_id = batch and sub.score is not null)
  );
$$;

grant execute on function public.batch_stats(uuid) to authenticated, service_role;

/** Per-student attendance and grades for one batch. */
create or replace function public.batch_student_stats(batch uuid)
returns table (
  enrollment_id uuid,
  user_id uuid,
  full_name text,
  phone text,
  sessions_marked bigint,
  present_count bigint,
  attendance_rate numeric,
  submitted_count bigint,
  average_score numeric
)
language sql stable security definer set search_path = public
as $$
  select
    e.id,
    e.user_id,
    p.full_name,
    p.phone,
    (select count(*) from public.attendance_records r where r.enrollment_id = e.id),
    (select count(*) from public.attendance_records r
      where r.enrollment_id = e.id and r.state in ('present','late')),
    (select case when count(*) = 0 then null
            else round(100.0 * count(*) filter (where r.state in ('present','late'))
                       / count(*), 1) end
       from public.attendance_records r where r.enrollment_id = e.id),
    (select count(*) from public.assignment_submissions s where s.enrollment_id = e.id),
    (select round(avg(s.score), 1) from public.assignment_submissions s
      where s.enrollment_id = e.id and s.score is not null)
  from public.enrollments e
  join public.profiles p on p.id = e.user_id
  where e.batch_id = batch and e.status in ('active', 'completed')
  order by p.full_name;
$$;

grant execute on function public.batch_student_stats(uuid) to authenticated, service_role;
