// Phase 0 baseline: replies and error codes of the 4 public calls (start_visit, get_table_state,
// place_order, get_public_menu) as they behave TODAY. Real SQL from supabase/migrations, called as
// role anon through tests/support/bridge.py, on a fresh database per test.
// Cases: docs/testing/phase-0-test-cases.md, P0-API-01 … P0-API-10.
//
// Business errors come back as HTTP 400 { code: "P0001", message: "<CODE>", details } (same as PostgREST).
// Time passing is simulated in the database, never with sleeps.
import { test, expect } from "../support/fixtures.js";
import { ADDON, CATEGORIES, DISH, qrFor, uuid } from "../support/data.js";
import {
  MENU_KEYS, PRIVATE_KEYS, SEED, countOrders, expectApiError, expectOk, expireWindow, fetchMenu, findKeys,
  line, openSessionId, setOrdering, sha256, visitRow, wrongKeySets,
} from "./_api-helpers.js";

const BROWNIE = [line(DISH.brownie)]; // one Brownie, ₹89

test("@phase0 @p1 P0-API-01 start_visit validates the QR and device and returns a 5-minute visit", async ({ api, db }) => {
  const device = uuid();

  await test.step("bad or unknown QR → INVALID_TABLE", async () => {
    for (const [what, qr] of [["'abc'", "abc"], ["upper-case QR", qrFor(1).toUpperCase()], ["null", null], ["unknown QR", "0".repeat(32)]]) {
      await test.step(what, async () => {
        expectApiError(await api.rpc("start_visit", { p_qr_token: qr, p_device: device }), "INVALID_TABLE");
      });
    }
  });

  await test.step("good QR, bad device → BAD_REQUEST", async () => {
    for (const [what, dev] of [["'not-a-uuid'", "not-a-uuid"], ["upper-case UUID", uuid().toUpperCase()]]) {
      await test.step(what, async () => {
        expectApiError(await api.rpc("start_visit", { p_qr_token: qrFor(1), p_device: dev }), "BAD_REQUEST");
      });
    }
    expect(await db.sql("select count(*) from public.table_visits"), "a rejected scan stores nothing").toBe("0");
  });

  const replies = [];
  await test.step("valid scan twice → 200, exactly 5 keys, two different visits", async () => {
    for (let i = 0; i < 2; i++) {
      const body = expectOk(await api.rpc("start_visit", { p_qr_token: qrFor(1), p_device: device }));
      expect(Object.keys(body).sort()).toEqual(["active", "orderSeconds", "orderingOpen", "table", "visit"]);
      expect(body).toEqual({ visit: expect.stringMatching(/^[0-9a-f]{64}$/), orderSeconds: 300, table: "T1", active: true, orderingOpen: true });
      replies.push(body);
    }
    expect(replies[0].visit).not.toBe(replies[1].visit);
  });

  await test.step("DB: 2 visits for T1, only hashes stored, window = 5 minutes", async () => {
    const rows = await db.json(`
      select coalesce(json_agg(json_build_object(
               'token_hash', v.token_hash,
               'device_hash', v.device_hash,
               'five_minutes', v.order_until - v.created_at = interval '5 minutes')), '[]')
        from public.table_visits v join public.dining_tables t on t.id = v.table_id
       where t.label = 'T1'`);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.token_hash).sort()).toEqual(replies.map((r) => sha256(r.visit)).sort());
    for (const r of rows) {
      expect(r.device_hash, "device id is stored hashed").toBe(sha256(device));
      expect(r.five_minutes, "order_until − created_at").toBe(true);
    }
    expect(await db.sql("select count(*) from public.table_visits"), "no visit for another table").toBe("2");
    for (const r of replies) {
      const raw = await db.sql(`select count(*) from public.table_visits t where row_to_json(t)::text like '%${r.visit}%'`);
      expect(raw, "the raw visit token is not stored anywhere in table_visits").toBe("0");
    }
  });
});

