-- Local dev only (supabase db reset). Test payments are off on any real deployment unless set there.
insert into public.app_settings (key, value) values ('allow_test_payments', 'true') on conflict do nothing;
