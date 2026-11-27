// Phase 0 baseline, area GATE: the menu's scan gate in every state, against the real SQL.
// Cases: docs/testing/phase-0-test-cases.md (P0-GATE-01 … P0-GATE-08).
// Code under test: site/table-context.js (scan → tab storage), site/menu.js (boot, startVisit, showGate,
// handlePlaceError, pollTableState), supabase/migrations/20261102000100_visit_tokens.sql.
//
// Every "the page made these RPCs and no others" check runs after settle(): proving that a call
// does NOT happen needs the page to have finished the calls it was going to make.
import { test, expect } from "../support/fixtures.js";
import { DISH, qrFor } from "../support/data.js";
import {
  KEY, expectGateScreen, expectNoPageErrors, keysContaining, openHome, orderCount, parsed, rpcReply, settle, sha256,
  storage, visitCount,
} from "./_gate-helpers.js";

// What the menu page asks for when a scan opens it: swap the QR, load the menu, first table poll.
const OPEN_CALLS = ["start_visit", "get_public_menu", "get_table_state"];

test("@phase0 @p1 P0-GATE-01 a visitor without a scan, or with a malformed ?t=, sees \"Scan to see the menu\" and the menu makes 0 RPC calls", async ({ guest, baseURL }) => {
  await test.step("1) straight to the menu, no scan", async () => {
    const g = await guest();
    await g.menu.goto();
    await expectGateScreen(g, "none", { note: false });
    await settle(g.page);
    expect(g.rpcCalls).toEqual([]);
    const s = await storage(g.page);
    expect(s.local[KEY.visit]).toBeUndefined();
    expect(s.session[KEY.scan]).toBeUndefined();
    expectNoPageErrors(g);
  });

  await test.step("2) malformed ?t=xyz on the home page, then the menu", async () => {
    const g = await guest();
    const before = await openHome(g, "xyz");
    await expect(g.page).toHaveURL(`${baseURL}/`);
    expect((await storage(g.page)).session[KEY.scan]).toBeUndefined();

    await g.menu.goto();
    await expectGateScreen(g, "none", { note: false });
    await settle(g.page);
    expect(g.rpcCalls.slice(before)).toEqual([]);
    const s = await storage(g.page);
    expect(s.local[KEY.visit]).toBeUndefined();
    expect(s.session[KEY.scan]).toBeUndefined();
    expectNoPageErrors(g);
  });
});

test("@phase0 @p0 P0-GATE-02 a scan swaps the QR for a visit token: QR stripped from the URL, kept only in this tab, never in localStorage, cleared after start_visit", async ({ guest, db, baseURL }) => {
  const qr = qrFor(2);
  const g = await guest();

  // 1) Scan: the QR leaves the address bar and is held for this tab only.
  const before = await openHome(g, qr);
  await expect(g.page).toHaveURL(`${baseURL}/`);
  let s = await storage(g.page);
  expect(parsed(s.session[KEY.scan])).toEqual({ qr });
  expect(keysContaining({ local: s.local, session: {} }, qr)).toEqual([]);

  // 2) The menu swaps it for a visit token first, then loads the menu.
  await g.menu.goto();
  await g.menu.expectOpen();
  await settle(g.page);
  // start_visit first, then get_public_menu (the case), and nothing else but the first table poll:
  // a second start_visit would mint a second visit.
  expect(g.rpcCalls.slice(before)).toEqual(OPEN_CALLS);
  expect(g.page.url()).not.toContain(qr);

  s = await storage(g.page);
  const now = await g.page.evaluate(() => Date.now());
  expect(s.session[KEY.scan]).toBeUndefined();
  const visit = parsed(s.local[KEY.visit]);
  expect(visit).toEqual({ visit: expect.stringMatching(/^[0-9a-f]{64}$/), orderBy: expect.any(Number) });
  // orderBy = the phone's clock at the start_visit reply + 300 s (visit_order_minutes = 5).
  expect(visit.orderBy - now).toBeLessThanOrEqual(300_000);
  expect(visit.orderBy - now).toBeGreaterThan(300_000 - 30_000);
  expect(keysContaining(s, qr)).toEqual([]);

  // 3) The server keeps only hashes, tied to this phone's device id.
  const device = s.local[KEY.device];
  expect(device).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const rows = await db.json(`
    select coalesce(json_agg(x), '[]') from (
      select t.label, v.token_hash, v.device_hash, v.session_id,
             extract(epoch from v.order_until - v.created_at)::int as window_s,
             extract(epoch from v.order_until - now())::numeric as left_s
        from public.table_visits v join public.dining_tables t on t.id = v.table_id) x`);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ label: "T2", token_hash: sha256(visit.visit), device_hash: sha256(device), session_id: null, window_s: 300 });
  expect(Number(rows[0].left_s)).toBeGreaterThan(240);
  expect(Number(rows[0].left_s)).toBeLessThanOrEqual(300);
  expectNoPageErrors(g);
});

