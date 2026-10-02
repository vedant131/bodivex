-- Scale fixes: do filtering, text search, ranking and counting in the database and send the
-- phone only one page of results. Plain PostgreSQL; RLS still applies (security invoker).

-- ─── Coach search, one page at a time ─────────────────────────────────────────
create or replace function public.search_trainers(
  p_city text default null,          -- null = every city (online search)
  p_q text default null,             -- free text: name, bio, specialization or gym
  p_specs text[] default null,       -- any of these specializations
  p_pref text default null,          -- 'online' | 'offline' (coaches offering it, incl. 'both')
  p_level text default null,         -- 'competitive' | 'pro' (missing = enthusiasts only)
  p_gym text default null,           -- trains at this gym id
  p_place text default null,         -- 'gym' | 'home' | 'outdoor'
  p_prefer_gym text default null,    -- sort coaches at this gym first
  p_limit int default 20,
  p_offset int default 0
) returns setof public.trainers
  language sql stable security invoker set search_path = public as $$
  select t.* from trainers t
  where t.is_kyc_approved
    and (p_city is null or t.city = p_city)
    and (p_pref is null or t.session_preference in (p_pref, 'both'))
    and (p_specs is null or t.specializations && p_specs)
    and (p_level is null or coalesce(t.coaches_levels, '{enthusiast}') @> array[p_level])
    and (p_gym is null or t.gym_ids @> array[p_gym])
    and (p_place is null or (
          t.session_preference <> 'online'
          and coalesce(t.in_person_places,
                       case when jsonb_array_length(t.gyms) > 0 or t.gym_location is not null then '{gym}'::text[] else '{}' end)
              @> array[p_place]))
    and (coalesce(p_q, '') = '' or strpos(lower(t.name || ' ' || t.bio || ' ' || array_to_string(t.specializations, ' ') || ' ' || t.gyms::text),
                                          lower(p_q)) > 0)
  order by (p_prefer_gym is not null and t.gym_ids @> array[p_prefer_gym]) desc,
           t.rating desc, t.total_reviews desc, t.id
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

-- ─── Coaches per gym in a city (gym directory) ────────────────────────────────
create or replace function public.trainer_counts_by_gym(p_city text)
  returns table (gym_id text, coaches int)
  language sql stable security invoker set search_path = public as $$
  select g, count(*)::int from trainers t, unnest(t.gym_ids) g
  where t.is_kyc_approved and t.city = p_city
  group by g
$$;

-- ─── Leaderboard ranked in the database (no 1,000-row API cap) ────────────────
-- Only in-app sessions and reviews count, so taking clients off-platform lowers rank.
create or replace function public.trainer_score(t public.trainers) returns int
  language sql immutable as $$ select round(t.total_sessions * 8 + t.rating * 60 + t.total_reviews * 6)::int $$;

create or replace function public.trainer_rankings(p_city text default null, p_mode text default 'all', p_limit int default 100)
  returns table (rank bigint, score int, trainer jsonb)
  language sql stable security invoker set search_path = public as $$
  select r.rank, r.score, to_jsonb(r.t) from (
    select t, trainer_score(t) as score, rank() over (order by trainer_score(t) desc) as rank
    from trainers t
    where t.is_kyc_approved
      and (p_city is null or t.city = p_city)
      and case p_mode when 'online' then t.session_preference in ('online', 'both')
                      when 'offline' then t.session_preference in ('offline', 'both')
                      when 'both' then t.session_preference = 'both'
                      else true end
  ) r
  order by r.rank, (r.t).total_reviews desc, (r.t).id
  limit least(greatest(p_limit, 1), 200)
$$;

-- The signed-in coach's own position, even when outside the top list (null if not approved).
-- Same ordering as trainer_rankings: equal scores share a rank.
create or replace function public.my_trainer_rank(p_city text default null, p_mode text default 'all')
  returns bigint
  language sql stable security invoker set search_path = public as $$
  select 1 + (select count(*) from trainers o
              where o.is_kyc_approved
                and (p_city is null or o.city = p_city)
                and case p_mode when 'online' then o.session_preference in ('online', 'both')
                                when 'offline' then o.session_preference in ('offline', 'both')
                                when 'both' then o.session_preference = 'both'
                                else true end
                and trainer_score(o) > trainer_score(me))
  from trainers me
  where me.id = me() and me.is_kyc_approved
    and (p_city is null or me.city = p_city)
$$;

-- ─── Chats: a plain client_id column so live updates can be filtered per user ─
alter table public.chats add column client_id uuid
  generated always as (case when participants[1] = trainer_id then participants[2] else participants[1] end) stored;
create index chats_client on public.chats (client_id, last_message_at desc);
create index chats_trainer on public.chats (trainer_id, last_message_at desc);

grant execute on function public.search_trainers(text, text, text[], text, text, text, text, text, int, int),
  public.trainer_counts_by_gym(text), public.trainer_score(public.trainers),
  public.trainer_rankings(text, text, int), public.my_trainer_rank(text, text) to authenticated;
