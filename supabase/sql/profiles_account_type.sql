-- Add supporter vs user role to existing Taraform databases (safe to re-run).
alter table public.profiles add column if not exists account_type text not null default 'user';
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check check (account_type in ('user', 'supporter'));
