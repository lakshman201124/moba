-- 20261011000700_function_grants.sql
-- Close the function-execute hole left by migrations 1-4.
--
-- Postgres grants EXECUTE on every new function to PUBLIC. A schema-scoped
-- "alter default privileges in schema ... revoke ... from public" cannot take that
-- built-in default away, so every function created in migrations 3 and 4 was callable by
-- anon. The staff_* functions still refused (they start with private.require_staff()),
-- but the spec wants them denied before they run. This migration makes that true.

-- 1. Take EXECUTE away from PUBLIC and anon on everything that exists now.
revoke execute on all functions in schema public  from public, anon;
revoke execute on all functions in schema private from public, anon;

-- 2. Give back exactly what each role needs.
-- Diners (anon) get three functions. Signed-in users get them too (harmless; same checks).
grant execute on function
  public.get_public_menu(),
  public.get_table_state(text, text),
  public.place_order(text, text, uuid, jsonb, int)
to anon, authenticated;

-- Staff API: signed-in users only (each function also calls private.require_staff()).
grant execute on function
  public.staff_dashboard(),
  public.staff_tables_overview(),
  public.staff_set_order_status(uuid, text, text, text),
  public.staff_free_table(uuid, int, boolean),
  public.staff_reopen_session(uuid),
  public.staff_rotate_table_token(uuid),
  public.staff_reorder(text, uuid[]),
  public.staff_save_category(jsonb),
  public.staff_save_dish(jsonb),
  public.staff_save_choice_group(jsonb)
to authenticated;

-- RLS policies call this one as the signed-in user.
grant execute on function private.is_staff() to authenticated;

-- 3. Functions created from now on start with no PUBLIC execute either, so a forgotten
--    grant fails closed instead of open. (Applies to functions created by this role.)
alter default privileges revoke execute on functions from public;
