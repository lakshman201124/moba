# MOBA Ordering System: Build Spec

> **Source of truth** for table ordering at MOBA: from the QR code on the table, through the customer menu and Supabase, to the MOBA Admin app the restaurant uses. If the code and this file disagree, this file wins until someone updates it.
>
> Status: **v1, ready to build** · Last updated: 2026-10-11

---

## 0. Read this first

**Precedence.**
- This spec replaces the "browse-only / no cart / no backend" lines in `PRODUCT.md`, `project.md` and `visual-direction.md` (Q&A row 5). Ordering is now in scope. Visual direction is unchanged.
- **This is not StudentMess.** `C:\Users\sanja\Downloads\CLAUDE.md` describes a different product (a student mess app) that has its own Supabase project, its own tables (plans, students, entries, menu) and its own design system. **None of it applies here.** MOBA gets a **new** Supabase project. Never use StudentMess's URL, keys, tables or fonts.

**What exists today** (`site/`):
- `index.html`: the animated landing ("Gather for food"), with links to `menu.html` through `bubble-transition.js`.
- `menu.html` + `menu.js` + `menu.css`: the full menu UI. The ordering UI is already built: a dish builder (size, required picks, add-ons, kitchen note, quantity), a cart saved in `localStorage`, and a "Place order" button that takes a **typed table number** (or `?table=12` from the URL) and POSTs to `window.MOBA_ORDER_URL`. That URL is empty, so orders currently stay on the phone.
- `menu-data.js`: the whole menu hard-coded (12 sections, 123 dishes, 13 add-ons).

**What this spec adds:**
1. A Supabase backend: database, rules, server functions, image storage and live updates.
2. The customer site wired to that backend: a real menu from the database, secure table identity, server-priced orders and live order status.
3. **MOBA Admin**, a new web app for staff with sign-in, a small dashboard, and three sections: **Tables & QR**, **Orders**, and **Menu & Categories**.

**How to build from this:** go phase by phase (§17). Every phase has acceptance criteria. Section 5 (security) is not optional at any phase.

### Glossary

| Term | Meaning |
|---|---|
| **Diner** | Anyone at a table using their own phone. Never signs in. |
| **Staff** | Restaurant people with an Admin login (the owner included). |
| **Table** | A physical table: one row in `dining_tables`. |
| **QR token** | A 32-character random secret printed inside the table's QR code. It is the only way a phone can act for a table. |
| **Visit (session)** | One group's time at a table. It opens on the first order and closes when staff tap **Free table**. Row in `table_sessions`. |
| **Device secret** | A random UUID that each phone creates once and keeps. It is how the server knows which orders are "mine". |
| **Guest number** | Guest 1, Guest 2… for each phone within one visit. This is how staff see *who* ordered *what* without collecting names. |
| **Order** | One tap of "Place order". It has one or more lines (`order_items`). |
| **Choice list** | A reusable pick list such as Filling (Tofu / Paneer / Chicken / Fish). It is attached to many dishes. |
| **Add-on** | An optional extra with a price (Fried egg ₹25). It is offered by a whole category. |

---

## 1. Scope

### In v1

**Customer (the existing menu site):**
- Scan the table QR, browse, build dishes, and place orders that are tied securely to that table.
- See their own orders for this visit, with live status.
- Get clear handling when something sells out, a price changes, the kitchen is closed or the QR is invalid.

**Staff (MOBA Admin):**
- Sign in, sign out, reset password.
- **Dashboard:** an "accepting orders" switch, today's numbers, and orders waiting to be accepted.
- **Tables & QR:** add, edit, deactivate, reorder and delete tables; preview, download, share and replace the QR; see who is ordering what at a table.
- **Orders:** all tables at a glance; open a table to see its orders; accept, serve or cancel; **free the table** when guests leave (with undo).
- **Menu & Categories:** categories (add, customize, hide, reorder), dishes (add to a category, edit everything, upload a photo, mark sold out, hide), choice lists and add-ons.

### Not in v1 (do not build)
Payments, bills or GST invoices · KOT printing or a kitchen display · customer accounts, names or phone numbers · takeaway or delivery · discounts · multiple branches · a staff-management UI (staff are added with SQL, §16.4) · reports beyond "today" · diners editing or cancelling an order after placing it (they ask staff) · a call-waiter button · push notifications · offline order queueing.

---

## 2. Use cases

### Diner

| ID | Use case |
|---|---|
| C1 | Scans the table QR, lands on the home page, opens the menu and sees "Table 5" in the order sheet. |
| C2 | Opens the menu without a QR (shared link, Google). Can browse the full menu and build a cart, but cannot place an order and is told to scan the table's QR. |
| C3 | Builds a dish (size, required picks, optional add-ons, kitchen note, quantity) and adds it to the cart. |
| C4 | Places the order. The server validates and prices it, then the diner sees a confirmation with the order number and status. |
| C5 | Sees "Your orders" for this visit with live status: Sent → Cooking → Served (or Cancelled). |
| C6 | Orders again during the same visit. The order joins the same visit and keeps the same guest number. |
| C7 | Something sells out or a price changes while it sits in the cart. The diner is told exactly what changed, the cart is fixed, and nothing is placed at a price they didn't see. |
| C8 | The kitchen has stopped taking orders. The diner can still browse and sees a clear banner. |
| C9 | After staff free the table, this phone stops ordering for that table until it scans the QR again. |

### Staff

| ID | Use case |
|---|---|
| S1 | Signs in, signs out, resets a forgotten password. Accounts that aren't staff are refused. |
| S2 | Dashboard: turns accepting orders on or off, sees today's orders and order value, and sees orders waiting to be accepted. |
| S3 | Tables: adds one table or a range (1 to 12), renames, sets seats, deactivates, reorders, and deletes a table that has never been used. |
| S4 | Table QR: previews it, downloads a printable PNG table card and a plain SVG, shares it, and replaces it (the old code stops working). |
| S5 | Table detail: sees who is ordering (Guest 1, Guest 2…) and what, live. |
| S6 | Orders: sees every table as free, occupied or needs attention, and opens a table to see its orders. |
| S7 | Moves an order through Accept → Served, cancels with a reason, and undoes a mis-tap. |
| S8 | Frees the table when guests leave. Gets a warning about unfinished orders and can undo within 15 minutes. |
| S9 | Categories: adds and edits (name, Korean name, short name, blurb, icon, cover image, sub-sections, notes, which add-ons it offers), hides or shows, reorders, and deletes when empty. |
| S10 | Dishes: adds to a category, edits everything, uploads a photo, marks sold out or available, hides, reorders, deletes. |
| S11 | Choice lists: creates lists (Filling, Base, Flavour…) whose options carry a veg or non-veg mark and an optional extra price. Marks one option out of stock everywhere at once ("no fish today"). |
| S12 | Add-ons: name, price, diet, badge, availability, and which categories offer them. |
| S13 | Is notified of new orders (sound, badge, tab title) while the Admin app is open. |

---

## 3. Architecture

```
 Diner's phone                           Supabase  (NEW project · region ap-south-1 Mumbai)
 ┌─────────────────────────┐   HTTPS   ┌─────────────────────────────────────────────────┐
 │ site/  (static, no build)│─────────▶│ PostgREST /rest/v1/rpc/…                        │
 │ index.html · menu.html   │ public   │   anon may EXECUTE exactly 3 functions:         │
 │ menu.js · api.js         │ key      │   get_public_menu · get_table_state · place_order│
 └─────────────────────────┘           │                                                 │
                                       │ Postgres: every table behind RLS (staff only)   │
 Staff phone / tablet                  │   state changes only through staff_* functions  │
 ┌─────────────────────────┐   HTTPS   │ Auth: email + password · sign-ups OFF           │
 │ admin/  (React SPA)      │─────────▶│ Realtime: orders, table_sessions → staff only   │
 │ supabase-js + session    │◀── WSS ──│ Storage: menu-images (public read, staff write) │
 └─────────────────────────┘           └─────────────────────────────────────────────────┘
```

**Hosting:** two static sites on **separate origins**.
- `https://menu.moba.cafe` serves `site/` (domain to be confirmed with the client)
- `https://admin.moba.cafe` serves `admin/dist`

Why separate origins: the staff login lives in the admin origin's own storage, so nothing on the public menu (GSAP from a CDN, Google Fonts, any future script) can ever read it.

**Repo layout after the build:**
```
site/                    customer site (existing; changed as in §12)
  config.js              NEW  public config: Supabase URL + publishable key
  table-context.js       NEW  reads ?t= from the QR, stores it, removes it from the address bar
  api.js                 NEW  small fetch client for the 3 public functions
admin/                   NEW  MOBA Admin (React), §13
supabase/
  config.toml            from `supabase init`
  migrations/            the 6 migrations in §6–§10 (timestamp-prefixed names)
  seed.sql               generated by scripts/build-seed.mjs, §15
scripts/
  build-seed.mjs         legacy menu-data.js → seed.sql
  security-check.mjs     §18.1
  legacy/menu-data.js    moved from site/ (seed source only, no longer loaded by the site)
ordering-system.md       this file
```

---

## 4. Core concepts and rules

### 4.1 Tables and QR tokens
- The QR code contains `https://menu.moba.cafe/?t=<qr_token>`. It points at the landing page, so the brand opening still plays. `menu.html?t=…` works too.
- `qr_token` is 32 lowercase hex characters from `gen_random_uuid()`, which is 122 random bits. It cannot be guessed. **The table number never appears in a URL.**
- Only staff can read tokens. Only `staff_rotate_table_token` can change one. Rotating kills the printed QR immediately.
- **Diners never type a table number.** Remove today's `?table=12` handling and the "Table no." input: both let anyone order to any table.
- Display rule for labels: a purely numeric label "5" is shown as "Table 5". Any other label is shown as it is ("Patio 2").

