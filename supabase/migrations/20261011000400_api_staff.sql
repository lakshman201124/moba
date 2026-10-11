-- 20261011000400_api_staff.sql

create function private.require_staff() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not private.is_staff() then
    raise exception 'NOT_STAFF' using errcode = '42501';
  end if;
end $$;

-- ── dashboard ──────────────────────────────────────────────────────
create function public.staff_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_start timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  perform private.require_staff();
  return jsonb_build_object(
    'orderingOpen',   (select ordering_open from public.restaurant_settings where id = 1),
    'ordersToday',    (select count(*) from public.orders where created_at >= v_start and status <> 'cancelled'),
    'valueToday',     (select coalesce(sum(total), 0) from public.orders where created_at >= v_start and status <> 'cancelled'),
    'cancelledToday', (select count(*) from public.orders where created_at >= v_start and status = 'cancelled'),
    'waiting',        (select count(*) from public.orders o join public.table_sessions s on s.id = o.session_id
                        where o.status = 'placed' and s.status = 'open'),
    'preparing',      (select count(*) from public.orders o join public.table_sessions s on s.id = o.session_id
                        where o.status = 'preparing' and s.status = 'open'),
    'openTables',     (select count(*) from public.table_sessions where status = 'open'),
    'activeTables',   (select count(*) from public.dining_tables where is_active));
end $$;

-- ── tables overview ────────────────────────────────────────────────
create function public.staff_tables_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'label', t.label, 'seats', t.seats, 'isActive', t.is_active, 'sortOrder', t.sort_order,
             'session', (
               select jsonb_build_object(
                        'id', s.id, 'openedAt', s.opened_at, 'lastOrderAt', s.last_order_at,
                        'orders',    count(o.id),
                        'placed',    count(o.id) filter (where o.status = 'placed'),
                        'preparing', count(o.id) filter (where o.status = 'preparing'),
                        'total',     coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0))
                 from public.table_sessions s
                 left join public.orders o on o.session_id = s.id
                where s.table_id = t.id and s.status = 'open'
                group by s.id))
           order by t.sort_order, t.label)
      from public.dining_tables t), '[]'::jsonb);
end $$;

