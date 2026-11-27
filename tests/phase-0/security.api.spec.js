// Phase 0 · SEC: permissions, data exposure and note cleaning, at the SQL / API layer.
// Baseline of today's behaviour. Browser XSS cases live in security.spec.js.
import { test, expect } from "../support/fixtures.js";
import { DISH, TABLE, qrFor } from "../support/data.js";
import {
  FORMAT_CHARS, PUBLIC_RPCS, PUBLIC_TABLES, STAFF_CALLS,
  allKeys, lit, mapLimit, outcome, rowCounts,
} from "./_sec-helpers.js";

const brownie = (extra = {}) => ({ dish_id: DISH.brownie.id, qty: 1, ...extra });
const t1Id = (db) => db.sql("select id from public.dining_tables where label = 'T1'");

test("@phase0 @p1 P0-SEC-01 anon can't read or write any of the 16 public tables", async ({ db, api }) => {
  // 1) Exactly the 16 known tables, every one with row level security on.
  const tables = await db.json(`
    select json_agg(json_build_object('name', c.relname, 'rls', c.relrowsecurity) order by c.relname)
      from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')`);
  expect(tables).toEqual([...PUBLIC_TABLES].sort().map((name) => ({ name, rls: true })));

  // Rows to protect in every table (the seed has the menu; add a visit, a session and an order).
  const v = await api.scan(1);
  expect((await api.order(v, [brownie()], DISH.brownie.price)).status).toBe(200);
  const before = await rowCounts(db);
  for (const t of PUBLIC_TABLES) expect(before[t], `${t} has rows`).toBeGreaterThan(0);

  // 2) As anon: select, insert, update-to-itself, delete on every table. Each must be refused by the grant.
  const firstCol = Object.fromEntries((await db.sql(`
    select c.relname || '|' || a.attname
      from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum = 1
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'`)).split("\n").map((l) => l.split("|")));
  const statements = PUBLIC_TABLES.flatMap((t) => [
    [t, "select", `select * from public.${t} limit 1`],
    [t, "insert", `insert into public.${t} default values`],
    [t, "update", `update public.${t} set ${firstCol[t]} = ${firstCol[t]}`],
    [t, "delete", `delete from public.${t}`],
  ]);
  const results = await mapLimit(statements, 8, async ([t, kind, q]) => ({ t, kind, ...(await outcome(db.asAnon(q))) }));
  expect(results).toEqual(statements.map(([t, kind]) => ({ t, kind, sqlstate: "42501", text: `permission denied for table ${t}` })));

  // Nothing changed.
  expect(await rowCounts(db)).toEqual(before);
});

test("@phase0 @p1 P0-SEC-02 anon can't execute any staff_* function", async ({ db }) => {
  // 1) Exactly 10 staff functions exist.
  const names = (await db.sql(`
    select string_agg(p.proname, ',' order by p.proname)
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'staff\\_%'`)).split(",");
  const calls = STAFF_CALLS(await t1Id(db));
  expect(names).toEqual(Object.keys(calls).sort());

  // 2) Each is refused by the EXECUTE grant before its body runs (42501 "permission denied for
  //    function", not the NOT_STAFF raised by private.require_staff()).
  const results = await mapLimit(Object.entries(calls), 5, async ([fn, call]) => ({ fn, ...(await outcome(db.asAnon(`select ${call}`))) }));
  expect(results).toEqual(Object.keys(calls).map((fn) => ({ fn, sqlstate: "42501", text: `permission denied for function ${fn}` })));

  // The rotate call did nothing: T1 still has its printed QR.
  expect(await db.sql("select qr_token from public.dining_tables where label = 'T1'")).toBe(qrFor(1));
});

test("@phase0 @p1 P0-SEC-03 A signed-in non-staff account gets NOT_STAFF and sees no rows", async ({ db, api }) => {
  // 1) Rows exist in every table the account will try to read.
  const v = await api.scan(1);
  const placed = await api.order(v, [brownie()], DISH.brownie.price);
  expect(placed.status).toBe(200);

  // 2a) Staff RPCs: the grant lets authenticated in, require_staff() then refuses.
  const id = await t1Id(db);
  for (const call of ["public.staff_dashboard()", `public.staff_rotate_table_token('${id}')`]) {
    expect(await outcome(db.asNonStaff(`select ${call}`)), call).toEqual({ sqlstate: "42501", text: "NOT_STAFF" });
  }
  expect(await db.sql("select qr_token from public.dining_tables where label = 'T1'")).toBe(qrFor(1));

  // 2b) Reads: RLS hides every row from a non-staff account.
  const readable = ["orders", "order_items", "table_sessions", "dining_tables", "dishes", "staff", "restaurant_settings"];
  const counts = (who) => who(`select json_build_object(${readable.map((t) => `'${t}', (select count(*) from public.${t})`).join(", ")})::text`).then(JSON.parse);
  expect(await counts(db.asNonStaff)).toEqual(Object.fromEntries(readable.map((t) => [t, 0])));

  // 2c) Write: the column grant allows the UPDATE, RLS matches no row, nothing changes.
  expect(await db.asNonStaff("with u as (update public.restaurant_settings set ordering_open = false returning 1) select count(*) from u")).toBe("0");
  expect(await db.sql("select ordering_open from public.restaurant_settings where id = 1")).toBe("t");

  // 2d) table_visits has no grant at all.
  expect(await outcome(db.asNonStaff("select * from public.table_visits"))).toEqual({ sqlstate: "42501", text: "permission denied for table table_visits" });

  // 3) The same reads as staff see the rows, so the zeros above are real denials.
  expect(await db.asStaff("select count(*) from public.orders")).toBe("1");
  const staffCounts = await counts(db.asStaff);
  for (const t of readable) expect(staffCounts[t], `staff sees rows in ${t}`).toBeGreaterThan(0);
});