### 4.2 Visits (sessions)
- A table has **at most one open visit** (enforced by a unique partial index).
- A visit opens automatically on the first successful order from that table's QR.
- A visit closes when staff tap **Free table**. It also closes automatically when an order arrives after `session_idle_hours` (default 6) with no orders, so a visit left open overnight never swallows the next day's orders.
- Staff work with a table's **open** visit. A closed visit is read-only: no status changes.
- **Undo:** staff can reopen a visit they freed within 15 minutes, as long as no new visit has started at that table.
- Why visits exist: without them, the next group at Table 5 would inherit the previous group's orders, and "free the table" would mean nothing.

### 4.3 Devices and guest numbers
- Each phone creates `moba:device = crypto.randomUUID()` once and keeps it in `localStorage`.
- The server stores only `sha256(device)` as `orders.device_hash`.
- **A diner sees only orders placed from their own phone, at this table, in the open visit.** Staff see everything.
- Guest number: the first phone to order in a visit is Guest 1, the next new phone is Guest 2, and so on. The same phone keeps its number for the whole visit.

### 4.4 Order lifecycle

```
              Accept                  Served
   placed ───────────────▶ preparing ───────────▶ served
     │  └──────────── Served (quick) ──────────────▲
     │ Cancel                 │ Cancel
     ▼                        ▼
  cancelled               cancelled

  Undo (mis-taps): preparing → placed · served → preparing · cancelled → placed
```

- Every change goes through `staff_set_order_status(order, from, to)` as a compare-and-set: it only applies if the order is still in `from`. If two staff tap at once, the second gets `STATUS_CONFLICT` and the screen refreshes.
- Changes are allowed only while the visit is open.

| Status | Admin label | Diner sees |
|---|---|---|
| `placed` | **New** (orange) | Sent · waiting for the kitchen |
| `preparing` | **Preparing** (sky) | Cooking · 만드는 중 |
| `served` | **Served** (green) | Served · 맛있게 드세요! |
| `cancelled` | **Cancelled** (grey, struck) | Cancelled · please ask our staff |

### 4.5 Money
- Amounts are **integer rupees**. Taxes stay outside this system: "Taxes extra" stays on the menu, and the dashboard says "before tax". If payments or GST are ever added, migrate to paise.
- **The server computes every price.** A line's unit price is (size price, or the dish price when there are no sizes) + the price of each picked option + the price of each add-on. The client sends the total it showed (`expected_total`). If it doesn't match the server's total, the order is refused with `PRICE_CHANGED` and nothing is saved.
- Orders snapshot names, labels and prices, so editing or deleting a dish never changes a past order.

### 4.6 The diet mark on a line
Computed on the server and stored on each order line. The kitchen relies on it.
1. If the dish is non-veg, or any picked option or add-on is non-veg → **nonveg**
2. else if the dish is egg, or any picked option or add-on is egg → **egg**
3. else if the dish is veg → **veg**
4. else if the dish is "veg or non-veg" and a picked option is marked veg (Tofu, Paneer) → **veg**
5. else if the dish is "veg or non-veg" → **both** (shown with both marks)
6. else → unmarked

Choice options carry their own diet mark (Chicken = nonveg, Paneer = veg). This replaces the `NONVEG_PICK` regex in `menu.js`.

### 4.7 Availability

| Flag | Effect on the menu | At order time |
|---|---|---|
| `categories.is_visible = false` | The section and all its dishes are hidden | `DISH_UNAVAILABLE` |
| `dishes.is_visible = false` | The dish is hidden | `DISH_UNAVAILABLE` |
| `dishes.is_available = false` | Shown as **Sold out** | `DISH_UNAVAILABLE` |
| `choice_options.is_available = false` | The chip is disabled ("out today") on every dish using that list. If a required list has fewer available options than its minimum, the dish shows Sold out | `OPTION_UNAVAILABLE` |
| `addons.is_available = false` | Not offered | `ADDON_UNAVAILABLE` |

---

## 5. Security model

### 5.1 Who holds what

| Actor | Holds | Can do |
|---|---|---|
| Anyone on the internet | The publishable key (public by design) | Read the public menu |
| A diner at Table 5 | The key + Table 5's token + their own device secret | Place orders to Table 5. Read their own orders at Table 5 in the open visit. **Nothing else.** |
| Staff | The key + a Supabase session (JWT) + an active row in `staff` | Everything in Admin |
| Local scripts (seed) | The secret key, from an environment variable only | Bypass RLS. **Never in a browser, never committed.** |

### 5.2 Rules (non-negotiable)
1. **The `anon` role has zero table privileges.** It may only EXECUTE `get_public_menu`, `get_table_state` and `place_order`.
2. **RLS is enabled on every table**, and every policy requires `private.is_staff()`.
3. Every `SECURITY DEFINER` function sets `search_path = ''`, uses fully qualified names and validates its inputs. Every `staff_*` function starts with `private.require_staff()`.
4. **No function a diner can call takes a table id, visit id or order id.** Diners reach a table only through its token, and their orders only through token + device secret. So there is no way to read another table's orders, whether by editing a URL, guessing ids or calling the API by hand.
5. Prices from the client are never trusted (§4.5).
6. The QR token is removed from the address bar on landing, and the referrer policy is `strict-origin-when-cross-origin`, so the token doesn't leak through shared links, screenshots or `Referer` headers.
7. Public sign-ups are **off** and anonymous sign-ins are **off**. Even if an account slips through, without an active `staff` row it sees nothing.
8. The secret (service-role) key never appears in `site/`, `admin/` or git. CI greps the built output for `sb_secret_` and `service_role` (§18.1).
9. Route guards in the admin are a convenience. **Grants + RLS + function checks are the security.**
10. Admin never uses `dangerouslySetInnerHTML`. The customer site keeps escaping everything through `esc()`. Kitchen notes are shown as text, always.
11. Internal helpers live in the `private` schema, which the API does not expose. Only the API functions live in `public`.

### 5.3 Threats and mitigations

| Threat | Mitigation |
|---|---|
| Changing the table number in the URL to order for, or see, another table | No table numbers in URLs. 122-bit tokens. Reads are keyed by device secret. |
| A diner who has left keeps the link and orders or peeks from home | They see only their own orders, which disappear when the visit closes. Their phone drops the token when its visit closes (§12.4). The accepting-orders switch goes off after hours. Staff must accept orders. Staff can rotate the QR. |
| A photo of the QR posted online leads to prank orders | All of the above, plus rate limits and Cancel |
| Forged prices, hidden or sold-out dishes, or invalid picks sent straight to the API | Full server-side validation and pricing in `place_order` |
| Double tap or a flaky network creating duplicate orders | The `client_order_id` idempotency key, reused on retry |
| Flooding | Per phone, 6 orders per 10 min. Per table, 20 per 10 min. Max 30 lines and 50 items per order. |
| A random person signs up and reads orders | Sign-ups off, plus `is_staff()` in every policy and function |
| XSS or a leaked script stealing the staff session | Separate origin, strict CSP, no third-party scripts in admin, no raw HTML |
| Two staff acting on the same order, or freeing a table while a new order lands | Compare-and-set status changes. Freeing locks the table row and checks the expected order count. |
| Junk uploads | Bucket limits (2 MB; webp, jpeg and png only). Only staff can write. |
| Abusive kitchen notes | Max 140 characters, control characters stripped, rendered as text |

**Accepted residual risk:** anyone holding a valid token can place an order to that table while ordering is open. This is inherent to walk-in QR ordering, and staff Accept/Cancel is the control. If it becomes a real problem, add "staff must open a table before it takes orders" (backlog).

---

## 6. Database: migration 1 (`schema`)

Use the Supabase CLI (`supabase init`, `supabase link`). Migration file names must be timestamp-prefixed: `20261011000100_schema.sql`, `…0200_access.sql`, `…0300_api_public.sql`, `…0400_api_staff.sql`, `…0500_storage.sql`, `…0600_realtime.sql`.

