// Helpers for phase-0/gate.spec.js only (menu gate states). Things here that other areas could use
// are listed as support suggestions in the Phase 0 report; tests/support/* is shared and not edited here.
import { createHash } from "node:crypto";
import { expect } from "../support/fixtures.js";

/** Gate screens, copied word for word from GATES in site/menu.js. */
export const GATE = {
  none: { title: "Scan to see the menu", msg: "Scan the QR code on your table at MOBA to browse the menu and order." },
  expired: { title: "Scan again", msg: "Your table session timed out. Scan the QR code on your table again to keep browsing and ordering." },
  ended: { title: "Thanks for eating with us!", msg: "Scan the QR code on your table to order again. 같이 밥 먹어요" },
  invalid: { title: "Scan again", msg: "This QR code isn't active any more. Scan the code on your table, or ask our staff." },
  busy: { title: "One moment", msg: "This QR code was scanned a lot just now. Please wait a minute and scan again." },
  offline: { title: "No connection", msg: "We couldn't reach MOBA. Check your connection and try again." },
};
export const SAVED_NOTE = "Your picks are saved on this phone.";

/** Storage keys used by site/table-context.js, site/api.js and site/menu.js. */
export const KEY = { scan: "moba:scan", visit: "moba:visit:v1", device: "moba:device", cart: "moba:cart:v2" };

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** Every localStorage and sessionStorage entry of the page, as raw strings. */
export async function storage(page) {
  return page.evaluate(() => {
    const dump = (s) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)).map((k) => [k, s.getItem(k)]));
    return { local: dump(localStorage), session: dump(sessionStorage) };
  });
}

/** A stored JSON value, or null when the key is absent. */
export const parsed = (raw) => (raw == null ? null : JSON.parse(raw));

/** Entries (in either store) whose key or value contains `needle`, as "local:<key>" / "session:<key>". */
export function keysContaining(store, needle) {
  return [...Object.entries(store.local).map(([k, v]) => [`local:${k}`, k, v]), ...Object.entries(store.session).map(([k, v]) => [`session:${k}`, k, v])]
    .filter(([, k, v]) => k.includes(needle) || String(v).includes(needle))
    .map(([name]) => name);
}

/**
 * Wait for the next reply of public RPC `fn` (optionally one whose JSON body passes `when`).
 * Resolves to { status, body }. Register it BEFORE the action that triggers the call.
 * Fails after `timeout` ms with the RPC's name, instead of hanging until the test timeout.
 */
export function rpcReply(page, fn, when = () => true, { timeout = 15_000 } = {}) {
  return page
    .waitForResponse(async (r) => {
      if (!r.url().endsWith(`/rest/v1/rpc/${fn}`) || r.request().method() !== "POST") return false;
      const body = await r.json().catch(() => null);
      return when(body, r.status());
    }, { timeout })
    .catch((e) => { throw new Error(`No matching ${fn} reply within ${timeout} ms: ${e.message}`); })
    .then(async (r) => ({ status: r.status(), body: await r.json().catch(() => null) }));
}

/**
 * Let the page finish the requests it was going to make: the page has loaded and no request has
 * started or ended for `quietMs`. Used ONLY before a "these RPCs and no others" check, so the check
 * can't pass just because a late call hadn't left yet; proving that something does NOT happen needs
 * a window of time. Never used to wait for something to appear (web-first assertions do that).
 * Playwright's own "networkidle" can't be used here: it fires once per navigation, so after an
 * in-page action (Place, a poll) it has already fired and resolves at once.
 */
export async function settle(page, { quietMs = 500, maxMs = 10_000 } = {}) {
  await page.waitForLoadState("load");
  let last = Date.now();
  const bump = () => { last = Date.now(); };
  const events = ["request", "requestfinished", "requestfailed"];
  for (const e of events) page.on(e, bump);
  try {
    const start = Date.now();
    while (Date.now() - last < quietMs) {
      if (Date.now() - start > maxMs) throw new Error(`network never went quiet for ${quietMs} ms within ${maxMs} ms`);
      await new Promise((r) => setTimeout(r, 50)); // polling the quiet window, not waiting for an outcome
    }
  } finally {
    for (const e of events) page.off(e, bump);
  }
}

/** No uncaught script error on any page this phone opened. */
export const expectNoPageErrors = (g) => expect(g.errors, "uncaught page errors").toEqual([]);

/**
 * Open the home page (optionally as a QR scan) and wait for its own get_restaurant_info call to
 * finish, so later RPCs can be attributed to the menu page. Returns rpcCalls.length at that point.
 */
export async function openHome(g, qr) {
  const info = rpcReply(g.page, "get_restaurant_info");
  await g.home.goto(qr);
  await info;
  return g.rpcCalls.length;
}

/**
 * Assert the whole menu page is the given gate screen.
 *   note:  whether "Your picks are saved on this phone." is shown
 */
export async function expectGateScreen(g, kind, { note = false } = {}) {
  const { page, menu } = g;
  const { title, msg } = GATE[kind];
  await menu.expectGate(title);
  await expect(menu.gateMsg).toHaveText(msg);
  if (note) await expect(menu.gateNote).toHaveText(SAVED_NOTE);
  else await expect(menu.gateNote).toHaveCount(0);
  const retry = menu.gate.getByRole("button", { name: "Try again" });
  if (kind === "offline") await expect(retry).toBeVisible();
  else await expect(retry).toHaveCount(0);
  await expect(menu.gate.getByRole("link", { name: "Back to MOBA home" })).toHaveAttribute("href", "index.html");
  // html.gated hides every other part of the page (menu.css: html.gated body > :not(.gate)).
  await expect(page.locator("#app")).toBeHidden();
  await expect(page.locator("#dock")).toBeHidden();
  await expect(page.locator("#listSheet")).toBeHidden();
}

/** Number of visits at table Tn. */
export const visitCount = async (db, n) =>
  Number(await db.sql(`select count(*) from public.table_visits v join public.dining_tables t on t.id = v.table_id where t.label = 'T${n}'`));

export const orderCount = async (db) => Number(await db.sql("select count(*) from public.orders"));