test("@phase0 @p0 P0-GATE-03 when the 5-minute window is over (DB), Place shows \"Scan again\" with \"Your picks are saved on this phone.\" and no order is created", async ({ guest, db }) => {
  const g = await guest();
  await g.scanAndOpen(3);
  await g.menu.quickAdd(DISH.brownie);
  await expect(g.menu.badge).toHaveText("1");
  const visitBefore = parsed((await storage(g.page)).local[KEY.visit]);

  // Simulate the 5 minutes passing on the server; the phone's own clock still says "can order".
  await db.sql("update public.table_visits set order_until = now() - interval '1 second'");

  await g.sheet.open();
  await expect(g.page.locator("html")).not.toHaveClass(/\bgated\b/); // only the server's reply may close it
  await expect(g.sheet.placeBtn).toBeEnabled();
  await settle(g.page);
  const beforePlace = g.rpcCalls.length;
  const placed = rpcReply(g.page, "place_order");
  await g.sheet.place();
  const reply = await placed;
  expect(reply.status).toBe(400);
  expect(reply.body).toMatchObject({ message: "VISIT_EXPIRED" });

  await expectGateScreen(g, "expired", { note: true });
  await settle(g.page);
  expect(g.rpcCalls.slice(beforePlace)).toEqual(["place_order"]); // no retry, no further polling

  const s = await storage(g.page);
  expect(parsed(s.local[KEY.visit])).toEqual({ visit: visitBefore.visit, orderBy: 0 });
  expect(parsed(s.local[KEY.cart])).toEqual([expect.objectContaining({ id: DISH.brownie.id, qty: 1 })]);
  expect(await orderCount(db)).toBe(0);
  expectNoPageErrors(g);
});

test("@phase0 @p1 P0-GATE-04 reload after expiry makes 0 API calls; a fresh scan reopens the menu with the saved cart", async ({ guest, db }) => {
  const g = await guest();

  // 1) As GATE-03, at table T4.
  await g.scanAndOpen(4);
  await g.menu.quickAdd(DISH.brownie);
  await expect(g.menu.badge).toHaveText("1");
  const oldVisit = parsed((await storage(g.page)).local[KEY.visit]).visit;
  await db.sql("update public.table_visits set order_until = now() - interval '1 second'");
  await g.sheet.open();
  const placed = rpcReply(g.page, "place_order");
  await g.sheet.place();
  const reply = await placed;
  expect(reply.status).toBe(400);
  expect(reply.body).toMatchObject({ message: "VISIT_EXPIRED" });
  await expectGateScreen(g, "expired", { note: true });

  // 2) Reload: the gate comes straight from this phone's storage, with no API call.
  await settle(g.page);
  const beforeReload = g.rpcCalls.length;
  await g.page.reload();
  await expectGateScreen(g, "expired", { note: true });
  await settle(g.page);
  expect(g.rpcCalls.slice(beforeReload)).toEqual([]);

  // 3) A fresh scan of the same table opens the menu again, cart intact.
  const before = await openHome(g, qrFor(4));
  await g.menu.goto();
  await g.menu.expectOpen();
  await expect(g.menu.badge).toHaveText("1");
  await settle(g.page);
  expect(g.rpcCalls.slice(before)).toEqual(OPEN_CALLS);
  const s = await storage(g.page);
  const now = await g.page.evaluate(() => Date.now());
  expect(s.session[KEY.scan]).toBeUndefined();
  expect(parsed(s.local[KEY.cart])).toEqual([expect.objectContaining({ id: DISH.brownie.id, qty: 1 })]);
  const fresh = parsed(s.local[KEY.visit]);
  expect(fresh.visit).toMatch(/^[0-9a-f]{64}$/);
  expect(fresh.visit).not.toBe(oldVisit);
  expect(fresh.orderBy - now).toBeGreaterThan(300_000 - 30_000); // a new 5-minute window, not the closed one

  expect(await visitCount(db, 4)).toBe(2);
  expect(await orderCount(db)).toBe(0);
  expectNoPageErrors(g);
});