```sql
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
  role         text not null default 'staff' check (role in ('owner', 'staff')),  -- same powers in v1
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ── menu ───────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),  -- menu.html#<slug>
  name        text not null check (char_length(name) between 1 and 60),
  short_name  text check (char_length(short_name) <= 24),          -- top band label; falls back to name
  name_ko     text check (char_length(name_ko) <= 40),
  blurb       text check (char_length(blurb) <= 400),
  art         text not null default 'pot' check (art in (
                'pot','soup','wok','chicken','corndog','dimsum','gimbap',
                'noodles','rice','burger','boba','sundae')),        -- line drawings in menu.html
  image_path  text,                                                 -- optional cover, in menu-images
  notes       jsonb not null default '[]' check (jsonb_typeof(notes) = 'array'),
              -- [{ "title", "ko", "text", "items": [["term","definition"], …] }]
  is_visible  boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Sub-sections inside a category (Boba Bar → Authentic, Matcha, Ube …)
create table public.category_groups (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name        text not null check (char_length(name) between 1 and 60),
  name_ko     text check (char_length(name_ko) <= 40),
  lede        text check (char_length(lede) <= 300),
  sort_order  int not null default 0,
  constraint category_groups_slug_key unique (category_id, slug) deferrable initially deferred,
  constraint category_groups_id_category_key unique (id, category_id)   -- target of the dishes FK
);

create table public.dishes (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories (id) on delete restrict,
  group_id     uuid,
  name         text not null check (char_length(name) between 1 and 80),
  description  text check (char_length(description) <= 400),
  note         text check (char_length(note) <= 600),               -- longer "good to know"
  price        int  not null check (price between 0 and 100000),    -- with sizes: lowest size price (display only)
  diet         text check (diet in ('veg','nonveg','egg','both')),  -- null = not marked yet
  spice        smallint not null default 0 check (spice between 0 and 3),
  badge        text check (char_length(badge) <= 24),               -- badge ⇒ shown in "Most loved"
  image_path   text,
  is_available boolean not null default true,                       -- false = Sold out
  is_visible   boolean not null default true,                       -- false = hidden
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- a dish's sub-section must belong to the dish's category
  foreign key (group_id, category_id)
    references public.category_groups (id, category_id) on delete set null (group_id)
);

create table public.dish_sizes (
  id         uuid primary key default gen_random_uuid(),
  dish_id    uuid not null references public.dishes (id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 40),  -- "Small · 4 pcs"
  price      int  not null check (price between 0 and 100000),
  sort_order int  not null default 0
);

-- Reusable pick lists
create table public.choice_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 60),  -- staff-only: "Filling — Tofu, Paneer, Chicken…"
  label      text not null check (char_length(label) between 1 and 40),        -- diner sees: "Filling"
  min_select smallint not null default 1 check (min_select >= 0),             -- 0 = optional
  max_select smallint not null default 1 check (max_select between 1 and 10),
  check (min_select <= max_select),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.choice_options (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.choice_groups (id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 40),
  diet         text check (diet in ('veg','nonveg','egg')),            -- drives the line's diet mark
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
  order_no        bigint generated always as identity unique,   -- shown as #1043
  session_id      uuid not null references public.table_sessions (id) on delete restrict,
  table_id        uuid not null references public.dining_tables (id) on delete restrict,
  device_hash     text not null,                                -- sha256(device secret), hex
  client_order_id uuid not null unique,                         -- idempotency key
  guest_no        smallint not null check (guest_no between 1 and 99),
  status          text not null default 'placed'
                  check (status in ('placed','preparing','served','cancelled')),
  item_count      int  not null check (item_count between 1 and 50),
  total           int  not null check (total >= 0),
  cancel_reason   text check (char_length(cancel_reason) <= 140), -- staff-only, never sent to diners
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  served_at       timestamptz,
  cancelled_at    timestamptz,
  updated_by      uuid references auth.users (id) on delete set null
);

create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  dish_id    uuid references public.dishes (id) on delete set null,  -- history survives deletes
  dish_name  text not null,
  size_label text,
  choices    jsonb not null default '[]',   -- [{ "label": "Filling", "options": ["Chicken"] }]
  addons     jsonb not null default '[]',   -- [{ "name": "Fried egg", "price": 25 }]
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
```

---

## 7. Access control: migration 2 (`access`)

```sql
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
-- Saves that touch several tables go through staff_save_* (§8.2) so they are atomic.
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
```

---

## 8. API: server functions

All errors are raised as `raise exception '<CODE>' using errcode = 'P0001'[, detail = …]`. PostgREST returns HTTP 400 with `{ "code": "P0001", "message": "<CODE>", "details": "…" }`. Clients switch on `message` (§11).

### 8.1 Public functions: migration 3 (`api_public`)

| Function | Called by | Purpose |
|---|---|---|
| `get_public_menu()` | menu.html on load and on refresh | The whole visible menu in the shape `menu.js` reads |
| `get_table_state(p_token, p_device)` | menu.html on load, after ordering, and polling | Table label, active?, ordering open?, this phone's orders in the open visit |
| `place_order(p_token, p_device, p_client_order_id, p_items, p_expected_total)` | the Place order button | Validate, price, open a visit if needed, save, return the order |

**`get_public_menu()` response shape.** Category and sub-section `id`s are slugs, which keeps `menu.html#rameyon` deep links working. Everything else is a uuid. `image` values are storage paths. Build the URL as `${supabaseUrl}/storage/v1/object/public/menu-images/${path}`.

```jsonc
{
  "version": 412,                 // restaurant_settings.menu_version
  "orderingOpen": true,
  "categories": [{
    "id": "rameyon", "name": "Rameyon", "short": "Rameyon", "ko": "라면", "art": "noodles",
    "blurb": "…", "image": null, "notes": [{ "title": "Spice guide", "ko": "맵기 단계", "text": "…" }],
    "groups": [{ "id": "authentic", "name": "Authentic", "ko": "오리지널", "lede": "…" }],
    "extras": ["<addon uuid>", "…"]
  }],
  "extras": [{ "id": "<uuid>", "name": "Fried egg", "price": 25, "diet": "egg", "badge": null, "available": true }],
  "dishes": [{
    "id": "<uuid>", "category": "rameyon", "group": null, "name": "Buldak",
    "description": "…", "note": null, "price": 339, "diet": "both", "spice": 3,
    "badge": null, "image": "dishes/8f2c….webp", "available": true,
    "sizes": null,                // or [{ "id", "label", "price" }]
    "choose": [{ "id": "<uuid>", "label": "Filling", "min": 1, "max": 1,
                 "options": [{ "id": "<uuid>", "label": "Chicken", "diet": "nonveg", "price": 0, "available": true }] }]
  }]
}
```

**`place_order` request** (named RPC arguments):
```jsonc
{
  "p_token": "<32 hex>",
  "p_device": "<uuid from moba:device>",
  "p_client_order_id": "<uuid, reused on retry>",
  "p_expected_total": 977,
  "p_items": [{ "dish_id": "<uuid>", "size_id": null, "option_ids": ["<uuid>"],
                "addon_ids": ["<uuid>"], "qty": 2, "note": "less spicy" }]
}
```

**Order JSON** (returned by `place_order`, and inside `get_table_state.orders`):
```jsonc
{ "id": "<uuid>", "orderNo": 1043, "guestNo": 2, "status": "placed", "table": "5",
  "total": 977, "itemCount": 3, "createdAt": "2026-10-11T14:05:00Z",
  "items": [{ "name": "Classic Rabokki", "size": null,
              "choices": [{ "label": "Filling", "options": ["Chicken"] }],
              "addons": [{ "name": "Fried egg", "price": 25 }], "note": "less spicy",
              "diet": "nonveg", "qty": 2, "unitPrice": 394, "lineTotal": 788 }] }
```

**`get_table_state` response:**
```jsonc
{ "table": "5", "active": true, "orderingOpen": true,
  "lastVisitClosedAt": null,      // set when this phone's latest visit here has been closed (§12.4)
  "orders": [ /* order JSON, oldest first; this phone + open visit only */ ] }
```

```sql
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
           d.is_available and not exists (            -- a required list with too few options left
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

  -- No orders from this phone in the open visit: if its last visit here was closed, say when.
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
  -- 1. Shape. Malformed input gets one generic error: no hints for probing.
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

  -- 2. Replay of an order that already went through (lost response, double tap).
  select id into v_order_id from public.orders
   where client_order_id = p_client_order_id and device_hash = v_hash;
  if found then
    return private.order_json(v_order_id);
  end if;

  -- 3. Is the kitchen taking orders?
  select * into v_settings from public.restaurant_settings where id = 1;
  if not v_settings.ordering_open then
    raise exception 'ORDERING_CLOSED' using errcode = 'P0001';
  end if;

  -- 4. The table. FOR UPDATE serialises everything that touches this table's visit
  --    (concurrent first orders, staff freeing the table, idempotent twins).
  select * into v_table from public.dining_tables where qr_token = p_token for update;
  if not found then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;
  if not v_table.is_active then
    raise exception 'TABLE_INACTIVE' using errcode = 'P0001';
  end if;
  select id into v_order_id from public.orders                 -- twin that won the lock
   where client_order_id = p_client_order_id and device_hash = v_hash;
  if found then
    return private.order_json(v_order_id);
  end if;

  -- 5. Rate limits.
  if (select count(*) from public.orders
       where device_hash = v_hash and created_at > now() - interval '10 minutes') >= 6
     or (select count(*) from public.orders
       where table_id = v_table.id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- 6. The open visit: reuse it, retire it if idle too long, or open one.
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

  -- 7. Price every line from the database. Client prices are never read.
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

    -- size: required when the dish has sizes, not allowed otherwise
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

    -- picks: no repeats, each belongs to one of this dish's lists, each list within min..max
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

    -- add-ons: no repeats, offered by this dish's category, in stock
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

  -- 8. Guest number: a phone keeps its number for the whole visit.
  select o.guest_no into v_guest from public.orders o
   where o.session_id = v_session.id and o.device_hash = v_hash limit 1;
  if v_guest is null then
    select coalesce(max(o.guest_no), 0) + 1 into v_guest from public.orders o where o.session_id = v_session.id;
  end if;

  -- 9. Write.
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
```

Any failure inside `place_order` (for example `DISH_UNAVAILABLE` on line 3) rolls back the whole call, including a visit it just opened.

### 8.2 Staff functions: migration 4 (`api_staff`)

| Function | Purpose |
|---|---|
| `staff_dashboard()` | Today's numbers (IST) for the dashboard |
| `staff_tables_overview()` | Every table plus a summary of its open visit (Orders grid, Tables list, nav badge) |
| `staff_set_order_status(order, from, to, reason?)` | Compare-and-set status change (§4.4) |
| `staff_free_table(session, expected_orders, serve_pending)` | Close a visit safely |
| `staff_reopen_session(session)` | Undo a free within 15 min |
| `staff_rotate_table_token(table)` | New QR token; the old QR stops working |
| `staff_reorder(kind, ids[])` | Save a new order for categories, dishes, tables, sub-sections, add-ons, sizes or options |
| `staff_save_category(jsonb)` | Category + sub-sections + offered add-ons, atomically |
| `staff_save_dish(jsonb)` | Dish + sizes + attached choice lists, atomically |
| `staff_save_choice_group(jsonb)` | Choice list + its options, atomically |

The save functions **keep the ids of sizes, sub-sections and options that come back** (update in place), insert new ones and delete the rest. This matters because diners' carts hold size and option ids: rewriting rows on every save would break every open cart.

