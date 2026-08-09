-- =====================================================================
-- Direct messaging between a student and the centre, and the emergency
-- contact details collected at signup.
--
-- Run AFTER schema.sql / admin.sql / roles.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Emergency contact
--
-- A centre that teaches minors and evening classes needs someone to call.
-- The phone number and the relationship are what actually get used; the
-- name is optional but makes the call less awkward.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists address text not null default '',
  add column if not exists emergency_name text not null default '',
  add column if not exists emergency_phone text not null default '',
  add column if not exists emergency_relation text not null default '';

-- ---------------------------------------------------------------------
-- Conversations
--
-- One thread per subject. The student starts it from their portal; staff
-- reply from the dashboard. Both sides read the same rows.
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references auth.users(id) on delete cascade,
  subject         text not null default '',
  is_open         boolean not null default true,
  last_message_at timestamptz not null default now(),
  -- Denormalised so the two inboxes can show a badge without counting rows.
  unread_for_staff   int not null default 0,
  unread_for_student int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists conversations_student_idx
  on public.conversations(student_id, last_message_at desc);
create index if not exists conversations_recent_idx
  on public.conversations(last_message_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references auth.users(id) on delete set null,
  -- Kept explicitly: a staff member can leave, and the thread still has to
  -- read correctly afterwards.
  from_staff      boolean not null default false,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- Keep the thread summary in step with its messages.
-- ---------------------------------------------------------------------
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         unread_for_staff = case when new.from_staff
                                 then unread_for_staff
                                 else unread_for_staff + 1 end,
         unread_for_student = case when new.from_staff
                                   then unread_for_student + 1
                                   else unread_for_student end
   where id = new.conversation_id;
  return null;
end; $$;

drop trigger if exists bump_conversation on public.messages;
create trigger bump_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

drop policy if exists "conversations: own or staff" on public.conversations;
create policy "conversations: own or staff" on public.conversations
  for select using (student_id = auth.uid() or public.is_staff());

drop policy if exists "conversations: student starts own" on public.conversations;
create policy "conversations: student starts own" on public.conversations
  for insert with check (student_id = auth.uid());

drop policy if exists "conversations: staff manage" on public.conversations;
create policy "conversations: staff manage" on public.conversations
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "messages: thread members read" on public.messages;
create policy "messages: thread members read" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.student_id = auth.uid() or public.is_staff())
    )
  );

-- A student may write to their own thread, and only as themselves.
drop policy if exists "messages: student writes own" on public.messages;
create policy "messages: student writes own" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and not from_staff
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.student_id = auth.uid() and c.is_open
    )
  );

drop policy if exists "messages: staff write" on public.messages;
create policy "messages: staff write" on public.messages
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- Carry the emergency contact through from signup metadata.
-- Replaces the original trigger function with one that knows the new
-- columns; everything else about it is unchanged.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, phone, address,
    emergency_name, emergency_phone, emergency_relation
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'address', ''),
    coalesce(new.raw_user_meta_data ->> 'emergency_name', ''),
    coalesce(new.raw_user_meta_data ->> 'emergency_phone', ''),
    coalesce(new.raw_user_meta_data ->> 'emergency_relation', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
