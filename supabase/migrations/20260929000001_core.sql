-- Bodivex core schema. Plain PostgreSQL (15+): tables, row-level security, column grants,
-- triggers and the booking/fee functions. Nothing here is Supabase-specific except that
-- me() reads the signed-in user from auth.uid(); on another host (AWS RDS + any JWT auth)
-- redefine me() and create the `authenticated` role, the rest runs unchanged.
-- Supabase-only setup (storage bucket, realtime) lives in the *_supabase.sql migration.

create or replace function public.me() returns uuid
  language sql stable as $$ select auth.uid() $$;

-- Anti-leak: no phone numbers, links, emails or social handles in public text.
create or replace function public.no_contact_info(t text) returns boolean
  language sql immutable as $$
  select t is null or t !~* '(https?://|www\.|wa\.me|t\.me|instagram|insta\y|whatsapp|telegram|[0-9][0-9 ()+.-]{7,}[0-9]|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|@[a-z0-9_.]{3,})'
$$;

create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- True when the statement runs as an end user (not inside a SECURITY DEFINER function / admin).
create or replace function public.is_end_user() returns boolean
  language sql stable as $$ select current_user in ('authenticated', 'anon') $$;

-- Server-side switches (e.g. allow_test_payments). Only admins write these.
create table public.app_settings (key text primary key, value text not null);