test("@phase0 @p1 P0-API-02 Visit-token calls reject malformed input, shape before visit", async ({ api, db }) => {
  const v = await api.scan(1);

  await test.step("1) get_table_state: bad visit → INVALID_VISIT, bad device → BAD_REQUEST", async () => {
    for (const [what, visit] of [["'x'", "x"], ["64 zeros", "0".repeat(64)], ["the table's QR token used as a visit", qrFor(1)]]) {
      await test.step(what, async () => {
        expectApiError(await api.rpc("get_table_state", { p_visit: visit, p_device: v.device }), "INVALID_VISIT");
      });
    }
    expectApiError(await api.rpc("get_table_state", { p_visit: v.visit, p_device: "nope" }), "BAD_REQUEST");
  });

  await test.step("2) place_order: every shape error → BAD_REQUEST, even with a garbage visit", async () => {
    const valid = () => ({ p_visit: v.visit, p_device: v.device, p_client_order_id: uuid(), p_items: BROWNIE, p_expected_total: 89 });
    const shapeErrors = [
      ["p_client_order_id null", { p_client_order_id: null }],
      ["p_expected_total null", { p_expected_total: null }],
      ["p_items []", { p_items: [] }],
      ["p_items {}", { p_items: {} }],
      ["31 lines", { p_items: Array.from({ length: 31 }, () => line(DISH.brownie)) }],
    ];
    for (const [visitWhat, visit] of [["valid visit", v.visit], ["garbage visit 'x'", "x"]]) {
      for (const [what, override] of shapeErrors) {
        await test.step(`${visitWhat}, ${what}`, async () => {
          expectApiError(await api.rpc("place_order", { ...valid(), p_visit: visit, ...override }), "BAD_REQUEST");
        });
      }
    }
    await test.step("garbage visit 'x' with a valid shape → INVALID_VISIT", async () => {
      expectApiError(await api.rpc("place_order", { ...valid(), p_visit: "x" }), "INVALID_VISIT");
    });
  });

  await test.step("3) a visit older than session_idle_hours (6) → VISIT_EXPIRED", async () => {
    // Inside the 6 hours the visit can still read its table (control for the next check).
    await db.sql(`update public.table_visits set created_at = now() - interval '5 hours' where ${visitRow(v)}`);
    expect(expectOk(await api.state(v))).toMatchObject({ table: "T1" });
    await db.sql(`update public.table_visits set created_at = now() - interval '7 hours' where ${visitRow(v)}`);
    expectApiError(await api.state(v), "VISIT_EXPIRED");
  });

  expect(await countOrders(db)).toBe(0);
});

test("@phase0 @p0 P0-API-03 A visit token is useless on another phone, and table state shows only this phone's orders", async ({ api, db }) => {
  const A = await api.scan(2);
  expectOk(await api.order(A, BROWNIE, 89));
  const B = await api.scan(2); // a second phone at the same table

  await test.step("3) A's visit token with B's device → INVALID_VISIT on both calls", async () => {
    const stolen = { visit: A.visit, device: B.device };
    expectApiError(await api.state(stolen), "INVALID_VISIT");
    expectApiError(await api.order(stolen, BROWNIE, 89), "INVALID_VISIT");
  });

  await test.step("4) each phone sees only its own orders", async () => {
    expect(expectOk(await api.state(B))).toEqual({ table: "T2", active: true, orderingOpen: true, visitEnded: false, orders: [] });
    const a = expectOk(await api.state(A));
    expect(a).toMatchObject({ table: "T2", active: true, orderingOpen: true, visitEnded: false });
    expect(a.orders).toHaveLength(1);
    expect(a.orders[0]).toMatchObject({ guestNo: 1, total: 89, status: "placed", table: "T2" });
  });

  expect(await countOrders(db)).toBe(1);
});

