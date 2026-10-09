-- Run this once in Supabase: SQL Editor > New query > paste > Run
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 20),
  score int not null check (score between 0 and 400),
  correct int not null check (correct between 0 and 10),
  total int not null check (total between 1 and 10),
  mode text not null check (char_length(mode) <= 40),
  created_at timestamptz not null default now(),
  check (correct <= total)
);
create index if not exists scores_rank_idx on public.scores (score desc, created_at asc);
alter table public.scores enable row level security;
-- Everyone can read and add scores. Nobody can edit or delete them from the website.
create policy "scores_read" on public.scores for select to anon using (true);
create policy "scores_insert" on public.scores for insert to anon with check (true);
grant select, insert on public.scores to anon;