test("@phase0 @p1 P0-SEC-04 Private helpers are unreachable and anon can execute exactly the 5 public RPCs", async ({ db }) => {
  // 1) anon has no USAGE on schema private.
  for (const q of ["select private.is_staff()", "select private.find_visit('x', 'y')", "select private.order_json(gen_random_uuid())"]) {
    expect(await outcome(db.asAnon(q)), q).toEqual({ sqlstate: "42501", text: "permission denied for schema private" });
  }

  // 2) authenticated can enter the schema (for is_staff) but not run the order/visit helpers.
  expect(await outcome(db.asNonStaff("select private.find_visit('x', 'y')"))).toEqual({ sqlstate: "42501", text: "permission denied for function find_visit" });
  expect(await outcome(db.asNonStaff("select private.order_json(gen_random_uuid())"))).toEqual({ sqlstate: "42501", text: "permission denied for function order_json" });

  // 3) Exactly five public functions are executable by anon.
  const fns = await db.sql(`
    select string_agg(p.proname, ',' order by p.proname)
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE')`);
  expect(fns.split(",")).toEqual(PUBLIC_RPCS);
});

test("@phase0 @p1 P0-SEC-05 QR tokens never appear in any public RPC response", async ({ db, api }) => {
  const v = await api.scan(1);
  expect(v.visit).toMatch(/^[0-9a-f]{64}$/);
  expect(v.visit).not.toBe(qrFor(1));

  const replies = {};
  replies.start_visit = v;
  replies.place_order = await api.order(v, [brownie()], DISH.brownie.price);
  expect(replies.place_order.status).toBe(200);
  replies.get_public_menu = await api.rpc("get_public_menu");
  replies.get_restaurant_info = await api.rpc("get_restaurant_info");
  replies.get_table_state = await api.state(v);
  // An error reply: Brownie has no sizes, so a size id makes the line invalid.
  replies.invalid_item = await api.order(v, [brownie({ size_id: DISH.wings.sizes.small.id })], DISH.brownie.price);
  expect(replies.invalid_item.status).toBe(400);
  expect(replies.invalid_item.body).toMatchObject({ code: "P0001", message: "INVALID_ITEM" });
  for (const fn of ["get_public_menu", "get_restaurant_info", "get_table_state"]) expect(replies[fn].status, fn).toBe(200);
  expect(replies.get_table_state.body.orders).toHaveLength(1);

  const qrs = Array.from({ length: TABLE.count }, (_, i) => qrFor(i + 1));
  for (const [fn, reply] of Object.entries(replies)) {
    const raw = JSON.stringify(reply.body ?? reply).toLowerCase();
    const leaked = qrs.filter((qr) => raw.includes(qr));
    expect(leaked, `${fn} body contains a QR token`).toEqual([]);
    const qrKeys = [...allKeys(reply.body ?? reply)].filter((k) => /^qr(_?token)?$/i.test(k));
    expect(qrKeys, `${fn} body has a QR key`).toEqual([]);
  }

  // The visit token is stored only as its SHA-256; no column holds the raw token.
  expect(await db.sql(`select count(*) from public.table_visits where token_hash = encode(extensions.digest(${lit(v.visit)}, 'sha256'), 'hex')`)).toBe("1");
  expect(await db.sql(`select count(*) from public.table_visits t where strpos(t::text, ${lit(v.visit)}) > 0`)).toBe("0");
  expect(await db.sql("select count(*) from public.table_visits")).toBe("1");
});

test("@phase0 @p1 P0-SEC-06 Guest notes are stripped of control characters, trimmed, capped at 140, and blank becomes null", async ({ db, api }) => {
  const v = await api.scan(2);
  const notes = ["  Less\tspicy\n\u0007please  ", "x".repeat(200), "\n\t  ", "Normal note"];
  const r = await api.order(v, notes.map((note) => brownie({ note })), DISH.brownie.price * 4);
  expect(r.status).toBe(200);
  expect(r.body.total).toBe(356);

  const want = ["Less spicy please", "x".repeat(140), null, "Normal note"];
  expect(r.body.items.map((i) => i.note)).toEqual(want);
  expect(await db.json("select json_agg(note order by sort_order) from public.order_items")).toEqual(want);
  expect(Number(await db.sql("select max(char_length(note)) from public.order_items"))).toBeLessThanOrEqual(140);
});

test("@phase0 @p2 P0-SEC-09 Bidi and zero-width characters are stripped from guest notes", async ({ db, api }) => {
  const v = await api.scan(3);
  const note = "Table‮ 9​ spicy";
  const r = await api.order(v, [brownie({ note })], DISH.brownie.price);
  // Preconditions (must hold today too, so a broken setup is not mistaken for the known bug).
  expect(r.status).toBe(200);
  expect(r.body.items[0].note).toEqual(expect.stringContaining("spicy"));

  // KNOWN BUG F12/E14: place_order cleans notes with regexp_replace('[[:cntrl:]]+', ' '), which does
  // not match Unicode format characters (U+202E RIGHT-TO-LEFT OVERRIDE, U+200B ZERO WIDTH SPACE), so
  // they reach the kitchen ticket and can spoof it. Fix: also strip \p{Cf} (security-audit.md E14).
  test.fail(true, "KNOWN BUG F12/E14: bidi / zero-width characters survive note cleaning");
  expect(r.body.items[0].note).not.toMatch(FORMAT_CHARS);
  expect(await db.sql(`select count(*) from public.order_items where note ~ '[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF]'`)).toBe("0");
});
