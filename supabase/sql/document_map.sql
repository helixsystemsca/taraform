-- 2-stage PDF pipeline: document map + on-demand section detail
--
-- Document map is cheap and computed from a sample. Section details are computed only when user opens a section.

create table if not exists public.document_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null references public.processed_files (id) on delete cascade,
  document_map jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, file_id)
);

alter table public.document_maps enable row level security;

create policy "document_maps_select_own"
on public.document_maps
for select
using (auth.uid() = user_id);

create policy "document_maps_insert_own"
on public.document_maps
for insert
with check (auth.uid() = user_id);

create policy "document_maps_update_own"
on public.document_maps
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.section_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null references public.processed_files (id) on delete cascade,
  section_id text not null,
  summary_text text not null,
  key_concepts text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, file_id, section_id)
);

create index if not exists section_summaries_lookup_idx
  on public.section_summaries (user_id, file_id, section_id);

alter table public.section_summaries enable row level security;

create policy "section_summaries_select_own"
on public.section_summaries
for select
using (auth.uid() = user_id);

create policy "section_summaries_insert_own"
on public.section_summaries
for insert
with check (auth.uid() = user_id);

create policy "section_summaries_update_own"
on public.section_summaries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

