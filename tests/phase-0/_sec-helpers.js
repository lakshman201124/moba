// Helpers for the Phase 0 SEC area only (security.api.spec.js, security.spec.js).
// Kept here rather than in tests/support/ because other agents depend on support/ staying unchanged.
// Not a spec file: playwright.config.js only collects *.spec.js.
import { expect } from "../support/fixtures.js";
import { qrFor } from "../support/data.js";

/** The 16 tables in schema public (migrations 1 and 9). */
export const PUBLIC_TABLES = [
  "restaurant_settings", "staff", "categories", "category_groups", "dishes", "dish_sizes",
  "choice_groups", "choice_options", "dish_choice_groups", "addons", "category_addons",
  "dining_tables", "table_sessions", "orders", "order_items", "table_visits",
];

/** The 10 staff RPCs (migration 4, re-created in part by migration 9), called with typed nulls. */
export const STAFF_CALLS = (t1Id) => ({
  staff_dashboard: "public.staff_dashboard()",
  staff_tables_overview: "public.staff_tables_overview()",
  staff_set_order_status: "public.staff_set_order_status(null::uuid, null, null, null)",
  staff_free_table: "public.staff_free_table(null::uuid, null::int, null::boolean)",
  staff_reopen_session: "public.staff_reopen_session(null::uuid)",
  staff_rotate_table_token: `public.staff_rotate_table_token('${t1Id}')`,
  staff_reorder: "public.staff_reorder(null, null::uuid[])",
  staff_save_category: "public.staff_save_category('{}')",
  staff_save_dish: "public.staff_save_dish('{}')",
  staff_save_choice_group: "public.staff_save_choice_group('{}')",
});

/** The 5 RPCs anon may run. */
export const PUBLIC_RPCS = ["get_public_menu", "get_restaurant_info", "get_table_state", "place_order", "start_visit"];

/**
 * Run a db.* call and report what happened instead of throwing:
 * { ok: "<stdout>" } on success, { sqlstate, text } on a SqlError.
 */
export async function outcome(promise) {
  try {
    return { ok: await promise };
  } catch (e) {
    if (e && typeof e.sqlstate === "string") return { sqlstate: e.sqlstate, text: e.text };
    throw e;
  }
}

/** Map with at most `limit` calls in flight (each db call is one psql process). */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Row count of every public table, as one JSON object (run as postgres). */
export async function rowCounts(db) {
  const parts = PUBLIC_TABLES.map((t) => `'${t}', (select count(*) from public.${t})`).join(", ");
  return db.json(`select json_build_object(${parts})`);
}

/** Every object key anywhere inside a JSON value. */
export function allKeys(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      allKeys(v, out);
    }
  }
  return out;
}

/** Unicode format characters (bidi overrides, zero-width space/joiners, BOM...). */
export const FORMAT_CHARS = /\p{Cf}/u;

/** Stored-XSS payloads. Each sets window.__xss to a distinct number if it ever runs. */
export const XSS = {
  dishName: "<img src=x onerror=window.__xss=1>Brownie",
  optionLabel: "<img src=x onerror=window.__xss=2>",
  addonName: "<svg onload=window.__xss=3>Extra boba",
  note: `<img src=x onerror=window.__xss=4>"&'`,
  hours: "<img src=x onerror=window.__xss=5>",
  address: "<img src=x onerror=window.__xss=6>",
  instagram: "javascript:window.__xss=7//",
};

/**
 * Scan table n and open the menu on one category.
 * Stand-in for guest.scanAndOpen(n, category): its MenuPage.expectOpen() waits for a visible
 * "#rail .card", but the rail lives in the "Most loved" view, which is hidden when the menu opens on
 * a category hash, so scanAndOpen(n, category) always times out (see supportSuggestions).
 */
export async function scanAndOpenOn(g, n, category) {
  await g.home.goto(qrFor(n));
  await g.menu.goto(category);
  await expect(g.page.locator("html")).not.toHaveClass(/\bgated\b/);
  await expect(g.page.locator("#grid [data-open]").first()).toBeVisible();
}

/** SQL string literal (single quotes doubled). */
export const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

/**
 * Nothing an XSS payload would create is in the page: no <img src="x">, no <svg onload>, no
 * javascript: link, and window.__xss was never set. Checked on the main document.
 */
export async function expectNoInjectedMarkup(page) {
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator("svg[onload]")).toHaveCount(0);
  await expect(page.locator('a[href^="javascript:" i]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
}