-- ─── Users ──────────────────────────────────────────────────────────────────
create table public.users (
  id uuid primary key,
  phone text not null,
  email text,
  name text not null default '',
  profile_photo text,
  role text not null check (role in ('client', 'trainer')),
  kyc_status text not null default 'not_started',
  aadhaar_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_touch before update on public.users for each row execute function touch_updated_at();
alter table public.users enable row level security;
create policy users_own on public.users for all using (id = me()) with check (id = me());

-- ─── Client profiles (private to the client) ───────────────────────────────
create table public.clients (
  user_id uuid primary key references public.users on delete cascade,
  name text,
  age int,
  gender text,
  height numeric,
  height_unit text,
  weight numeric,
  profile_photo text,
  fitness_level text,
  currently_goes_to_gym boolean,
  gym_name text,
  gym jsonb,
  city text,
  goals text[],
  session_preference text,
  budget_range text,
  athlete_level text,
  sport text,
  federation text,
  next_competition text,
  aadhaar_verified boolean not null default false,
  fitness_blueprint jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_touch before update on public.clients for each row execute function touch_updated_at();
alter table public.clients enable row level security;
create policy clients_own on public.clients for all using (user_id = me())
  with check (user_id = me() and aadhaar_verified = false);

-- ─── Trainer profiles (public once approved) ───────────────────────────────
create table public.trainers (
  id uuid primary key references public.users on delete cascade,
  user_id uuid not null,
  name text not null default '',
  bio text not null default '',
  profile_photo text,
  -- Compulsory 30–60s intro (length checked in the app); can be replaced, never removed.
  video_intro_url text not null check (video_intro_url ~ '^https?://'),
  specializations text[] not null default '{}',
  certifications jsonb not null default '[]',
  medals jsonb not null default '[]',
  experience int not null default 0,
  pricing_online int,
  pricing_offline int,
  pricing_monthly int,
  gym_location jsonb,
  gyms jsonb not null default '[]',
  gym_ids text[] not null default '{}',
  in_person_places text[],
  session_preference text not null default 'both' check (session_preference in ('online', 'offline', 'both')),
  is_available_now boolean not null default false,
  availability_status text not null default 'offline',
  languages text[] not null default '{}',
  coaches_levels text[],
  federations text[],
  city text not null default '',
  state text not null default 'Maharashtra',
  -- Server-managed: approval, stats and fee counters (no end-user grant, see bottom)
  is_kyc_approved boolean not null default false,
  kyc_status text not null default 'pending',
  rating numeric(2, 1) not null default 0,
  total_reviews int not null default 0,
  total_sessions int not null default 0,
  lead_count int not null default 0,
  fees_paid int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id = id)
);
create index trainers_city on public.trainers (city) where is_kyc_approved;
create trigger trainers_touch before update on public.trainers for each row execute function touch_updated_at();
alter table public.trainers enable row level security;
create policy trainers_read on public.trainers for select using (is_kyc_approved or id = me());
create policy trainers_insert on public.trainers for insert with check (id = me());
create policy trainers_update on public.trainers for update using (id = me());

-- Social handles: owner only. accept_booking copies them onto the session for the client.
create table public.trainer_private (
  trainer_id uuid primary key references public.trainers on delete cascade,
  instagram text,
  youtube text
);
alter table public.trainer_private enable row level security;
create policy trainer_private_own on public.trainer_private for all using (trainer_id = me()) with check (trainer_id = me());

-- New-client fee ledger, written only by accept_booking.
create table public.leads (
  trainer_id uuid references public.trainers on delete cascade,
  client_id uuid,
  client_name text not null,
  first_session_id uuid,
  fee int not null default 0,
  payment_ref text,
  created_at timestamptz not null default now(),
  primary key (trainer_id, client_id)
);
alter table public.leads enable row level security;
create policy leads_own on public.leads for select using (trainer_id = me());

-- ─── Gyms (shared directory; anyone signed in can add, nobody edits) ────────
create table public.gyms (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(name) between 2 and 60 and no_contact_info(name)),
  area text not null default '' check (length(area) <= 40 and no_contact_info(area)),
  city text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index gyms_city on public.gyms (city);
alter table public.gyms enable row level security;
create policy gyms_read on public.gyms for select using (me() is not null);
create policy gyms_insert on public.gyms for insert with check (created_by = me());

-- ─── Chats ──────────────────────────────────────────────────────────────────
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  participants uuid[] not null check (cardinality(participants) = 2),
  participant_names jsonb not null default '{}',
  participant_photos jsonb,
  trainer_id uuid not null,
  session_id uuid,
  is_unlocked boolean not null default false,   -- set only by accept_booking
  last_message text,
  last_message_type text,
  last_message_at timestamptz not null default now(),
  unread_count jsonb not null default '{}',
  typing jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (trainer_id = any (participants))
);
create index chats_participants on public.chats using gin (participants);
alter table public.chats enable row level security;
create policy chats_read on public.chats for select using (me() = any (participants));
create policy chats_insert on public.chats for insert with check (me() = any (participants) and not is_unlocked);
create policy chats_update on public.chats for update using (me() = any (participants));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats on delete cascade,
  sender_id uuid not null,
  sender_name text not null default '',
  type text not null default 'text' check (type in ('text', 'photo', 'voice', 'system')),
  text text,
  photo_url text,
  voice_url text,
  voice_duration_secs int,
  translated jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_chat on public.messages (chat_id, created_at);
alter table public.messages enable row level security;
create policy messages_read on public.messages for select
  using (exists (select 1 from public.chats c where c.id = chat_id and me() = any (c.participants)));