```sql
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
       ('preparing','placed'), ('served','preparing'), ('cancelled','placed')) then  -- last three = undo
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
-- p_expected_orders: how many orders the staff member was looking at. If more arrived
-- meanwhile, refuse, so nobody frees a table over orders they haven't seen.
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
  perform 1 from public.dining_tables where id = v_session.table_id for update;   -- same lock as place_order
  select * into v_session from public.table_sessions where id = p_session_id;     -- re-read under the lock
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

-- ── undo a free (15 minutes, and only if no new visit started) ─────
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

-- ── save a dish (+ sizes + choice lists) ───────────────────────────
-- p: { id?, category_id, group_id?, name, description?, note?, price, diet?, spice, badge?,
--      image_path?, is_available, is_visible,
--      sizes: [{ id?, label, price }]   -- 0, or 2+ rows; order = display order
--      choice_group_ids: [uuid] }       -- order = display order
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

  -- sizes: keep returned ids, add new, drop the rest
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

  -- choice lists, in the order given
  delete from public.dish_choice_groups where dish_id = v_id;
  insert into public.dish_choice_groups (dish_id, group_id, sort_order)
  select v_id, x.g::uuid, x.n
    from jsonb_array_elements_text(coalesce(p->'choice_group_ids', '[]'::jsonb)) with ordinality as x(g, n);

  return v_id;
end $$;

-- ── save a category (+ sub-sections + offered add-ons) ─────────────
-- p: { id?, slug, name, short_name?, name_ko?, blurb?, art, image_path?, notes: [...], is_visible,
--      groups: [{ id?, slug, name, name_ko?, lede? }],   -- order = display order
--      addon_ids: [uuid] }                               -- order = display order
-- Removing a sub-section leaves its dishes in the category with no sub-section.
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

  -- sub-sections: keep returned ids (dishes point at them), add new, drop the rest
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

  -- offered add-ons, in the order given
  delete from public.category_addons where category_id = v_id;
  insert into public.category_addons (category_id, addon_id, sort_order)
  select v_id, x.a::uuid, x.n
    from jsonb_array_elements_text(coalesce(p->'addon_ids', '[]'::jsonb)) with ordinality as x(a, n);

  return v_id;
end $$;

-- ── save a choice list (+ options) ─────────────────────────────────
-- p: { id?, name, label, min_select, max_select,
--      options: [{ id?, label, diet?, price_delta, is_available }] }   -- order = display order
create function public.staff_save_choice_group(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id   uuid := nullif(p->>'id', '')::uuid;
  v_keep uuid[];
begin
  perform private.require_staff();
  if coalesce((p->>'min_select')::int, 1) > jsonb_array_length(coalesce(p->'options', '[]'::jsonb)) then
    raise exception 'BAD_REQUEST' using errcode = 'P0001';   -- can't require more picks than options
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

  -- options: keep returned ids (carts hold option ids), add new, drop the rest
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
```

Simple writes go straight through RLS from the admin: availability and visibility switches, add-on CRUD, table CRUD, deletes, and `restaurant_settings.ordering_open`.

---

## 9. Storage: migration 5 (`storage`)

```sql
-- 20261011000500_storage.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Public bucket: anyone can GET a file by its URL. Listing and writing are staff-only.
create policy menu_images_staff_read   on storage.objects for select to authenticated
  using (bucket_id = 'menu-images' and (select private.is_staff()));
create policy menu_images_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and (select private.is_staff()));
create policy menu_images_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and (select private.is_staff()))
  with check (bucket_id = 'menu-images' and (select private.is_staff()));
create policy menu_images_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and (select private.is_staff()));
```

**Paths:** `dishes/<random-uuid>.webp` and `categories/<random-uuid>.webp`. Every upload gets a **new** name, so CDN caching never serves an old photo (`cacheControl: '31536000'`, `upsert: false`). The database stores the path, not the full URL.

**Upload pipeline** (`admin/src/lib/image.js`):
1. Accept `image/jpeg`, `image/png`, `image/webp`, up to 15 MB raw. Reject anything else with "Use a JPG, PNG or WebP photo." (iPhones convert HEIC to JPEG on upload.)
2. Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`, centre-crop to a square, and scale to 1200 × 1200 (the menu shows dishes on a round plate).
3. Encode to WebP at quality 0.82. If the result is over 1.8 MB, retry at 0.7.
4. Upload, then save the dish with the new `image_path`. **On success** delete the old file. **If the save fails** delete the new file.

---

## 10. Realtime: migration 6 (`realtime`)

```sql
-- 20261011000600_realtime.sql
alter publication supabase_realtime add table public.orders, public.table_sessions;
```

- Only staff receive events: Realtime `postgres_changes` applies RLS, and `anon` has no SELECT.
- **Realtime is a hint, not the truth.** On any event, refetch the affected queries. After a reconnect (`SUBSCRIBED` following `CHANNEL_ERROR`, `TIMED_OUT` or `CLOSED`) and on window focus, refetch everything. Events can be missed, refetches can't.
- Diners do not use Realtime. They poll `get_table_state` (§12.4).

---

## 11. Error codes

| Code | Raised by | Diner copy (site) / Staff copy (admin) | Client action |
|---|---|---|---|
| `BAD_REQUEST` | any | "Something went wrong. Please try again." | Log it; this means a client bug |
| `INVALID_TABLE` | get_table_state, place_order | "This QR code isn't active any more. Scan the code on your table, or ask our staff." | Drop the stored token; switch to browse mode |
| `TABLE_INACTIVE` | place_order (and `active:false` in state) | "This table isn't taking orders right now. Please ask our staff." | Disable Place order |
| `ORDERING_CLOSED` | place_order (and `orderingOpen:false`) | "We're not taking orders right now. You can still browse the menu." | Banner; disable Place order |
| `RATE_LIMITED` | place_order | "That's a lot of orders in a few minutes. Please wait a moment or ask our staff." | Keep the cart |
| `DISH_UNAVAILABLE` (detail: dish id) | place_order | "{Dish} just sold out. We've marked it in your order." | Refresh the menu; flag the line; block Place until it's removed |
| `OPTION_UNAVAILABLE` (detail: option id) | place_order | "{Option} is out today. Pick another {list label} for {dish}." | Refresh the menu; flag the line; Edit opens the builder |
| `ADDON_UNAVAILABLE` (detail: add-on id) | place_order | "{Add-on} is out today. Remove it from {dish} to continue." | Same |
| `INVALID_ITEM` (detail: dish id) | place_order | "{Dish} changed on our menu. Please check its options." | Refresh the menu; re-validate the cart (§12.3) |
| `TOO_MANY_ITEMS` | place_order | "One order can have up to 50 items. Please split it in two." | — |
| `PRICE_CHANGED` (detail: new total) | place_order | "Prices were just updated. Check your total and place the order again." | Refresh the menu; re-render the cart; new client_order_id |
| `TIMEOUT` / `NETWORK` | client | "We couldn't reach the kitchen. Tap Place order again. It won't be sent twice." | Keep the same client_order_id |
| `NOT_STAFF` (42501) | staff_* | "This account doesn't have access to MOBA Admin." | Sign out |
| `STATUS_CONFLICT` | staff_set_order_status | "Someone just updated this order. Showing the latest." | Refetch |
| `BAD_TRANSITION` | staff_set_order_status | "That change isn't allowed." | Refetch |
| `SESSION_CHANGED` | staff_free_table | "New orders just came in for this table. Check them first." | Refetch; reopen the dialog |
| `PENDING_ORDERS` (detail: count) | staff_free_table | Dialog: "{n} orders aren't marked served yet." | Offer "Mark served & free" |
| `SESSION_CLOSED` | staff_free_table | "This table was already freed." | Refetch |
| `CANNOT_REOPEN` | staff_reopen_session | "Can't reopen: new guests have ordered, or it's been more than 15 minutes." | Refetch |
| `NOT_FOUND` | staff_* | "This was deleted. Showing the latest." | Refetch / NotFound page |
| `23505` unique violation | admin writes | "There's already a table called 5." / "That link name is taken." | Highlight the field |
| `23503` FK violation | admin deletes | "Table 5 has order history, so it can't be deleted. Turn it off instead." / "This category still has dishes." / "This list is used by 12 dishes. Remove it from them first." | — |

---

## 12. Customer site changes (`site/`)

The site stays static vanilla JS with no build step. The UI and motion are already approved, so change behaviour, not design. It does **not** load supabase-js: three RPC calls don't justify the bundle on a 4G QR scan.

### 12.1 New files

**`site/config.js`** (public values, safe to ship):
```js
window.MOBA_CONFIG = {
  supabaseUrl: "https://<project-ref>.supabase.co",
  supabaseKey: "sb_publishable_…",   // publishable/anon key. NEVER the secret key.
};
```

**`site/table-context.js`**: load it **first** in `<head>` on both `index.html` and `menu.html`.
```js
/* MOBA table context. The table's QR opens /?t=<token>. Keep the token for this visit,
   then take it out of the address bar so a shared link or screenshot can't order for the table. */
