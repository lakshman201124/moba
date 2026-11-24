// The demo database: MOBA's real menu (menu.json, built from supabase/seed.sql) plus synthetic
// tables, visits and orders. Kept in memory and saved to this browser so edits survive a reload.
// Orders are regenerated each new day (IST) so "today" always has a service in progress.
import menu from "./menu.json";

const KEY = "moba:admin:demo:db";
const VERSION = 7;
const IST = 330 * 60000;
const DAY = 86400000;
const HOUR = 3600000;
const MIN = 60000;

// Same business day as the dashboard: 4 AM to 4 AM IST.
export const istDayStart = (t = Date.now()) => Math.floor((t + IST - 4 * HOUR) / DAY) * DAY - IST + 4 * HOUR;
const dayKey = (t) => new Date(istDayStart(t) + IST).toISOString().slice(0, 10);
const iso = (t) => new Date(t).toISOString();
const uid = () => crypto.randomUUID();
const token = () => uid().replace(/-/g, "");

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function weighted(r, list) {
  const total = list.reduce((a, x) => a + x.w, 0);
  let n = r() * total;
  for (const x of list) if ((n -= x.w) <= 0) return x;
  return list[list.length - 1];
}

// ── menu + tables (kept across days) ───────────────────────────────
const TABLES = [
  ["T1", 2], ["T2", 4], ["T3", 4], ["T4", 2], ["T5", 4], ["T6", 6],
  ["T7", 2], ["T8", 4], ["T9", 4], ["T10", 4], ["T11", 2], ["T12", 6],
];

function freshBase(now) {
  const stamp = iso(now - 40 * DAY);
  return {
    version: VERSION,
    day: null,
    settings: {
      id: 1, restaurant_name: "MOBA", ordering_open: true, session_idle_hours: 6, menu_version: 1,
      instagram_url: "https://instagram.com/moba.cafe", google_review_url: "https://g.page/r/moba/review",
      facebook_url: null, youtube_url: null, whatsapp_number: "+91 98765 43210",
      zomato_url: "https://zomato.com/restaurant/moba", swiggy_url: null,
      address: "123 Anna Nagar, Chennai 600040", map_url: "https://maps.app.goo.gl/moba",
      hours_text: "Mon–Sun: 11 AM – 11 PM", tagline: "같이 밥 먹어요 · Gather for food",
      contact_phone: "+91 44 2345 6789", contact_email: "hello@moba.cafe", wifi_password: "moba2026",
    },
    staff: { user_id: "demo-staff", display_name: "Ji-woo Kim", role: "owner", is_active: true, email: "owner@moba.cafe" },
    categories: menu.categories.map((c) => ({ ...c, created_at: stamp, updated_at: stamp })),
    category_groups: menu.category_groups,
    dishes: menu.dishes.map((d) => ({ ...d, created_at: stamp, updated_at: stamp })),
    dish_sizes: menu.dish_sizes,
    choice_groups: menu.choice_groups.map((g) => ({ ...g, created_at: stamp, updated_at: stamp })),
    choice_options: menu.choice_options.map((o) => ({ is_available: true, ...o })),
    dish_choice_groups: menu.dish_choice_groups,
    addons: menu.addons.map((a) => ({ is_available: true, ...a, created_at: stamp, updated_at: stamp })),
    category_addons: menu.category_addons,
    tables: TABLES.map(([label, seats], i) => ({
      id: uid(), label, seats, qr_token: token(), is_active: label !== "T12", sort_order: i,
      token_rotated_at: null, created_at: stamp, updated_at: stamp,
    })),
    sessions: [],
    orders: [],
    nextOrderNo: 1001,
  };
}

