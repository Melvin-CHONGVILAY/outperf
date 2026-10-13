-- Outperf: optional account storage. Run once in Supabase, SQL Editor.
-- One row per user holding the synced document (categories, sessions, settings).

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "read own data" on public.user_data;
drop policy if exists "insert own data" on public.user_data;
drop policy if exists "update own data" on public.user_data;
drop policy if exists "delete own data" on public.user_data;
create policy "read own data"   on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own data" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own data" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own data" on public.user_data for delete to authenticated using ((select auth.uid()) = user_id);

-- In-app account deletion (App Store guideline 5.1.1 v): removes the auth user, the row follows by cascade.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
