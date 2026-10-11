-- 20261011000200_access.sql
-- Lock everything, then open exactly what each role needs.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public  from public, anon, authenticated;
revoke execute on all functions in schema private from public;

-- The one check every policy uses.
create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s where s.user_id = auth.uid() and s.is_active
  )
$$;
grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

-- RLS on every table (deny by default).
do $$
declare t text;
begin
  foreach t in array array['restaurant_settings','staff','categories','category_groups','dishes',
                           'dish_sizes','choice_groups','choice_options','dish_choice_groups',
                           'addons','category_addons','dining_tables','table_sessions',
                           'orders','order_items'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Menu content: staff read and write directly (simple edits, toggles, deletes).
do $$
declare t text;
begin
  foreach t in array array['categories','category_groups','dishes','dish_sizes','choice_groups',
                           'choice_options','dish_choice_groups','addons','category_addons'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy staff_all on public.%I for all to authenticated
                    using ((select private.is_staff())) with check ((select private.is_staff()))', t);
  end loop;
end $$;

-- Tables: staff manage everything except the QR token (only staff_rotate_table_token changes it).
grant select, delete on public.dining_tables to authenticated;
grant insert (label, seats, is_active, sort_order) on public.dining_tables to authenticated;
grant update (label, seats, is_active, sort_order) on public.dining_tables to authenticated;
create policy staff_all on public.dining_tables for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- Live state: staff read only. Every change goes through staff_* functions.
grant select on public.table_sessions, public.orders, public.order_items to authenticated;
create policy staff_read on public.table_sessions for select to authenticated using ((select private.is_staff()));
create policy staff_read on public.orders         for select to authenticated using ((select private.is_staff()));
create policy staff_read on public.order_items    for select to authenticated using ((select private.is_staff()));

-- Settings: staff read; staff flip ordering_open (and the two other plain fields).
grant select on public.restaurant_settings to authenticated;
grant update (restaurant_name, ordering_open, session_idle_hours) on public.restaurant_settings to authenticated;
create policy staff_read   on public.restaurant_settings for select to authenticated using ((select private.is_staff()));
create policy staff_update on public.restaurant_settings for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- Staff list: a signed-in user can read their own row (so Admin can tell a stray account apart).
grant select on public.staff to authenticated;
create policy self_or_staff_read on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

-- anon: nothing here. It gets EXECUTE on three functions in migration 3.
