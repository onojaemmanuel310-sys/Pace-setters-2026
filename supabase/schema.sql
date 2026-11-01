-- ==============================================================================
-- PACE SETTERS 2026: MASTER DATABASE SCHEMA & SECURITY POLICIES
-- Target: Supabase PostgreSQL with Row-Level Security (RLS)
-- ==============================================================================

-- 1. Enable Required Extensions
create extension if not exists pgcrypto;

-- 2. Drop existing triggers FIRST (before functions they depend on)
drop trigger if exists on_auth_user_created_pace_setter on auth.users;
drop trigger if exists on_registration_status_changed on public.graduate_registrations;
drop function if exists public.handle_pace_setter_signup() cascade;
drop function if exists public.sync_graduate_approval() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_approved_graduate(uuid) cascade;

-- ==============================================================================
-- 3. TABLES DEFINITION
-- ==============================================================================

-- A. USER ROLES (Separates admin privileges from user-editable tables)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Helper function to check if current user is an administrator
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- B. GRADUATE REGISTRATIONS (Verification queue & status tracking)
create table if not exists public.graduate_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  department text not null,
  matric_number text not null unique,
  email text not null unique,
  bio text,
  phone text,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Helper function to check if a user is an approved graduate
create or replace function public.is_approved_graduate(check_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.graduate_registrations
    where user_id = check_user_id and approval_status = 'approved'
  );
$$;

-- C. GRADUATE PROFILES (Public directory & reusable profile pages)
create table if not exists public.graduate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text unique,
  full_name text not null,
  department text not null,
  profile_photo_url text,
  bio text,
  phone text,
  privacy_settings jsonb not null default '{"show_phone": false, "show_matric": false}'::jsonb,
  is_approved boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- D. GRADUATE PHOTOS (Yearbook gallery uploads)
create table if not exists public.graduate_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  caption text check (char_length(caption) <= 300),
  is_approved boolean not null default true,
  is_removed boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- E. GRADUATE MEMORIES (Stories, milestones & appreciation)
create table if not exists public.graduate_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 150),
  content text not null check (char_length(content) <= 3000),
  category text not null default 'General' check (
    category in ('General', 'Graduation Story', 'Class Event', 'Appreciation', 'Milestone', 'Lesson Learned', 'Friendship')
  ),
  photo_url text,
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- F. GRADUATE ACHIEVEMENTS (Honors, certifications, career milestones)
create table if not exists public.graduate_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 150),
  description text not null check (char_length(description) <= 2000),
  category text not null default 'Academic' check (
    category in ('Academic', 'Career', 'Certification', 'Business', 'Award', 'Community Service', 'Other')
  ),
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- G. SITE SETTINGS (Key-value store for official class portrait, announcements, etc.)
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references auth.users(id) on delete set null
);

-- H. ADMIN AUDIT LOGS (Security accountability)
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. AUTOMATED TRIGGERS & BUSINESS LOGIC
-- ==============================================================================

-- A. Automatically creates registration, profile, and member role on user signup
create or replace function public.handle_pace_setter_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_department text;
  v_matric text;
  v_bio text;
  v_phone text;
  v_username text;
begin
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Pace Setter');
  v_department := coalesce(nullif(trim(new.raw_user_meta_data ->> 'department'), ''), 'General');
  v_matric := coalesce(nullif(trim(new.raw_user_meta_data ->> 'matric_number'), ''), 'PENDING-' || substr(new.id::text, 1, 8));
  v_bio := nullif(trim(new.raw_user_meta_data ->> 'bio'), '');
  v_phone := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  v_username := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || substr(new.id::text, 1, 4);

  -- 1. Create Graduate Registration record (pending by default)
  insert into public.graduate_registrations (
    user_id,
    full_name,
    department,
    matric_number,
    email,
    bio,
    phone,
    approval_status
  ) values (
    new.id,
    v_full_name,
    v_department,
    v_matric,
    coalesce(new.email, ''),
    v_bio,
    v_phone,
    'pending'
  ) on conflict (user_id) do nothing;

  -- 2. Create Public Profile (is_approved = false)
  insert into public.graduate_profiles (
    user_id,
    username,
    full_name,
    department,
    bio,
    phone,
    is_approved
  ) values (
    new.id,
    v_username,
    v_full_name,
    v_department,
    v_bio,
    v_phone,
    false
  ) on conflict (user_id) do nothing;

  -- 3. Assign Default Member Role
  insert into public.user_roles (
    user_id,
    role
  ) values (
    new.id,
    'member'
  ) on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_pace_setter
after insert on auth.users
for each row execute procedure public.handle_pace_setter_signup();

-- B. Automatically sync profile approval when registration is approved or rejected
create or replace function public.sync_graduate_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'approved' then
    update public.graduate_profiles
    set is_approved = true, updated_at = timezone('utc'::text, now())
    where user_id = new.user_id;
  else
    update public.graduate_profiles
    set is_approved = false, updated_at = timezone('utc'::text, now())
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_registration_status_changed
after update of approval_status on public.graduate_registrations
for each row execute procedure public.sync_graduate_approval();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.user_roles enable row level security;
alter table public.graduate_registrations enable row level security;
alter table public.graduate_profiles enable row level security;
alter table public.graduate_photos enable row level security;
alter table public.graduate_memories enable row level security;
alter table public.graduate_achievements enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Drop all existing table policies before recreating (safe re-run)
drop policy if exists "Users can view their own role" on public.user_roles;
drop policy if exists "Only administrators can modify roles" on public.user_roles;

drop policy if exists "Users can read their own registration status" on public.graduate_registrations;
drop policy if exists "Users can update their own registration before approval" on public.graduate_registrations;
drop policy if exists "Administrators can manage all registrations" on public.graduate_registrations;