-- ── order status (compare-and-set) ─────────────────────────────────
create function public.staff_set_order_status(p_order_id uuid, p_from text, p_to text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.require_staff();
  if (p_from, p_to) not in (
       ('placed','preparing'), ('placed','served'), ('placed','cancelled'),
       ('preparing','served'), ('preparing','cancelled'),
       ('preparing','placed'), ('served','preparing'), ('cancelled','placed')) then
    raise exception 'BAD_TRANSITION' using errcode = 'P0001';
  end if;
  update public.orders o
     set status        = p_to,
         accepted_at   = case when p_to = 'preparing' then coalesce(o.accepted_at, now())
                              when p_to = 'placed'    then null
                              else o.accepted_at end,
         served_at     = case when p_to = 'served'    then now() end,
         cancelled_at  = case when p_to = 'cancelled' then now() end,
         cancel_reason = case when p_to = 'cancelled' then nullif(left(btrim(coalesce(p_reason, '')), 140), '') end,
         updated_by    = auth.uid()
    from public.table_sessions s
   where o.id = p_order_id and o.status = p_from
     and s.id = o.session_id and s.status = 'open'
  returning o.id into v_id;
  if v_id is null then
    raise exception 'STATUS_CONFLICT' using errcode = 'P0001';
  end if;
  return jsonb_build_object('id', v_id, 'status', p_to);
end $$;

-- ── free the table ─────────────────────────────────────────────────
create function public.staff_free_table(p_session_id uuid, p_expected_orders int, p_serve_pending boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.table_sessions;
  v_orders  int;
  v_pending int;
  v_total   int;
begin
  perform private.require_staff();
  select * into v_session from public.table_sessions where id = p_session_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform 1 from public.dining_tables where id = v_session.table_id for update;
  select * into v_session from public.table_sessions where id = p_session_id;
  if v_session.status <> 'open' then
    raise exception 'SESSION_CLOSED' using errcode = 'P0001';
  end if;

  select count(*),
         count(*) filter (where status in ('placed','preparing')),
         coalesce(sum(total) filter (where status <> 'cancelled'), 0)
    into v_orders, v_pending, v_total
    from public.orders where session_id = p_session_id;

  if v_orders <> p_expected_orders then
    raise exception 'SESSION_CHANGED' using errcode = 'P0001';
  end if;
  if v_pending > 0 and not p_serve_pending then
    raise exception 'PENDING_ORDERS' using errcode = 'P0001', detail = v_pending::text;
  end if;

  update public.orders set status = 'served', served_at = now(), updated_by = auth.uid()
   where session_id = p_session_id and status in ('placed','preparing');
  update public.table_sessions
     set status = 'closed', closed_at = now(), closed_by = auth.uid(), close_reason = 'freed'
   where id = p_session_id;

  return jsonb_build_object('sessionId', p_session_id, 'orders', v_orders, 'total', v_total);
end $$;

-- ── undo a free ─────────────────────────────────────────────────────
create function public.staff_reopen_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_session public.table_sessions;
begin
  perform private.require_staff();
  select * into v_session from public.table_sessions where id = p_session_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform 1 from public.dining_tables where id = v_session.table_id for update;
  select * into v_session from public.table_sessions where id = p_session_id;
  if v_session.status <> 'closed'
     or v_session.close_reason is distinct from 'freed'
     or v_session.closed_at < now() - interval '15 minutes'
     or exists (select 1 from public.table_sessions where table_id = v_session.table_id and status = 'open') then
    raise exception 'CANNOT_REOPEN' using errcode = 'P0001';
  end if;
  update public.table_sessions
     set status = 'open', closed_at = null, closed_by = null, close_reason = null
   where id = p_session_id;
end $$;

-- ── replace a table's QR ───────────────────────────────────────────
create function public.staff_rotate_table_token(p_table_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  perform private.require_staff();
  update public.dining_tables
     set qr_token = replace(gen_random_uuid()::text, '-', ''), token_rotated_at = now()
   where id = p_table_id
  returning qr_token into v_token;
  if v_token is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_token;
end $$;

-- ── reorder ────────────────────────────────────────────────────────
create function public.staff_reorder(p_kind text, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  case p_kind
    when 'categories' then update public.categories      t set sort_order = x.n from unnest(p_ids) with ordinality x(id, n) where t.id = x.id;
    when 'dishes'     then update public.dishes          t set sort_order = x.n from unnest(p_ids) with ordinality x(id, n) where t.id = x.id;
    when 'tables'     then update public.dining_tables   t set sort_order = x.n from unnest(p_ids) with ordinality x(id, n) where t.id = x.id;
    when 'groups'     then update public.category_groups t set sort_order = x.n from unnest(p_ids) with ordinality x(id, n) where t.id = x.id;
    when 'addons'     then update public.addons          t set sort_order = x.n from unnest(p_ids) with ordinality x(id, n) where t.id = x.id;
    when 'sizes'      then update public.dish_sizes      t set sort_order = x.n from unnest(p_ids) with ordinality x(id, n) where t.id = x.id;
    when 'options'    then update public.choice_options  t set sort_order = x.n from unnest(p_ids) with ordinality x(id, n) where t.id = x.id;
    else raise exception 'BAD_REQUEST' using errcode = 'P0001';
  end case;
end $$;

-- ── save a dish ────────────────────────────────────────────────────
create function public.staff_save_dish(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id   uuid := nullif(p->>'id', '')::uuid;
  v_keep uuid[];
begin
  perform private.require_staff();
  if v_id is null then
    insert into public.dishes (category_id, group_id, name, description, note, price, diet, spice, badge,
                               image_path, is_available, is_visible, sort_order)
    values ((p->>'category_id')::uuid, nullif(p->>'group_id', '')::uuid, btrim(p->>'name'),
            nullif(btrim(p->>'description'), ''), nullif(btrim(p->>'note'), ''),
            coalesce((p->>'price')::int, 0), nullif(p->>'diet', ''), coalesce((p->>'spice')::smallint, 0),
            nullif(btrim(p->>'badge'), ''), nullif(p->>'image_path', ''),
            coalesce((p->>'is_available')::boolean, true), coalesce((p->>'is_visible')::boolean, true),
            coalesce((select max(sort_order) + 1 from public.dishes where category_id = (p->>'category_id')::uuid), 0))
    returning id into v_id;
  else
    update public.dishes set
      category_id  = (p->>'category_id')::uuid,
      group_id     = nullif(p->>'group_id', '')::uuid,
      name         = btrim(p->>'name'),
      description  = nullif(btrim(p->>'description'), ''),
      note         = nullif(btrim(p->>'note'), ''),
      price        = coalesce((p->>'price')::int, 0),
      diet         = nullif(p->>'diet', ''),
      spice        = coalesce((p->>'spice')::smallint, 0),
      badge        = nullif(btrim(p->>'badge'), ''),
      image_path   = nullif(p->>'image_path', ''),
      is_available = coalesce((p->>'is_available')::boolean, true),
      is_visible   = coalesce((p->>'is_visible')::boolean, true)
    where id = v_id;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;

  v_keep := array(select (s->>'id')::uuid from jsonb_array_elements(coalesce(p->'sizes', '[]'::jsonb)) s
                   where nullif(s->>'id', '') is not null);
  delete from public.dish_sizes where dish_id = v_id and id <> all(v_keep);
  update public.dish_sizes z set label = btrim(x.s->>'label'), price = (x.s->>'price')::int, sort_order = x.n
    from jsonb_array_elements(coalesce(p->'sizes', '[]'::jsonb)) with ordinality as x(s, n)
   where z.dish_id = v_id and z.id = nullif(x.s->>'id', '')::uuid;
  insert into public.dish_sizes (dish_id, label, price, sort_order)
  select v_id, btrim(x.s->>'label'), (x.s->>'price')::int, x.n
    from jsonb_array_elements(coalesce(p->'sizes', '[]'::jsonb)) with ordinality as x(s, n)
   where nullif(x.s->>'id', '') is null;
  update public.dishes set price = (select min(price) from public.dish_sizes where dish_id = v_id)
   where id = v_id and exists (select 1 from public.dish_sizes where dish_id = v_id);

  delete from public.dish_choice_groups where dish_id = v_id;
  insert into public.dish_choice_groups (dish_id, group_id, sort_order)
  select v_id, x.g::uuid, x.n
    from jsonb_array_elements_text(coalesce(p->'choice_group_ids', '[]'::jsonb)) with ordinality as x(g, n);

  return v_id;
end $$;

-- ── save a category ────────────────────────────────────────────────
create function public.staff_save_category(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id   uuid := nullif(p->>'id', '')::uuid;
  v_keep uuid[];
begin
  perform private.require_staff();
  if v_id is null then
    insert into public.categories (slug, name, short_name, name_ko, blurb, art, image_path, notes, is_visible, sort_order)
    values (p->>'slug', btrim(p->>'name'), nullif(btrim(p->>'short_name'), ''), nullif(btrim(p->>'name_ko'), ''),
            nullif(btrim(p->>'blurb'), ''), coalesce(nullif(p->>'art', ''), 'pot'), nullif(p->>'image_path', ''),
            coalesce(p->'notes', '[]'::jsonb), coalesce((p->>'is_visible')::boolean, true),
            coalesce((select max(sort_order) + 1 from public.categories), 0))
    returning id into v_id;
  else
    update public.categories set
      slug       = p->>'slug',
      name       = btrim(p->>'name'),
      short_name = nullif(btrim(p->>'short_name'), ''),
      name_ko    = nullif(btrim(p->>'name_ko'), ''),
      blurb      = nullif(btrim(p->>'blurb'), ''),
      art        = coalesce(nullif(p->>'art', ''), 'pot'),
      image_path = nullif(p->>'image_path', ''),
      notes      = coalesce(p->'notes', '[]'::jsonb),
      is_visible = coalesce((p->>'is_visible')::boolean, true)
    where id = v_id;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;

  v_keep := array(select (g->>'id')::uuid from jsonb_array_elements(coalesce(p->'groups', '[]'::jsonb)) g
                   where nullif(g->>'id', '') is not null);
  delete from public.category_groups where category_id = v_id and id <> all(v_keep);
  update public.category_groups cg
     set slug = x.g->>'slug', name = btrim(x.g->>'name'), name_ko = nullif(btrim(x.g->>'name_ko'), ''),
         lede = nullif(btrim(x.g->>'lede'), ''), sort_order = x.n
    from jsonb_array_elements(coalesce(p->'groups', '[]'::jsonb)) with ordinality as x(g, n)
   where cg.category_id = v_id and cg.id = nullif(x.g->>'id', '')::uuid;
  insert into public.category_groups (category_id, slug, name, name_ko, lede, sort_order)
  select v_id, x.g->>'slug', btrim(x.g->>'name'), nullif(btrim(x.g->>'name_ko'), ''),
         nullif(btrim(x.g->>'lede'), ''), x.n
    from jsonb_array_elements(coalesce(p->'groups', '[]'::jsonb)) with ordinality as x(g, n)
   where nullif(x.g->>'id', '') is null;

  delete from public.category_addons where category_id = v_id;
  insert into public.category_addons (category_id, addon_id, sort_order)
  select v_id, x.a::uuid, x.n
    from jsonb_array_elements_text(coalesce(p->'addon_ids', '[]'::jsonb)) with ordinality as x(a, n);

  return v_id;
end $$;

-- ── save a choice list ─────────────────────────────────────────────
create function public.staff_save_choice_group(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id   uuid := nullif(p->>'id', '')::uuid;
  v_keep uuid[];
begin
  perform private.require_staff();
  if coalesce((p->>'min_select')::int, 1) > jsonb_array_length(coalesce(p->'options', '[]'::jsonb)) then
    raise exception 'BAD_REQUEST' using errcode = 'P0001';
  end if;
  if v_id is null then
    insert into public.choice_groups (name, label, min_select, max_select)
    values (btrim(p->>'name'), btrim(p->>'label'),
            coalesce((p->>'min_select')::smallint, 1), coalesce((p->>'max_select')::smallint, 1))
    returning id into v_id;
  else
    update public.choice_groups set
      name       = btrim(p->>'name'),
      label      = btrim(p->>'label'),
      min_select = coalesce((p->>'min_select')::smallint, 1),
      max_select = coalesce((p->>'max_select')::smallint, 1)
    where id = v_id;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;

  v_keep := array(select (o->>'id')::uuid from jsonb_array_elements(coalesce(p->'options', '[]'::jsonb)) o
                   where nullif(o->>'id', '') is not null);
  delete from public.choice_options where group_id = v_id and id <> all(v_keep);
  update public.choice_options co
     set label = btrim(x.o->>'label'), diet = nullif(x.o->>'diet', ''),
         price_delta = coalesce((x.o->>'price_delta')::int, 0),
         is_available = coalesce((x.o->>'is_available')::boolean, true), sort_order = x.n
    from jsonb_array_elements(coalesce(p->'options', '[]'::jsonb)) with ordinality as x(o, n)
   where co.group_id = v_id and co.id = nullif(x.o->>'id', '')::uuid;
  insert into public.choice_options (group_id, label, diet, price_delta, is_available, sort_order)
  select v_id, btrim(x.o->>'label'), nullif(x.o->>'diet', ''), coalesce((x.o->>'price_delta')::int, 0),
         coalesce((x.o->>'is_available')::boolean, true), x.n
    from jsonb_array_elements(coalesce(p->'options', '[]'::jsonb)) with ordinality as x(o, n)
   where nullif(x.o->>'id', '') is null;

  return v_id;
end $$;

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