// ── synthetic orders ───────────────────────────────────────────────
const POPULARITY = {
  signatures: 7, rameyon: 6, street: 6, boba: 6, gimbap: 4, starters: 4,
  crispy: 4, mandu: 3, ricenoodle: 3, toast: 2, salads: 1.2, desserts: 2,
};
const HOUR_WEIGHT = { 11: 2, 12: 5, 13: 9, 14: 8, 15: 4, 16: 3, 17: 4, 18: 6, 19: 9, 20: 11, 21: 10, 22: 6 };
const NOTES = [
  "Less spicy please", "No onion", "Extra sauce on the side", "Make it mild, it's for a kid",
  "Less ice", "Pack the fries to take away", "No spring onion", "Sauce on the side",
];
const NONVEG_RE = /chicken|fish|meat|prawn|bulgogi/i;

function menuIndex(db) {
  const slug = Object.fromEntries(db.categories.map((c) => [c.id, c.slug]));
  const rank = {};
  const pool = { food: [], drink: [], dessert: [] };
  for (const d of [...db.dishes].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!d.is_visible || !d.is_available) continue;
    const s = slug[d.category_id];
    rank[s] = (rank[s] ?? -1) + 1;
    // Dishes we have a real photo for lead the service, so the dashboard's Top dishes and the live
    // tickets show plates rather than "No photo yet" tiles. The orders are synthetic, so this only
    // shapes which real dishes sell well — it states nothing untrue.
    const w = ((POPULARITY[s] || 1) / (1 + 0.35 * rank[s])) * (d.image_path ? 4 : 1);
    (s === "boba" ? pool.drink : s === "desserts" ? pool.dessert : pool.food).push({ d, w });
  }
  return { pool, slug };
}

function makeItem(db, r, dish, sort) {
  const sizes = db.dish_sizes.filter((s) => s.dish_id === dish.id).sort((a, b) => a.sort_order - b.sort_order);
  const size = sizes.length ? sizes[r() < 0.6 ? 0 : sizes.length - 1] : null;
  let unit = size ? size.price : dish.price;
  const choices = [];
  const links = db.dish_choice_groups.filter((x) => x.dish_id === dish.id).sort((a, b) => a.sort_order - b.sort_order);
  for (const link of links) {
    const g = db.choice_groups.find((x) => x.id === link.group_id);
    if (!g || g.min_select < 1) continue;
    const opts = db.choice_options.filter((o) => o.group_id === g.id && o.is_available);
    if (!opts.length) continue;
    const o = opts[Math.floor(r() * opts.length)];
    unit += o.price_delta || 0;
    choices.push({ label: g.label, options: [o.label] });
  }
  const addons = [];
  if (r() < 0.16) {
    const ids = db.category_addons.filter((x) => x.category_id === dish.category_id).map((x) => x.addon_id);
    const a = db.addons.find((x) => x.id === ids[Math.floor(r() * ids.length)]);
    if (a) {
      addons.push({ name: a.name, price: a.price });
      unit += a.price;
    }
  }
  const qty = r() < 0.78 ? 1 : 2;
  const diet = dish.diet === "both"
    ? (choices.some((c) => c.options.some((o) => NONVEG_RE.test(o))) ? "nonveg" : "veg")
    : dish.diet;
  return {
    id: uid(), dish_id: dish.id, dish_name: dish.name, size_label: size?.label || null,
    choices, addons, note: r() < 0.07 ? NOTES[Math.floor(r() * NOTES.length)] : null,
    diet, qty, unit_price: unit, line_total: unit * qty, sort_order: sort,
  };
}

