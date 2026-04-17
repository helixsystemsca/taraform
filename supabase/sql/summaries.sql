-- Taraform: summaries derived from processed PDFs
--
-- Stores a single merged summary per processed file (per user).
-- RLS ensures users can only access their own summaries.

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null references public.processed_files (id) on delete cascade,
  summary_text text not null,
  created_at timestamptz not null default now(),
  unique (user_id, file_id)
);

alter table public.summaries enable row level security;

create policy "summaries_select_own"
on public.summaries
for select
using (auth.uid() = user_id);

create policy "summaries_insert_own"
on public.summaries
for insert
with check (auth.uid() = user_id);

create policy "summaries_update_own"
on public.summaries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

