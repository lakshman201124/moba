// Helpers for phase-0/api.api.spec.js only (not a spec: Playwright doesn't run this file).
// Anything here that other areas need belongs in tests/support/ (see supportSuggestions in the run report).
import { createHash } from "node:crypto";
import { expect } from "../support/fixtures.js";

/** IDs from supabase/seed.sql that tests/support/data.js doesn't carry. */
export const SEED = {
  // Korean Fried Chicken Wings' "Flavour" group (pick exactly 1), and its Bulgogi option (price_delta 0).
  wingsFlavourGroup: "838ab013-14a6-4b31-81b2-31463292f896",
  wingsBulgogi: "8822b1e0-00d0-4b93-80b4-54026d0f8771",
};

/** Public key sets of get_public_menu (supabase/migrations/20261011000300_api_public.sql), sorted. */
export const MENU_KEYS = {
  top: ["categories", "dishes", "extras", "orderingOpen", "version"],
  category: ["art", "blurb", "extras", "groups", "id", "image", "ko", "name", "notes", "short"],
  dish: ["available", "badge", "category", "choose", "description", "diet", "group", "id", "image", "name", "note", "price", "sizes", "spice"],
  extra: ["available", "badge", "diet", "id", "name", "price"],
};

/** Column names that must never appear anywhere in the public menu. */
export const PRIVATE_KEYS = ["qr_token", "is_visible", "is_available", "sort_order", "created_at", "updated_at",
  "category_id", "device_hash", "session_id", "price_delta"];

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** One order line in the shape site/menu.js sends: { dish_id, qty, size_id?, option_ids?, addon_ids? }. */
export const line = (dish, qty = 1, extra = {}) => ({ dish_id: dish.id ?? dish, qty, ...extra });

/**
 * A public-API business error: HTTP 400, PostgREST shape { code: "P0001", message: <CODE>, details }.
 * Pass `details` to check it too (e.g. the server total for PRICE_CHANGED, a dish id for INVALID_ITEM).
 */
export function expectApiError(res, code, details) {
  const seen = `${res.status} ${JSON.stringify(res.body)}`;
  expect(res.status, `expected 400 ${code}, got ${seen}`).toBe(400);
  expect(res.body, `expected ${code}, got ${seen}`).toMatchObject({ code: "P0001", message: code });
  if (details !== undefined) expect(res.body.details, `details of ${code}`).toBe(details);
}

/** 200 and the reply body, with the error in the message when it isn't. */
export function expectOk(res) {
  expect(res.status, `expected 200, got ${res.status} ${JSON.stringify(res.body)}`).toBe(200);
  return res.body;
}

export const countOrders = async (db) => Number(await db.sql("select count(*) from public.orders"));

/** SQL condition selecting the table_visits row behind a visit returned by start_visit. */
export const visitRow = (v) => `token_hash = '${sha256(v.visit)}'`;

/** Simulate the 5-minute ordering window running out for one visit. */
export const expireWindow = (db, v) =>
  db.sql(`update public.table_visits set order_until = now() - interval '1 second' where ${visitRow(v)}`);

/** Staff switch for the whole kitchen (restaurant_settings.ordering_open). */
export const setOrdering = (db, open) =>
  db.sql(`update public.restaurant_settings set ordering_open = ${open ? "true" : "false"} where id = 1`);

/** Id of table `label`'s open session (created by its first order), or "" when none. */
export const openSessionId = (db, label) =>
  db.sql(`select s.id from public.table_sessions s join public.dining_tables t on t.id = s.table_id
           where t.label = '${label}' and s.status = 'open'`);

/** get_public_menu as a phone calls it; fails the test unless it answers 200. */
export async function fetchMenu(api) {
  return expectOk(await api.rpc("get_public_menu"));
}

/** Every object key anywhere inside `value` that is in `names`, as "path.key". */
export function findKeys(value, names, path = "$") {
  const hits = [];
  if (Array.isArray(value)) value.forEach((v, i) => hits.push(...findKeys(v, names, `${path}[${i}]`)));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (names.includes(k)) hits.push(`${path}.${k}`);
      hits.push(...findKeys(v, names, `${path}.${k}`));
    }
  }
  return hits;
}

/** Items of `list` whose sorted key set differs from `keys`, as "id: k1,k2,…" (empty when all match). */
export const wrongKeySets = (list, keys) =>
  list.filter((o) => Object.keys(o).sort().join() !== keys.join()).map((o) => `${o.id}: ${Object.keys(o).sort().join()}`);
