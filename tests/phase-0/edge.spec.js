// Phase 0 baseline, area EDGE: ordering edge cases through the UI, end to end on the local stack.
// Cases: docs/testing/phase-0-test-cases.md (P0-EDGE-01 … P0-EDGE-11).
//
// Every test gets its own cloned database (db fixture), so changing prices, closing ordering or
// filling a table with orders affects only that test. Time and staff actions are simulated by
// changing the database, never by waiting.
import { test, expect } from "../support/fixtures.js";
import { DISH } from "../support/data.js";
import {
  SheetBits, chip, closeSheet, dishCard, holdRequests, phoneIds, readStorage, recordRpc, scanAndOpenOn,
} from "./_edge-helpers.js";

const PLACE_ORDER = "**/rest/v1/rpc/place_order";
const isPlaceOrder = (r) => /\/rest\/v1\/rpc\/place_order$/.test(r.url());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const TOAST = {
  priceChanged: "Prices were just updated. Check your total and try again.",
  menuChanged: "Something changed on our menu. Check your order.",
  closed: "We're not taking orders right now.",
  network: "We couldn't reach the kitchen. Tap Place order again.",
  busy: "The kitchen has a few orders from this table to accept first. Please wait a moment or ask our staff.",
  rateLimited: "That's a lot of orders in a few minutes. Please wait a moment.",
};
const FIX_MARKED = "Fix the marked items to place your order.";

/** "count:total" of every order in this test's database. */
const ordersSummary = (db) => db.sql("select count(*) || ':' || coalesce(max(total), 0) from public.orders");
const orderCount = (db) => db.sql("select count(*) from public.orders");

/** Tap Place and return the place_order reply as { status, body }. */
async function placeAndRead(g) {
  const reply = g.page.waitForResponse(isPlaceOrder);
  await g.sheet.place();
  const res = await reply;
  return { status: res.status(), body: await res.json() };
}

