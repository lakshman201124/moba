-- 20261011000300_api_public.sql

-- ── helpers (private, called only from the API functions) ──────────
create function private.order_json(p_order_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'orderNo', o.order_no, 'guestNo', o.guest_no, 'status', o.status,
    'table', t.label, 'total', o.total, 'itemCount', o.item_count, 'createdAt', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', i.dish_name, 'size', i.size_label, 'choices', i.choices,
               'addons', i.addons, 'note', i.note, 'diet', i.diet, 'qty', i.qty,
               'unitPrice', i.unit_price, 'lineTotal', i.line_total)
             order by i.sort_order)
        from public.order_items i where i.order_id = o.id), '[]'::jsonb))
  from public.orders o
  join public.dining_tables t on t.id = o.table_id
  where o.id = p_order_id
$$;

create function private.line_diet(p_dish_diet text, p_option_ids uuid[], p_addon_ids uuid[]) returns text
language sql stable set search_path = '' as $$
  with marks as (
    select o.diet from public.choice_options o where o.id = any(p_option_ids) and o.diet is not null
    union all
    select a.diet from public.addons a where a.id = any(p_addon_ids) and a.diet in ('nonveg','egg')
  )
  select case
    when p_dish_diet = 'nonveg' or exists (select 1 from marks where diet = 'nonveg') then 'nonveg'
    when p_dish_diet = 'egg'    or exists (select 1 from marks where diet = 'egg')    then 'egg'
    when p_dish_diet = 'veg'                                                          then 'veg'
    when p_dish_diet = 'both'   and exists (select 1 from marks where diet = 'veg')   then 'veg'
    when p_dish_diet = 'both'                                                         then 'both'
  end
$$;

-- ── get_public_menu ────────────────────────────────────────────────
create function public.get_public_menu() returns jsonb
language sql stable security definer set search_path = '' as $$
  with s as (
    select menu_version, ordering_open from public.restaurant_settings where id = 1
  ),
  cats as (
    select * from public.categories where is_visible
  ),
  ds as (
    select d.*, c.slug as cat_slug, c.sort_order as cat_sort, g.slug as group_slug, g.sort_order as group_sort,
           d.is_available and not exists (
             select 1 from public.dish_choice_groups dcg
               join public.choice_groups cg on cg.id = dcg.group_id
              where dcg.dish_id = d.id
                and cg.min_select > (select count(*) from public.choice_options o
                                      where o.group_id = cg.id and o.is_available)
           ) as orderable
      from public.dishes d
      join cats c on c.id = d.category_id
      left join public.category_groups g on g.id = d.group_id
     where d.is_visible
  )
  select jsonb_build_object(
    'version', s.menu_version,
    'orderingOpen', s.ordering_open,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.slug, 'name', c.name, 'short', coalesce(c.short_name, c.name), 'ko', c.name_ko,
               'art', c.art, 'blurb', c.blurb, 'image', c.image_path, 'notes', c.notes,
               'groups', coalesce((
                  select jsonb_agg(jsonb_build_object('id', g.slug, 'name', g.name, 'ko', g.name_ko, 'lede', g.lede)
                                   order by g.sort_order, g.name)
                    from public.category_groups g where g.category_id = c.id), '[]'::jsonb),
               'extras', coalesce((
                  select jsonb_agg(ca.addon_id order by ca.sort_order)
                    from public.category_addons ca where ca.category_id = c.id), '[]'::jsonb))
             order by c.sort_order, c.name)
        from cats c), '[]'::jsonb),
    'extras', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'price', a.price, 'diet', a.diet,
                                          'badge', a.badge, 'available', a.is_available)
                       order by a.sort_order, a.name)
        from public.addons a), '[]'::jsonb),
    'dishes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'category', d.cat_slug, 'group', d.group_slug, 'name', d.name,
               'description', d.description, 'note', d.note, 'price', d.price, 'diet', d.diet,
               'spice', d.spice, 'badge', d.badge, 'image', d.image_path, 'available', d.orderable,
               'sizes', (select jsonb_agg(jsonb_build_object('id', z.id, 'label', z.label, 'price', z.price)
                                          order by z.sort_order, z.price)
                           from public.dish_sizes z where z.dish_id = d.id),
               'choose', coalesce((
                  select jsonb_agg(jsonb_build_object(
                           'id', cg.id, 'label', cg.label, 'min', cg.min_select, 'max', cg.max_select,
                           'options', coalesce((
                              select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'diet', o.diet,
                                                                  'price', o.price_delta, 'available', o.is_available)
                                               order by o.sort_order, o.label)
                                from public.choice_options o where o.group_id = cg.id), '[]'::jsonb))
                         order by dcg.sort_order)
                    from public.dish_choice_groups dcg
                    join public.choice_groups cg on cg.id = dcg.group_id
                   where dcg.dish_id = d.id), '[]'::jsonb))
             order by d.cat_sort, d.group_sort nulls first, d.sort_order, d.name)
        from ds d), '[]'::jsonb))
  from s
