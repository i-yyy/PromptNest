-- PromptNest shared database setup
-- Public mode: visitors do not sign in and may read/write all rows.
-- Run this in Supabase Dashboard > SQL Editor.

create table if not exists public.prompts (
  id text primary key,
  title text not null,
  content text not null,
  category text not null default '',
  model text not null default '',
  tags jsonb not null default '[]'::jsonb,
  description text not null default '',
  favorite boolean not null default false,
  archived boolean not null default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  last_used_at bigint
);

create table if not exists public.prompt_categories (
  path text primary key,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists prompts_updated_at_idx
  on public.prompts (updated_at desc);

alter table public.prompts enable row level security;
alter table public.prompt_categories enable row level security;

-- Grant only the operations used by the website. This also exposes these
-- two tables through the Data API when automatic table exposure is disabled.
grant usage on schema public to anon;
revoke all on table public.prompts, public.prompt_categories from anon;
grant select, insert, update, delete
  on table public.prompts, public.prompt_categories to anon;

drop policy if exists "public can read prompts" on public.prompts;
create policy "public can read prompts"
  on public.prompts for select to anon using (true);

drop policy if exists "public can add prompts" on public.prompts;
create policy "public can add prompts"
  on public.prompts for insert to anon with check (true);

drop policy if exists "public can edit prompts" on public.prompts;
create policy "public can edit prompts"
  on public.prompts for update to anon using (true) with check (true);

drop policy if exists "public can delete prompts" on public.prompts;
create policy "public can delete prompts"
  on public.prompts for delete to anon using (true);

drop policy if exists "public can read categories" on public.prompt_categories;
create policy "public can read categories"
  on public.prompt_categories for select to anon using (true);

drop policy if exists "public can add categories" on public.prompt_categories;
create policy "public can add categories"
  on public.prompt_categories for insert to anon with check (true);

drop policy if exists "public can edit categories" on public.prompt_categories;
create policy "public can edit categories"
  on public.prompt_categories for update to anon using (true) with check (true);

drop policy if exists "public can delete categories" on public.prompt_categories;
create policy "public can delete categories"
  on public.prompt_categories for delete to anon using (true);