drop policy if exists "Public can view approved graduate profiles" on public.graduate_profiles;
drop policy if exists "Members can update their own profile" on public.graduate_profiles;

drop policy if exists "Public can view approved graduation photos" on public.graduate_photos;
drop policy if exists "Approved members can upload photos" on public.graduate_photos;
drop policy if exists "Photo owners or admins can update photos" on public.graduate_photos;
drop policy if exists "Photo owners or admins can delete photos" on public.graduate_photos;

drop policy if exists "Public can read approved memories" on public.graduate_memories;
drop policy if exists "Approved members can submit memories" on public.graduate_memories;
drop policy if exists "Memory owners or admins can update memories" on public.graduate_memories;
drop policy if exists "Memory owners or admins can delete memories" on public.graduate_memories;

drop policy if exists "Public can read approved achievements" on public.graduate_achievements;
drop policy if exists "Approved members can submit achievements" on public.graduate_achievements;
drop policy if exists "Achievement owners or admins can manage achievements" on public.graduate_achievements;

drop policy if exists "Only admins can view audit logs" on public.admin_audit_logs;
drop policy if exists "System and admins can insert audit logs" on public.admin_audit_logs;

drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Only admins can modify site settings" on public.site_settings;

-- --- USER ROLES POLICIES ---
create policy "Users can view their own role" on public.user_roles
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "Only administrators can modify roles" on public.user_roles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- --- GRADUATE REGISTRATIONS POLICIES ---
create policy "Users can read their own registration status" on public.graduate_registrations
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "Users can update their own registration before approval" on public.graduate_registrations
for update to authenticated
using (auth.uid() = user_id and approval_status = 'pending')
with check (
  auth.uid() = user_id
  and approval_status = 'pending'
);

create policy "Administrators can manage all registrations" on public.graduate_registrations
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- --- GRADUATE PROFILES POLICIES ---
create policy "Public can view approved graduate profiles" on public.graduate_profiles
for select using (
  is_approved = true
  or auth.uid() = user_id
  or public.is_admin()
);

create policy "Members can update their own profile" on public.graduate_profiles
for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (
  auth.uid() = user_id or public.is_admin()
);

-- --- GRADUATE PHOTOS POLICIES ---
create policy "Public can view approved graduation photos" on public.graduate_photos
for select using (is_removed = false and is_approved = true);

create policy "Approved members can upload photos" on public.graduate_photos
for insert to authenticated
with check (
  auth.uid() = user_id
  and public.is_approved_graduate(auth.uid())
  and is_removed = false
);

create policy "Photo owners or admins can update photos" on public.graduate_photos
for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "Photo owners or admins can delete photos" on public.graduate_photos
for delete to authenticated
using (auth.uid() = user_id or public.is_admin());

-- --- GRADUATE MEMORIES POLICIES ---
create policy "Public can read approved memories" on public.graduate_memories
for select using (
  moderation_status = 'approved'
  or auth.uid() = user_id
  or public.is_admin()
);

create policy "Approved members can submit memories" on public.graduate_memories
for insert to authenticated
with check (
  auth.uid() = user_id
  and public.is_approved_graduate(auth.uid())
);

create policy "Memory owners or admins can update memories" on public.graduate_memories
for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "Memory owners or admins can delete memories" on public.graduate_memories
for delete to authenticated
using (auth.uid() = user_id or public.is_admin());

-- --- GRADUATE ACHIEVEMENTS POLICIES ---
create policy "Public can read approved achievements" on public.graduate_achievements
for select using (
  moderation_status = 'approved'
  or auth.uid() = user_id
  or public.is_admin()
);

create policy "Approved members can submit achievements" on public.graduate_achievements
for insert to authenticated
with check (
  auth.uid() = user_id
  and public.is_approved_graduate(auth.uid())
);

create policy "Achievement owners or admins can manage achievements" on public.graduate_achievements
for all to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- --- ADMIN AUDIT LOGS POLICIES ---
create policy "Only admins can view audit logs" on public.admin_audit_logs
for select to authenticated
using (public.is_admin());

create policy "System and admins can insert audit logs" on public.admin_audit_logs
for insert to authenticated
with check (public.is_admin());

-- --- SITE SETTINGS POLICIES ---
create policy "Public can read site settings" on public.site_settings
for select using (true);

create policy "Only admins can modify site settings" on public.site_settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ==============================================================================
-- 6. STORAGE BUCKETS CONFIGURATION (Run in SQL or create in dashboard)
-- ==============================================================================

insert into storage.buckets (id, name, public)
values ('yearbook_photos', 'yearbook_photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('graduation_photos', 'graduation_photos', true)
on conflict (id) do nothing;


-- Storage RLS Policies (drop first to allow clean re-run)
drop policy if exists "Public can view yearbook photos" on storage.objects;
drop policy if exists "Approved members can upload yearbook photos" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Owners or admins can delete photos" on storage.objects;
drop policy if exists "Admins can manage graduation photos bucket" on storage.objects;

create policy "Public can view yearbook photos" on storage.objects
for select using (bucket_id in ('yearbook_photos', 'avatars', 'graduation_photos'));

create policy "Approved members can upload yearbook photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'yearbook_photos'
  and public.is_approved_graduate(auth.uid())
);

create policy "Admins can manage graduation photos bucket" on storage.objects
for all to authenticated
using (
  bucket_id = 'graduation_photos'
  and public.is_admin()
)
with check (
  bucket_id = 'graduation_photos'
  and public.is_admin()
);

create policy "Users can upload their own avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Owners or admins can delete photos" on storage.objects
for delete to authenticated
using (
  (bucket_id in ('yearbook_photos', 'avatars') and auth.uid()::text = (storage.foldername(name))[1])
  or public.is_admin()
);
