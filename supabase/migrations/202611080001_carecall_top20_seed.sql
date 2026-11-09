begin;

-- ---------------------------------------------------------------------------
-- CareCall leaderboard: top 20, automatic storage, seeded opening board.
--
-- Run this AFTER 202611070001_carecall_leaderboard.sql. Safe to re-run:
-- it never duplicates or overwrites real player scores.
-- ---------------------------------------------------------------------------

create schema if not exists carecall_private;

create table if not exists carecall_private.scores (
  run_id uuid primary key,
  player_id uuid references auth.users(id) on delete cascade,
  name text not null check (name ~ '^[A-Z0-9][A-Z0-9 ]{0,7}$' and name = btrim(name)),
  score integer not null check (score between 1 and 10000000),
  level smallint not null check (level between 1 and 50),
  created_at timestamptz not null default now()
);

-- Seeded house scores have no owning player; every real score must have one.
alter table carecall_private.scores add column if not exists is_seed boolean not null default false;
alter table carecall_private.scores alter column player_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'carecall_scores_owner_present'
  ) then
    alter table carecall_private.scores
      add constraint carecall_scores_owner_present
      check ((is_seed and player_id is null) or (not is_seed and player_id is not null));
  end if;
end $$;

alter table carecall_private.scores enable row level security;
revoke all on carecall_private.scores from public, anon, authenticated;

create index if not exists carecall_scores_ranking
  on carecall_private.scores (score desc, level desc, created_at asc, run_id asc);
create index if not exists carecall_scores_player_time
  on carecall_private.scores (player_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Public read: the top 20 of all players. No guest ids are exposed.
-- ---------------------------------------------------------------------------
create or replace function public.carecall_leaderboard()
returns table (run_id uuid, name text, score integer, level smallint, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.run_id, s.name, s.score, s.level, s.created_at
  from carecall_private.scores as s
  order by s.score desc, s.level desc, s.created_at asc, s.run_id asc
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Write: only store a run that actually reaches the top 20.
-- The board is the same for everyone; there is no per-device opt-in.
-- ---------------------------------------------------------------------------
create or replace function public.carecall_submit_score(
  p_run_id uuid,
  p_name text,
  p_score integer,
  p_level integer,
  p_start_level integer
)
returns table (run_id uuid, name text, score integer, level smallint, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player uuid := auth.uid();
  v_name text := upper(btrim(p_name));
  v_existing carecall_private.scores%rowtype;
  v_now timestamptz;
  v_cutoff integer;
  v_count integer;
begin
  if v_player is null then
    raise exception 'A guest session is required' using errcode = '42501';
  end if;
  if p_run_id is null or v_name is null or v_name !~ '^[A-Z0-9][A-Z0-9 ]{0,7}$'
    or p_score is null or p_score not between 1 and 10000000
    or p_level is null or p_level not between 1 and 50
    or p_start_level is distinct from 1 then
    raise exception 'Invalid score submission' using errcode = '22023';
  end if;

  -- Serialize each guest's writes so parallel requests cannot bypass the limit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_player::text, 0));

  select s.* into v_existing from carecall_private.scores as s where s.run_id = p_run_id;
  if found then
    if v_existing.is_seed or v_existing.player_id is distinct from v_player
      or v_existing.name <> v_name or v_existing.score <> p_score or v_existing.level <> p_level then
      raise exception 'Run already submitted with different details' using errcode = '22023';
    end if;
    -- Idempotent retry after a lost response.
    return query select v_existing.run_id, v_existing.name, v_existing.score, v_existing.level, v_existing.created_at;
    return;
  end if;

  v_now := clock_timestamp();
  if exists (
    select 1 from carecall_private.scores as s
    where s.player_id = v_player and s.created_at > v_now - interval '1 minute'
  ) then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- Only qualifying runs are stored. A full board's 20th score is the bar.
  -- Qualified alias: the function's OUT parameters share these column names.
  select count(*), min(t.score) into v_count, v_cutoff
  from (
    select s.score from carecall_private.scores as s
    order by s.score desc, s.level desc, s.created_at asc, s.run_id asc
    limit 20
  ) as t;

  if v_count >= 20 and p_score <= v_cutoff then
    raise exception 'BELOW_CUTOFF' using errcode = 'P0001';
  end if;

  return query
    insert into carecall_private.scores as s (run_id, player_id, name, score, level, created_at, is_seed)
    values (p_run_id, v_player, v_name, p_score, p_level::smallint, v_now, false)
    returning s.run_id, s.name, s.score, s.level, s.created_at;
end;
$$;

revoke all on function public.carecall_leaderboard() from public, anon, authenticated;
grant execute on function public.carecall_leaderboard() to anon, authenticated;
revoke all on function public.carecall_submit_score(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.carecall_submit_score(uuid, text, integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Opening board. Values match src/lib/seedScores.ts and come from the game's
-- real scoring curve; TONY leads on a run that ends around shift 20.
-- Inserted only while no real player score exists, so a re-run is harmless.
-- ---------------------------------------------------------------------------
insert into carecall_private.scores (run_id, player_id, name, score, level, created_at, is_seed)
select v.run_id, null::uuid, v.name, v.score, v.level::smallint,
       timestamptz '2026-01-01 06:00:00+00' + (v.ord || ' minutes')::interval, true
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'TONY',     248650, 20,  0),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'MATRON',   231480, 19,  1),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'NURSE JO', 214905, 19,  2),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'DEV 42',   198340, 18,  3),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'SCRUBS',   184720, 18,  4),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'NIGHTOWL', 171265, 17,  5),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'PRIYA',    158910, 16,  6),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'BLUECAP',  146380, 16,  7),
  ('00000000-0000-4000-8000-000000000009'::uuid, 'RM 10',    134025, 15,  8),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'HAZEL',    122470, 14,  9),
  ('00000000-0000-4000-8000-000000000011'::uuid, 'STEADY',   111905, 13, 10),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'OMAR',     101340, 12, 11),
  ('00000000-0000-4000-8000-000000000013'::uuid, 'JANET',     91780, 12, 12),
  ('00000000-0000-4000-8000-000000000014'::uuid, 'TEA RUN',   82155, 11, 13),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'KWAME',     73600, 10, 14),
  ('00000000-0000-4000-8000-000000000016'::uuid, 'SHIFT 9',   61240,  9, 15),
  ('00000000-0000-4000-8000-000000000017'::uuid, 'LUCY',      49815,  8, 16),
  ('00000000-0000-4000-8000-000000000018'::uuid, 'ROOKIE',    36270,  7, 17),
  ('00000000-0000-4000-8000-000000000019'::uuid, 'AIDES',     21430,  5, 18),
  ('00000000-0000-4000-8000-000000000020'::uuid, 'INTERN',    12460,  4, 19)
) as v(run_id, name, score, level, ord)
where not exists (
  select 1 from carecall_private.scores as s where s.is_seed = false
)
on conflict (run_id) do nothing;

notify pgrst, 'reload schema';
commit;