test("@phase0 @p0 P0-API-04 The server re-prices sizes, option deltas and add-ons; PRICE_CHANGED returns the server total", async ({ api, db }) => {
  const D = DISH.doubleScoop;
  await db.sql(`update public.choice_options set price_delta = 20 where id = '${D.options.chocolate}'`);
  const v = await api.scan(3);
  const items = [
    // Wings Large ₹289 + Bulgogi (+0). The "price" field is ignored by the server.
    line(DISH.wings, 1, { size_id: DISH.wings.sizes.large.id, option_ids: [SEED.wingsBulgogi], price: 1 }),
    // Double Scoop ₹169 + Vanilla (+0) + Chocolate (+20 set above) = ₹189.
    line(D, 1, { option_ids: [D.options.vanilla, D.options.chocolate] }),
    // Lemon Ice Tea ₹139 + Extra boba ₹30 + Coconut jelly ₹30 = ₹199, ×2 = ₹398.
    line(DISH.lemonIceTea, 2, { addon_ids: [ADDON.extraBoba.id, ADDON.coconutJelly.id] }),
  ];

  await test.step("2) phone total ₹1 → PRICE_CHANGED with the server total 876, nothing written", async () => {
    expectApiError(await api.order(v, items, 1), "PRICE_CHANGED", "876");
    expect(await countOrders(db)).toBe(0);
  });

  await test.step("3) the server total → 200 with re-priced lines", async () => {
    const o = expectOk(await api.order(v, items, 876));
    expect(o).toMatchObject({ total: 876, itemCount: 4, status: "placed" });
    expect(o.items).toHaveLength(3);
    expect(o.items[0]).toMatchObject({
      name: "Korean Fried Chicken Wings", size: "Large · 6 pcs", choices: [{ label: "Flavour", options: ["Bulgogi"] }],
      unitPrice: 289, lineTotal: 289, diet: "nonveg",
    });
    expect(o.items[1]).toMatchObject({ unitPrice: 189, choices: [{ label: "Flavours", options: ["Vanilla", "Chocolate"] }] });
    expect(o.items[2]).toMatchObject({
      unitPrice: 199, qty: 2, lineTotal: 398,
      addons: [{ name: "Extra boba", price: 30 }, { name: "Coconut jelly", price: 30 }],
    });
    expect(await db.sql("select string_agg(line_total::text, ',' order by sort_order) from public.order_items")).toBe("289,189,398");
    expect(await db.sql("select total || ':' || item_count from public.orders")).toBe("876:4");
  });

  await test.step("4) a price change after the menu loaded → PRICE_CHANGED with the new price", async () => {
    await db.sql(`update public.dishes set price = 99 where id = '${DISH.brownie.id}'`);
    expectApiError(await api.order(v, BROWNIE, 89), "PRICE_CHANGED", "99");
    expect(await countOrders(db)).toBe(1);
  });
});

test("@phase0 @p0 P0-API-05 Quantity bounds and order size limits", async ({ api, db }) => {
  const v = await api.scan(4);
  const B = DISH.brownie.id;

  await test.step("bad quantity, bad dish id or a non-object line → BAD_REQUEST", async () => {
    const bad = [
      ["qty 0", [{ dish_id: B, qty: 0 }], 0],
      ["qty 21", [{ dish_id: B, qty: 21 }], 21 * 89],
      ["qty -1", [{ dish_id: B, qty: -1 }], -89],
      ['qty "abc"', [{ dish_id: B, qty: "abc" }], 89],
      ["qty missing", [{ dish_id: B }], 89],
      ["dish_id 'x'", [{ dish_id: "x", qty: 1 }], 89],
      ["items [1]", [1], 89],
    ];
    for (const [what, items, total] of bad) {
      await test.step(what, async () => expectApiError(await api.order(v, items, total), "BAD_REQUEST"));
    }
  });

  await test.step("unknown dish UUID → DISH_UNAVAILABLE with that UUID", async () => {
    const ghost = uuid();
    expectApiError(await api.order(v, [{ dish_id: ghost, qty: 1 }], 89), "DISH_UNAVAILABLE", ghost);
  });

  await test.step("51 items in 3 lines → TOO_MANY_ITEMS (even with the right total)", async () => {
    const lines = [line(DISH.brownie, 20), line(DISH.brownie, 20), line(DISH.brownie, 11)];
    expectApiError(await api.order(v, lines, 51 * 89), "TOO_MANY_ITEMS");
  });

  await test.step("exactly 50 items → 200", async () => {
    const lines = [line(DISH.brownie, 20), line(DISH.brownie, 20), line(DISH.brownie, 10)];
    expect(expectOk(await api.order(v, lines, 4450))).toMatchObject({ itemCount: 50, total: 4450 });
  });

  expect(await countOrders(db)).toBe(1);
});

