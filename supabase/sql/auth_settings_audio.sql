-- Taraform: Auth + Settings + Encouragement Audio
--
-- Run this in Supabase SQL editor.
-- Notes:
-- - Uses Supabase Auth (auth.users) as the source of truth for user ids.
-- - Enforces access via RLS: users can only read/write their own rows.
-- - Storage: recommended private bucket `audio` with per-user paths `audio/{user_id}/...`.

-- -----------------------------
-- Profiles (user settings)
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Auto-create a profile row at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- -----------------------------
-- Audio metadata (DB)
-- -----------------------------
create table if not exists public.user_audio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('before', 'after')),
  -- We store the storage path (not a public URL) so we can generate signed URLs for private buckets.
  file_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_audio_user_type_created_idx
  on public.user_audio (user_id, type, created_at desc);

alter table public.user_audio enable row level security;

create policy "user_audio_select_own"
on public.user_audio
for select
using (auth.uid() = user_id);

create policy "user_audio_insert_own"
on public.user_audio
for insert
with check (auth.uid() = user_id);

create policy "user_audio_delete_own"
on public.user_audio
for delete
using (auth.uid() = user_id);

-- -----------------------------
-- Storage bucket + policies
-- -----------------------------
-- Create a private bucket named `audio` in the Supabase Dashboard (Storage → Buckets).
-- Then add policies below.

-- Allow users to read their own objects (for signed URLs).
create policy "storage_audio_read_own"
on storage.objects
for select
using (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to upload into their own folder.
create policy "storage_audio_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own objects.
create policy "storage_audio_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