(() => {
  "use strict";
  const KEY = "moba:table:v2";
  const TTL = 4 * 60 * 60 * 1000;          // one visit; scanning again refreshes it
  const TOKEN = /^[0-9a-f]{32}$/;
  let mem = null;                          // private mode: localStorage may throw
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return mem; } };
  const write = (v) => {
    mem = v;
    try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {}
  };

  const url = new URL(location.href);
  const t = url.searchParams.get("t");
  if (t !== null) {
    if (TOKEN.test(t)) write({ token: t, scannedAt: Date.now() });
    url.searchParams.delete("t");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }

  window.MOBA_TABLE = {
    get() {                                // { token, scannedAt } or null
      const v = read();
      return v && TOKEN.test(v.token) && Date.now() - v.scannedAt < TTL ? v : null;
    },
    drop() { write(null); },
  };
})();
```

**`site/api.js`**: the only code that talks to Supabase.
```js
(() => {
  "use strict";
  const { supabaseUrl, supabaseKey } = window.MOBA_CONFIG;
  const DEVICE_KEY = "moba:device";

  class ApiError extends Error {
    constructor(code, detail = null) { super(code); this.code = code; this.detail = detail; }
  }

  async function rpc(fn, args, timeoutMs = 10000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const headers = { "Content-Type": "application/json", apikey: supabaseKey };
    if (supabaseKey.startsWith("eyJ")) headers.Authorization = `Bearer ${supabaseKey}`; // legacy anon JWT key only
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST", headers, body: JSON.stringify(args || {}), signal: ctrl.signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const code = typeof body?.message === "string" && /^[A-Z_]+$/.test(body.message) ? body.message : "SERVER_ERROR";
        throw new ApiError(code, body?.details ?? null);
      }
      return body;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e.name === "AbortError" ? "TIMEOUT" : "NETWORK");
    } finally {
      clearTimeout(timer);
    }
  }

  let memDevice = null;
  function deviceId() {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
      return id;
    } catch {
      return (memDevice ||= crypto.randomUUID());
    }
  }

  window.MobaApi = {
    ApiError,
    deviceId,
    getMenu: () => rpc("get_public_menu", {}),
    getTableState: (token) => rpc("get_table_state", { p_token: token, p_device: deviceId() }),
    placeOrder: ({ token, clientOrderId, items, expectedTotal }) =>
      rpc("place_order", { p_token: token, p_device: deviceId(), p_client_order_id: clientOrderId,
                           p_items: items, p_expected_total: expectedTotal }, 15000),
    imageUrl: (path) => (path ? `${supabaseUrl}/storage/v1/object/public/menu-images/${path}` : null),
  };
})();
```

### 12.2 HTML changes
- **Both pages:** `<meta name="referrer" content="strict-origin-when-cross-origin">`, and `<script src="table-context.js"></script>` as the first script in `<head>`.
- **`menu.html`:** load `config.js` and `api.js` before `menu.js`. **Remove** `menu-data.js`. In the order sheet footer, **replace the "Table no." input** with a table slot (`#tableSlot`) that shows one of the states in §12.5. Add an empty `#orderingBanner`. Bump the `?v=` cache-busters.
- **Move** `site/menu-data.js` to `scripts/legacy/menu-data.js`. It is seed input only.

### 12.3 `menu.js` changes

| Area | Change |
|---|---|
| Boot | Render at once from the cached menu (`moba:menu:v2` = `{ version, data }`), then fetch `getMenu()`. If the version changed, re-ingest and re-render the current view without entrance animations. No cache and fetch failed → existing `showLoadError()`. Refetch when the tab becomes visible and the last fetch is > 60 s old. |
| `ingest()` | Read the §8.1 shape: sizes carry `id`; `choose` items are `{ id, label, min, max, options:[{ id, label, diet, price, available }] }`; extras carry `available`; image paths go through `MobaApi.imageUrl()`. Optional cover image on category tiles (fallback: line art). |
| Cart v2 | New key `moba:cart:v2` (old carts are dropped). Line = `{ id, sizeId, picks: { [groupId]: [optionId] }, addons: [addonId], note, qty }`. `lineKey` uses sorted ids. |
| `cleanLine()` | Validate against the current menu. If the dish, size or option list is gone → drop the line and toast "{Dish} changed on our menu and was removed." Unavailable dish/option/add-on → keep the line with `blocked: "<reason>"`, render it with a "Sold out: remove" or "Out today: edit" note, and disable Place order while any line is blocked. |
| Builder | Chips use option ids. Unavailable options are disabled with "out today". Show "+₹50" when `price > 0`. Lists with `min = 0` say "Optional · pick up to N"; lists with `max > 1` say "Pick up to N". Required-pick validation uses `min`. |
| Diet | `lineDiet()` follows §4.6 using `option.diet`. Delete `NONVEG_PICK`. |
| Pricing preview | `unitPrice = (size?.price ?? dish.price) + Σ option.price + Σ addon.price`, the same formula as the server. |
| Table | Delete `TABLE_KEY`, `readTable()`, `tableOk()`, `showTableError()` and the table input handlers. Use `MOBA_TABLE.get()`. |
| Place order | (1) Need a token, else show the scan prompt. (2) `clientOrderId`: reuse the pending one saved in `sessionStorage` (`moba:pending` = `{ id, cartKey }`) if the cart is unchanged, else `crypto.randomUUID()`, saved **before** sending, so a reload during a lost response can't double-order. (3) Send ids only, plus `expectedTotal = cartTotal()`. (4) On success: clear the cart and `moba:pending`, render the confirmation from the **server** order, start polling. (5) On error: §11. |
| Placed orders | Delete `ORDERS_KEY` and its TTL logic. "Your orders at Table 5" comes from `getTableState().orders`, with status chips (§4.4). Footer line: "Need to change something? Ask our staff." |
| Remove | `window.MOBA_ORDER_URL`, `sendOrder()`, `orderId()`, the client-side `MB-xxxx` numbers. |

### 12.4 Polling and the end of a visit
- When a token is present, call `getTableState(token)` on boot, right after placing an order, when the tab becomes visible, and on an interval while the tab is visible: **every 20 s** while any order is `placed` or `preparing`, otherwise **every 60 s**. Stop when there is no token.
- If `lastVisitClosedAt` is set **and** it is later than `scannedAt` → this phone's visit was closed after it scanned. Call `MOBA_TABLE.drop()` and show in the order sheet: "Thanks for eating with us! 같이 밥 먹어요. Scan the QR on your table to order again." This is what stops a departed diner's phone from ordering to a table that's now someone else's.
- `INVALID_TABLE` → drop the token. `active: false` or `orderingOpen: false` → update the footer state (§12.5).

### 12.5 Order sheet footer states

| State | Footer shows |
|---|---|
| No token (browse mode) | "To order, scan the QR code on your table." Place order is hidden; the cart still works. |
| Token invalid | "This QR code isn't active any more. Scan the code on your table, or ask our staff." |
| Table inactive | "This table isn't taking orders right now. Please ask our staff." |
| Ordering closed | Banner: "We're not taking orders right now. You can still browse the menu." Place order is disabled. |
| Any line blocked | "Fix the marked items to place your order." Place order is disabled. |
| Ready | Chip "Table 5", item count, total, "Taxes extra", **Place order** |

The confirmation screen keeps the existing `주문 완료!` stamp and shows "Order #1043 · Table 5 · Guest 2", the status chip, the lines, and the server total.

---

## 13. MOBA Admin (`admin/`)

### 13.1 Stack
React 19 · Vite · Tailwind CSS v4 · react-router v7 (declarative mode) · @supabase/supabase-js v2 · @tanstack/react-query v5 (caching, refetch on focus, invalidation from Realtime) · react-hook-form + zod (dish and category forms have dynamic rows) · `qrcode` (canvas and SVG output) · lucide-react · react-hot-toast · date-fns. JavaScript (JSX). Pin exact versions when you scaffold and commit the lockfile.

### 13.2 Structure
```
admin/
├── index.html                 <meta name="robots" content="noindex, nofollow">
├── .env.example               VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_PUBLIC_MENU_URL
├── public/                    logo-full.webp, logo-mark.webp, new-order.mp3
└── src/
    ├── main.jsx · App.jsx · index.css (Tailwind @theme tokens, §13.10)
    ├── lib/        supabase.js · queryClient.js · errors.js (code → copy, §11) · format.js (₹, IST time,
    │               table label) · qr.js (QR + table card) · image.js (§9) · ids.js (uuid check)
    ├── services/   authService · settingsService · dashboardService · tableService · orderService ·
    │               categoryService · dishService · choiceService · addonService · storageService
    ├── hooks/      useAuth · useLiveOrders · useOrderSound · useWakeLock
    ├── context/    AuthContext.jsx
    ├── components/
    │   ├── layout/     AppShell · Sidebar · BottomNav · ProtectedRoute
    │   ├── ui/         Button · Card · Badge · StatusChip · DietMark · Switch · Field · Modal ·
    │   │               ConfirmDialog · EmptyState · ErrorState · Skeleton · ImageUpload · ArtIcon
    │   ├── dashboard/  OrderingSwitch · StatsRow · WaitingList
    │   ├── tables/     TableList · TableFormModal · TableRangeForm · QrPreview · QrActions · TableNowPanel
    │   ├── orders/     TableGrid · TableTile · OrderCard · OrderLine · FreeTableDialog · VisitSummary
    │   └── menu/       CategoryList · CategoryForm · GroupsEditor · NotesEditor · AddonPicker · DishList ·
    │                   DishForm · SizesEditor · ChoiceListPicker · ChoiceGroupForm · AddonForm · ArtPicker
    └── pages/      LoginPage · ResetPasswordPage · DashboardPage · OrdersPage · OrderTablePage ·
                    TablesPage · TableDetailPage · MenuPage · CategoryPage · DishPage · ChoicesPage ·
                    AddonsPage · NotFoundPage
```

**Code rules:** all Supabase calls live in `services/`, never in components. Every page handles loading (skeleton), error (ErrorState + Retry), empty (EmptyState + the next action) and data. Every mutation shows a pending state, toasts on error with §11 copy, and invalidates the right queries. Times are IST via `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })`; relative times use date-fns. No mock data: everything hits Supabase. No `dangerouslySetInnerHTML`.

### 13.3 Routes

| Path | Page | Access |
|---|---|---|
| `/login` | LoginPage | Public. If already signed in → `/dashboard` |
| `/reset-password` | ResetPasswordPage | Public (opened from the recovery email) |
| `/` | → `/dashboard` | Staff |
| `/dashboard` | DashboardPage | Staff |
| `/orders` | OrdersPage: grid of all tables | Staff |
| `/orders/:tableId` | OrderTablePage: live orders + Free table | Staff |
| `/tables` | TablesPage: list + add | Staff |
| `/tables/:tableId` | TableDetailPage: QR, edit, "now at this table" | Staff |
| `/menu` | MenuPage: tabs Categories · Choices · Add-ons (Categories by default) | Staff |
| `/menu/choices` | ChoicesPage | Staff |
| `/menu/addons` | AddonsPage | Staff |
| `/menu/categories/new` | CategoryPage (create) | Staff |
| `/menu/categories/:categoryId` | CategoryPage | Staff |
| `/menu/dishes/new?category=:categoryId` | DishPage (create) | Staff |
| `/menu/dishes/:dishId` | DishPage | Staff |
| `*` | NotFoundPage | — |