test("@phase0 @p0 P0-GATE-05 staff free the table: the phone shows \"Thanks for eating with us!\" and drops its visit", async ({ guest, db }) => {
  const g = await guest();

  // 1) Order at T6.
  await g.scanAndOpen(6);
  await g.menu.quickAdd(DISH.brownie);
  await expect(g.menu.badge).toHaveText("1");
  await g.sheet.open();
  await g.sheet.placeAndConfirm();
  expect(await orderCount(db)).toBe(1);

  // 2) Staff free the table (serving the pending order). Listen first: whichever get_table_state
  //    call sees the closed session (the post-order poll or the foreground one) proves visitEnded.
  const ended = rpcReply(g.page, "get_table_state", (body) => body?.visitEnded === true);
  const session = await db.sql(`
    select s.id from public.table_sessions s join public.dining_tables t on t.id = s.table_id
     where t.label = 'T6' and s.status = 'open'`);
  expect(session).toMatch(/^[0-9a-f-]{36}$/);
  await db.asStaff(`select public.staff_free_table('${session}', 1, true)`);

  // 3) The phone comes back to the foreground.
  await g.menu.foreground();
  const state = await ended;
  expect(state.status).toBe(200);
  expect(state.body).toMatchObject({ visitEnded: true, orders: [] });
  await expectGateScreen(g, "ended", { note: false }); // the cart was emptied by the order
  expect((await storage(g.page)).local[KEY.visit]).toBeUndefined();
  // The gate stops the table polling.
  const atGate = g.rpcCalls.length;
  await settle(g.page);
  expect(g.rpcCalls.slice(atGate)).toEqual([]);

  // 4) Reload: no visit left, so the plain scan screen, with no API call.
  const beforeReload = g.rpcCalls.length;
  await g.page.reload();
  await expectGateScreen(g, "none", { note: false });
  await settle(g.page);
  expect(g.rpcCalls.slice(beforeReload)).toEqual([]);

  // DB: the session is closed as freed and the pending order was served.
  expect(await db.sql(`
    select s.status || '|' || s.close_reason || '|' || string_agg(o.status, ',')
      from public.table_sessions s join public.dining_tables t on t.id = s.table_id
      join public.orders o on o.session_id = s.id
     where t.label = 'T6' group by s.id`)).toBe("closed|freed|served");
  expectNoPageErrors(g);
});

test("@phase0 @p1 P0-GATE-06 (A) a rotated QR: Place gets VISIT_EXPIRED, and the old printed QR shows \"This QR code isn't active any more\" and stores nothing", async ({ guest, db }) => {
  const g = await guest();
  await g.scanAndOpen(7);
  await g.menu.quickAdd(DISH.brownie);
  await expect(g.menu.badge).toHaveText("1");

  // Staff replace T7's QR: that ends every open ordering window at T7.
  const tableId = await db.sql("select id from public.dining_tables where label = 'T7'");
  const newQr = await db.asStaff(`select public.staff_rotate_table_token('${tableId}')`);
  expect(newQr).toMatch(/^[0-9a-f]{32}$/);
  expect(newQr).not.toBe(qrFor(7));

  await g.sheet.open();
  const placed = rpcReply(g.page, "place_order");
  await g.sheet.place();
  const reply = await placed;
  expect(reply.status).toBe(400);
  expect(reply.body).toMatchObject({ message: "VISIT_EXPIRED" });
  await expectGateScreen(g, "expired", { note: true });

  // Re-scan the old printed QR.
  const before = await openHome(g, qrFor(7));
  expect(parsed((await storage(g.page)).session[KEY.scan])).toEqual({ qr: qrFor(7) });
  const started = rpcReply(g.page, "start_visit");
  await g.menu.goto();
  const sv = await started;
  expect(sv.status).toBe(400);
  expect(sv.body).toMatchObject({ message: "INVALID_TABLE" });
  // Baseline: the Brownie is still in the cart, so the "saved" note shows on the invalid screen too.
  await expectGateScreen(g, "invalid", { note: true });

  await settle(g.page);
  const s = await storage(g.page);
  expect(s.local[KEY.visit]).toBeUndefined();
  expect(s.session[KEY.scan]).toBeUndefined();
  expect(g.rpcCalls.slice(before)).toEqual(["start_visit"]); // no get_public_menu, no polling
  expect(await orderCount(db)).toBe(0);
  expectNoPageErrors(g);
});

