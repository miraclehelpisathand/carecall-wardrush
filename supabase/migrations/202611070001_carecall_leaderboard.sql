begin;

-- Keep raw scores and guest identifiers outside the exposed API schemas.
create schema if not exists carecall_private;
revoke all on schema carecall_private from public, anon, authenticated;

create table if not exists carecall_private.scores (
  run_id uuid primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name ~ '^[A-Z0-9][A-Z0-9 ]{0,7}$' and name = btrim(name)),
  score integer not null check (score between 1 and 10000000),
  level smallint not null check (level between 1 and 50),
  created_at timestamptz not null default now()
);

alter table carecall_private.scores enable row level security;
revoke all on carecall_private.scores from public, anon, authenticated;

create index if not exists carecall_scores_ranking
  on carecall_private.scores (score desc, level desc, created_at asc, run_id asc);
create index if not exists carecall_scores_player_time
  on carecall_private.scores (player_id, created_at desc);

-- This deliberately narrow read API exposes only eight public score records.
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
  limit 8;
$$;

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

  -- Serialize each guest's writes so simultaneous requests cannot bypass the limit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_player::text, 0));
  select s.* into v_existing from carecall_private.scores as s where s.run_id = p_run_id;
  if found then
    if v_existing.player_id <> v_player or v_existing.name <> v_name
      or v_existing.score <> p_score or v_existing.level <> p_level then
      raise exception 'Run already submitted with different details' using errcode = '22023';
    end if;
    -- A retry after a lost response is safe and never creates another score.
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

  return query
    insert into carecall_private.scores as s (run_id, player_id, name, score, level, created_at)
    values (p_run_id, v_player, v_name, p_score, p_level::smallint, v_now)
    returning s.run_id, s.name, s.score, s.level, s.created_at;
end;
$$;

-- Functions run as their owner only after the above checks; no direct table API.
revoke all on function public.carecall_leaderboard() from public, anon, authenticated;
grant execute on function public.carecall_leaderboard() to anon, authenticated;
revoke all on function public.carecall_submit_score(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.carecall_submit_score(uuid, text, integer, integer, integer) to authenticated;

notify pgrst, 'reload schema';
commit;