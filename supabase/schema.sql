-- =========================================================
-- Campus Pass — Supabase schema
-- Run this once in the Supabase SQL Editor on a fresh project.
-- Mirrors the data shapes used by js/store.js so the upcoming
-- rewrite of that file can map almost 1:1 onto these tables.
-- =========================================================

-- ---------- profiles (one row per account, linked to Supabase Auth) ----------
-- No password column here on purpose: Supabase Auth (auth.users) owns
-- credentials and handles hashing/security. This table only holds the
-- app-specific profile fields your UI already reads/writes.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  middle_name text not null default '',
  last_name text not null default '',
  no_middle_name boolean not null default false,
  name text not null default '',
  email text unique not null,
  role text not null default 'student' check (role in ('student','faculty','admin','alumni','guest')),
  active boolean not null default true,
  student_id text not null default '',
  level text not null default '',
  course text not null default '',
  strand text not null default '',
  year_level text not null default '',
  grade_level text not null default '',
  section text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  description text not null default '',
  location text not null default '',
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  open_to_alumni boolean not null default false,
  requires_approval boolean not null default false,
  audience jsonb not null default '{"roles":[],"courses":[],"yearLevels":[],"gradeLevels":[]}',
  cover_tag text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- activities (one event has many) ----------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text not null default '',
  capacity integer not null default 0,
  deadline timestamptz
);

-- ---------- registrations ----------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  ticket_code text unique not null,
  event_id uuid not null references public.events(id) on delete cascade,
  activity_ids uuid[] not null default '{}',
  -- nullable: a bulk-registered / front-desk student with no account yet
  -- has user_id = null and their details live only in user_snapshot.
  user_id uuid references public.profiles(id),
  user_snapshot jsonb not null default '{}',
  extra_fields jsonb not null default '{}',
  status text not null default 'approved' check (status in ('approved','pending','rejected','cancelled')),
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  registered_at timestamptz not null default now(),
  added_by uuid references public.profiles(id),
  bulk_group_id text
);

-- ---------- announcements ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  event_id uuid references public.events(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_by_role text not null default '',
  audience jsonb not null default '{"type":"everyone","courses":[]}',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- bulk-register templates ----------
create table public.bulk_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text not null default '',
  students jsonb not null default '[]',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- audit log ----------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_name text not null default '',
  actor_role text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  target_label text not null default '',
  details text not null default '',
  ts timestamptz not null default now()
);

-- =========================================================
-- Helper functions used by the policies below.
-- Safe without SECURITY DEFINER because the profiles SELECT
-- policy already lets any signed-in user read all profiles.
-- =========================================================
create function public.is_admin() returns boolean
  language sql stable as $$
    select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
  $$;

create function public.is_staff() returns boolean
  language sql stable as $$
    select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','faculty'));
  $$;

-- =========================================================
-- Auto-create a profile row whenever someone signs up through
-- Supabase Auth. The app will pass firstName/lastName/role/etc.
-- as signUp() "options.data" metadata, which lands here.
-- =========================================================
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
  begin
    insert into public.profiles (
      id, first_name, middle_name, last_name, no_middle_name, name,
      email, role, active, student_id, level, course, strand, year_level, grade_level, section
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data->>'firstName',''),
      coalesce(new.raw_user_meta_data->>'middleName',''),
      coalesce(new.raw_user_meta_data->>'lastName',''),
      coalesce((new.raw_user_meta_data->>'noMiddleName')::boolean, false),
      coalesce(new.raw_user_meta_data->>'name', new.email),
      new.email,
      coalesce(new.raw_user_meta_data->>'role','student'),
      true,
      coalesce(new.raw_user_meta_data->>'studentId',''),
      coalesce(new.raw_user_meta_data->>'level',''),
      coalesce(new.raw_user_meta_data->>'course',''),
      coalesce(new.raw_user_meta_data->>'strand',''),
      coalesce(new.raw_user_meta_data->>'yearLevel',''),
      coalesce(new.raw_user_meta_data->>'gradeLevel',''),
      coalesce(new.raw_user_meta_data->>'section','')
    );
    return new;
  end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- Row Level Security. Every table is locked down by default in
-- Postgres/Supabase once RLS is enabled — nothing is readable or
-- writable until a policy explicitly allows it. This is required:
-- the app's API key is public (visible in your site's JS), so RLS
-- is what actually keeps one student from reading/editing another
-- student's data, or a random visitor from editing anything at all.
-- =========================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.activities enable row level security;
alter table public.registrations enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.bulk_templates enable row level security;
alter table public.audit_log enable row level security;

-- profiles: any signed-in user can see names/roles (needed for admin
-- lists, faculty bulk-register matching, etc.); you can only edit your
-- own profile unless you're an admin.
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated using (auth.uid() = id or public.is_admin());
create policy "profiles_delete_admin_only" on public.profiles
  for delete to authenticated using (public.is_admin());

-- events: everyone signed in can read; only admins manage them.
create policy "events_select_authenticated" on public.events
  for select to authenticated using (true);
create policy "events_write_admin_only" on public.events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- activities: same pattern as events.
create policy "activities_select_authenticated" on public.activities
  for select to authenticated using (true);
create policy "activities_write_admin_only" on public.activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- registrations: you can see your own; staff (admin/faculty) can see
-- everyone's. Any signed-in user can create a registration row (covers
-- self-registration and bulk-register by faculty); only staff can
-- change status/check-in or delete.
create policy "registrations_select_own_or_staff" on public.registrations
  for select to authenticated using (auth.uid() = user_id or public.is_staff());
create policy "registrations_insert_authenticated" on public.registrations
  for insert to authenticated with check (true);
create policy "registrations_update_own_or_staff" on public.registrations
  for update to authenticated using (auth.uid() = user_id or public.is_staff());
create policy "registrations_delete_staff_only" on public.registrations
  for delete to authenticated using (public.is_staff());

-- announcements: everyone reads; only staff post/delete.
create policy "announcements_select_authenticated" on public.announcements
  for select to authenticated using (true);
create policy "announcements_write_staff_only" on public.announcements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- notifications: you only ever see your own. Insert is left open to any
-- signed-in user because the app creates notifications *for other
-- people* (e.g. notifying a student their registration was approved).
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "notifications_insert_authenticated" on public.notifications
  for insert to authenticated with check (true);
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (auth.uid() = user_id);

-- bulk_templates: visible/editable by whoever created them, or staff.
create policy "bulk_templates_select_own_or_staff" on public.bulk_templates
  for select to authenticated using (auth.uid() = created_by or public.is_staff());
create policy "bulk_templates_write_own_or_staff" on public.bulk_templates
  for all to authenticated using (auth.uid() = created_by or public.is_staff())
  with check (auth.uid() = created_by or public.is_staff());

-- audit_log: any signed-in user can write an entry (the app logs from
-- the client); only admins can read the log back.
create policy "audit_log_select_admin_only" on public.audit_log
  for select to authenticated using (public.is_admin());
create policy "audit_log_insert_authenticated" on public.audit_log
  for insert to authenticated with check (true);
