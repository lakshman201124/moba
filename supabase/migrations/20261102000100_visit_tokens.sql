-- 20261102000100_visit_tokens.sql
-- Short-lived visit tokens. The QR token no longer places orders by itself.
--
-- Before: the QR token printed on the table never expired and was the credential for
-- get_table_state and place_order. Anyone who had scanned it once could order to that
-- table from anywhere until staff rotated the code; the 4-hour limit lived only in the browser.
--
-- Now: scanning swaps the QR token for a random visit token (start_visit), tied to the phone's
-- device id. A visit token can place orders for visit_order_minutes after the scan (5 by default);
-- after that the guest scans the table's QR again. It can read this phone's orders until the
-- table is freed. Phones keep the visit token, never the QR token.
--
-- Old clients call the functions with p_token and get "function not found" until they load
-- the new menu.js. Deploy the site together with this migration.

-- ── settings ──────────────────────────────────────────────────────
alter table public.restaurant_settings
  add column visit_order_minutes smallint not null default 5 check (visit_order_minutes between 1 and 60);
grant update (visit_order_minutes) on public.restaurant_settings to authenticated;

-- ── visits ────────────────────────────────────────────────────────
-- One row per scan. session_id is set by the visit's first order, so freeing that table ends it.
create table public.table_visits (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references public.dining_tables (id) on delete cascade,
  session_id  uuid references public.table_sessions (id) on delete set null,
  token_hash  text not null unique,
  device_hash text not null,
  created_at  timestamptz not null default now(),
  order_until timestamptz not null
);
create index table_visits_table_idx  on public.table_visits (table_id, created_at desc);
create index table_visits_device_idx on public.table_visits (device_hash, created_at desc);

-- Nobody reads visits directly; only the functions below do.
alter table public.table_visits enable row level security;
revoke all on public.table_visits from public, anon, authenticated;

-- ── helper ────────────────────────────────────────────────────────
-- The visit behind a token, for this phone only. A token copied to another phone is useless.
create function private.find_visit(p_visit text, p_device text) returns public.table_visits
language plpgsql stable set search_path = '' as $$
declare v public.table_visits;
begin
  if p_visit is null or p_visit !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_VISIT' using errcode = 'P0001';
  end if;
  if p_device is null or p_device !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'BAD_REQUEST' using errcode = 'P0001';
  end if;
  select * into v from public.table_visits
   where token_hash  = encode(extensions.digest(p_visit, 'sha256'), 'hex')
     and device_hash = encode(extensions.digest(p_device, 'sha256'), 'hex');
  if not found then
    raise exception 'INVALID_VISIT' using errcode = 'P0001';
  end if;
  return v;
end $$;
revoke execute on function private.find_visit(text, text) from public, anon, authenticated;

