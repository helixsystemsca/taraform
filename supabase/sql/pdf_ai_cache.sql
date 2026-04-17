-- Taraform: PDF + AI caching tables (per-user, RLS)
--
-- Goals:
-- - Never process the same PDF twice (by file hash)
-- - Never pay for the same AI output twice (by input hash)
-- - Keep all cached data scoped to the signed-in user via RLS

create table if not exists public.processed_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, file_hash)
);

alter table public.processed_files enable row level security;

create policy "processed_files_select_own"
on public.processed_files
for select
using (auth.uid() = user_id);

create policy "processed_files_insert_own"
on public.processed_files
for insert
with check (auth.uid() = user_id);

create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_hash text not null,
  input_text text not null,
  output_text text not null,
  type text not null check (type in ('summary','flashcard','quiz')),
  created_at timestamptz not null default now(),
  unique (user_id, input_hash)
);

-- Fast lookup for cache hits + type filtering
create index if not exists ai_cache_user_type_created_idx
  on public.ai_cache (user_id, type, created_at desc);

alter table public.ai_cache enable row level security;

create policy "ai_cache_select_own"
on public.ai_cache
for select
using (auth.uid() = user_id);

create policy "ai_cache_insert_own"
on public.ai_cache
for insert
with check (auth.uid() = user_id);

