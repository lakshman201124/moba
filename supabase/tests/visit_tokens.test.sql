-- Attack and lifecycle tests for 20261102000100_visit_tokens.sql. Run as postgres; switches role per step.
-- Use a throwaway database: it writes fixtures and orders. Exits non-zero if any check fails.
--
--   createdb -p 54329 -U postgres moba_test
--   for f in supabase/tests/supabase-stubs.sql supabase/migrations/*.sql; do
--     psql -p 54329 -U postgres -d moba_test -v ON_ERROR_STOP=1 -q -f "$f"; done
--   psql -p 54329 -U postgres -d moba_test -f supabase/tests/visit_tokens.test.sql
\set ON_ERROR_STOP 1
\set QUIET 1
\pset format unaligned
\pset tuples_only on

drop schema if exists t cascade;
create schema t;
create table t.results (n serial, name text, expected text, got text);
grant usage on schema t to anon, authenticated;
grant insert, select on t.results to anon, authenticated;
grant usage on sequence t.results_n_seq to anon, authenticated;
-- Runs SQL as the current role; returns 'OK:<result>' or the error message.
create function t.run(p_sql text) returns text language plpgsql as $$
declare r text;
begin execute p_sql into r; return 'OK:' || coalesce(r, ''); exception when others then return sqlerrm; end $$;
grant execute on function t.run(text) to anon, authenticated;
create function t.check(p_name text, p_expected text, p_got text) returns void language sql as $$
  insert into t.results (name, expected, got) values (p_name, p_expected, p_got) $$;
grant execute on function t.check(text, text, text) to anon, authenticated;

-- Fixtures: two tables, one staff member, one ₹89 dish
delete from public.dining_tables where label in ('T1', 'T2');
insert into public.dining_tables (label, qr_token) values ('T1', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), ('T2', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111') on conflict do nothing;
insert into public.staff (user_id, display_name, role) values ('11111111-1111-1111-1111-111111111111', 'Test', 'owner') on conflict do nothing;
insert into public.categories (id, slug, name) values ('00000000-0000-4000-8000-0000000000c1', 'visit-test', 'Visit test') on conflict do nothing;
insert into public.dishes (id, category_id, name, price) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c1', 'Test dish', 89) on conflict do nothing;
update public.restaurant_settings set ordering_open = true, visit_order_minutes = 5;
\set DEV1 'd1d1d1d1-0000-4000-8000-000000000001'
\set DEV2 'd2d2d2d2-0000-4000-8000-000000000002'

-- ── as a diner ──
set role anon;
select t.check('V01 start_visit: bad QR format', 'INVALID_TABLE', t.run($$select public.start_visit('xyz', 'd1d1d1d1-0000-4000-8000-000000000001')$$));
select t.check('V02 start_visit: unknown QR', 'INVALID_TABLE', t.run($$select public.start_visit('cccccccccccccccccccccccccccccccc', 'd1d1d1d1-0000-4000-8000-000000000001')$$));
select t.check('V03 start_visit: bad device id', 'BAD_REQUEST', t.run($$select public.start_visit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'nope')$$));
select public.start_visit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', :'DEV1') ->> 'visit' as v1 \gset
select t.check('V04 start_visit: returns 64-hex token, 300 s window', 'true',
  (select (:'v1' ~ '^[0-9a-f]{64}$')::text));
select t.check('V05 anon cannot read table_visits', 'permission denied for table table_visits', t.run($$select count(*)::text from public.table_visits$$));
select t.check('V06 anon cannot call private.find_visit', 'permission denied for schema private', t.run($$select (private.find_visit('x','y')).id::text$$));
select t.check('V07 get_table_state with visit token', 'OK:T1|false|0',
  t.run(format($$select s->>'table' || '|' || (s->>'visitEnded') || '|' || jsonb_array_length(s->'orders') from public.get_table_state(%L, %L) s$$, :'v1', :'DEV1')));
select t.check('V08 visit token from another phone', 'INVALID_VISIT',
  t.run(format($$select public.get_table_state(%L, %L)::text$$, :'v1', :'DEV2')));
select t.check('V09 QR token used as a visit token', 'INVALID_VISIT',
  t.run(format($$select public.place_order('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', %L, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89)::text$$, :'DEV1')));
select t.check('V10 price tampering still refused', 'PRICE_CHANGED',
  t.run(format($$select public.place_order(%L, %L, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 1)::text$$, :'v1', :'DEV1')));
select t.check('V11 place_order inside the window', 'OK:1',
  t.run(format($$select (public.place_order(%L, %L, 'eeeeeeee-0000-4000-8000-000000000001', '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89))->>'guestNo'$$, :'v1', :'DEV1')));
reset role;
select t.check('V12 first order binds the visit to the table session', 'true',
  (select (session_id is not null)::text from public.table_visits where device_hash = encode(extensions.digest(:'DEV1', 'sha256'), 'hex') order by created_at desc limit 1));
select t.check('V13 raw visit token is not stored', '0',
  (select count(*)::text from public.table_visits where token_hash = :'v1'));
-- five minutes pass
update public.table_visits set order_until = now() - interval '1 second';
set role anon;
select t.check('V14 place_order after 5 minutes', 'VISIT_EXPIRED',
  t.run(format($$select public.place_order(%L, %L, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89)::text$$, :'v1', :'DEV1')));
select t.check('V15 retry of the same order after the window returns it (idempotent)', 'OK:1',
  t.run(format($$select (public.place_order(%L, %L, 'eeeeeeee-0000-4000-8000-000000000001', '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89))->>'guestNo'$$, :'v1', :'DEV1')));
select t.check('V16 order status still readable after the window', 'OK:1',
  t.run(format($$select jsonb_array_length(s->'orders')::text from public.get_table_state(%L, %L) s$$, :'v1', :'DEV1')));
-- guest scans again: a new 5-minute window, same guest
select public.start_visit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', :'DEV1') ->> 'visit' as v1b \gset
select t.check('V17 re-scan: sees own orders, orders again as the same guest', 'OK:1|1',
  t.run(format($$select jsonb_array_length(s->'orders') || '|' || (public.place_order(%L, %L, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89)->>'guestNo')
                 from public.get_table_state(%L, %L) s$$, :'v1b', :'DEV1', :'v1b', :'DEV1')));
select public.start_visit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', :'DEV1') ->> 'visit' as v1c \gset
reset role;

-- ── staff free the table ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.staff_free_table(s.id, 2, true) from public.table_sessions s join public.dining_tables d on d.id = s.table_id where d.label = 'T1' and s.status = 'open';
reset role;
set role anon;
select t.check('V18 after Free table: visit reports ended, orders hidden', 'OK:true|0',
  t.run(format($$select (s->>'visitEnded') || '|' || jsonb_array_length(s->'orders') from public.get_table_state(%L, %L) s$$, :'v1b', :'DEV1')));
select t.check('V19 after Free table: unbound re-scan also reports ended', 'OK:true',
  t.run(format($$select s->>'visitEnded' from public.get_table_state(%L, %L) s$$, :'v1c', :'DEV1')));
reset role;
update public.table_visits set order_until = now() + interval '5 minutes';   -- even with time left on the window
set role anon;
select t.check('V20 after Free table: departed guest cannot order', 'VISIT_EXPIRED',
  t.run(format($$select public.place_order(%L, %L, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89)::text$$, :'v1b', :'DEV1')));
select public.start_visit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', :'DEV2') ->> 'visit' as v2 \gset
select t.check('V21 next party: fresh visit, new session, Guest 1', 'OK:1',
  t.run(format($$select (public.place_order(%L, %L, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89))->>'guestNo'$$, :'v2', :'DEV2')));
reset role;

-- ── staff rotate the QR ──
set role authenticated;
select public.staff_rotate_table_token(id) from public.dining_tables where label = 'T1';
reset role;
set role anon;
select t.check('V22 after QR rotation: open visits stop ordering', 'VISIT_EXPIRED',
  t.run(format($$select public.place_order(%L, %L, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89)::text$$, :'v2', :'DEV2')));
select t.check('V23 after QR rotation: old QR is refused', 'INVALID_TABLE',
  t.run($$select public.start_visit('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'd2d2d2d2-0000-4000-8000-000000000002')::text$$));
reset role;

-- ── read window ends ──
update public.table_visits set created_at = now() - interval '7 hours' where device_hash = encode(extensions.digest(:'DEV2', 'sha256'), 'hex');
set role anon;
select t.check('V24 token older than session_idle_hours cannot read', 'VISIT_EXPIRED',
  t.run(format($$select public.get_table_state(%L, %L)::text$$, :'v2', :'DEV2')));

-- ── abuse limits ──
select t.check('V25 one phone minting tokens: 11th scan in 10 min', 'RATE_LIMITED',
  t.run($$select string_agg(coalesce(public.start_visit('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'd3d3d3d3-0000-4000-8000-000000000003')->>'table', ''), ',') from generate_series(1, 11)$$));
reset role;
-- ten unaccepted orders at T2 from ten phones, then an eleventh
do $$
declare i int; v text; dev text;
begin
  for i in 1..10 loop
    dev := format('a%s-0000-4000-8000-000000000000', lpad(i::text, 7, '0'));
    v := public.start_visit('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', dev) ->> 'visit';
    perform public.place_order(v, dev, gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89);
  end loop;
end $$;
set role anon;
select public.start_visit('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'f0f0f0f0-0000-4000-8000-000000000011') ->> 'visit' as v11 \gset
select t.check('V26 eleventh unaccepted order at one table', 'TABLE_BUSY',
  t.run(format($$select public.place_order(%L, 'f0f0f0f0-0000-4000-8000-000000000011', gen_random_uuid(), '[{"dish_id":"00000000-0000-4000-8000-0000000000d1","qty":1}]', 89)::text$$, :'v11')));
reset role;

-- ── settings and housekeeping ──
update public.restaurant_settings set visit_order_minutes = 1;
set role anon;
select t.check('V27 window follows visit_order_minutes', '60',
  (select (public.start_visit('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'f1f1f1f1-0000-4000-8000-000000000012') ->> 'orderSeconds')));
reset role;
update public.restaurant_settings set visit_order_minutes = 5;
update public.table_visits set created_at = now() - interval '2 days' where table_id = (select id from public.dining_tables where label = 'T2') and device_hash = encode(extensions.digest('f1f1f1f1-0000-4000-8000-000000000012', 'sha256'), 'hex');
set role anon;
select public.start_visit('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'f2f2f2f2-0000-4000-8000-000000000013') is not null;
reset role;
select t.check('V28 visits older than a day are cleared on the next scan', '0',
  (select count(*)::text from public.table_visits where created_at < now() - interval '1 day'));
select t.check('V29 only the visit-token signatures remain', 'get_table_state(p_visit text, p_device text)|place_order(p_visit text, p_device text, p_client_order_id uuid, p_items jsonb, p_expected_total integer)',
  (select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', '|' order by p.proname)
     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('get_table_state', 'place_order')));
set role anon;
select t.check('V30 anon cannot rotate a QR', 'permission denied for function staff_rotate_table_token',
  t.run($$select public.staff_rotate_table_token(gen_random_uuid())$$));
reset role;

\pset tuples_only off
\pset format aligned
select n, case when got = expected then 'PASS' else 'FAIL' end as result, name, case when got = expected then '' else 'expected ' || expected || ' | got ' || got end as detail
  from t.results order by n;

do $$
declare n int := (select count(*) from t.results where got is distinct from expected);
begin
  if n > 0 then raise exception '% visit-token check(s) failed', n; end if;
end $$;