$$;

-- ── get_table_state ────────────────────────────────────────────────
create function public.get_table_state(p_token text, p_device text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_table   public.dining_tables;
  v_hash    text;
  v_session uuid;
  v_closed  timestamptz;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;
  if p_device is null or p_device !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'BAD_REQUEST' using errcode = 'P0001';
  end if;
  select * into v_table from public.dining_tables where qr_token = p_token;
  if not found then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;
  v_hash := encode(extensions.digest(p_device, 'sha256'), 'hex');
  select id into v_session from public.table_sessions where table_id = v_table.id and status = 'open';

  if not exists (select 1 from public.orders where session_id = v_session and device_hash = v_hash) then
    select s.closed_at into v_closed
      from public.orders o join public.table_sessions s on s.id = o.session_id
     where o.table_id = v_table.id and o.device_hash = v_hash and s.status = 'closed'
     order by o.created_at desc
     limit 1;
  end if;

  return jsonb_build_object(
    'table', v_table.label,
    'active', v_table.is_active,
    'orderingOpen', (select ordering_open from public.restaurant_settings where id = 1),
    'lastVisitClosedAt', v_closed,
    'orders', coalesce((
      select jsonb_agg(private.order_json(o.id) order by o.created_at)
        from public.orders o
       where o.session_id = v_session and o.device_hash = v_hash), '[]'::jsonb));
end $$;

-- ── place_order ────────────────────────────────────────────────────
create function public.place_order(
  p_token           text,
  p_device          text,
  p_client_order_id uuid,
  p_items           jsonb,
  p_expected_total  int
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_hash     text;
  v_settings public.restaurant_settings;
  v_table    public.dining_tables;
  v_session  public.table_sessions;
  v_order_id uuid;
  v_guest    smallint;
  v_item     jsonb;
  v_dish     public.dishes;
  v_size     public.dish_sizes;
  v_size_id  uuid;
  v_opts     uuid[];
  v_adds     uuid[];
  v_qty      int;
  v_unit     int;
  v_bad      uuid;
  v_total    int   := 0;
  v_count    int   := 0;
  v_lines    jsonb := '[]'::jsonb;
begin
  -- 1. Shape
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;
  if p_device is null
     or p_device !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or p_client_order_id is null
     or p_expected_total is null
     or (case when jsonb_typeof(p_items) = 'array'
              then jsonb_array_length(p_items) not between 1 and 30
              else true end) then
    raise exception 'BAD_REQUEST' using errcode = 'P0001';
  end if;
  v_hash := encode(extensions.digest(p_device, 'sha256'), 'hex');

  -- 2. Replay
  select id into v_order_id from public.orders
   where client_order_id = p_client_order_id and device_hash = v_hash;
  if found then
    return private.order_json(v_order_id);
  end if;

  -- 3. Kitchen open?
  select * into v_settings from public.restaurant_settings where id = 1;
  if not v_settings.ordering_open then
    raise exception 'ORDERING_CLOSED' using errcode = 'P0001';
  end if;

  -- 4. The table
  select * into v_table from public.dining_tables where qr_token = p_token for update;
  if not found then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;
  if not v_table.is_active then
    raise exception 'TABLE_INACTIVE' using errcode = 'P0001';
  end if;
  select id into v_order_id from public.orders
   where client_order_id = p_client_order_id and device_hash = v_hash;
  if found then
    return private.order_json(v_order_id);
  end if;

  -- 5. Rate limits
  if (select count(*) from public.orders
       where device_hash = v_hash and created_at > now() - interval '10 minutes') >= 6
     or (select count(*) from public.orders
       where table_id = v_table.id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- 6. The open visit
  select * into v_session from public.table_sessions where table_id = v_table.id and status = 'open';
  if found and coalesce(v_session.last_order_at, v_session.opened_at)
               < now() - make_interval(hours => v_settings.session_idle_hours) then
    update public.table_sessions set status = 'closed', closed_at = now(), close_reason = 'idle'
     where id = v_session.id;
    v_session := null;
  end if;
  if v_session.id is null then
    insert into public.table_sessions (table_id) values (v_table.id) returning * into v_session;
  end if;

  -- 7. Price every line
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'BAD_REQUEST' using errcode = 'P0001';
    end if;
    begin
      select * into v_dish from public.dishes where id = (v_item->>'dish_id')::uuid;
      v_size_id := nullif(v_item->>'size_id', '')::uuid;
      v_opts := array(select x::uuid from jsonb_array_elements_text(coalesce(v_item->'option_ids', '[]'::jsonb)) x);
      v_adds := array(select x::uuid from jsonb_array_elements_text(coalesce(v_item->'addon_ids',  '[]'::jsonb)) x);
      v_qty  := (v_item->>'qty')::int;
    exception when others then
      raise exception 'BAD_REQUEST' using errcode = 'P0001';
    end;

    if v_dish.id is null or not v_dish.is_visible
       or not exists (select 1 from public.categories c where c.id = v_dish.category_id and c.is_visible) then
      raise exception 'DISH_UNAVAILABLE' using errcode = 'P0001', detail = coalesce(v_item->>'dish_id', '');
    end if;
    if not v_dish.is_available then
      raise exception 'DISH_UNAVAILABLE' using errcode = 'P0001', detail = v_dish.id::text;
    end if;
    if v_qty is null or v_qty not between 1 and 20 then
      raise exception 'BAD_REQUEST' using errcode = 'P0001';
    end if;

    v_size := null;
    if exists (select 1 from public.dish_sizes where dish_id = v_dish.id) then
      select * into v_size from public.dish_sizes where dish_id = v_dish.id and id = v_size_id;
      if v_size.id is null then
        raise exception 'INVALID_ITEM' using errcode = 'P0001', detail = v_dish.id::text;
      end if;
      v_unit := v_size.price;
    elsif v_size_id is not null then
      raise exception 'INVALID_ITEM' using errcode = 'P0001', detail = v_dish.id::text;
    else
      v_unit := v_dish.price;
    end if;

    if cardinality(v_opts) <> (select count(distinct x) from unnest(v_opts) x)
       or exists (select 1 from unnest(v_opts) x
                   where not exists (select 1 from public.choice_options o
                                       join public.dish_choice_groups dcg on dcg.group_id = o.group_id
                                      where o.id = x and dcg.dish_id = v_dish.id))
       or exists (select 1 from public.dish_choice_groups dcg
                    join public.choice_groups cg on cg.id = dcg.group_id
                   where dcg.dish_id = v_dish.id
                     and (select count(*) from public.choice_options o
                           where o.group_id = cg.id and o.id = any(v_opts))
                         not between cg.min_select and cg.max_select) then
      raise exception 'INVALID_ITEM' using errcode = 'P0001', detail = v_dish.id::text;
    end if;
    select o.id into v_bad from public.choice_options o where o.id = any(v_opts) and not o.is_available limit 1;
    if found then
      raise exception 'OPTION_UNAVAILABLE' using errcode = 'P0001', detail = v_bad::text;
    end if;

    if cardinality(v_adds) <> (select count(distinct x) from unnest(v_adds) x)
       or exists (select 1 from unnest(v_adds) x
                   where not exists (select 1 from public.category_addons ca
                                      where ca.category_id = v_dish.category_id and ca.addon_id = x)) then
      raise exception 'INVALID_ITEM' using errcode = 'P0001', detail = v_dish.id::text;
    end if;
    select a.id into v_bad from public.addons a where a.id = any(v_adds) and not a.is_available limit 1;
    if found then
      raise exception 'ADDON_UNAVAILABLE' using errcode = 'P0001', detail = v_bad::text;
    end if;

    v_unit := v_unit
      + coalesce((select sum(o.price_delta) from public.choice_options o where o.id = any(v_opts)), 0)
      + coalesce((select sum(a.price)       from public.addons a         where a.id = any(v_adds)), 0);
    v_count := v_count + v_qty;
    v_total := v_total + v_unit * v_qty;

    v_lines := v_lines || jsonb_build_object(
      'dish_id',    v_dish.id,
      'dish_name',  v_dish.name,
      'size_label', v_size.label,
      'choices', coalesce((
         select jsonb_agg(jsonb_build_object(
                  'label', cg.label,
                  'options', (select jsonb_agg(o.label order by o.sort_order, o.label)
                                from public.choice_options o
                               where o.group_id = cg.id and o.id = any(v_opts)))
                order by dcg.sort_order)
           from public.dish_choice_groups dcg
           join public.choice_groups cg on cg.id = dcg.group_id
          where dcg.dish_id = v_dish.id
            and exists (select 1 from public.choice_options o where o.group_id = cg.id and o.id = any(v_opts))
       ), '[]'::jsonb),
      'addons', coalesce((
         select jsonb_agg(jsonb_build_object('name', a.name, 'price', a.price) order by a.sort_order, a.name)
           from public.addons a where a.id = any(v_adds)), '[]'::jsonb),
      'note', nullif(left(btrim(regexp_replace(coalesce(v_item->>'note', ''), '[[:cntrl:]]+', ' ', 'g')), 140), ''),
      'diet', private.line_diet(v_dish.diet, v_opts, v_adds),
      'qty', v_qty,
      'unit_price', v_unit,
      'line_total', v_unit * v_qty);
  end loop;

  if v_count > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;
  if p_expected_total <> v_total then
    raise exception 'PRICE_CHANGED' using errcode = 'P0001', detail = v_total::text;
  end if;

  -- 8. Guest number
  select o.guest_no into v_guest from public.orders o
   where o.session_id = v_session.id and o.device_hash = v_hash limit 1;
  if v_guest is null then
    select coalesce(max(o.guest_no), 0) + 1 into v_guest from public.orders o where o.session_id = v_session.id;
  end if;

  -- 9. Write
  insert into public.orders (session_id, table_id, device_hash, client_order_id, guest_no, item_count, total)
  values (v_session.id, v_table.id, v_hash, p_client_order_id, v_guest, v_count, v_total)
  returning id into v_order_id;

  insert into public.order_items
    (order_id, dish_id, dish_name, size_label, choices, addons, note, diet, qty, unit_price, line_total, sort_order)
  select v_order_id, (l->>'dish_id')::uuid, l->>'dish_name', l->>'size_label', l->'choices', l->'addons',
         l->>'note', l->>'diet', (l->>'qty')::int, (l->>'unit_price')::int, (l->>'line_total')::int, n::int
    from jsonb_array_elements(v_lines) with ordinality as t(l, n);

  update public.table_sessions set last_order_at = now() where id = v_session.id;

  return private.order_json(v_order_id);
end $$;

grant execute on function public.get_public_menu()                              to anon, authenticated;
grant execute on function public.get_table_state(text, text)                    to anon, authenticated;
grant execute on function public.place_order(text, text, uuid, jsonb, int)      to anon, authenticated;
