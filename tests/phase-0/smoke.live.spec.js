// Phase 0 · SMOKE: live production, READ-ONLY (docs/testing/phase-0-test-cases.md, section SMOKE).
//
// Runs only in the `live` project: Desktop Chrome against https://moba-h5ag.vercel.app (or
// MOBA_LIVE_URL, e.g. a Vercel preview) and the Supabase project in site/config.js.
// Rules: page loads, static GETs, and API calls whose input fails its first validation check.
// Nothing is ever created on live: no visit, no order, no account, no file. guardLive() aborts any
// browser request that is not a plain read, and the API calls below are all denied or rejected
// before they touch data.
//
// Gate items (NOT wrapped in test.fail(): the phase gate needs them green):
//   P0-SMOKE-06 @needs-owner  owner change 0.5 (F4 / audit D18). Green since the owner turned
//                             sign-up off; turns red again if sign-up is ever switched back on.
//   P0-SMOKE-07 @after-ship   favicon (change 0.4, F10). Red until the Phase 0 favicon is deployed.
import { test, expect } from "../support/fixtures.js";
import { HomePage, MenuPage } from "../support/pages.js";
import {
  expectDeployedConfig, guardLive, hstsMaxAge, ICO_MAGIC, magic, parseCsp, PNG_MAGIC, supabase, supabaseConfig, uuid,
} from "./_smoke-helpers.js";

const cfg = supabaseConfig();

/** Every <link> tag in a page's <head> (only the head: the home page is ~377 KB). */
const headLinks = (html) => (html.split(/<\/head>/i)[0].match(/<link\b[^>]*>/gi) ?? []);

