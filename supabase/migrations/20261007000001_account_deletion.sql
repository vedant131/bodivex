-- "Delete my account" (App Store requirement; DPDP right to erasure).
-- Deleting an account removes the person's profile, bookings, chats and reviews they wrote.
-- Records that belong to someone else keep working but no longer name them:
-- a coach's fee ledger and public Q&A show "Deleted user".

-- Bookings go with either participant's account (previously they blocked deletion).
alter table public.sessions
  drop constraint sessions_client_id_fkey,
  add constraint sessions_client_id_fkey foreign key (client_id) references public.users on delete cascade,
  drop constraint sessions_trainer_id_fkey,
  add constraint sessions_trainer_id_fkey foreign key (trainer_id) references public.trainers on delete cascade,
  drop constraint sessions_chat_id_fkey,
  add constraint sessions_chat_id_fkey foreign key (chat_id) references public.chats on delete set null;

-- Supabase-specific: also removes the login (auth.users). On another host, delete the
-- identity-provider user here instead. Files in storage are removed by the app first
-- (Storage API), since storage rows can't be deleted with SQL.
create or replace function public.delete_my_account() returns void
  language plpgsql security definer set search_path = public as $$
declare
  uid uuid := me();
begin
  if uid is null then raise exception 'Sign in first.'; end if;

  -- Other people's records: keep them, drop the name
  update leads set client_name = 'Deleted user' where client_id = uid;
  update qa set client_name = 'Deleted user', asker_photo = null where client_id = uid;
  update gyms set created_by = null where created_by = uid;

  delete from chats where uid = any (participants);       -- messages cascade
  delete from scheduled_checkins where uid in (trainer_id, client_id);
  delete from users where id = uid;                        -- cascades profile, bookings, reviews, Q&A on own profile, ledger, admin
  delete from auth.users where id = uid;                   -- the login itself
end $$;

grant execute on function public.delete_my_account() to authenticated;
