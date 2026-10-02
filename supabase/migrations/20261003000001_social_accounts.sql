-- More social platforms for coaches. Still private until a booking is accepted.
alter table public.trainer_private add column facebook text, add column x text;

-- accept_booking now copies every social column (not a hard-coded list), so adding a
-- platform later only needs a column. Body otherwise identical to the core migration.
create or replace function public.accept_booking(p_session uuid, p_payment text default null) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  t trainers;
  social trainer_private;
  is_new boolean;
  fee int := 0;
  pay_ref text;
begin
  select * into s from sessions where id = p_session for update;
  if s.id is null or s.trainer_id <> me() then raise exception 'Booking not found.'; end if;
  if s.status <> 'pending' then raise exception 'This request was already handled.'; end if;
  if s.scheduled_at < now() then raise exception 'This request has expired.'; end if;

  select * into t from trainers where id = me() for update;
  if not t.is_kyc_approved then raise exception 'Your profile is not approved yet.'; end if;

  is_new := not exists (select 1 from leads where trainer_id = t.id and client_id = s.client_id);
  if is_new and t.lead_count >= 3 then fee := 149; end if;

  if fee > 0 then
    if p_payment = 'test' and coalesce((select value from app_settings where key = 'allow_test_payments'), '') = 'true' then
      pay_ref := 'test_' || extract(epoch from now())::bigint;
    else
      raise exception 'payment-required' using detail = fee::text;
    end if;
  end if;

  if is_new then
    insert into leads (trainer_id, client_id, client_name, first_session_id, fee, payment_ref)
    values (t.id, s.client_id, s.client_name, s.id, fee, pay_ref);
    update trainers set lead_count = lead_count + 1, fees_paid = fees_paid + fee where id = t.id;
  end if;

  select * into social from trainer_private where trainer_id = t.id;

  update sessions set
    status = 'confirmed',
    confirmed_at = now(),
    video_call_room_id = case when s.type = 'online' then 'bodivex-' || replace(gen_random_uuid()::text, '-', '') end,
    trainer_social = nullif(jsonb_strip_nulls(to_jsonb(social) - 'trainer_id'), '{}'::jsonb)
  where id = s.id;

  if s.chat_id is not null then update chats set is_unlocked = true where id = s.chat_id; end if;

  return jsonb_build_object('fee', fee, 'confirmed', true);
end $$;