**Route rules:**
- `:tableId`, `:categoryId`, `:dishId` and `?category=` must be UUIDs. If not, render NotFound **without querying**. A valid UUID that returns no row → NotFound ("This table doesn't exist or was deleted"). Never a blank screen.
- `ProtectedRoute` waits for the auth state (skeleton), then: no session → `/login?next=<path>`; session but no active staff row → sign out and show "This account doesn't have access to MOBA Admin."
- `next` is followed only if it starts with `/` and not `//` (no open redirects).
- These guards are UX only. The database enforces access (§5.2.9).

### 13.4 Auth
- `signInWithPassword`. Errors are generic ("Email or password is wrong") so they don't reveal which accounts exist.
- After sign-in, `select * from staff where user_id = auth.uid()`. No row, or `is_active = false` → sign out with the message above.
- Forgot password → `resetPasswordForEmail(email, { redirectTo: '<admin-url>/reset-password' })`. Always say "If that email has an account, we've sent a link." `/reset-password` waits for the `PASSWORD_RECOVERY` event, then `updateUser({ password })` with at least 10 characters.
- Sign out is in the sidebar and the bottom-nav overflow. Sessions persist and refresh through supabase-js defaults.

### 13.5 Dashboard (`/dashboard`)
- **Accepting orders** switch (`restaurant_settings.ordering_open`). Turning it **off** asks for confirmation: "Phones can still browse the menu, but can't place orders."
- **Stats row** from `staff_dashboard()`: Orders today · Order value today (before tax) · Waiting to be accepted · Tables occupied (4 / 18).
- **Waiting list:** orders in `placed` from open visits, oldest first. Each row shows Table 5 · Guest 2 · #1043 · 6 min ago · 3 items · ₹977, with **Accept** and **Open table**.
- States: skeleton; ErrorState + Retry; "All caught up. New orders show up here." when nothing is waiting.

### 13.6 Tables & QR

**`/tables` list:** from `staff_tables_overview()`. Each row shows the label, seats, status (Free · Occupied for 38 min), an Active switch, up/down reorder, and a tap to open the detail page.
- **Add table** modal with two modes: *One table* (label, seats) and *A range* (from, to, optional prefix like "T"; max 50 at once). The range is inserted in one request. A duplicate gives "Table 7 already exists".
- The Active switch is **disabled while the table is occupied**, with the hint "Free the table first."
- Empty state: "No tables yet. Add your tables to print their QR codes." with **Add tables**.

**`/tables/:tableId` detail:**
- **QR preview:** a large QR plus a preview of the printable table card.
- **Download table card (PNG):** a 1200 × 1600 canvas with a cream background, the MOBA logo, "TABLE 5" in Bagel Fat One, the QR (ink `#1B1A2E` modules on white, error correction **M**, 4-module quiet zone), "Scan to order · 주문하기" and "맛있게 드세요!". Wait for `document.fonts.load()` before drawing. File name `moba-table-5.png`.
- **Download QR (SVG):** the plain QR for print shops, via `QRCode.toString(url, { type: 'svg', margin: 4 })`.
- **Share:** if `navigator.canShare({ files })`, share the PNG card with the Web Share API. Otherwise, download it. A secondary "Copy ordering link" copies the link after a note: "Anyone with this link can order for Table 5. Share it only with your printer."
- **Edit:** label and seats.
- **Danger zone:**
  - *Replace QR code* (`staff_rotate_table_token`). Confirm: "The printed QR for Table 5 will stop working right away. You'll need to print the new one."
  - *Delete table*. Only possible if it has no history; otherwise explain "Turn it off instead" (§11, 23503).
- **Now at this table:** a read-only list of the open visit's orders, **grouped by guest** (Guest 1, Guest 2…), with lines, diet marks, notes and status, live. "Manage in Orders →" links to `/orders/:tableId`. When free: "No one is ordering at this table right now."

QR content: `${VITE_PUBLIC_MENU_URL}/?t=${qr_token}`. Tokens are read only on this page; never show them as plain text.

### 13.7 Orders

**`/orders` grid:** from `staff_tables_overview()`, kept in **table order** (tiles never jump around). Filter chips: All · Occupied · Needs attention.

| Tile state | Look | Shows |
|---|---|---|
| Free | Dashed border, muted | Label |
| Occupied | Solid cobalt border | Label · "38 min" · orders · ₹ total |
| Needs attention (has `placed`) | Orange border + "2 new" badge; gentle pulse unless reduced motion | Same + badge |

Tap a tile → `/orders/:tableId`.

**`/orders/:tableId`:**
- **Header:** Table 5 · Open since 7:42 PM (38 min) · 3 orders · ₹1,245 (before tax).
- **Order cards, oldest first.** Each shows `#1043 · Guest 2 · 7:45 PM · status`, then the lines: `2 × Classic Rabokki` + diet mark, size, choices ("Filling: Chicken"), add-ons ("+ Fried egg"), and the kitchen note **highlighted in lemon**, then the order total.
- **Actions by status:**

  | Status | Actions |
  |---|---|
  | placed | **Accept**, Served, Cancel |
  | preparing | **Served**, Cancel |
  | served | Undo (→ preparing) |
  | cancelled | Undo (→ placed) |

  Cancel asks for an optional reason (staff-only). Every action sends `from` = the status shown on screen.
- **Sticky footer:** the visit total + **Free table**.
- **Free table dialog** (`staff_free_table` with `expected_orders` = the number of orders on screen):
  1. Nothing pending: "Free Table 5? 3 orders · ₹1,245. The next guests start with a fresh order list." → **Free table**.
  2. Pending orders: "2 orders aren't marked served yet" (listed) → **Mark served & free** (`serve_pending = true`) or **Keep table open**. Ghost or prank orders should be cancelled from their cards first.
  3. `SESSION_CHANGED` → refetch, toast, keep the dialog closed.
  4. Success → navigate to `/orders`, toast "Table 5 is free" with **Undo** (10 s) → `staff_reopen_session`.
- **Table is free:** "Table 5 is free. Orders from its QR code will show up here." If it was freed in the last 15 minutes, also show "Freed at 8:12 PM · Reopen visit".
- **Closed visits** are not browsable in v1 (backlog).

### 13.8 Menu & Categories

**`/menu` (Categories tab):** each row shows the line-art icon, name, Korean name, dish count, a Visible switch, up/down reorder (`staff_reorder('categories')`), and a tap to open. **Add category** button. Empty state: "No categories yet."

**`/menu/categories/:categoryId`:**
- **Details form** (`staff_save_category`):
  - Name (required) and Short name ("Shown in the top bar. Defaults to the name").
  - Korean name.
  - Link name / slug: auto-generated from the name on create and editable. Warning: "Menu links like menu.html#rameyon use this."
  - Blurb.
  - Icon: ArtPicker with the 12 line drawings from `menu.html`, copied into `ArtIcon`.
  - Cover photo (optional).
  - Visible.
- **Sub-sections:** rows with name, Korean, intro and auto slug. Add, reorder, remove ("Its dishes stay in the category, without a sub-section").
- **Notes:** rows with title, Korean and text, plus optional term/definition pairs (the "Flavour options" panel).
- **Add-ons offered:** a checklist of add-ons in order.
- **Dishes:** each row shows the photo thumbnail, name, diet mark, price ("from ₹229" with sizes), and an **Available** switch (Sold out ↔ Available, one tap, written directly via RLS). Also Visible, reorder, and tap to edit. **Add dish** → `/menu/dishes/new?category=<id>`.
- **Delete category:** only when it has no dishes. Otherwise: "Move or delete its 9 dishes first, or hide the category."

**`/menu/dishes/:dishId` (and `/new`)**, saved through `staff_save_dish` and validated with zod using the same limits as the database:

| Field | Rules |
|---|---|
| Photo | ImageUpload (§9). Round preview like the menu plate. Replace / remove. |
| Name | 1–80, required |
| Category · Sub-section | Category required. Sub-section options filtered to the category; cleared when the category changes. |
| Description · Good to know | ≤ 400 · ≤ 600 |
| Price | **One price** (₹, integer) or **Sizes**: 2–4 rows of label + price. The menu shows "from" the lowest. |
| Diet | Veg · Non-veg · Contains egg · Veg or non-veg (depends on the pick) · Not marked |
| Spice | None · Mild · Hot · Very hot |
| Badge | ≤ 24. Hint: "Dishes with a badge appear in Most loved." |
| Choice lists | Ordered list of attached lists (add from a dropdown, reorder, remove). Each shows its rule ("Pick 1", "Pick up to 2", "Optional"). Link: "Manage choice lists". |
| Available · Visible | Switches. Hint: "Sold out keeps it on the menu; hidden removes it." |
| Delete | Confirm. Past orders keep their copy. Suggest "Hide" instead. |

Leaving with unsaved changes asks for confirmation.

**`/menu/choices`:** each choice list shows its staff name ("Filling — Tofu, Paneer, Chicken…"), the label diners see, its rule, "Used by 41 dishes", and its options inline with **availability switches** ("no fish today" in one tap, across every dish). Edit modal (`staff_save_choice_group`): name, label, min, max, and option rows (label, diet, +₹ price, available) with reorder. Delete only when unused.

**`/menu/addons`:** each row shows name, price, diet, badge, an **Available** switch, and "Offered in: Rameyon, Signatures…". Add/edit modal. Delete confirms which categories lose it.

