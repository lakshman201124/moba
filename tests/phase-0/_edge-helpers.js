// Area helpers for phase-0/edge.spec.js only.
//
// The EDGE cases need to see exactly what each RPC sent and got back (client_order_id reuse,
// PRICE_CHANGED details, how many place_order requests a triple tap makes), to hold a request in
// flight, and a few order-sheet selectors the shared page objects don't have yet. Candidates to
// move into support/ are listed in the Phase 0 run report.
import { expect } from "../support/fixtures.js";
import { qrFor } from "../support/data.js";

const RPC = /\/rest\/v1\/rpc\/([a-z_]+)/;
const json = (s) => { try { return s ? JSON.parse(s) : null; } catch { return s; } };

/**
 * Record every /rest/v1/rpc/* call a page makes: { fn, args, status, body, failed }.
 * Attach right after guest() so start_visit is caught too.
 * `status` stays null until the reply arrives; `failed` is the network error text when there is none.
 */
export function recordRpc(page) {
  const calls = [];
  const byReq = new Map();
  page.on("request", (req) => {
    const m = req.url().match(RPC);
    if (!m) return;
    const entry = { fn: m[1], args: json(req.postData()), status: null, body: undefined, failed: null };
    byReq.set(req, entry);
    calls.push(entry);
  });
  page.on("response", async (res) => {
    const entry = byReq.get(res.request());
    if (!entry) return;
    entry.body = json(await res.text().catch(() => null));
    entry.status = res.status();
  });
  page.on("requestfailed", (req) => {
    const entry = byReq.get(req);
    if (entry) entry.failed = req.failure()?.errorText ?? "failed";
  });
  return {
    calls,
    of: (fn) => calls.filter((c) => c.fn === fn),
    count: (fn) => calls.filter((c) => c.fn === fn).length,
  };
}

/**
 * Hold every request matching `pattern` until release() is called, then let it through unchanged.
 * Used to look at the screen while a request is in flight. Returns { count(), release() }.
 */
export async function holdRequests(page, pattern) {
  let release;
  const gate = new Promise((r) => { release = r; });
  let seen = 0;
  await page.route(pattern, async (route) => {
    seen++;
    await gate;
    await route.continue();
  });
  return { count: () => seen, release: () => release() };
}

/** The phone's own visit token and device id, as the app stored them. */
export async function phoneIds(page) {
  return page.evaluate(() => ({
    visit: JSON.parse(localStorage.getItem("moba:visit:v1") || "null")?.visit ?? null,
    device: localStorage.getItem("moba:device"),
  }));
}

export const readStorage = (page, key) => page.evaluate((k) => {
  const v = localStorage.getItem(k);
  return v === null ? null : JSON.parse(v);
}, key);

/**
 * Close the order sheet and wait for its history entry to be popped. menu.js closes a layer with
 * history.back(), which runs asynchronously; changing location.hash before it lands would be
 * undone by that traversal.
 */
export async function closeSheet(g) {
  await g.sheet.close();
  await expect.poll(() => g.page.evaluate(() => history.state?.mobaLayer ?? null)).toBeNull();
}

/** Order-sheet selectors the shared OrderSheet doesn't have. */
export class SheetBits {
  constructor(page) {
    this.page = page;
    // Editable cart lines only (not the lines inside "Your orders").
    this.cartLines = page.locator("#listBody > ul.lines > li.line");
    this.emptyTitle = page.locator("#listBody .empty .empty__title");
    this.doneTotal = page.locator("#listBody .done__total strong");
    this.orderAgain = page.getByRole("button", { name: "Order something else" });
    this.placedTitle = page.locator("#listBody .placed__title");
    this.placedOrders = page.locator("#listBody .placed__order");
    this.toastMsg = page.locator("#toast > span");
    this.toastBtn = page.locator("#toast button");
  }
  line(name) { return this.cartLines.filter({ has: this.page.locator(".line__name", { hasText: name }) }); }
  blockedMsg(name) { return this.line(name).locator(".line__blocked-msg"); }
  lineOpts(name) { return this.line(name).locator(".line__opt"); }
  removeBtn(name) { return this.page.getByRole("button", { name: `Remove ${name}`, exact: true }); }
  editBtn(name) { return this.line(name).getByRole("button", { name: `Edit ${name}` }); }
}

/**
 * scanAndOpen(n, category) for a deep link straight to a category. The shared fixture's
 * MenuPage.expectOpen() waits for a "Most loved" rail card, which is hidden (#topView[hidden])
 * when the menu opens on a category, so it always times out there. This checks the open grid instead.
 */
export async function scanAndOpenOn(g, n, category) {
  await g.home.goto(qrFor(n));
  await g.menu.goto(category);
  await expect(g.page.locator("html")).not.toHaveClass(/\bgated\b/);
  await expect(g.page.locator("#grid [data-open]").first()).toBeVisible();
  await expect(g.page.locator("#catTitle")).not.toBeEmpty();
}

/**
 * A choice chip in the dish builder, by its visible label. The <input> sits under its own <span>
 * (menu.css .chip input is absolutely positioned, the span paints over it), so MenuPage.option(id).check()
 * fails with "<span> intercepts pointer events". A guest taps the chip, so tests tap the chip too.
 */
export const chip = (g, label) => g.menu.detail.locator("label.chip", { has: g.page.locator("span", { hasText: label }) });

/** The dish card for one dish in the current category grid. */
export const dishCard = (page, dish) => page.locator(`#grid article.dish[data-id="${dish.id}"]`);