function makeOrder(db, r, idx, { at, table, session, guest, status }) {
  const items = [];
  const used = new Set();
  const add = (list) => {
    for (let k = 0; k < 4; k++) {
      const { d } = weighted(r, list);
      if (used.has(d.id)) continue;
      used.add(d.id);
      items.push(makeItem(db, r, d, items.length));
      return;
    }
  };
  const nFood = r() < 0.55 ? 1 : r() < 0.82 ? 2 : 3;
  for (let k = 0; k < nFood; k++) add(idx.pool.food);
  if (idx.pool.drink.length && r() < 0.48) add(idx.pool.drink);
  if (idx.pool.dessert.length && r() < 0.12) add(idx.pool.dessert);
  if (!items.length) add(idx.pool.food.length ? idx.pool.food : idx.pool.drink);
  const total = items.reduce((a, x) => a + x.line_total, 0);
  const accepted = status === "placed" ? null : at + (1 + r() * 3) * MIN;
  return {
    id: uid(), order_no: db.nextOrderNo++, session_id: session.id, table_id: table.id,
    device_hash: token().slice(0, 16), client_order_id: uid(), guest_no: guest, status,
    item_count: items.reduce((a, x) => a + x.qty, 0), total,
    cancel_reason: status === "cancelled" ? (r() < 0.5 ? "Guest changed their mind" : null) : null,
    created_at: iso(at),
    accepted_at: accepted && status !== "cancelled" ? iso(accepted) : null,
    served_at: status === "served" ? iso(at + (12 + r() * 14) * MIN) : null,
    cancelled_at: status === "cancelled" ? iso(at + (2 + r() * 6) * MIN) : null,
    order_items: items,
  };
}

function hourPick(r, fromHour, toHour) {
  const list = Object.entries(HOUR_WEIGHT)
    .map(([h, w]) => ({ h: Number(h), w }))
    .filter((x) => x.h >= fromHour && x.h < toHour);
  return list.length ? weighted(r, list).h : null;
}

function generateService(db, now) {
  const r = rng(hash(`moba-${dayKey(now)}`));
  const idx = menuIndex(db);
  const active = db.tables.filter((t) => t.is_active).sort((a, b) => a.sort_order - b.sort_order);
  db.sessions = [];
  db.orders = [];
  db.nextOrderNo = 1001;
  if (!active.length || !idx.pool.food.length) return;

  const today = istDayStart(now);
  const historyEnd = now - 80 * MIN;
  const lastSession = {};

  const place = (at, status) => {
    const table = active[Math.floor(r() * active.length)];
    let s = lastSession[table.id];
    if (!s || at - new Date(s.last_order_at).getTime() > 50 * MIN) {
      s = { id: uid(), table_id: table.id, status: "closed", opened_at: iso(at - 2 * MIN), last_order_at: iso(at), closed_at: null, closed_by: null, close_reason: "freed", guests: 0 };
      db.sessions.push(s);
      lastSession[table.id] = s;
    }
    s.last_order_at = iso(at);
    s.guests = Math.min(4, s.guests + (r() < 0.6 ? 1 : 0)) || 1;
    db.orders.push(makeOrder(db, r, idx, { at, table, session: s, guest: 1 + Math.floor(r() * s.guests), status }));
  };

  for (let d = 61; d >= 0; d--) {
    const start = today - d * DAY;
    const midnight = start - 4 * HOUR;
    const dow = new Date(midnight + IST).getUTCDay();
    const base = (dow === 5 || dow === 6 || dow === 0 ? 66 : 46) * (0.85 + r() * 0.3);
    const end = d === 0 ? historyEnd : start + DAY;
    const endHour = Math.min(24, Math.floor((end - midnight) / HOUR));
    const share = d === 0
      ? Object.entries(HOUR_WEIGHT).reduce((a, [h, w]) => a + (Number(h) < endHour ? w : 0), 0) /
        Object.values(HOUR_WEIGHT).reduce((a, w) => a + w, 0)
      : 1;
    const n = Math.round(base * share);
    const times = [];
    for (let k = 0; k < n; k++) {
      const h = hourPick(r, 11, endHour);
      if (h == null) break;
      const at = midnight + h * HOUR + Math.floor(r() * 60) * MIN + Math.floor(r() * 60) * 1000;
      if (at < end) times.push(at);
    }
    times.sort((a, b) => a - b);
    for (const at of times) place(at, r() < 0.045 ? "cancelled" : "served");
  }
  for (const s of db.sessions) {
    s.closed_at = iso(new Date(s.last_order_at).getTime() + (22 + r() * 35) * MIN);
  }

  // The service in progress right now.
  const LIVE = [
    [1, 70, [[68, "served"], [34, "served"]]],
    [2, 52, [[50, "served"], [14, "preparing"]]],
    [4, 38, [[36, "preparing"], [4, "placed"]]],
    [5, 46, [[44, "served"], [21, "preparing"]]],
    [7, 27, [[25, "preparing"]]],
    [9, 12, [[2, "placed"]]],
    [10, 19, [[17, "preparing"], [6, "placed"]]],
  ];
  for (const [i, ago, orders] of LIVE) {
    const table = active[i];
    if (!table) continue;
    const opened = now - ago * MIN;
    const s = { id: uid(), table_id: table.id, status: "open", opened_at: iso(opened), last_order_at: null, closed_at: null, closed_by: null, close_reason: null };
    db.sessions.push(s);
    orders.forEach(([oAgo, status], k) => {
      const at = now - oAgo * MIN;
      s.last_order_at = iso(at);
      db.orders.push(makeOrder(db, r, idx, { at, table, session: s, guest: k + 1, status }));
    });
  }
  db.orders.sort((a, b) => a.created_at.localeCompare(b.created_at));
  db.orders.forEach((o, k) => (o.order_no = 1001 + k));
  db.nextOrderNo = 1001 + db.orders.length;
  for (const s of db.sessions) delete s.guests;
  db.day = dayKey(now);
}