test("@phase0 @p0 P0-API-06 Options and add-ons must belong to the dish: INVALID_ITEM, OPTION_UNAVAILABLE, ADDON_UNAVAILABLE", async ({ api, db }) => {
  const v = await api.scan(5);
  const S = DISH.singleScoop, D = DISH.doubleScoop, W = DISH.wings;

  await test.step("structural mistakes → INVALID_ITEM with the dish's id", async () => {
    const structural = [
      ["Single Scoop + a Double Scoop option", S, { option_ids: [D.options.vanilla] }],
      ["Double Scoop + the same flavour twice", D, { option_ids: [D.options.vanilla, D.options.vanilla] }],
      ["Double Scoop + all 3 flavours (max 2)", D, { option_ids: Object.values(D.options) }],
      ["Single Scoop with no flavour (min 1)", S, { option_ids: [] }],
      ["Wings with a flavour but no size", W, { option_ids: [SEED.wingsBulgogi] }],
      ["Wings Small with no flavour", W, { size_id: W.sizes.small.id }],
      ["Brownie + a Wings size", DISH.brownie, { size_id: W.sizes.small.id }],
      ["Brownie + Extra boba (desserts offer no add-ons)", DISH.brownie, { addon_ids: [ADDON.extraBoba.id] }],
      ["Lemon Ice Tea + Extra boba twice", DISH.lemonIceTea, { addon_ids: [ADDON.extraBoba.id, ADDON.extraBoba.id] }],
      ["Lemon Ice Tea + Fried egg (a gimbap add-on)", DISH.lemonIceTea, { addon_ids: [ADDON.friedEgg.id] }],
    ];
    for (const [what, dish, extra] of structural) {
      await test.step(what, async () => {
        expectApiError(await api.order(v, [line(dish, 1, extra)], dish.price ?? 229), "INVALID_ITEM", dish.id);
      });
    }
  });

  await test.step("option switched off → OPTION_UNAVAILABLE with the option id", async () => {
    await db.sql(`update public.choice_options set is_available = false where id = '${S.options.vanilla}'`);
    expectApiError(await api.order(v, [line(S, 1, { option_ids: [S.options.vanilla] })], 89), "OPTION_UNAVAILABLE", S.options.vanilla);
  });

  await test.step("add-on switched off → ADDON_UNAVAILABLE with the add-on id", async () => {
    await db.sql(`update public.addons set is_available = false where id = '${ADDON.extraBoba.id}'`);
    expectApiError(await api.order(v, [line(DISH.lemonIceTea, 1, { addon_ids: [ADDON.extraBoba.id] })], 169), "ADDON_UNAVAILABLE", ADDON.extraBoba.id);
  });

  expect(await countOrders(db)).toBe(0);
});

