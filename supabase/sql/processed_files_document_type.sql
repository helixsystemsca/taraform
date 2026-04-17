-- Add document_type to processed_files for conditional pipelines.
-- Run after `supabase/sql/pdf_ai_cache.sql`.

alter table public.processed_files
  add column if not exists document_type text;

-- Optional: keep values constrained.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'processed_files_document_type_check'
  ) then
    alter table public.processed_files
      add constraint processed_files_document_type_check
      check (document_type is null or document_type in ('textbook','lecture_notes','legal','other'));
  end if;
end $$;