### 13.9 Live updates, sound, screen
- **`useLiveOrders`** is mounted once in `AppShell`, so it works on every page. It subscribes to `postgres_changes` on `orders` and `table_sessions`. On any event it invalidates `['tables-overview']`, `['dashboard']` and `['table-live', table_id]`. On an orders **INSERT** it shows a toast ("New order · Table 5 · #1043", tap → table), plays the sound, and prefixes the tab title "(2) ". On reconnect it refetches everything. As a safety net, it polls the overview every 60 s.
- **Orders badge** in the nav = the `waiting` count.
- **Sound:** browsers block audio until a tap, so show an "Enable sound" button on Dashboard and Orders, remember the choice in `localStorage`, and unlock audio on that tap.
- **Wake lock:** on `/orders*` and `/dashboard`, request `navigator.wakeLock.request('screen')` where supported, and re-request on `visibilitychange`, so the counter tablet doesn't sleep.

### 13.10 Design
Same world as the menu, calmer for operations.

| Token | Value | Use |
|---|---|---|
| `cream` | `#FFF8E7` | Page background |
| `paper` | `#FFFDF6` | Cards, sheets |
| `ink` | `#1B1A2E` | Body text, QR modules |
| `cobalt` | `#3069B8` | Lines, borders, links, focus ring, Occupied |
| `orange` | `#FF531B` | Primary buttons, "New" status, needs attention |
| `lemon` | `#F6F396` | Selection, kitchen-note highlight |
| `sky` | `#8BBEE9` | "Preparing" status |
| `veg` · `nonveg` · `egg` | `#1E8A3C` · `#D3261A` · `#C98A0C` | Diet marks (same square-dot marks as the menu), Served (veg green) |
| `line` | `rgba(48,105,184,.28)` | Dividers, dashed Free tiles |