// ── persistence + change events ────────────────────────────────────
let db = null;
const listeners = new Set();

function load() {
  const now = Date.now();
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {}
  const next = saved?.version === VERSION ? saved : freshBase(now);
  if (next.day !== dayKey(now)) {
    generateService(next, now);
    db = next;
    persist();
  }
  return next;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked: the demo keeps working from memory for this visit.
  }
}

export function getDb() {
  if (!db) db = load();
  return db;
}

export function commit(event = { type: "change" }) {
  persist();
  for (const fn of listeners) fn(event);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  db = freshBase(Date.now());
  generateService(db, Date.now());
  commit({ type: "reset" });
}

// ── new orders arriving while the demo is open ─────────────────────
let simTimer = null;

export function simulateOrder() {
  const d = getDb();
  if (!d.settings.ordering_open) return null;
  const waiting = d.orders.filter((o) => o.status === "placed" && d.sessions.find((s) => s.id === o.session_id)?.status === "open");
  if (waiting.length >= 5) return null;
  const r = rng(Date.now() & 0xffffffff);
  const active = d.tables.filter((t) => t.is_active);
  const open = d.sessions.filter((s) => s.status === "open");
  const busy = new Set(open.map((s) => s.table_id));
  const free = active.filter((t) => !busy.has(t.id));
  let session;
  let table;
  if (free.length && (r() < 0.45 || !open.length)) {
    table = free[Math.floor(r() * free.length)];
    session = { id: uid(), table_id: table.id, status: "open", opened_at: iso(Date.now()), last_order_at: null, closed_at: null, closed_by: null, close_reason: null };
    d.sessions.push(session);
  } else if (open.length) {
    session = open[Math.floor(r() * open.length)];
    table = d.tables.find((t) => t.id === session.table_id);
  }
  if (!session || !table) return null;
  const guests = new Set(d.orders.filter((o) => o.session_id === session.id).map((o) => o.guest_no));
  const order = makeOrder(d, r, menuIndex(d), {
    at: Date.now(), table, session, guest: r() < 0.6 && guests.size ? [...guests][0] : guests.size + 1, status: "placed",
  });
  session.last_order_at = order.created_at;
  d.orders.push(order);
  commit({ type: "order-insert", order: { ...order, table_label: table.label } });
  return order;
}

export function startSimulator() {
  if (simTimer) return () => {};
  const tick = () => {
    simTimer = setTimeout(() => {
      if (document.visibilityState === "visible") simulateOrder();
      tick();
    }, 75000 + Math.random() * 45000);
  };
  tick();
  return () => {
    clearTimeout(simTimer);
    simTimer = null;
  };
}