-- ─── Sessions (booking requests) ────────────────────────────────────────────
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users,
  trainer_id uuid not null references public.trainers,
  client_name text not null,
  trainer_name text not null,
  client_photo text,
  trainer_photo text,
  type text not null check (type in ('online', 'offline')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  scheduled_at timestamptz not null,
  ended_at timestamptz,
  duration_mins int not null default 60,
  place text check (place in ('gym', 'home', 'outdoor')),
  place_label text,
  slot_key text not null,          -- YYYY-MM-DD-HH (trainer-local hour)
  price int not null check (price >= 0),
  chat_id uuid references public.chats,
  trainer_social jsonb,             -- revealed on accept
  video_call_room_id text,          -- set on accept for online sessions
  confirmed_at timestamptz,
  client_rating int check (client_rating between 1 and 5),
  client_review text,
  cancel_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trainer_id <> client_id)
);
-- The slot lock: a trainer hour can hold only one live booking, so two clients
-- tapping the same slot can't both succeed. Cancelling frees it.
create unique index sessions_slot_lock on public.sessions (trainer_id, slot_key) where status <> 'cancelled';
create index sessions_client on public.sessions (client_id, scheduled_at desc);
create index sessions_trainer on public.sessions (trainer_id, scheduled_at desc);
create trigger sessions_touch before update on public.sessions for each row execute function touch_updated_at();
alter table public.sessions enable row level security;
create policy sessions_read on public.sessions for select using (me() in (client_id, trainer_id));
create policy sessions_insert on public.sessions for insert with check (
  client_id = me() and status = 'pending'
  and exists (select 1 from public.trainers t where t.id = trainer_id and t.is_kyc_approved and t.is_available_now)
);
create policy sessions_update on public.sessions for update using (me() in (client_id, trainer_id));

-- Allowed status moves for end users (accepting goes through accept_booking for the fee):
--   trainer: pending -> cancelled (decline)
--   client:  pending -> cancelled, or confirmed -> completed once the session time has passed
create or replace function public.sessions_guard() returns trigger language plpgsql as $$
begin
  if not is_end_user() then return new; end if;
  if old.trainer_id = me() and old.status = 'pending' and new.status = 'cancelled'
     and new.client_rating is not distinct from old.client_rating
     and new.client_review is not distinct from old.client_review then
    return new;
  end if;
  if old.client_id = me() and (
       (old.status = 'pending' and new.status = 'cancelled')
    or (old.status = 'confirmed' and new.status = 'completed' and now() >= old.scheduled_at)) then
    return new;
  end if;
  raise exception 'This booking can''t be changed that way.' using errcode = '42501';
end $$;
create trigger sessions_guard before update on public.sessions for each row execute function sessions_guard();

-- Completed in-app sessions count toward rank.
create or replace function public.sessions_count_completed() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    update trainers set total_sessions = total_sessions + 1 where id = new.trainer_id;
  end if;
  return new;
end $$;
create trigger sessions_completed after update of status on public.sessions
  for each row execute function sessions_count_completed();

-- ─── Reviews: one per completed session (id = session id) ───────────────────
create table public.reviews (
  id uuid primary key references public.sessions on delete cascade,
  session_id uuid not null,
  client_id uuid not null,
  client_name text not null default '',
  client_photo text,
  trainer_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  check (id = session_id)
);
create index reviews_trainer on public.reviews (trainer_id, created_at desc);
alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select using (me() is not null);
create policy reviews_insert on public.reviews for insert with check (
  client_id = me()
  and exists (select 1 from public.sessions s where s.id = session_id
              and s.client_id = me() and s.status = 'completed' and s.trainer_id = reviews.trainer_id)
);

create or replace function public.reviews_update_rating() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update trainers
     set rating = round((rating * total_reviews + new.rating) / (total_reviews + 1), 1),
         total_reviews = total_reviews + 1
   where id = new.trainer_id;
  return new;
end $$;
create trigger reviews_rating after insert on public.reviews for each row execute function reviews_update_rating();