- **Type:** Bagel Fat One for page titles and big numbers only. Nunito (400/600/700/800) for all UI text. Korean text uses the system fallback.
- **Shapes:** cards are `paper` with a 2px `line` border and 16px radius. Primary buttons are orange with white text and a hard `3px 3px 0 cobalt` shadow (the brand's sticker look). No soft shadows, no gradients.
- **Layout:** mobile-first. Under 768px there is a bottom nav (Dashboard · Orders · Tables · Menu). At 768px and up, a 240px left sidebar. The Orders grid has 2 columns on phones and 4–6 on a landscape tablet. Tap targets are at least 44px. Status is never shown by colour alone: chips always carry text.
- **Motion:** minimal (toast slide, tile pulse); `prefers-reduced-motion` turns it off.

---

## 14. Edge cases and races

| Situation | Behaviour |
|---|---|
| Two phones at a free table order at the same moment | The table-row lock serialises them: one opens the visit and the other joins it. Guest 1 and Guest 2. |
| Double tap on Place order, or a lost response and a retry | Same `client_order_id` → the server returns the first order. Never a duplicate. |
| Page reloaded while an order was in flight | `moba:pending` keeps the id. A retry with the unchanged cart reuses it. |
| Dish sold out, or price changed, while in the cart | §11: server refuses, client refreshes the menu, flags or re-prices the lines, the diner confirms again. |
| Staff detach a choice list or delete a size while diners hold it in their carts | `INVALID_ITEM` → refresh → `cleanLine` drops the line with a toast |
| Two staff tap Accept on the same order | Compare-and-set: one wins, the other gets `STATUS_CONFLICT` → refetch |
| A new order lands while staff are freeing the table | `SESSION_CHANGED` → refetch, staff see it, decide again |
| Staff free the wrong table | Undo toast / "Reopen visit" for 15 min, if no new visit has started. Phones that already dropped the token re-scan. |
| A visit left open overnight | The next order after 6 idle hours closes it (`idle`) and starts fresh. The dashboard shows how long each table has been occupied. |
| Diner leaves, then tries to order from home later | After the visit closes their phone drops the token (§12.4). If they still have the link: ordering is off after hours, staff must Accept, Cancel exists, and Replace QR is available. |
| QR replaced while guests are seated | Their next action → `INVALID_TABLE` → "Scan the code on your table". Staff should replace QRs between visits. |
| Table deactivated | Blocked while occupied (UI). A deactivated table's QR says "isn't taking orders". |
| Staff account removed or deactivated mid-shift | The next query returns nothing or `NOT_STAFF` → signed out with a message |
| Admin JWT expired | supabase-js refreshes it. If refresh fails → `/login?next=…` |
| Private browsing (`localStorage` throws) | Device id and token fall back to memory. Orders still work; "Your orders" is lost on reload. |
| Menu cached from yesterday | Shown instantly, refreshed in the background. `expected_total` makes stale prices impossible to place. |
| Category with a hidden state but dishes in carts | The dish is unavailable at order time → flagged |
| Deleting a dish that has past orders | Allowed: `order_items` keeps the snapshot and `dish_id` becomes null. The UI suggests Hide. |
| Image upload succeeds but the save fails (or the reverse) | The pipeline deletes the orphan (§9) |
| Very long note, emoji, Hangul | Trimmed to 140; control characters stripped; UTF-8 throughout; rendered as text |

---

## 15. Seeding from the current menu

`scripts/build-seed.mjs` (Node 20+) turns `scripts/legacy/menu-data.js` into `supabase/seed.sql`:
1. Load the file with `vm.runInNewContext(code, { window: {} })` and read `window.MOBA_MENU`.
2. Generate UUIDs in Node (`crypto.randomUUID()`) so the SQL has literal ids. Wrap everything in `begin; … commit;`. It is meant for an empty database and fails loudly on duplicates.
3. **Categories:** `slug` = the current `id` (keeps `#rameyon` links). `sort_order` = array index. `short_name`, `name_ko`, `art`, `blurb` and `notes` copied (notes `items` stay as `[term, definition]` pairs).
4. **Sub-sections** from `groups` (`[id, name, ko, lede]`).
5. **Add-ons** from `extras`. **category_addons** from each category's `extras`, in order.
6. **Choice lists:** dedupe every dish `choose` entry by (label, options, max). Create one `choice_groups` row per distinct combination: `label` = the choose label, `min_select` = 1, `max_select` = `max || 1`, and `name` = `"<label> — <first 3 options>…"`, made unique with a " #2" suffix. **Option diet:** `/chicken|fish|meat|prawn/i` → `nonveg`; `/tofu|paneer|veg|cauliflower|potato|mushroom/i` → `veg`; otherwise null (flavours, rice/noodles, plating).
7. **Dishes:** `sort_order` = index within the category; `group_id` from `group`; `sizes` → `dish_sizes` (dish `price` = the lowest); `choose` → `dish_choice_groups` in order; `image` stays null (staff upload photos in Admin).
8. Sanity counts printed at the end: 12 categories · 123 dishes · 13 add-ons.

Run it once against the new project (SQL editor, or `supabase db reset` locally). After seeding, the database is the only source of truth for the menu.

**Data issues to raise with the client** (from `menu-structure.md` §5 and the data):
- Desserts have no diet marks (shown unmarked until the kitchen confirms).
- "Ban-ban (large only)" is an add-on on Starters, which have no sizes.
- Spellings vary: Gochuchang/Gochujang, Rameyon/Ramyeon.

---

## 16. Environments, configuration, deployment

### 16.1 Supabase project
- **New** project `moba-prod`, region **ap-south-1 (Mumbai)**. Optionally `moba-staging` for testing (or local `supabase start`).
- **Plan:** Pro is recommended for production. Free projects pause after a week of inactivity and have no daily backups. The client decides.
- **Keys:** the *publishable* key goes in `site/config.js` and `admin/.env`. The *secret* key goes only in a local `.env` for scripts (git-ignored).

### 16.2 Auth settings (Dashboard → Authentication)
- Email provider **on**. **Allow new users to sign up: OFF.** **Anonymous sign-ins: OFF.** Confirm email: on.
- Site URL: `https://admin.moba.cafe`. Redirect URLs: `https://admin.moba.cafe/reset-password`, `http://localhost:5173/reset-password`.
- Minimum password length 10. Leaked-password protection on if the plan allows.
- **Custom SMTP** (any transactional provider) before launch. The built-in mailer is rate-limited and meant for testing, and password resets depend on it.

### 16.3 Migrations
`supabase link --project-ref <ref>` → `supabase db push`. Then confirm **Advisors → Security** shows **zero errors**.

### 16.4 Adding staff (runbook, no UI in v1)
1. Authentication → Users → **Add user** (email + password, auto-confirm).
2. SQL editor:
   ```sql
   insert into public.staff (user_id, display_name, role)
   select id, 'Owner', 'owner' from auth.users where email = 'owner@example.com';
   ```
   To remove someone: `update public.staff set is_active = false where user_id = …;` (they lose access on their next request).

### 16.5 Hosting (Vercel, as `implementation.md` §9 already recommends)
- **Menu:** a Vercel project with root `site/`, no build. `site/vercel.json` adds the headers below.
- **Admin:** a Vercel project with root `admin/`, `npm run build` → `dist`. `admin/vercel.json` adds an SPA rewrite (`/(.*)` → `/index.html`), the headers, and `X-Robots-Tag: noindex`.
- **Headers on both:** `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy: camera=(), microphone=(), geolocation=()` · `X-Frame-Options: DENY`.
- **CSP, menu:**
  ```
  default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com 'sha256-<inline bubble-cover script>';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;
  img-src 'self' data: https://<ref>.supabase.co; connect-src https://<ref>.supabase.co;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  ```
  `index.html` has two large inline `<script>` blocks (lines ~544 and ~667). Move them into files, or add their hashes. Ship as `Content-Security-Policy-Report-Only` first, then enforce.
- **CSP, admin:**
  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://<ref>.supabase.co;
  connect-src https://<ref>.supabase.co wss://<ref>.supabase.co; media-src 'self';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  ```

---

## 17. Build phases

Each phase ends with its acceptance criteria passing. Don't start the next phase with the current one red.

**Phase 0: Backend foundation**
- New project, auth settings (§16.2), migrations 1–6, seed, owner account.
- Two test tables created with SQL: `insert into dining_tables (label) values ('1'), ('2');`.
- ✅ The Security Advisor shows 0 errors. ✅ `select get_public_menu()` returns 12 categories and 123 dishes. ✅ The anon part of `security-check.mjs` passes (§18.1).

**Phase 1: Customer site on Supabase** (§12)
- ✅ Opening `/?t=<table 1 token>` strips `t` from the address bar, and the menu shows "Table 1" in the order sheet.
- ✅ An order placed from phone A shows up in `orders` with server prices.
- ✅ Phone B at Table 1 is Guest 2 and does not see phone A's orders.
- ✅ Without a token, the menu browses but can't order.
- ✅ Sold-out, price-changed and kitchen-closed flows work (toggle the flags in SQL).
- ✅ A retry after a forced network failure creates no duplicate.

**Phase 2: Admin shell**
Scaffold, auth (login, reset, guards), AppShell (sidebar + bottom nav), Dashboard with the switch and stats.
- ✅ A non-staff account is refused.
- ✅ A deep link while signed out returns to it after sign-in.
- ✅ The switch closes ordering on the site within one poll.

**Phase 3: Tables & QR** (§13.6)
- ✅ Add a range, rename, reorder, deactivate.
- ✅ Card PNG and SVG download.
- ✅ Share works on Android and iOS.
- ✅ After replacing a QR, the old code shows "isn't active".
- ✅ Delete is refused for a used table.
- ✅ "Now at this table" updates live.

**Phase 4: Orders** (§13.7, §13.9)
- ✅ A new order appears on the grid and the table page within 2 s, with a toast, sound and badge.
- ✅ Accept → Served → Undo all work.
- ✅ Cancel shows "Cancelled" on the diner's phone.
- ✅ Free table (both dialog paths, plus `SESSION_CHANGED`) works, and Undo works.
- ✅ After freeing, the diner's phone shows the thank-you and can't order without re-scanning.
- ✅ The tablet stays awake.

**Phase 5: Menu & Categories** (§13.8, §9)
- ✅ Create a category with sub-sections, notes and add-ons; it appears on the site.
- ✅ Create a dish with sizes and two choice lists plus a photo; it orders correctly at the right price.
- ✅ The Available switch shows Sold out on the site after refresh.
- ✅ Switching "Fish" off disables it on every dish.
- ✅ Reordering is reflected on the site.
- ✅ Re-saving a dish keeps carts holding its sizes valid.

**Phase 6: Hardening & launch**
- Full `security-check.mjs` green. CSP enforced. Custom SMTP. Pro plan decision. Real-phone QA (§18.3). Print and test every table card. Go-live checklist (§18.4).

---

## 18. Test plan

### 18.1 `scripts/security-check.mjs` (run against staging; exits non-zero on any failure)

**As anon (publishable key only):**
1. `select` on every table (`orders`, `order_items`, `table_sessions`, `dining_tables`, `staff`, `categories`, …) → permission denied.
2. `insert`/`update`/`delete` on any table → denied.
3. Every `staff_*` RPC → denied.
4. `private` helpers are not callable (404 from PostgREST).
5. `get_public_menu` works and contains no hidden dishes or hidden categories.
6. `place_order` with a bad token → `INVALID_TABLE`; with an inactive table → `TABLE_INACTIVE`; with ordering closed → `ORDERING_CLOSED`.
7. Hidden dish, sold-out dish, sold-out option or add-on, an option from another dish, an add-on not offered by the category, a missing required pick, too many picks, a size from another dish, a missing size on a sized dish, qty 0 or 21, 31 lines, or 51 items → the right error each time.
8. `p_expected_total` off by ₹1 → `PRICE_CHANGED`, and **no rows written** (no new visit either).
9. Same `client_order_id` twice → same order id, one row.
10. Device A orders at Table 1; device B calls `get_table_state(table1, B)` → no orders. Device A with Table 2's token → no orders.
11. The 7th order from one device within 10 minutes → `RATE_LIMITED`.
12. Storage: upload to `menu-images` → denied; list the bucket → denied; GET a public file URL → 200.
13. `auth.signUp` → refused (sign-ups disabled).

**As a signed-in user without a staff row:**
14. Every table select → 0 rows. Every `staff_*` RPC → `NOT_STAFF`.

**As staff:**
15. Can read orders. A direct `update orders set status=…` → permission denied (must use RPC). `update dining_tables set qr_token=…` → permission denied.
16. `staff_set_order_status` with the wrong `from` → `STATUS_CONFLICT`. Status change on a closed visit → `STATUS_CONFLICT`.
17. `staff_free_table` with a stale `expected_orders` → `SESSION_CHANGED`. With pending orders and `false` → `PENDING_ORDERS`.
18. `staff_reopen_session` after a new visit opened → `CANNOT_REOPEN`.

**Build output:**
19. `grep -r "sb_secret_\|service_role" site/ admin/dist/` → nothing.
20. A database query confirms RLS is enabled on every `public` table: `select tablename from pg_tables where schemaname = 'public' and not rowsecurity` → 0 rows.

### 18.2 Manual end-to-end (two phones + one tablet)
1. Tablet signed in on `/orders`, sound enabled.
2. Phone A scans Table 1, orders Rabokki (Chicken) + Fried egg with note "less spicy" → tablet shows a toast within 2 s; the card shows the non-veg mark, the add-on and the highlighted note.
3. Phone B scans Table 1, orders boba → it is Guest 2; phone A doesn't see it.
4. Tablet: Accept phone A's order → phone A shows "Cooking" within 20 s. Cancel phone B's → phone B shows "Cancelled".
5. Admin: mark Rabokki sold out → phone A's next Rabokki order is refused and the line is flagged.
6. Tablet: Free table → dialog lists pending → Mark served & free → Undo → Free again.
7. Phone A polls → thank-you screen; Place order now asks to scan.
8. Phone A scans Table 2 → new visit, Guest 1, Table 1's orders invisible.
9. Dashboard switch off → both phones show the closed banner.

### 18.3 Real-device QA
iPhone Safari, Android Chrome, the in-app QR scanners of Google Lens, WhatsApp and Instagram, a slow 4G profile (menu usable in < 3 s from cache, < 5 s cold), a private tab, landscape tablet for Admin.

### 18.4 Go-live checklist
- [ ] Sign-ups off, anonymous off, SMTP set, redirect URLs set
- [ ] Security Advisor 0 errors · `security-check.mjs` green on prod
- [ ] Owner + staff accounts created; test accounts removed
- [ ] Every table created; cards printed; **every printed QR scanned and tested once**
- [ ] Test orders and visits deleted from prod (or a fresh `orders` table) before opening day
- [ ] CSP enforced; headers verified
- [ ] Daily backups confirmed (Pro)

---

## 19. Decision log

| # | Decision | Why | Rejected |
|---|---|---|---|
| 1 | The QR carries a 122-bit random token, never a table number | Table numbers are forgeable | `?table=12` (today's code) |
| 2 | Visits (sessions) per table | Isolates each group; makes "Free table" real; keeps old orders from leaking to new guests | Orders attached directly to tables |
| 3 | Diners stay anonymous; three SECURITY DEFINER RPCs; device secret | Smallest attack surface; no auth users per diner; easy to audit | Supabase anonymous sign-ins (an auth user per diner, needs CAPTCHA, more RLS); anon RLS on tables |
| 4 | Diners see only their own phone's orders | A departed diner holding the token can't watch the next group | Whole-table view for diners |
| 5 | Server-side pricing + `expected_total` | Never trust client money; never charge a price the diner didn't see | Trusting `unitPrice` from the cart |
| 6 | Idempotency key per placement, persisted before sending | Flaky 4G and double taps | Disabling the button only |
| 7 | Status changes via compare-and-set RPCs; free-table with lock + expected count | Multiple staff devices, no lost updates | Direct UPDATE through RLS |
| 8 | Customer site stays vanilla + `fetch`; no supabase-js | Approved UI; 3 calls; fast first load | Rewriting the menu in React |
| 9 | Diners poll; staff use Realtime | No Realtime surface for anon; status changes are infrequent | Public broadcast channels |
| 10 | Admin on its own origin | The admin session is isolated from public-site scripts | `/admin` under the menu domain |
| 11 | Reusable choice lists with per-option diet and price | "No fish today" in one switch; diet marks from data instead of a regex | A per-dish `choose` JSON |
| 12 | Save functions keep child ids | Open carts stay valid when staff edit | Delete-and-reinsert |
| 13 | Visits auto-open on the first order; staff free them | Zero friction for diners and staff | Staff must open a table first (kept as a backlog option) |
| 14 | Guest numbers instead of names | Answers "who ordered what" with no personal data | Asking diners for a name |
| 15 | Integer rupees | Menu prices are whole rupees; no payments in scope | Paise (switch if payments arrive) |
| 16 | Single restaurant | One client, one branch | Multi-tenant `restaurant_id` everywhere |

---

## 20. Open questions for the client (defaults are already in this spec)

1. **Domains:** `menu.moba.cafe` and `admin.moba.cafe`? (Default as written.)
2. **Table labels:** numbers only (1–20) or names (Patio 2)? Both work.
3. **Supabase Pro plan** for production (no pausing, daily backups)?
4. **Who gets Admin logins**, and should staff and owner differ? (v1: same powers.)
5. **Opening hours:** is a manual "accepting orders" switch enough for now? (Default: yes; automatic hours are backlog.)
6. **Menu data:** dessert diet marks, the Ban-ban "large only" rule on Starters, canonical spellings.
7. **Dish photos:** the files in `site/assets/dishes/` can be uploaded through Admin as first photos. Are they approved?

### Backlog (after v1)
Staff must open a table before it takes orders · browse closed visits / order history · automatic opening hours · staff management UI with roles · KOT printing · daily summary · bulk "download all table cards" (ZIP) · optional diner name · Turnstile CAPTCHA on login.
