begin;

-- ---------------------------------------------------------------------------
-- CareCall leaderboard: every run competes.
--
-- Run this AFTER 202611080001_carecall_top20_seed.sql. Safe to re-run.
--
-- Previously only runs started at shift 1 could be stored. That gate hid the
-- name-entry form for anyone who began at a later unlocked shift, which read as
-- "no way to get on the board". Starting later earns no free points (the score
-- still accumulates from zero), so there is no fairness reason to exclude those
-- runs. The start shift is still recorded for context; it just no longer gates.
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
    or p_start_level is null or p_start_level not between 1 and 50 then
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

  -- Only qualifying runs are stored. A full board's 20th score is the bar;
  -- anything above it pushes every lower place down and the 20th falls off.
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

revoke all on function public.carecall_submit_score(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.carecall_submit_score(uuid, text, integer, integer, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