test("@phase0 @p0 P0-API-07 Replaying a client_order_id returns the same order, also after the window or the kitchen closes", async ({ api, db }) => {
  const v = await api.scan(6);
  const id = uuid();
  let first;

  await test.step("1) the same id twice → the same order, written once", async () => {
    first = expectOk(await api.order(v, BROWNIE, 89, id));
    const again = expectOk(await api.order(v, BROWNIE, 89, id));
    expect(again.id).toBe(first.id);
    expect(again.orderNo).toBe(first.orderNo);
    expect(await countOrders(db)).toBe(1);
  });

  await test.step("2) the same id with different items → the original order, nothing created", async () => {
    const replay = expectOk(await api.order(v, [line(DISH.lemonIceTea)], 139, id));
    expect(replay).toMatchObject({ id: first.id, orderNo: first.orderNo, total: 89, itemCount: 1 });
    expect(replay.items).toHaveLength(1);
    expect(replay.items[0]).toMatchObject({ name: "Brownie", qty: 1, unitPrice: 89 });
    expect(await countOrders(db)).toBe(1);
    expect(await db.sql("select count(*) from public.order_items")).toBe("1");
  });

  await test.step("3) after the window: replay → same order; a new id → VISIT_EXPIRED", async () => {
    await expireWindow(db, v);
    expect(expectOk(await api.order(v, BROWNIE, 89, id))).toMatchObject({ id: first.id, orderNo: first.orderNo });
    expectApiError(await api.order(v, BROWNIE, 89), "VISIT_EXPIRED");
  });

  await test.step("4) kitchen closed: replay → same order", async () => {
    await setOrdering(db, false);
    expect(expectOk(await api.order(v, BROWNIE, 89, id))).toMatchObject({ id: first.id, orderNo: first.orderNo });
    await setOrdering(db, true);
  });

  await test.step("5) another phone reusing the id never gets phone 1's order", async () => {
    const w = await api.scan(6);
    const r = await api.order(w, BROWNIE, 89, id);
    // Baseline today: the insert hits orders.client_order_id's unique index → raw Postgres error 23505 (HTTP 409).
    expect(r.status, JSON.stringify(r.body)).toBe(409);
    expect(r.body).toMatchObject({ code: "23505" });
    expect(r.body?.id).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain(first.id);
    expect(await countOrders(db)).toBe(1);
  });
});

test("@phase0 @p0 P0-API-08 ORDERING_CLOSED and VISIT_EXPIRED rules, window checked before the kitchen, freed table ends the visit", async ({ api, db }) => {
  let v;

  await test.step("1) kitchen closed: scan works, everything reports it, ordering → ORDERING_CLOSED", async () => {
    await setOrdering(db, false);
    v = await api.scan(7);
    expect(v).toMatchObject({ table: "T7", active: true, orderingOpen: false });
    expect((await fetchMenu(api)).orderingOpen).toBe(false);
    expect(expectOk(await api.state(v))).toMatchObject({ table: "T7", orderingOpen: false });
    expectApiError(await api.order(v, BROWNIE, 89), "ORDERING_CLOSED");
  });

  await test.step("2) window over while closed → VISIT_EXPIRED (window checked before the kitchen)", async () => {
    await expireWindow(db, v);
    expectApiError(await api.order(v, BROWNIE, 89), "VISIT_EXPIRED");
  });

  await test.step("3) kitchen open again → still VISIT_EXPIRED", async () => {
    await setOrdering(db, true);
    expectApiError(await api.order(v, BROWNIE, 89), "VISIT_EXPIRED");
  });

  await test.step("4) staff free the table → the visit, still inside its 5 minutes, → VISIT_EXPIRED", async () => {
    const w = await api.scan(8);
    expectOk(await api.order(w, BROWNIE, 89));
    const session = await openSessionId(db, "T8");
    expect(session).toMatch(/^[0-9a-f-]{36}$/);
    const freed = JSON.parse(await db.asStaff(`select public.staff_free_table('${session}', 1, true)`));
    expect(freed).toMatchObject({ sessionId: session, orders: 1, total: 89 });
    expect(await db.sql(`select order_until > now() from public.table_visits where ${visitRow(w)}`), "window still open").toBe("t");
    expectApiError(await api.order(w, BROWNIE, 89), "VISIT_EXPIRED");
    // Table state for the freed visit: over, no orders shown.
    expect(expectOk(await api.state(w))).toMatchObject({ table: "T8", visitEnded: true, orders: [] });
  });

  expect(await countOrders(db)).toBe(1);
});