test("@phase0 @p0 P0-EDGE-01 price changes mid-cart: PRICE_CHANGED toast, the total refreshes to the server price, and the retry places one order", async ({ guest, db }) => {
  const g = await guest();
  const rpc = recordRpc(g.page);
  const bits = new SheetBits(g.page);
  await g.scanAndOpen(1);
  await g.menu.quickAdd(DISH.brownie);
  await g.sheet.open();
  await expect(g.sheet.total).toHaveText("₹89");

  // The kitchen raises the price while the guest is looking at the order.
  await db.sql(`update public.dishes set price = 99 where id = '${DISH.brownie.id}'`);
  const menuFetches = rpc.count("get_public_menu");
  await g.page.evaluate(() => { window.__edgeNoReload = true; });

  const first = await placeAndRead(g);
  expect(first.status).toBe(400);
  expect(first.body).toMatchObject({ message: "PRICE_CHANGED", details: "99" });
  await expect(bits.toastMsg).toHaveText(TOAST.priceChanged);
  // The phone fetches the menu again and redraws the open sheet with the server's price.
  await expect.poll(() => rpc.count("get_public_menu")).toBeGreaterThan(menuFetches);
  await expect(g.sheet.total).toHaveText("₹99");
  await expect(g.sheet.placeBtn).toBeEnabled();
  await expect(g.sheet.placeBtn).toHaveText("Place order");
  expect(await g.page.evaluate(() => window.__edgeNoReload), "the page must not reload").toBe(true);
  expect(await orderCount(db)).toBe("0");

  const done = await g.sheet.placeAndConfirm();
  expect(done).toMatch(/^Order #\d+ · T1 · Guest 1$/i);
  await expect(bits.doneTotal).toHaveText("₹99");

  const sent = rpc.of("place_order").map((c) => c.args);
  expect(sent).toHaveLength(2);
  expect(sent[0].p_expected_total).toBe(89);
  expect(sent[1].p_expected_total).toBe(99);
  expect(sent[1].p_client_order_id).toMatch(UUID);
  expect(sent[1].p_client_order_id, "the retry after PRICE_CHANGED is a new order id").not.toBe(sent[0].p_client_order_id);
  expect(await ordersSummary(db)).toBe("1:99");
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p0 P0-EDGE-02 dish sold out mid-cart: named toast, line blocked, Place disabled until the line is removed", async ({ guest, db }) => {
  const g = await guest();
  const rpc = recordRpc(g.page);
  const bits = new SheetBits(g.page);
  await g.scanAndOpen(2);
  await g.menu.quickAdd(DISH.brownie);
  await g.menu.quickAdd(DISH.lemonIceTea);
  await g.sheet.open();
  await expect(bits.cartLines).toHaveCount(2);
  await expect(g.sheet.total).toHaveText("₹228");

  await db.sql(`update public.dishes set is_available = false where id = '${DISH.brownie.id}'`);

  const first = await placeAndRead(g);
  expect(first.status).toBe(400);
  expect(first.body).toMatchObject({ message: "DISH_UNAVAILABLE", details: DISH.brownie.id });
  await expect(bits.toastMsg).toHaveText("Brownie just sold out.");
  await expect(bits.blockedMsg("Brownie")).toHaveText("Sold out — remove to continue");
  await expect(bits.blockedMsg("Lemon Ice Tea")).toHaveCount(0);
  await expect(g.sheet.tableSlot).toHaveText(FIX_MARKED);
  await expect(g.sheet.placeBtn).toBeDisabled();
  expect(await orderCount(db)).toBe("0");

  await bits.removeBtn("Brownie").click();
  await expect(bits.cartLines).toHaveCount(1);
  await expect(bits.line("Lemon Ice Tea")).toHaveCount(1);
  await expect(g.sheet.total).toHaveText("₹139");
  await expect(g.sheet.tableSlot).not.toContainText(FIX_MARKED);
  await expect(g.sheet.placeBtn).toBeEnabled();

  const done = await g.sheet.placeAndConfirm();
  expect(done).toMatch(/^Order #\d+ · T2 · Guest 1$/i);
  await expect(bits.doneTotal).toHaveText("₹139");
  const last = rpc.of("place_order").at(-1).args;
  expect(last.p_items).toEqual([expect.objectContaining({ dish_id: DISH.lemonIceTea.id, qty: 1 })]);

  // Back on the menu, the Brownie card is marked sold out and can't be added.
  await closeSheet(g);
  await g.menu.showCategory("desserts");
  const card = dishCard(g.page, DISH.brownie);
  await expect(card).toHaveClass(/\bis-out\b/);
  await expect(card.locator(".dish__status")).toHaveText("Sold out");
  await expect(g.menu.addBtn(DISH.brownie.id)).toHaveCount(0);

  expect(await db.sql(
    "select count(*) || ':' || max(total) || ':' || (select count(*) from public.order_items) from public.orders",
  )).toBe("1:139:1");
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p0 P0-EDGE-03 option switched off mid-cart: \"Out today — edit or remove\", edit to another flavour, then the order goes through", async ({ guest, db }) => {
  const { singleScoop } = DISH;
  const g = await guest();
  const bits = new SheetBits(g.page);
  // = g.scanAndOpen(3, "desserts"); see scanAndOpenOn for why the fixture's version can't be used here.
  await scanAndOpenOn(g, 3, "desserts");
  await expect(g.page.locator("#catTitle")).toHaveText("K-Desserts");
  await g.menu.openDish(singleScoop);
  await chip(g, "Vanilla").click();
  await expect(g.menu.option(singleScoop.options.vanilla)).toBeChecked();
  await expect(g.menu.buyBtn).toHaveText("Add to order · ₹89");
  await g.menu.buyBtn.click();
  await expect(g.menu.detail).toBeHidden();
  await g.sheet.open();
  await expect(bits.lineOpts("Single Scoop")).toHaveText(["Flavour: Vanilla"]);

  await db.sql(`update public.choice_options set is_available = false where id = '${singleScoop.options.vanilla}'`);

  const first = await placeAndRead(g);
  expect(first.status).toBe(400);
  expect(first.body).toMatchObject({ message: "OPTION_UNAVAILABLE", details: singleScoop.options.vanilla });
  await expect(bits.toastMsg).toHaveText(TOAST.menuChanged);
  await expect(bits.blockedMsg("Single Scoop")).toHaveText("Out today — edit or remove");
  await expect(g.sheet.tableSlot).toHaveText(FIX_MARKED);
  await expect(g.sheet.placeBtn).toBeDisabled();
  expect(await orderCount(db)).toBe("0");

  // Edit the line: Vanilla is greyed out, pick Chocolate instead.
  await bits.editBtn("Single Scoop").click();
  await expect(g.menu.detail).toBeVisible();
  await expect(g.menu.option(singleScoop.options.vanilla)).toBeDisabled();
  await expect(chip(g, "Vanilla")).toContainText("(out today)");
  await chip(g, "Chocolate").click();
  await expect(g.menu.option(singleScoop.options.chocolate)).toBeChecked();
  await expect(g.menu.buyBtn).toHaveText("Update order · ₹89");
  await g.menu.buyBtn.click();
  await expect(g.menu.detail).toBeHidden();

  await expect(bits.cartLines).toHaveCount(1);
  await expect(bits.lineOpts("Single Scoop")).toHaveText(["Flavour: Chocolate"]);
  await expect(bits.blockedMsg("Single Scoop")).toHaveCount(0);
  await expect(g.sheet.placeBtn).toBeEnabled();

  const done = await g.sheet.placeAndConfirm();
  expect(done).toMatch(/^Order #\d+ · T3 · Guest 1$/i);
  expect(await orderCount(db)).toBe("1");
  expect(await db.json("select coalesce(jsonb_agg(choices), '[]'::jsonb) from public.order_items"))
    .toEqual([[{ label: "Flavour", options: ["Chocolate"] }]]);
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p0 P0-EDGE-04 ordering closed mid-cart: toast, banner and Place disabled; reopening re-enables Place", async ({ guest, db }) => {
  const g = await guest();
  const bits = new SheetBits(g.page);
  await g.scanAndOpen(4);
  await g.menu.quickAdd(DISH.brownie);
  await g.sheet.open();
  await expect(g.sheet.banner).toBeHidden();
  await expect(g.sheet.placeBtn).toBeEnabled();

  await db.sql("update public.restaurant_settings set ordering_open = false");
  const first = await placeAndRead(g);
  expect(first.status).toBe(400);
  expect(first.body).toMatchObject({ message: "ORDERING_CLOSED" });
  await expect(bits.toastMsg).toHaveText(TOAST.closed);
  await expect(g.sheet.banner).toBeVisible();
  await expect(g.sheet.banner).toHaveText("We're not taking orders right now. You can still browse the menu.");
  await expect(g.sheet.placeBtn).toBeDisabled();
  expect(await orderCount(db)).toBe("0");

  // The kitchen reopens; the phone learns it from get_table_state when it comes back to the foreground.
  await db.sql("update public.restaurant_settings set ordering_open = true");
  const stateReply = g.page.waitForResponse((r) => /\/rest\/v1\/rpc\/get_table_state$/.test(r.url()));
  await g.menu.foreground();
  const state = await stateReply;
  expect(state.status()).toBe(200);
  expect((await state.json()).orderingOpen).toBe(true);
  await expect(g.sheet.banner).toBeHidden();
  await expect(g.sheet.placeBtn).toBeEnabled();

  const done = await g.sheet.placeAndConfirm();
  expect(done).toMatch(/^Order #\d+ · T4 · Guest 1$/i);
  expect(await ordersSummary(db)).toBe("1:89");
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p1 P0-EDGE-05 inactive table T49: the menu opens but Place is hidden behind a staff message", async ({ guest, db }) => {
  const g = await guest();
  const rpc = recordRpc(g.page);
  const scanReply = g.page.waitForResponse((r) => /\/rest\/v1\/rpc\/start_visit$/.test(r.url()));
  await g.scanAndOpen(49);
  const scan = await scanReply;
  expect(scan.status()).toBe(200);
  expect(await scan.json()).toMatchObject({ table: "T49", active: false });

  await g.menu.quickAdd(DISH.brownie);
  await expect(g.menu.badge).toHaveText("1");
  await g.sheet.open();
  await expect(g.sheet.tableSlot).toHaveText("This table isn't taking orders right now. Please ask our staff.");
  await expect(g.sheet.placeBtn).toBeHidden();
  expect(rpc.count("place_order")).toBe(0);
  expect(await orderCount(db)).toBe("0");
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p0 P0-EDGE-06 offline, then a lost reply while placing: every retry reuses the same client_order_id and exactly one order exists", async ({ guest, db }) => {
  const g = await guest();
  const rpc = recordRpc(g.page);
  const bits = new SheetBits(g.page);
  await g.scanAndOpen(6);
  await g.menu.quickAdd(DISH.brownie);
  await g.sheet.open();

  // 1. No connection at all.
  await g.context.setOffline(true);
  await g.sheet.place();
  await expect(bits.toastMsg).toHaveText(TOAST.network);
  await g.context.setOffline(false);
  const pending = await readStorage(g.page, "moba:pending");
  expect(pending?.id, "the order id is saved before the request goes out").toMatch(UUID);
  await expect(bits.cartLines).toHaveCount(1);
  await expect(g.menu.badge).toHaveText("1");
  await expect(g.sheet.placeBtn).toBeEnabled();
  expect(await orderCount(db)).toBe("0");
  // Let the first toast go, so the next one is provably new.
  await expect(g.menu.toast).toBeHidden();

  // 2. The request reaches the server, but the reply is lost on the way back.
  let forwarded = 0;
  await g.page.route(PLACE_ORDER, async (route) => {
    forwarded++;
    await route.fetch({ headers: { ...route.request().headers(), "x-moba-db": db.name } });
    await route.abort("failed");
  }, { times: 1 });
  await g.sheet.place();
  await expect(bits.toastMsg).toHaveText(TOAST.network);
  expect(forwarded).toBe(1);
  await expect.poll(() => orderCount(db)).toBe("1");
  await g.page.unroute(PLACE_ORDER);
  await expect(bits.cartLines).toHaveCount(1);
  await expect(g.sheet.placeBtn).toBeEnabled();

  // 3. The retry gets the order the server already made.
  const done = await g.sheet.placeAndConfirm();
  const orderNo = await db.sql("select order_no from public.orders");
  expect(done).toMatch(new RegExp(`^Order #${orderNo} · T6 · Guest 1$`, "i"));

  const ids = rpc.of("place_order").map((c) => c.args.p_client_order_id);
  // WebKit may drop the offline attempt before it shows up as a request; the lost one and the retry always do.
  expect(ids.length).toBeGreaterThanOrEqual(2);
  for (const id of ids) expect(id).toBe(pending.id);
  expect(await ordersSummary(db)).toBe("1:89");
  expect(await readStorage(g.page, "moba:pending")).toBeNull();
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p0 P0-EDGE-07 triple-tap Place sends exactly one place_order request", async ({ guest, db }) => {
  const g = await guest();
  const rpc = recordRpc(g.page);
  await g.scanAndOpen(7);
  await g.menu.quickAdd(DISH.brownie);
  await g.menu.quickAdd(DISH.lemonIceTea);
  await g.menu.quickAdd(DISH.lemonIceTea);
  await g.sheet.open();
  await expect(g.sheet.total).toHaveText("₹367");
  await expect(g.sheet.count).toHaveText("3 items");

  // Hold the request so the in-flight state can be seen.
  const hold = await holdRequests(g.page, PLACE_ORDER);
  await g.sheet.placeBtn.click({ clickCount: 3 });
  await expect(g.sheet.placeBtn).toHaveText("Placing your order…");
  await expect(g.sheet.placeBtn).toBeDisabled();
  hold.release();

  await expect(g.sheet.doneId).toBeVisible();
  expect(hold.count()).toBe(1);
  expect(rpc.count("place_order")).toBe(1);
  expect(await db.sql("select count(*) || ':' || max(total) || ':' || max(item_count) from public.orders")).toBe("1:367:3");
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p0 P0-EDGE-08 a second phone at the same table becomes Guest 2 and sees only its own orders", async ({ guest, db }) => {
  const a = await guest();
  const b = await guest();
  const bBits = new SheetBits(b.page);

  // Phone A orders first.
  await a.scanAndOpen(5);
  await a.menu.quickAdd(DISH.brownie);
  await a.sheet.open();
  expect(await a.sheet.placeAndConfirm()).toMatch(/^Order #\d+ · T5 · Guest 1$/i);

  // Phone B joins the same table.
  await b.scanAndOpen(5);
  await b.menu.quickAdd(DISH.lemonIceTea);
  await b.sheet.open();
  const bDone = await b.sheet.placeAndConfirm();
  expect(bDone).toMatch(/^Order #\d+ · T5 · Guest 2$/i);
  const bNo = bDone.match(/#(\d+)/)[1];
  await bBits.orderAgain.click();
  await expect(b.sheet.sheet).toBeHidden();
  await expect.poll(() => b.page.evaluate(() => history.state?.mobaLayer ?? null)).toBeNull();
  await b.sheet.open();
  await expect(bBits.placedTitle).toHaveText("Your orders at T5");
  await expect(bBits.placedOrders).toHaveCount(1);
  const own = bBits.placedOrders.first();
  await expect(own.locator("summary > span").first()).toHaveText(`Order #${bNo} · Guest 2`);
  await expect(own.locator(".placed__total")).toHaveText("₹139");
  await expect(bBits.placedOrders.filter({ hasText: "Guest 1" })).toHaveCount(0);
  await expect(bBits.placedOrders.filter({ hasText: "Brownie" })).toHaveCount(0);

  // Phone A orders again and keeps its guest number.
  await closeSheet(a);
  await a.menu.quickAdd(DISH.brownie);
  await a.sheet.open();
  expect(await a.sheet.placeAndConfirm()).toMatch(/^Order #\d+ · T5 · Guest 1$/i);

  expect(await db.sql(
    "select count(*) || ':' || count(distinct session_id) || ':' || string_agg(guest_no::text, ',' order by created_at, order_no)" +
    " || ':' || count(distinct device_hash) from public.orders",
  )).toBe("3:1:1,2,1:2");
  expect(await db.sql(
    "select count(*) from public.table_sessions s join public.dining_tables t on t.id = s.table_id where t.label = 'T5' and s.status = 'open'",
  )).toBe("1");
  expect([...a.errors, ...b.errors], "uncaught page errors").toEqual([]);
});

test("@phase0 @p1 P0-EDGE-09 TABLE_BUSY after 10 unaccepted orders; accepting one lets the next order through", async ({ guest, api, db }) => {
  // Two other phones at T10 send 5 orders each; the kitchen hasn't accepted any.
  const phones = [await api.scan(10), await api.scan(10)];
  for (const v of phones) {
    for (let i = 0; i < 5; i++) {
      const r = await api.order(v, [{ dish_id: DISH.brownie.id, qty: 1 }], 89);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
    }
  }
  expect(await db.sql("select count(*) from public.orders where status = 'placed'")).toBe("10");

  const g = await guest();
  const bits = new SheetBits(g.page);
  await g.scanAndOpen(10);
  await g.menu.quickAdd(DISH.brownie);
  await g.sheet.open();
  const first = await placeAndRead(g);
  expect(first.status).toBe(400);
  expect(first.body).toMatchObject({ message: "TABLE_BUSY" });
  await expect(bits.toastMsg).toHaveText(TOAST.busy);
  await expect(g.menu.badge).toHaveText("1");
  await expect(bits.cartLines).toHaveCount(1);
  await expect(g.sheet.placeBtn).toBeEnabled();
  expect(await orderCount(db)).toBe("10");

  // The kitchen accepts the oldest order.
  const oldest = await db.sql("select id from public.orders order by created_at, order_no limit 1");
  await db.asStaff(`select public.staff_set_order_status('${oldest}', 'placed', 'preparing')`);

  const done = await g.sheet.placeAndConfirm();
  expect(done).toMatch(/^Order #\d+ · T10 · Guest 3$/i);
  expect(await orderCount(db)).toBe("11");
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p1 P0-EDGE-10 RATE_LIMITED after 6 orders from one phone in 10 minutes", async ({ guest, api, db }) => {
  const g = await guest();
  const bits = new SheetBits(g.page);
  await g.scanAndOpen(11);
  const phone = await phoneIds(g.page);
  expect(phone.visit).toMatch(/^[0-9a-f]{64}$/);
  expect(phone.device).toMatch(UUID);

  // The same phone (same visit and device id) sends 6 orders straight to the API.
  for (let i = 0; i < 6; i++) {
    const r = await api.order(phone, [{ dish_id: DISH.brownie.id, qty: 1 }], 89);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
  }

  await g.menu.quickAdd(DISH.brownie);
  await g.sheet.open();
  const seventh = await placeAndRead(g);
  expect(seventh.status).toBe(400);
  expect(seventh.body).toMatchObject({ message: "RATE_LIMITED" });
  await expect(bits.toastMsg).toHaveText(TOAST.rateLimited);
  await expect(g.menu.badge).toHaveText("1");
  await expect(bits.cartLines).toHaveCount(1);
  await expect(g.sheet.placeBtn).toBeEnabled();
  expect(await orderCount(db)).toBe("6");
  expect(g.errors, "uncaught page errors").toEqual([]);
});

test("@phase0 @p2 P0-EDGE-11 Clear order empties the cart and Undo brings it back", async ({ guest }) => {
  const g = await guest();
  const rpc = recordRpc(g.page);
  const bits = new SheetBits(g.page);
  await g.scanAndOpen(12);
  await g.menu.quickAdd(DISH.brownie);
  await g.menu.quickAdd(DISH.lemonIceTea);
  await g.sheet.open();
  await expect(bits.cartLines).toHaveCount(2);
  await expect(g.sheet.total).toHaveText("₹228");

  await g.sheet.clearBtn.click();
  await expect(bits.toastMsg).toHaveText("Order cleared");
  await expect(bits.toastBtn).toHaveText("Undo");
  await expect(bits.emptyTitle).toHaveText("Nothing picked yet");
  await expect(bits.cartLines).toHaveCount(0);
  await expect(g.menu.badge).toBeHidden();
  expect(await readStorage(g.page, "moba:cart:v2")).toEqual([]);

  await bits.toastBtn.click();
  await expect(bits.cartLines).toHaveCount(2);
  await expect(bits.line("Brownie")).toHaveCount(1);
  await expect(bits.line("Lemon Ice Tea")).toHaveCount(1);
  await expect(g.sheet.total).toHaveText("₹228");
  await expect(g.sheet.count).toHaveText("2 items");
  await expect(g.menu.badge).toBeVisible();
  await expect(g.menu.badge).toHaveText("2");
  await expect(g.menu.toast).toBeHidden();
  const cart = await readStorage(g.page, "moba:cart:v2");
  expect(cart.map((l) => [l.id, l.qty])).toEqual([[DISH.brownie.id, 1], [DISH.lemonIceTea.id, 1]]);
  expect(rpc.count("place_order")).toBe(0);
  expect(g.errors, "uncaught page errors").toEqual([]);
});