test("@phase0 @p1 P0-GATE-06 (B) an unknown but well-formed QR shows \"This QR code isn't active any more\" and stores nothing", async ({ guest, db }) => {
  const g = await guest();
  const unknown = "0".repeat(32);
  const before = await openHome(g, unknown);
  expect(parsed((await storage(g.page)).session[KEY.scan])).toEqual({ qr: unknown });

  const started = rpcReply(g.page, "start_visit");
  await g.menu.goto();
  const sv = await started;
  expect(sv.status).toBe(400);
  expect(sv.body).toMatchObject({ message: "INVALID_TABLE" });
  await expectGateScreen(g, "invalid", { note: false });

  await settle(g.page);
  const s = await storage(g.page);
  expect(s.local[KEY.visit]).toBeUndefined();
  expect(s.session[KEY.scan]).toBeUndefined();
  expect(g.rpcCalls.slice(before)).toEqual(["start_visit"]);
  expect(await db.sql("select count(*) from public.table_visits")).toBe("0");
  expectNoPageErrors(g);
});

test("@phase0 @p2 P0-GATE-07 too many scans at one table shows \"One moment\"", async ({ guest, db }) => {
  // 1) 120 scans at T8 in the last 10 minutes (the per-table limit in start_visit).
  await db.sql(`
    insert into public.table_visits (table_id, token_hash, device_hash, order_until)
    select t.id, md5(concat(g, random())), 'flood', now() + interval '5 minutes'
      from public.dining_tables t, generate_series(1, 120) g where t.label = 'T8'`);
  expect(await visitCount(db, 8)).toBe(120);

  // 2) A real phone scans T8.
  const g = await guest();
  const before = await openHome(g, qrFor(8));
  const started = rpcReply(g.page, "start_visit");
  await g.menu.goto();
  const sv = await started;
  expect(sv.status).toBe(400);
  expect(sv.body).toMatchObject({ message: "RATE_LIMITED" });
  await expectGateScreen(g, "busy", { note: false }); // also asserts no "Try again"

  await settle(g.page);
  const s = await storage(g.page);
  expect(s.session[KEY.scan]).toBeUndefined();
  expect(s.local[KEY.visit]).toBeUndefined();
  expect(g.rpcCalls.slice(before)).toEqual(["start_visit"]);
  expect(await visitCount(db, 8)).toBe(120);
  expectNoPageErrors(g);
});

test("@phase0 @p1 P0-GATE-08 no connection at scan shows \"No connection\"; Try again recovers with the kept scan", async ({ guest, db }) => {
  const g = await guest();
  const qr = qrFor(9);

  // 1) Scan T9.
  const before = await openHome(g, qr);

  // 2) The scan swap can't reach the server.
  const offline = (route) => route.abort("internetdisconnected");
  await g.page.route("**/rest/v1/rpc/start_visit", offline);
  await g.menu.goto();
  await expectGateScreen(g, "offline", { note: false });
  await settle(g.page);
  expect(g.rpcCalls.slice(before)).toEqual(["start_visit"]); // the aborted swap only; no menu load
  let s = await storage(g.page);
  expect(parsed(s.session[KEY.scan])).toEqual({ qr });
  expect(s.local[KEY.visit]).toBeUndefined();
  expect(await visitCount(db, 9)).toBe(0);

  // 3) Back online: "Try again" reloads and swaps the kept scan.
  await g.page.unroute("**/rest/v1/rpc/start_visit", offline);
  const beforeRetry = g.rpcCalls.length;
  const started = rpcReply(g.page, "start_visit");
  await g.menu.gate.getByRole("button", { name: "Try again" }).click();
  const sv = await started;
  expect(sv.status).toBe(200);
  expect(sv.body).toMatchObject({ table: "T9", orderSeconds: 300 });
  await g.menu.expectOpen();
  await settle(g.page);
  expect(g.rpcCalls.slice(beforeRetry)).toEqual(OPEN_CALLS);
  s = await storage(g.page);
  expect(s.session[KEY.scan]).toBeUndefined();
  expect(parsed(s.local[KEY.visit])).toEqual({ visit: sv.body.visit, orderBy: expect.any(Number) });
  expect(await visitCount(db, 9)).toBe(1);
  expectNoPageErrors(g);
});