test("@phase0 @p1 P0-API-09 TABLE_INACTIVE: an inactive table can scan but not order", async ({ api, db }) => {
  await test.step("1) T49 (inactive): scan 200 active false, state active false, order → TABLE_INACTIVE", async () => {
    const v = await api.scan(49);
    expect(v).toMatchObject({ table: "T49", active: false });
    expect(expectOk(await api.state(v))).toMatchObject({ table: "T49", active: false });
    expectApiError(await api.order(v, BROWNIE, 89), "TABLE_INACTIVE");
    expect(await countOrders(db)).toBe(0);

    await test.step("2) staff switch T49 on → the same visit can order", async () => {
      await db.sql("update public.dining_tables set is_active = true where label = 'T49'");
      expect(expectOk(await api.order(v, BROWNIE, 89))).toMatchObject({ table: "T49", total: 89, status: "placed" });
    });
  });

  await test.step("3) T3 switched off mid-visit → TABLE_INACTIVE", async () => {
    const w = await api.scan(3);
    await db.sql("update public.dining_tables set is_active = false where label = 'T3'");
    expectApiError(await api.order(w, BROWNIE, 89), "TABLE_INACTIVE");
  });

  expect(await countOrders(db)).toBe(1);
});

test("@phase0 @p1 P0-API-10 get_public_menu exposes only public fields and hides hidden dishes and categories", async ({ api, db }) => {
  const v = await api.scan(10);

  await test.step("1) only public keys, categories in menu order, Brownie as seeded", async () => {
    const m = await fetchMenu(api);
    expect(Object.keys(m).sort()).toEqual(MENU_KEYS.top);
    expect(m.categories.map((c) => c.id)).toEqual(CATEGORIES);
    expect(wrongKeySets(m.categories, MENU_KEYS.category), "categories with other keys").toEqual([]);
    expect(m.dishes.length).toBeGreaterThan(0);
    expect(wrongKeySets(m.dishes, MENU_KEYS.dish), "dishes with other keys").toEqual([]);
    expect(m.extras.length).toBeGreaterThan(0);
    expect(wrongKeySets(m.extras, MENU_KEYS.extra), "extras with other keys").toEqual([]);
    expect(findKeys(m, PRIVATE_KEYS), "private column names anywhere in the menu").toEqual([]);
    expect(m.dishes.find((d) => d.id === DISH.brownie.id)).toMatchObject({ price: 89, available: true, category: "desserts" });
  });

  await test.step("2) all Single Scoop flavours off → Single Scoop listed, not available", async () => {
    await db.sql(`update public.choice_options set is_available = false where group_id = '${DISH.singleScoop.group}'`);
    const m = await fetchMenu(api);
    expect(m.dishes.find((d) => d.id === DISH.singleScoop.id)).toMatchObject({ name: "Single Scoop", available: false });
  });

  await test.step("3) Brownie hidden → gone from the menu, version bumped, ordering it → DISH_UNAVAILABLE", async () => {
    const before = (await fetchMenu(api)).version;
    await db.sql(`update public.dishes set is_visible = false where id = '${DISH.brownie.id}'`);
    const m = await fetchMenu(api);
    expect(m.dishes.some((d) => d.id === DISH.brownie.id), "Brownie listed").toBe(false);
    expect(Number(m.version)).toBeGreaterThan(Number(before));
    expectApiError(await api.order(v, BROWNIE, 89), "DISH_UNAVAILABLE", DISH.brownie.id);
  });

  await test.step("4) desserts category hidden → it and all its dishes are gone", async () => {
    await db.sql("update public.categories set is_visible = false where slug = 'desserts'");
    const m = await fetchMenu(api);
    expect(m.categories.map((c) => c.id)).toEqual(CATEGORIES.filter((c) => c !== "desserts"));
    expect(m.dishes.filter((d) => d.category === "desserts").map((d) => d.name)).toEqual([]);
    for (const id of [DISH.singleScoop.id, DISH.doubleScoop.id]) expect(m.dishes.some((d) => d.id === id)).toBe(false);
  });

  expect(await countOrders(db)).toBe(0);
});
