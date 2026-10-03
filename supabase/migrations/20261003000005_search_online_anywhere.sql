-- Search: the client's city plus online coaches from any other city.
-- In-person coaching needs the same city; online coaching does not. Coaches who only train
-- in person never appear outside their city, and place/gym filters (in-person only) keep the
-- search to the chosen city. Same-city coaches are listed first.
drop function if exists public.search_trainers(text, text, text[], text, text, text, text, text, int, int);

create or replace function public.search_trainers(
  p_city text default null,               -- null = every city
  p_q text default null,                  -- free text: name, bio, specialization or gym
  p_specs text[] default null,            -- any of these specializations
  p_pref text default null,               -- 'online' | 'offline' (coaches offering it, incl. 'both')
  p_level text default null,              -- 'competitive' | 'pro'
  p_gym text default null,                -- trains at this gym id
  p_place text default null,              -- 'gym' | 'home' | 'outdoor'
  p_prefer_gym text default null,         -- sort coaches at this gym first
  p_online_anywhere boolean default false,-- with p_city: also online coaches from other cities
  p_limit int default 20,
  p_offset int default 0
) returns setof public.trainers
  language sql stable security invoker set search_path = public as $$
  select t.* from trainers t
  where t.is_kyc_approved
    and (p_city is null
         or t.city = p_city
         or (p_online_anywhere and t.session_preference <> 'offline' and p_place is null and p_gym is null))
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
           (p_city is not null and t.city = p_city) desc,
           t.rating desc, t.total_reviews desc, t.id
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

grant execute on function public.search_trainers(text, text, text[], text, text, text, text, text, boolean, int, int) to authenticated;
