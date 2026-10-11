-- 20261011000100_schema.sql
-- MOBA ordering: schema. Run on the NEW MOBA project (never the StudentMess one).

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;          -- helpers; not exposed by the API

-- Nothing is reachable by default; every grant is explicit (migration 2).
alter default privileges in schema public  revoke all     on tables    from anon, authenticated;
alter default privileges in schema public  revoke all     on sequences from anon, authenticated;
alter default privileges in schema public  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── settings (one row) ─────────────────────────────────────────────
create table public.restaurant_settings (
  id                 smallint primary key default 1 check (id = 1),
  restaurant_name    text     not null default 'MOBA' check (char_length(restaurant_name) between 1 and 60),
  ordering_open      boolean  not null default true,
  session_idle_hours smallint not null default 6 check (session_idle_hours between 1 and 24),
  menu_version       bigint   not null default 1,
  updated_at         timestamptz not null default now()
);
insert into public.restaurant_settings (id) values (1);

-- Any menu change bumps the version so phones know to refresh.
create function private.bump_menu_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.restaurant_settings set menu_version = menu_version + 1 where id = 1;
  return null;
end $$;

-- ── staff ──────────────────────────────────────────────────────────
create table public.staff (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role         text not null default 'staff' check (role in ('owner', 'staff')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ── menu ───────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name        text not null check (char_length(name) between 1 and 60),
  short_name  text check (char_length(short_name) <= 24),
  name_ko     text check (char_length(name_ko) <= 40),
  blurb       text check (char_length(blurb) <= 400),
  art         text not null default 'pot' check (art in (
                'pot','soup','wok','chicken','corndog','dimsum','gimbap',
                'noodles','rice','burger','boba','sundae')),
  image_path  text,
  notes       jsonb not null default '[]' check (jsonb_typeof(notes) = 'array'),
  is_visible  boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.category_groups (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name        text not null check (char_length(name) between 1 and 60),
  name_ko     text check (char_length(name_ko) <= 40),
  lede        text check (char_length(lede) <= 300),
  sort_order  int not null default 0,
  constraint category_groups_slug_key unique (category_id, slug) deferrable initially deferred,
  constraint category_groups_id_category_key unique (id, category_id)
);

create table public.dishes (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories (id) on delete restrict,
  group_id     uuid,
  name         text not null check (char_length(name) between 1 and 80),
  description  text check (char_length(description) <= 400),
  note         text check (char_length(note) <= 600),
  price        int  not null check (price between 0 and 100000),
  diet         text check (diet in ('veg','nonveg','egg','both')),
  spice        smallint not null default 0 check (spice between 0 and 3),
  badge        text check (char_length(badge) <= 24),
  image_path   text,
  is_available boolean not null default true,
  is_visible   boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (group_id, category_id)
    references public.category_groups (id, category_id) on delete set null (group_id)
);

create table public.dish_sizes (
  id         uuid primary key default gen_random_uuid(),
  dish_id    uuid not null references public.dishes (id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 40),
  price      int  not null check (price between 0 and 100000),
  sort_order int  not null default 0
);

create table public.choice_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 60),
  label      text not null check (char_length(label) between 1 and 40),
  min_select smallint not null default 1 check (min_select >= 0),
  max_select smallint not null default 1 check (max_select between 1 and 10),
  check (min_select <= max_select),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.choice_options (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.choice_groups (id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 40),
  diet         text check (diet in ('veg','nonveg','egg')),
  price_delta  int  not null default 0 check (price_delta between 0 and 10000),
  is_available boolean not null default true,
  sort_order   int  not null default 0,
  constraint choice_options_label_key unique (group_id, label) deferrable initially deferred
);

create table public.dish_choice_groups (
  dish_id    uuid not null references public.dishes (id) on delete cascade,
  group_id   uuid not null references public.choice_groups (id) on delete restrict,
  sort_order int  not null default 0,
  primary key (dish_id, group_id)
);

create table public.addons (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique check (char_length(name) between 1 and 60),
  price        int  not null check (price between 0 and 10000),
  diet         text check (diet in ('veg','nonveg','egg','both')),
  badge        text check (char_length(badge) <= 24),
  is_available boolean not null default true,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.category_addons (
  category_id uuid not null references public.categories (id) on delete cascade,
  addon_id    uuid not null references public.addons (id) on delete cascade,
  sort_order  int  not null default 0,
  primary key (category_id, addon_id)
);

-- ── tables, visits, orders ─────────────────────────────────────────
create table public.dining_tables (
  id               uuid primary key default gen_random_uuid(),
  label            text not null check (char_length(btrim(label)) between 1 and 20),
  seats            smallint check (seats between 1 and 50),
  qr_token         text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  token_rotated_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index dining_tables_label_key on public.dining_tables (lower(btrim(label)));

create table public.table_sessions (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid not null references public.dining_tables (id) on delete restrict,
  status        text not null default 'open' check (status in ('open','closed')),
  opened_at     timestamptz not null default now(),
  last_order_at timestamptz,
  closed_at     timestamptz,
  closed_by     uuid references auth.users (id) on delete set null,
  close_reason  text check (close_reason in ('freed','idle')),
  check ((status = 'open') = (closed_at is null))
);
create unique index table_sessions_one_open on public.table_sessions (table_id) where status = 'open';

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        bigint generated always as identity unique,
  session_id      uuid not null references public.table_sessions (id) on delete restrict,
  table_id        uuid not null references public.dining_tables (id) on delete restrict,
  device_hash     text not null,
  client_order_id uuid not null unique,
  guest_no        smallint not null check (guest_no between 1 and 99),
  status          text not null default 'placed'
                  check (status in ('placed','preparing','served','cancelled')),
  item_count      int  not null check (item_count between 1 and 50),
  total           int  not null check (total >= 0),
  cancel_reason   text check (char_length(cancel_reason) <= 140),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  served_at       timestamptz,
  cancelled_at    timestamptz,
  updated_by      uuid references auth.users (id) on delete set null
);

create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  dish_id    uuid references public.dishes (id) on delete set null,
  dish_name  text not null,
  size_label text,
  choices    jsonb not null default '[]',
  addons     jsonb not null default '[]',
  note       text check (char_length(note) <= 140),
  diet       text check (diet in ('veg','nonveg','egg','both')),
  qty        int  not null check (qty between 1 and 20),
  unit_price int  not null check (unit_price >= 0),
  line_total int  not null,
  sort_order int  not null default 0,
  check (line_total = unit_price * qty)
);

-- ── indexes ────────────────────────────────────────────────────────
create index dishes_category_idx          on public.dishes (category_id, sort_order);
create index dishes_group_idx             on public.dishes (group_id);
create index dish_sizes_dish_idx          on public.dish_sizes (dish_id, sort_order);
create index choice_options_group_idx     on public.choice_options (group_id, sort_order);
create index dish_choice_groups_group_idx on public.dish_choice_groups (group_id);
create index category_addons_addon_idx    on public.category_addons (addon_id);
create index table_sessions_table_idx     on public.table_sessions (table_id, opened_at desc);
create index orders_session_idx           on public.orders (session_id, created_at);
create index orders_table_idx             on public.orders (table_id, created_at desc);
create index orders_device_idx            on public.orders (device_hash, created_at desc);
create index orders_created_idx           on public.orders (created_at);
create index orders_active_idx            on public.orders (status) where status in ('placed','preparing');
create index order_items_order_idx        on public.order_items (order_id, sort_order);
create index order_items_dish_idx         on public.order_items (dish_id);

-- ── triggers ───────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['restaurant_settings','categories','dishes','choice_groups','addons','dining_tables'] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function private.set_updated_at()', t);
  end loop;
  foreach t in array array['categories','category_groups','dishes','dish_sizes','choice_groups',
                           'choice_options','dish_choice_groups','addons','category_addons'] loop
    execute format('create trigger bump_menu_version after insert or update or delete on public.%I
                    for each statement execute function private.bump_menu_version()', t);
  end loop;
end $$;