test.describe("live smoke (read-only)", () => {
  test("@phase0 @p0 P0-SMOKE-01 live home loads with one visible Gather-for-food h1, the menu link, and no console or page errors @live-readonly", async ({ page }) => {
    const seen = await guardLive(page);
    const home = new HomePage(page);

    const res = await page.goto("/");
    expect(res?.status()).toBe(200);

    // Exactly one VISIBLE h1 on the page, and that one is the hero headline ("Gather<br>for food").
    const visibleH1 = page.locator("h1").filter({ visible: true });
    await expect(visibleH1).toHaveCount(1);
    await expect(visibleH1).toHaveText(/Gather\s*for food/i);
    await expect(home.heading).toHaveCount(1);
    await expect(home.heading).toHaveText(/Gather\s*for food/i);

    // The hero's "Open the menu →" pill (exact name: not the nav's "The menu 메뉴 →" or a footer link).
    const openMenu = page.getByRole("link", { name: "Open the menu →", exact: true });
    await expect(openMenu).toBeVisible();
    await expect(openMenu).toHaveAttribute("href", "menu.html");

    // The page's one API call (visit info, end of <body>) must have answered 200. Its failure is
    // swallowed by the page's .catch(), so without this a broken call only shows as a console line.
    await expect.poll(() => seen.responses, { message: "visit-info call get_restaurant_info answered 200" })
      .toContain("200 POST /rest/v1/rpc/get_restaurant_info");

    // Let late requests settle (fonts, idle image loads) so a failure in any of them is counted below.
    await page.waitForLoadState("networkidle");

    expect(seen.blocked, "the home page must not send anything that writes on live").toEqual([]);
    expect(seen.pageErrors, "uncaught page errors").toEqual([]);
    expect(seen.consoleErrors, "console errors").toEqual([]);
  });

  test("@phase0 @p0 P0-SMOKE-02 live /menu.html for a visitor without a scan shows the scan gate and makes 0 Supabase REST calls @live-readonly", async ({ page }) => {
    // The `page` fixture is a fresh browser context: no visit token, no scan, empty storage.
    const seen = await guardLive(page);
    // Count fetch/XHR/beacon calls inside the page as they are made, so "0 calls" after the fake
    // minute below is not racing the network events.
    await page.addInitScript(() => {
      const calls = (window.__smokeCalls = []);
      const rec = (u) => { try { calls.push(String(u instanceof Request ? u.url : u)); } catch {} };
      const f = window.fetch;
      window.fetch = function (input, init) { rec(input); return f.call(this, input, init); };
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (m, u, ...rest) { rec(u); return open.call(this, m, u, ...rest); };
      const beacon = navigator.sendBeacon?.bind(navigator);
      if (beacon) navigator.sendBeacon = (u, d) => { rec(u); return beacon(u, d); };
    });
    // Fake timers: lets the test run a minute of the page's timers below without sleeping.
    await page.clock.install();
    const menu = new MenuPage(page);

    const res = await page.goto("/menu.html");
    expect(res?.status()).toBe(200);

    const expectScanGate = async () => {
      await menu.expectGate("Scan to see the menu");
      await expect(menu.gate).toHaveCount(1);
      await expect(menu.gateTitle).toBeVisible();
      await expect(menu.gateMsg).toHaveText("Scan the QR code on your table at MOBA to browse the menu and order.");
      await expect(menu.gateNote, "a fresh phone has no saved picks").toHaveCount(0);
    };
    await expectScanGate();

    // Wait until the network is quiet, so a late menu or table request would be caught below.
    await page.waitForLoadState("networkidle");
    const restCalls = () => seen.supabase.filter((r) => r.includes("/rest/v1/"));
    expect(restCalls(), "requests to Supabase /rest/v1/ during load").toEqual([]);

    // Simulates a visitor leaving the gate open for a minute (fake clock, no real wait): any poll,
    // retry or late menu fetch started behind the gate fires now. The gate must not move.
    await page.clock.runFor(60_000);
    await expectScanGate();
    const inPage = await page.evaluate(() => window.__smokeCalls.filter((u) => u.includes("/rest/v1/")));
    expect(inPage, "fetch/XHR/beacon calls to /rest/v1/ made by the page after a minute on the gate").toEqual([]);
    expect(restCalls(), "requests to Supabase /rest/v1/ after a minute on the gate").toEqual([]);

    expect(seen.blocked).toEqual([]);
    expect(seen.pageErrors, "uncaught page errors").toEqual([]);
  });

  test("@phase0 @p1 P0-SMOKE-03 live security headers are sent on / and /menu.html @live-readonly", async ({ request }) => {
    // Supabase hosts only: 'self' plus https:// or wss:// *.supabase.co (or one project's host).
    const SUPABASE_SRC = /^(https|wss):\/\/(\*\.|[a-z0-9-]+\.)supabase\.co$/i;
    for (const p of ["/", "/menu.html"]) {
      // No redirects: the headers must be on the page's own response, not on a redirect target.
      const res = await request.get(p, { maxRedirects: 0 });
      expect(res.status(), `${p} status`).toBe(200);
      const h = res.headers();
      const csp = parseCsp(h["content-security-policy"]);
      expect.soft(csp["default-src"], `${p} CSP default-src (${h["content-security-policy"]})`).toEqual(["'self'"]);
      expect.soft(csp["frame-ancestors"], `${p} CSP frame-ancestors`).toEqual(["'none'"]);
      expect.soft(csp["base-uri"], `${p} CSP base-uri`).toEqual(["'self'"]);
      const connect = csp["connect-src"] ?? [];
      expect.soft(connect.slice(0, 2), `${p} CSP connect-src starts 'self' https://*.supabase.co`).toEqual(["'self'", "https://*.supabase.co"]);
      // Negative: the page may talk to itself and Supabase only (no *, no bare scheme, no other host).
      expect.soft(connect.filter((t) => t !== "'self'" && !SUPABASE_SRC.test(t)), `${p} CSP connect-src extra sources`).toEqual([]);
      expect.soft(h["x-frame-options"], `${p} X-Frame-Options`).toBe("DENY");
      expect.soft(h["x-content-type-options"], `${p} X-Content-Type-Options`).toBe("nosniff");
      expect.soft(h["referrer-policy"], `${p} Referrer-Policy`).toBe("strict-origin-when-cross-origin");
      expect.soft((h["permissions-policy"] ?? "").split(",").map((d) => d.trim()), `${p} Permissions-Policy`).toContain("camera=()");
      expect.soft(hstsMaxAge(h["strict-transport-security"]), `${p} HSTS max-age (${h["strict-transport-security"]})`)
        .toBeGreaterThanOrEqual(31_536_000);
    }
  });

  test("@phase0 @p1 P0-SMOKE-04 live Supabase denies anon reads of dining_tables, orders and table_visits, and denies staff_dashboard before it runs @live-readonly", async ({ request }) => {
    await expectDeployedConfig(request, cfg);
    for (const table of ["dining_tables", "orders", "table_visits"]) {
      const r = await supabase(request, cfg, "GET", `/rest/v1/${table}?select=id&limit=1`);
      expect.soft(Array.isArray(r.body), `${table}: rows must never come back (${r.text.slice(0, 120)})`).toBe(false);
      expect.soft(r.status, `${table} status`).toBe(401);
      expect.soft(r.body?.code, `${table} code`).toBe("42501");
      expect.soft(r.body?.message, `${table} message`).toBe(`permission denied for table ${table}`);
    }

    // Denied by the EXECUTE grant (migration 7). "NOT_STAFF" here would mean the function ran
    // and only require_staff() stopped it, i.e. migration 7 is missing on live (audit D12).
    const s = await supabase(request, cfg, "POST", "/rest/v1/rpc/staff_dashboard", {});
    expect.soft(s.body?.message, "staff_dashboard message").not.toBe("NOT_STAFF");
    expect.soft(s.status, "staff_dashboard status").toBe(401);
    expect.soft(s.body?.code, "staff_dashboard code").toBe("42501");
    expect.soft(s.body?.message, "staff_dashboard message").toBe("permission denied for function staff_dashboard");
  });

  test("@phase0 @p1 P0-SMOKE-05 live public RPCs reject invalid input at their first check, and the old p_token get_table_state is gone @live-readonly", async ({ request }) => {
    await expectDeployedConfig(request, cfg);
    // Each body fails the function's FIRST validation, so nothing is read for a table or written.
    // start_visit: QR format check comes before any lookup or insert.
    const start = await supabase(request, cfg, "POST", "/rest/v1/rpc/start_visit", { p_qr_token: "not-a-qr", p_device: uuid() });
    expect.soft(start.status, "start_visit status").toBe(400);
    expect.soft(start.body, "start_visit body").toMatchObject({ code: "P0001", message: "INVALID_TABLE" });

    // get_table_state: private.find_visit rejects the visit-token format first.
    const state = await supabase(request, cfg, "POST", "/rest/v1/rpc/get_table_state", { p_visit: "x", p_device: uuid() });
    expect.soft(state.status, "get_table_state status").toBe(400);
    expect.soft(state.body, "get_table_state body").toMatchObject({ code: "P0001", message: "INVALID_VISIT" });

    // place_order: an empty item list fails the shape check before the visit is even looked up.
    const order = await supabase(request, cfg, "POST", "/rest/v1/rpc/place_order", {
      p_visit: "x", p_device: uuid(), p_client_order_id: uuid(), p_items: [], p_expected_total: 0,
    });
    expect.soft(order.status, "place_order status").toBe(400);
    expect.soft(order.body, "place_order body").toMatchObject({ code: "P0001", message: "BAD_REQUEST" });

    // The pre-visit-token signature get_table_state(p_token, p_device) was dropped (visit_tokens migration).
    const old = await supabase(request, cfg, "POST", "/rest/v1/rpc/get_table_state", { p_token: "0".repeat(32), p_device: uuid() });
    expect.soft(old.status, "old get_table_state(p_token) status").toBe(404);
    expect.soft(old.body?.code, "old get_table_state(p_token) code").toBe("PGRST202");
    expect.soft(old.body?.message ?? "", "old get_table_state(p_token) message").toContain("get_table_state");
  });

  // GATE ITEM, owner action 0.5 (F4 / audit D18): "Allow new users to sign up" off in the Supabase
  // dashboard. Deliberately NOT test.fail(): the phase gate needs it green.
  test("@phase0 @p1 P0-SMOKE-06 live sign-up is disabled @live-readonly @needs-owner", async ({ request }) => {
    await expectDeployedConfig(request, cfg);
    const r = await supabase(request, cfg, "GET", "/auth/v1/settings");
    expect(r.status, `settings status (${r.text.slice(0, 120)})`).toBe(200);
    expect(r.body, "disable_signup (false = anyone can create an account)").toMatchObject({ disable_signup: true });
  });

  // GATE ITEM, change 0.4 (F10). Red until the Phase 0 favicon is deployed; green on its preview.
  test("@phase0 @p2 P0-SMOKE-07 live favicon files are served and linked from the home page @live-readonly @after-ship", async ({ request }) => {
    for (const [p, sig] of [["/assets/favicon-32.png", [PNG_MAGIC]], ["/assets/apple-touch-icon.png", [PNG_MAGIC]], ["/favicon.ico", [PNG_MAGIC, ICO_MAGIC]]]) {
      const res = await request.get(p);
      expect.soft(res.status(), `${p} status`).toBe(200);
      expect.soft(res.headers()["content-type"] ?? "", `${p} content-type`).toMatch(/^image\//);
      // A real image, not an empty file or an HTML fallback served with an image type.
      const head = magic(await res.body(), 8);
      expect.soft(sig.some((s) => head.startsWith(s)), `${p} starts with a PNG or ICO signature (got ${head})`).toBe(true);
    }
    // Both diner pages carry the two links (change 0.4: "Favicon on the home and menu pages").
    for (const p of ["/", "/menu.html"]) {
      const links = headLinks(await (await request.get(p)).text());
      expect.soft(links.filter((l) => /\srel="icon"/.test(l) && /\shref="assets\/favicon-32\.png"/.test(l)),
        `${p} <link rel="icon" … href="assets/favicon-32.png">`).toHaveLength(1);
      expect.soft(links.filter((l) => /^<link\s+rel="apple-touch-icon"\s+href="assets\/apple-touch-icon\.png"/.test(l)),
        `${p} <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">`).toHaveLength(1);
    }
  });
});