-- ─── Public Q&A on trainer profiles ─────────────────────────────────────────
create table public.qa (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers on delete cascade,
  client_id uuid not null,
  client_name text not null default '',
  asker_role text not null default 'client' check (asker_role in ('client', 'trainer')),
  asker_photo text,
  question text not null check (length(question) <= 500 and no_contact_info(question)),
  answer text check (length(answer) <= 1000 and no_contact_info(answer)),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index qa_trainer on public.qa (trainer_id, created_at desc);
alter table public.qa enable row level security;
create policy qa_read on public.qa for select using (me() is not null);
create policy qa_insert on public.qa for insert with check (client_id = me() and answer is null);
create policy qa_answer on public.qa for update using (trainer_id = me());

-- ─── Transformations (trainer-owned, public) ────────────────────────────────
create table public.transformations (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers on delete cascade,
  before_photo_url text not null,
  after_photo_url text not null,
  ai_verified boolean not null default false,  -- no AI check yet; never claim one
  ai_score int,
  ai_flags text[],
  client_consent_given boolean not null,
  caption text,
  weight_lost_kg numeric,
  duration_weeks int,
  created_at timestamptz not null default now()
);
create index transformations_trainer on public.transformations (trainer_id, created_at desc);
alter table public.transformations enable row level security;
create policy transformations_read on public.transformations for select using (me() is not null);
create policy transformations_insert on public.transformations for insert with check (trainer_id = me() and client_consent_given);
create policy transformations_delete on public.transformations for delete using (trainer_id = me());

-- ─── Scheduled check-ins ────────────────────────────────────────────────────
create table public.scheduled_checkins (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null,
  client_id uuid not null,
  message text not null,
  scheduled_for timestamptz not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  day_of_week int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.scheduled_checkins enable row level security;
create policy checkins_read on public.scheduled_checkins for select using (me() in (trainer_id, client_id));
create policy checkins_write on public.scheduled_checkins for all using (trainer_id = me()) with check (trainer_id = me());

-- ─── Functions the app calls ────────────────────────────────────────────────

-- Busy hours for a trainer (keys only: clients can't see each other's bookings).
create or replace function public.booked_slot_keys(p_trainer uuid) returns setof text
  language sql stable security definer set search_path = public as $$
  select slot_key from sessions
   where trainer_id = p_trainer and status <> 'cancelled' and scheduled_at > now() - interval '1 day'
$$;

-- Fee the trainer would pay to accept this client now.
create or replace function public.accept_fee(p_client uuid) returns int
  language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from leads where trainer_id = me() and client_id = p_client) then 0
    when (select lead_count from trainers where id = me()) >= 3 then 149
    else 0 end
$$;

/*
 * Trainer accepts a pending booking. The first 3 distinct clients are free; after that each
 * NEW client costs ₹149 (returning clients are free). Confirms the session, unlocks chat,
 * creates the video room and reveals the trainer's socials — all in one transaction.
 * Note: payment is accepted as 'test' only when app_settings.allow_test_payments = 'true';
 * verify a Razorpay payment id here at launch. Keep 3/149 in sync with constants/config.ts.
 */
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
    trainer_social = case when coalesce(social.instagram, social.youtube) is not null
                          then jsonb_strip_nulls(jsonb_build_object('instagram', social.instagram, 'youtube', social.youtube)) end
  where id = s.id;

  if s.chat_id is not null then update chats set is_unlocked = true where id = s.chat_id; end if;

  return jsonb_build_object('fee', fee, 'confirmed', true);
end $$;

-- Send a message: participant-only, chat must be unlocked; bumps the other side's unread count.
create or replace function public.send_message(p_chat uuid, p_type text, p_text text, p_photo_url text,
                                                p_voice_url text, p_voice_secs int, p_sender_name text) returns void
  language plpgsql security definer set search_path = public as $$
declare c chats; other uuid;
begin
  select * into c from chats where id = p_chat for update;
  if c.id is null or not (me() = any (c.participants)) then raise exception 'Chat not found.'; end if;
  if not c.is_unlocked then raise exception 'Chat opens once the coach accepts the booking.'; end if;
  other := (select p from unnest(c.participants) p where p <> me() limit 1);

  insert into messages (chat_id, sender_id, sender_name, type, text, photo_url, voice_url, voice_duration_secs)
  values (p_chat, me(), coalesce(p_sender_name, ''), p_type, p_text, p_photo_url, p_voice_url, p_voice_secs);

  update chats set
    last_message = case p_type when 'text' then coalesce(p_text, '') when 'photo' then '📷 Photo'
                               when 'voice' then '🎙️ Voice message' else 'Message' end,
    last_message_type = p_type,
    last_message_at = now(),
    unread_count = unread_count
      || jsonb_build_object(me()::text, 0)
      || jsonb_build_object(other::text, coalesce((unread_count ->> other::text)::int, 0) + 1)
  where id = p_chat;
end $$;

create or replace function public.mark_chat_read(p_chat uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from chats where id = p_chat and me() = any (participants)) then return; end if;
  update chats set unread_count = unread_count || jsonb_build_object(me()::text, 0) where id = p_chat;
  update messages set read = true where chat_id = p_chat and sender_id <> me() and not read;
end $$;

create or replace function public.set_typing(p_chat uuid, p_typing boolean) returns void
  language sql security invoker as $$
  update public.chats set typing = typing || jsonb_build_object(me()::text, p_typing) where id = p_chat
$$;

-- ─── Privileges: deny by default, then grant exactly what end users may touch ──
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

grant select on public.users to authenticated;
grant insert (id, phone, email, name, profile_photo, role) on public.users to authenticated;
grant update (name, email, profile_photo) on public.users to authenticated;

grant select, insert, update, delete on public.clients to authenticated;

grant select on public.trainers to authenticated;
grant insert (id, user_id, name, bio, profile_photo, video_intro_url, specializations, certifications, medals,
              experience, pricing_online, pricing_offline, pricing_monthly, gym_location, gyms, gym_ids,
              in_person_places, session_preference, languages, coaches_levels, federations, city, state)
  on public.trainers to authenticated;
grant update (name, bio, profile_photo, video_intro_url, specializations, certifications, medals,
              experience, pricing_online, pricing_offline, pricing_monthly, gym_location, gyms, gym_ids,
              in_person_places, session_preference, is_available_now, availability_status, languages,
              coaches_levels, federations, city, state)
  on public.trainers to authenticated;

grant select, insert, update, delete on public.trainer_private to authenticated;
grant select on public.leads to authenticated;
grant select on public.gyms to authenticated;
grant insert (name, area, city, created_by) on public.gyms to authenticated;

grant select on public.chats to authenticated;
grant insert (participants, participant_names, participant_photos, trainer_id, session_id, unread_count) on public.chats to authenticated;
grant update (typing, participant_photos) on public.chats to authenticated;
grant select on public.messages to authenticated;

grant select on public.sessions to authenticated;
grant insert (client_id, trainer_id, client_name, trainer_name, client_photo, trainer_photo, type, scheduled_at,
              duration_mins, place, place_label, slot_key, price, chat_id, notes)
  on public.sessions to authenticated;
grant update (status, cancel_reason, client_rating, client_review, ended_at) on public.sessions to authenticated;

grant select on public.reviews to authenticated;
grant insert (id, session_id, client_id, client_name, client_photo, trainer_id, rating, comment) on public.reviews to authenticated;

grant select on public.qa to authenticated;
grant insert (trainer_id, client_id, client_name, asker_role, asker_photo, question) on public.qa to authenticated;
grant update (answer, answered_at) on public.qa to authenticated;

grant select, delete on public.transformations to authenticated;
grant insert (trainer_id, before_photo_url, after_photo_url, client_consent_given, caption, weight_lost_kg, duration_weeks)
  on public.transformations to authenticated;

grant select, insert, update, delete on public.scheduled_checkins to authenticated;

grant execute on function public.me(), public.no_contact_info(text), public.booked_slot_keys(uuid),
  public.accept_fee(uuid), public.accept_booking(uuid, text), public.send_message(uuid, text, text, text, text, int, text),
  public.mark_chat_read(uuid), public.set_typing(uuid, boolean) to authenticated;
-- Trigger functions run as the table owner; RLS helpers need to be callable inside policies.
grant execute on function public.is_end_user(), public.touch_updated_at(), public.sessions_guard() to authenticated;
