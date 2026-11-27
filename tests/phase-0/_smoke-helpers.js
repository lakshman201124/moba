// Helpers for the live, read-only smoke checks (phase-0/smoke.live.spec.js).
//
// Live is production. Everything here is built so a smoke test can only READ:
//   - supabaseConfig() takes the public URL and PUBLISHABLE key from site/config.js and refuses
//     anything that looks like a secret or service-role key. expectDeployedConfig() checks the
//     deployed site ships the same project, so the API checks probe the project live really uses.
//   - guardLive() aborts, in the browser, every Supabase-style request that is not a plain read:
//     only GET/HEAD/OPTIONS and POSTs to the read-only RPCs (get_public_menu, get_restaurant_info,
//     get_table_state) go through. Everything else (start_visit, place_order, staff_*, auth, storage
//     uploads, table writes, any new RPC) is aborted and recorded so the test fails loudly instead
//     of writing. It matches by PATH on any host, so a custom Supabase domain is guarded too.
//   - supabase() sends only the requests a spec passes it; specs pass only GETs, denied calls and
//     RPC inputs that fail their first validation check.
import fs from "node:fs";
import path from "node:path";
import { expect } from "../support/fixtures.js";
import { SITE_DIR } from "../support/env.js";

const CONFIG_RE = { url: /supabaseUrl:\s*"([^"]+)"/, key: /supabaseKey:\s*"([^"]+)"/ };

/** { url, key } from config.js source text. Refuses anything but an https *.supabase.co URL and a publishable key. */
export function parseConfig(src, where = "site/config.js") {
  const url = src.match(CONFIG_RE.url)?.[1];
  const key = src.match(CONFIG_RE.key)?.[1];
  if (!url || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new Error(`${where}: unexpected supabaseUrl ${url}`);
  // Only the publishable key may be used here. A secret key would bypass every grant being tested.
  if (!key || !key.startsWith("sb_publishable_")) throw new Error(`${where}: supabaseKey is not a publishable key; refusing to use it`);
  return { url, key };
}

/** { url, key } from site/config.js (the same values the live site ships). */
export function supabaseConfig() {
  return parseConfig(fs.readFileSync(path.join(SITE_DIR, "config.js"), "utf8"));
}

/**
 * The deployed site's config.js must name the same Supabase project as the repo's, or every API
 * check below would be probing a project live does not use. One static GET, read-only.
 */
export async function expectDeployedConfig(request, cfg) {
  const res = await request.get("/config.js", { maxRedirects: 0 });
  expect(res.status(), "deployed /config.js status").toBe(200);
  const deployed = parseConfig(await res.text(), "deployed /config.js");
  expect(deployed, "deployed /config.js must use the same Supabase project and key as site/config.js").toEqual(cfg);
}

/** Headers the site itself sends (site/api.js): apikey, plus Authorization only for a legacy JWT key. */
export function anonHeaders(key) {
  const h = { apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}

/**
 * Call the live Supabase project with the publishable key, through Playwright's `request` fixture.
 * Returns { status, body, text, headers }. body is parsed JSON when possible.
 */
export async function supabase(request, { url, key }, method, pathAndQuery, data) {
  const res = await request.fetch(`${url}${pathAndQuery}`, {
    method,
    headers: { ...anonHeaders(key), ...(data !== undefined ? { "Content-Type": "application/json" } : {}) },
    data: data !== undefined ? JSON.stringify(data) : undefined,
    maxRedirects: 0,
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status(), body, text, headers: res.headers() };
}

// Any request to a Supabase API path, on any host (a custom domain must not slip past the guard).
const SUPABASE_PATH = /^\/(rest|auth|storage|functions|realtime|graphql)\/v1(\/|$)/;
const isSupabase = (u) => u.hostname.endsWith(".supabase.co") || SUPABASE_PATH.test(u.pathname);
// The only POSTs a diner page may send that cannot change data.
const READ_RPC = /^\/rest\/v1\/rpc\/(get_public_menu|get_restaurant_info|get_table_state)$/;
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/** True when a browser request to live could create or change something. */
export function isLiveWrite(method, url) {
  const u = new URL(url);
  if (!isSupabase(u)) return false;
  if (/^\/auth\/v1\//.test(u.pathname)) return !SAFE_METHODS.includes(method) || /\/(signup|token|otp|magiclink|recover|invite|verify)\b/.test(u.pathname);
  if (SAFE_METHODS.includes(method)) return false;
  return !(method === "POST" && READ_RPC.test(u.pathname));
}

/**
 * Watch a live page: console errors, uncaught page errors, every request (and its status) to a
 * Supabase API, and block (abort) anything that could write. Call before page.goto().
 * seen.supabase:  "METHOD /path" for every Supabase request, whatever happened to it
 * seen.responses: "STATUS METHOD /path" for every Supabase response
 * seen.blocked:   "METHOD /path" for every request the guard aborted
 */
export async function guardLive(page) {
  const seen = { consoleErrors: [], pageErrors: [], supabase: [], responses: [], blocked: [] };
  const label = (r) => `${r.method()} ${new URL(r.url()).pathname}`;
  page.on("console", (m) => {
    if (m.type() === "error") seen.consoleErrors.push(`${m.text()} @ ${m.location()?.url ?? ""}`);
  });
  page.on("pageerror", (e) => seen.pageErrors.push(e.message));
  page.on("request", (r) => { if (isSupabase(new URL(r.url()))) seen.supabase.push(label(r)); });
  page.on("response", (r) => {
    if (isSupabase(new URL(r.url()))) seen.responses.push(`${r.status()} ${label(r.request())}`);
  });
  page.on("websocket", (ws) => { if (isSupabase(new URL(ws.url()))) seen.supabase.push(`WS ${new URL(ws.url()).pathname}`); });
  await page.context().route((u) => isSupabase(u), (route) => {
    const r = route.request();
    if (isLiveWrite(r.method(), r.url())) {
      seen.blocked.push(label(r));
      return route.abort("blockedbyclient");
    }
    return route.fallback();
  });
  return seen;
}

/** max-age in seconds from a Strict-Transport-Security value, or -1. */
export function hstsMaxAge(value) {
  const m = /max-age\s*=\s*"?(\d+)"?/i.exec(value ?? "");
  return m ? Number(m[1]) : -1;
}

/**
 * A CSP header as { directive: [tokens] }. Directive names are lower-cased; for a repeated
 * directive the FIRST one wins, as in browsers.
 */
export function parseCsp(value) {
  const out = {};
  for (const part of (value ?? "").split(";")) {
    const [name, ...tokens] = part.trim().split(/\s+/).filter(Boolean);
    if (name && !(name.toLowerCase() in out)) out[name.toLowerCase()] = tokens;
  }
  return out;
}

/** The first bytes of a response body, as a hex string ("89504e47…"). */
export const magic = (buf, n = 8) => Buffer.from(buf).subarray(0, n).toString("hex");
export const PNG_MAGIC = "89504e470d0a1a0a";
export const ICO_MAGIC = "00000100";

/** A random lowercase v4 UUID (the device-id format the RPCs accept). */
export const uuid = () => crypto.randomUUID();
