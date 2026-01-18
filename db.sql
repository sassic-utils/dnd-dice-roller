-- Enable useful extension (optional but common)
create extension if not exists pgcrypto;

-- USERS TABLE
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  created_at timestamptz not null default now()
);

-- ROLLS TABLE
create table if not exists public.rolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  dice_type text not null,
  dice_count integer not null check (dice_count >= 1 and dice_count <= 20),
  results integer[] not null,
  total integer,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists rolls_created_at_idx on public.rolls (created_at);
create index if not exists rolls_user_id_created_at_idx on public.rolls (user_id, created_at);

-- Optional: keep total consistent with results (comment out if you don't want enforcement)
-- This ensures total equals sum(results) when results is present.
create or replace function public.rolls_set_total_from_results()
returns trigger
language plpgsql
as $$
begin
  if new.results is not null then
    new.total := coalesce((select sum(x) from unnest(new.results) as x), new.total);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rolls_set_total_from_results on public.rolls;
create trigger trg_rolls_set_total_from_results
before insert or update of results on public.rolls
for each row execute function public.rolls_set_total_from_results();

-- -------------------------------------------------------------------
-- REALTIME: ensure table is in the realtime publication
-- (On many Supabase projects, this publication already exists.)
-- -------------------------------------------------------------------
alter publication supabase_realtime add table public.rolls;

-- -------------------------------------------------------------------
-- RLS SETTINGS
-- -------------------------------------------------------------------
-- For this app *as currently written* (no Supabase Auth), the simplest
-- working approach is: leave RLS disabled (default).
alter table public.users disable row level security;
alter table public.rolls disable row level security;

-- -------------------------------------------------------------------
-- OPTIONAL (only if you insist on enabling RLS but still want public access)
-- NOTE: This still allows anyone with the anon key to read/write.
-- -------------------------------------------------------------------
-- alter table public.users enable row level security;
-- alter table public.rolls enable row level security;
--
-- drop policy if exists "public read users" on public.users;
-- create policy "public read users" on public.users
-- for select using (true);
--
-- drop policy if exists "public write users" on public.users;
-- create policy "public write users" on public.users
-- for insert with check (true);
--
-- drop policy if exists "public update users" on public.users;
-- create policy "public update users" on public.users
-- for update using (true) with check (true);
--
-- drop policy if exists "public read rolls" on public.rolls;
-- create policy "public read rolls" on public.rolls
-- for select using (true);
--
-- drop policy if exists "public write rolls" on public.rolls;
-- create policy "public write rolls" on public.rolls
-- for insert with check (true);
