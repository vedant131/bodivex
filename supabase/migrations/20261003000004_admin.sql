-- Admin review of new coaches, inside the app. Plain PostgreSQL.
-- Admins are added only with the service key (no end-user grants on this table).
create table public.admins (
  user_id uuid primary key references public.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;  -- no policies: invisible to app users

-- Why a coach was not approved (shown to that coach). Server-written only: no update grant.
alter table public.trainers add column kyc_note text;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = me())
$$;

-- Coaches by review status, with the phone number from their account so the team can call
-- them to check ID and certificates. p_status: 'pending' | 'rejected' | 'approved'.
create or replace function public.admin_list_trainers(p_status text default 'pending')
  returns table (trainer jsonb, phone text)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only Bodivex admins can do this.' using errcode = '42501'; end if;
  return query
    select to_jsonb(t), u.phone
    from trainers t join users u on u.id = t.id
    where t.kyc_status = p_status
    order by t.updated_at desc
    limit 200;
end $$;

create or replace function public.admin_review_trainer(p_trainer uuid, p_approve boolean, p_note text default null)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only Bodivex admins can do this.' using errcode = '42501'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'Add a reason so the coach knows what to fix.'; end if;
  update trainers set
    is_kyc_approved = p_approve,
    kyc_status = case when p_approve then 'approved' else 'rejected' end,
    kyc_note = case when p_approve then null else trim(p_note) end
  where id = p_trainer;
  if not found then raise exception 'Coach not found.'; end if;
end $$;

-- A rejected coach who edits and saves their profile goes back into the review queue.
create or replace function public.trainers_resubmit() returns trigger
  language plpgsql as $$
begin
  if is_end_user() and old.kyc_status = 'rejected' then
    new.kyc_status := 'pending';
  end if;
  return new;
end $$;
create trigger trainers_resubmit before update on public.trainers
  for each row execute function trainers_resubmit();

grant execute on function public.is_admin(), public.admin_list_trainers(text),
  public.admin_review_trainer(uuid, boolean, text) to authenticated;
grant execute on function public.trainers_resubmit() to authenticated;
