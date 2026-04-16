-- Taraform SRS schema (no auth; device-scoped)
-- Run in Supabase SQL editor.

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  section_id text not null,
  concept text not null,
  strength real not null default 0.35,
  stability real not null default 1.0,
  last_reviewed timestamptz null,
  next_review timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists concepts_device_section_concept_uq
  on public.concepts (device_id, section_id, concept);

create index if not exists concepts_due_idx
  on public.concepts (device_id, next_review, strength);

-- Optional: enable RLS + policy if you later add auth.

