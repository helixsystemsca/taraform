-- Persisted quizzes per user + section (client section UUID from Zustand).
-- Prevents repeated OpenAI calls when regenerating the same section quiz.

create table if not exists public.section_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  section_id text not null,
  quiz_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, section_id)
);

create index if not exists section_quizzes_user_section_idx
  on public.section_quizzes (user_id, section_id);

alter table public.section_quizzes enable row level security;

create policy "section_quizzes_select_own"
on public.section_quizzes
for select
using (auth.uid() = user_id);

create policy "section_quizzes_insert_own"
on public.section_quizzes
for insert
with check (auth.uid() = user_id);

create policy "section_quizzes_update_own"
on public.section_quizzes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "section_quizzes_delete_own"
on public.section_quizzes
for delete
using (auth.uid() = user_id);