-- ── start_visit ───────────────────────────────────────────────────
create function public.start_visit(p_qr_token text, p_device text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_table    public.dining_tables;
  v_settings public.restaurant_settings;
  v_hash     text;
  v_token    text;
begin
  if p_qr_token is null or p_qr_token !~ '^[0-9a-f]{32}$' then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;
  if p_device is null or p_device !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'BAD_REQUEST' using errcode = 'P0001';
  end if;
  v_hash := encode(extensions.digest(p_device, 'sha256'), 'hex');

  -- FOR UPDATE serialises scans at one table, so the counts below can't be raced.
  select * into v_table from public.dining_tables where qr_token = p_qr_token for update;
  if not found then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;

  -- A party re-scans a few times an hour; a script minting tokens doesn't get far.
  if (select count(*) from public.table_visits
       where device_hash = v_hash and created_at > now() - interval '10 minutes') >= 10
     or (select count(*) from public.table_visits
       where table_id = v_table.id and created_at > now() - interval '10 minutes') >= 120 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- Visits can't be read after a day (session_idle_hours is at most 24); clear this table's as we go.
  delete from public.table_visits where table_id = v_table.id and created_at < now() - interval '1 day';

  select * into v_settings from public.restaurant_settings where id = 1;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.table_visits (table_id, token_hash, device_hash, order_until)
  values (v_table.id, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_hash,
          now() + make_interval(mins => v_settings.visit_order_minutes));

  return jsonb_build_object(
    'visit',        v_token,
    'orderSeconds', v_settings.visit_order_minutes * 60,
    'table',        v_table.label,
    'active',       v_table.is_active,
    'orderingOpen', v_settings.ordering_open);
end $$;

-- ── get_table_state (now takes a visit token) ─────────────────────
drop function public.get_table_state(text, text);

create function public.get_table_state(p_visit text, p_device text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_visit    public.table_visits;
  v_settings public.restaurant_settings;
  v_table    public.dining_tables;
  v_session  uuid;
  v_ended    boolean;
begin
  v_visit := private.find_visit(p_visit, p_device);
  select * into v_settings from public.restaurant_settings where id = 1;
  if v_visit.created_at < now() - make_interval(hours => v_settings.session_idle_hours) then
    raise exception 'VISIT_EXPIRED' using errcode = 'P0001';
  end if;
  select * into v_table from public.dining_tables where id = v_visit.table_id;
  select id into v_session from public.table_sessions where table_id = v_table.id and status = 'open';

  -- Over once the visit this phone ordered in has been closed: the visit's own, or, for a
  -- re-scan that hasn't ordered yet, one this phone ordered in that closed after the scan.
  v_ended := case
    when v_visit.session_id is not null then
      exists (select 1 from public.table_sessions s where s.id = v_visit.session_id and s.status = 'closed')
    else
      exists (select 1 from public.orders o join public.table_sessions s on s.id = o.session_id
               where o.table_id = v_table.id and o.device_hash = v_visit.device_hash
                 and s.status = 'closed' and s.closed_at > v_visit.created_at)
  end;

  return jsonb_build_object(
    'table',        v_table.label,
    'active',       v_table.is_active,
    'orderingOpen', v_settings.ordering_open,
    'visitEnded',   v_ended,
    'orders', case when v_ended then '[]'::jsonb else coalesce((
      select jsonb_agg(private.order_json(o.id) order by o.created_at)
        from public.orders o
       where o.session_id = v_session and o.device_hash = v_visit.device_hash), '[]'::jsonb) end);
end $$;

-- ── place_order (now takes a visit token) ─────────────────────────
drop function public.place_order(text, text, uuid, jsonb, int);

create function public.place_order(
  p_visit           text,
  p_device          text,
  p_client_order_id uuid,
  p_items           jsonb,
  p_expected_total  int
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_visit    public.table_visits;
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
  -- 1. Shape, then the visit
  if p_client_order_id is null
     or p_expected_total is null
     or (case when jsonb_typeof(p_items) = 'array'
              then jsonb_array_length(p_items) not between 1 and 30
              else true end) then
    raise exception 'BAD_REQUEST' using errcode = 'P0001';
  end if;
  v_visit := private.find_visit(p_visit, p_device);
  v_hash := v_visit.device_hash;

  -- 2. Replay (still answered after the ordering window, so a retry after a timeout finds its order)
  select id into v_order_id from public.orders
   where client_order_id = p_client_order_id and device_hash = v_hash;
  if found then
    return private.order_json(v_order_id);
  end if;

  -- 3. Ordering window: scan again after it
  if now() > v_visit.order_until then
    raise exception 'VISIT_EXPIRED' using errcode = 'P0001';
  end if;

  -- 4. Kitchen open?
  select * into v_settings from public.restaurant_settings where id = 1;
  if not v_settings.ordering_open then
    raise exception 'ORDERING_CLOSED' using errcode = 'P0001';
  end if;

  -- 5. The table
  select * into v_table from public.dining_tables where id = v_visit.table_id for update;
  if not v_table.is_active then
    raise exception 'TABLE_INACTIVE' using errcode = 'P0001';
  end if;
  select id into v_order_id from public.orders
   where client_order_id = p_client_order_id and device_hash = v_hash;
  if found then
    return private.order_json(v_order_id);
  end if;
  -- Staff freed the table this visit ordered at: the party has left.
  if exists (select 1 from public.table_sessions s
              where s.id = v_visit.session_id and s.status = 'closed' and s.close_reason = 'freed') then
    raise exception 'VISIT_EXPIRED' using errcode = 'P0001';
  end if;

  -- 6. Rate limits, and a cap on orders the kitchen hasn't accepted yet
  if (select count(*) from public.orders
       where device_hash = v_hash and created_at > now() - interval '10 minutes') >= 6
     or (select count(*) from public.orders
       where table_id = v_table.id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.orders o join public.table_sessions s on s.id = o.session_id
       where o.table_id = v_table.id and o.status = 'placed' and s.status = 'open') >= 10 then
    raise exception 'TABLE_BUSY' using errcode = 'P0001';
  end if;

  -- 7. The open visit
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

  -- 8. Price every line
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

  -- 9. Guest number
  select o.guest_no into v_guest from public.orders o
   where o.session_id = v_session.id and o.device_hash = v_hash limit 1;
  if v_guest is null then
    select coalesce(max(o.guest_no), 0) + 1 into v_guest from public.orders o where o.session_id = v_session.id;
  end if;

  -- 10. Write
  insert into public.orders (session_id, table_id, device_hash, client_order_id, guest_no, item_count, total)
  values (v_session.id, v_table.id, v_hash, p_client_order_id, v_guest, v_count, v_total)
  returning id into v_order_id;

  insert into public.order_items
    (order_id, dish_id, dish_name, size_label, choices, addons, note, diet, qty, unit_price, line_total, sort_order)
  select v_order_id, (l->>'dish_id')::uuid, l->>'dish_name', l->>'size_label', l->'choices', l->'addons',
         l->>'note', l->>'diet', (l->>'qty')::int, (l->>'unit_price')::int, (l->>'line_total')::int, n::int
    from jsonb_array_elements(v_lines) with ordinality as t(l, n);

  update public.table_sessions set last_order_at = now() where id = v_session.id;
  update public.table_visits set session_id = v_session.id where id = v_visit.id;

  return private.order_json(v_order_id);
end $$;

-- ── a new QR ends every visit started from the old one ────────────
create or replace function public.staff_rotate_table_token(p_table_id uuid) returns text
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
  update public.table_visits set order_until = now() where table_id = p_table_id and order_until > now();
  return v_token;
end $$;

-- ── grants ────────────────────────────────────────────────────────
-- Explicit, so this holds even where migration 7's default-privilege change isn't in effect.
revoke execute on function
  public.start_visit(text, text),
  public.get_table_state(text, text),
  public.place_order(text, text, uuid, jsonb, int),
  public.staff_rotate_table_token(uuid)
from public, anon, authenticated;

grant execute on function
  public.start_visit(text, text),
  public.get_table_state(text, text),
  public.place_order(text, text, uuid, jsonb, int)
to anon, authenticated;

grant execute on function public.staff_rotate_table_token(uuid) to authenticated;
