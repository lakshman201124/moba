-- Test-only data, loaded into the template database after the real migrations and seed.
-- Never run this against a real Supabase project.

-- 50 tables. QR token for table n = md5('moba-test-' || n), so tests can compute it.
-- T49 is switched off (inactive) for "table not taking orders" tests.
insert into public.dining_tables (label, qr_token, seats, sort_order, is_active)
select 'T' || n, md5('moba-test-' || n), 4, n, n <> 49
  from generate_series(1, 50) n;

-- One staff member (owner) for staff_* calls made from tests.
insert into auth.users (id) values ('11111111-1111-4111-8111-111111111111');
insert into public.staff (user_id, display_name, role)
values ('11111111-1111-4111-8111-111111111111', 'Test Owner', 'owner');

-- A signed-in user who is NOT staff (for permission tests).
insert into auth.users (id) values ('22222222-2222-4222-8222-222222222222');

update public.restaurant_settings set ordering_open = true, visit_order_minutes = 5, session_idle_hours = 6;
