-- Complete a session and save its review in ONE transaction (previously two app requests,
-- so a dropped connection could leave a completed session without its review).
-- Security invoker: the caller's RLS, column grants and the sessions_guard rules still apply
-- (only the client, only a confirmed session, only after its start time).
create or replace function public.complete_session(p_session uuid, p_rating int default null, p_review text default null)
  returns void
  language plpgsql security invoker set search_path = public as $$
declare
  s sessions;
  review text := nullif(trim(p_review), '');
begin
  update sessions
     set status = 'completed', client_rating = p_rating, client_review = review, ended_at = now()
   where id = p_session
  returning * into s;
  if s.id is null then raise exception 'Booking not found.'; end if;

  if p_rating is not null then
    insert into reviews (id, session_id, client_id, client_name, trainer_id, rating, comment)
    values (s.id, s.id, s.client_id, s.client_name, s.trainer_id, p_rating, coalesce(review, ''));
  end if;
end $$;

grant execute on function public.complete_session(uuid, int, text) to authenticated;
