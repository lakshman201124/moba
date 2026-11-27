// Shared test fixtures. Import { test, expect } from here, never from @playwright/test directly.
//
//   db     a fresh copy of the database for this test (helpers: sql, asAnon, asStaff, json)
//   api    call the public RPCs like a phone does, against this test's database
//   guest  factory: `const g = await guest()` → a new phone (own browser context) on this test's database
import { test as base, expect } from "@playwright/test";
import { cloneDb, dbHandle, dropDb } from "./db.js";
import { qrFor, uuid } from "./data.js";
import { HomePage, MenuPage, OrderSheet } from "./pages.js";

export { expect };

export const test = base.extend({
  db: async ({}, use, testInfo) => {
    const name = `moba_t_${process.pid}_${testInfo.workerIndex}`;
    await cloneDb(name);
    await use(dbHandle(name));
    await dropDb(name);
  },

  api: async ({ playwright, db, baseURL }, use) => {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-Moba-Db": db.name } });
    const api = {
      /** POST /rest/v1/rpc/<fn>. Returns { status, body }. */
      rpc: async (fn, args = {}) => {
        const res = await ctx.post(`/rest/v1/rpc/${fn}`, { data: args });
        const text = await res.text();
        let body = null;
        try { body = text ? JSON.parse(text) : null; } catch { body = text; }
        return { status: res.status(), body };
      },
      /** Scan table n with a new (or given) phone. Returns { visit, device, ...reply }. */
      scan: async (n, device = uuid()) => {
        const r = await api.rpc("start_visit", { p_qr_token: qrFor(n), p_device: device });
        if (r.status !== 200) throw new Error(`start_visit(T${n}) → ${r.status} ${JSON.stringify(r.body)}`);
        return { ...r.body, device };
      },
      order: (v, items, expectedTotal, clientOrderId = uuid()) =>
        api.rpc("place_order", { p_visit: v.visit, p_device: v.device, p_client_order_id: clientOrderId, p_items: items, p_expected_total: expectedTotal }),
      state: (v) => api.rpc("get_table_state", { p_visit: v.visit, p_device: v.device }),
    };
    await use(api);
    await ctx.dispose();
  },

  guest: async ({ browser, db, baseURL, viewport, userAgent, isMobile, hasTouch, deviceScaleFactor, locale }, use) => {
    const opened = [];
    const factory = async (options = {}) => {
      const context = await browser.newContext({
        viewport, userAgent, isMobile, hasTouch, deviceScaleFactor, locale,
        baseURL,
        reducedMotion: "reduce",
        extraHTTPHeaders: { "X-Moba-Db": db.name },
        ...options,
      });
      opened.push(context);
      const page = await context.newPage();
      const rpcCalls = [];
      const errors = [];
      page.on("request", (r) => {
        const m = r.url().match(/\/rest\/v1\/rpc\/([a-z_]+)/);
        if (m) rpcCalls.push(m[1]);
      });
      page.on("pageerror", (e) => errors.push(e.message));
      const home = new HomePage(page);
      const menu = new MenuPage(page);
      const sheet = new OrderSheet(page);
      return {
        context, page, home, menu, sheet, rpcCalls, errors,
        /** Scan table n's QR, then open the menu (optionally on a category). */
        async scanAndOpen(n, category) {
          await home.goto(qrFor(n));
          await menu.goto(category);
          await menu.expectOpen();
        },
      };
    };
    await use(factory);
    for (const c of opened) await c.close().catch(() => {});
  },
});
