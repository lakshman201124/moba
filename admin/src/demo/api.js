// Demo implementations of every service call, with the same names, arguments and return shapes
// as the Supabase versions, so pages can't tell the difference.
import { getDb, commit } from "./store";

const MIN = 60000;
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const copy = (v) => (v === undefined ? v : structuredClone(v));
const reply = (v) => new Promise((res) => setTimeout(() => res(copy(v)), 80 + Math.random() * 90));
const fail = (code) => Promise.reject(Object.assign(new Error(code), { code }));
const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const labelOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const blank = (s) => (s == null || String(s).trim() === "" ? null : String(s).trim());

function done(value, event) {
  commit(event);
  return reply(value);
}

// ── categories ─────────────────────────────────────────────────────
export const categories = {
  getCategories() {
    const db = getDb();
    return reply(
      [...db.categories].sort(bySort).map((c) => ({
        ...c,
        dish_count: db.dishes.filter((d) => d.category_id === c.id).length,
      })),
    );
  },
  setCategoryVisible(id, visible) {
    const c = getDb().categories.find((x) => x.id === id);
    if (!c) return fail("NOT_FOUND");
    c.is_visible = visible;
    return done(undefined);
  },
  getCategory(id) {
    const db = getDb();
    const c = db.categories.find((x) => x.id === id);
    if (!c) return fail("PGRST116");
    return reply({
      ...c,
      category_groups: db.category_groups.filter((g) => g.category_id === id).sort(bySort),
      category_addons: db.category_addons.filter((x) => x.category_id === id).sort(bySort).map((x) => ({ addon_id: x.addon_id })),
    });
  },
  saveCategory(p) {
    const db = getDb();
    if (db.categories.some((c) => c.slug === p.slug && c.id !== p.id)) return fail("23505");
    let c = p.id ? db.categories.find((x) => x.id === p.id) : null;
    if (p.id && !c) return fail("NOT_FOUND");
    if (!c) {
      c = { id: uid(), created_at: now(), sort_order: Math.max(-1, ...db.categories.map((x) => x.sort_order)) + 1 };
      db.categories.push(c);
    }
    Object.assign(c, {
      slug: p.slug, name: p.name.trim(), short_name: blank(p.short_name), name_ko: blank(p.name_ko),
      blurb: blank(p.blurb), art: p.art || "pot", image_path: p.image_path || null, notes: p.notes || [],
      is_visible: p.is_visible ?? true, updated_at: now(),
    });
    const keep = new Set((p.groups || []).filter((g) => g.id).map((g) => g.id));
    db.category_groups = db.category_groups.filter((g) => g.category_id !== c.id || keep.has(g.id));
    for (const d of db.dishes) if (d.category_id === c.id && d.group_id && !keep.has(d.group_id)) d.group_id = null;
    (p.groups || []).forEach((g, n) => {
      const row = g.id ? db.category_groups.find((x) => x.id === g.id) : null;
      const fields = { slug: g.slug, name: g.name.trim(), name_ko: blank(g.name_ko), lede: blank(g.lede), sort_order: n + 1 };
      if (row) Object.assign(row, fields);
      else db.category_groups.push({ id: uid(), category_id: c.id, ...fields });
    });
    if (p.addon_ids) {
      db.category_addons = db.category_addons.filter((x) => x.category_id !== c.id);
      p.addon_ids.forEach((a, n) => db.category_addons.push({ category_id: c.id, addon_id: a, sort_order: n + 1 }));
    }
    return done(c.id);
  },
  deleteCategory(id) {
    const db = getDb();
    if (db.dishes.some((d) => d.category_id === id)) return fail("23503");
    db.categories = db.categories.filter((c) => c.id !== id);
    db.category_groups = db.category_groups.filter((g) => g.category_id !== id);
    db.category_addons = db.category_addons.filter((x) => x.category_id !== id);
    return done(undefined);
  },
  reorderCategories(ids) {
    const db = getDb();
    ids.forEach((id, n) => {
      const c = db.categories.find((x) => x.id === id);
      if (c) c.sort_order = n + 1;
    });
    return done(undefined);
  },
};

// ── dishes ─────────────────────────────────────────────────────────
function dishRow(db, d) {
  return {
    ...d,
    dish_sizes: db.dish_sizes.filter((s) => s.dish_id === d.id).sort(bySort),
    dish_choice_groups: db.dish_choice_groups.filter((x) => x.dish_id === d.id).sort(bySort).map((x) => ({ group_id: x.group_id, sort_order: x.sort_order })),
  };
}

export const dishes = {
  getDishesByCategory(categoryId) {
    const db = getDb();
    return reply(db.dishes.filter((d) => d.category_id === categoryId).sort(bySort).map((d) => dishRow(db, d)));
  },
  getAllDishes() {
    const db = getDb();
    return reply(db.dishes.map((d) => ({ id: d.id, name: d.name, image_path: d.image_path, category_id: d.category_id })));
  },
  getDish(id) {
    const db = getDb();
    const d = db.dishes.find((x) => x.id === id);
    return d ? reply(dishRow(db, d)) : fail("PGRST116");
  },
  saveDish(p) {
    const db = getDb();
    let d = p.id ? db.dishes.find((x) => x.id === p.id) : null;
    if (p.id && !d) return fail("NOT_FOUND");
    if (!d) {
      const inCat = db.dishes.filter((x) => x.category_id === p.category_id);
      d = { id: uid(), created_at: now(), sort_order: Math.max(-1, ...inCat.map((x) => x.sort_order)) + 1 };
      db.dishes.push(d);
    }
    Object.assign(d, {
      category_id: p.category_id, group_id: p.group_id || null, name: p.name.trim(),
      description: blank(p.description), note: blank(p.note), price: Number(p.price) || 0,
      diet: p.diet || null, spice: Number(p.spice) || 0, badge: blank(p.badge), image_path: p.image_path || null,
      is_available: p.is_available ?? true, is_visible: p.is_visible ?? true, updated_at: now(),
    });
    const keep = new Set((p.sizes || []).filter((s) => s.id).map((s) => s.id));
    db.dish_sizes = db.dish_sizes.filter((s) => s.dish_id !== d.id || keep.has(s.id));
    (p.sizes || []).forEach((s, n) => {
      const row = s.id ? db.dish_sizes.find((x) => x.id === s.id) : null;
      const fields = { label: s.label.trim(), price: Number(s.price), sort_order: n + 1 };
      if (row) Object.assign(row, fields);
      else db.dish_sizes.push({ id: uid(), dish_id: d.id, ...fields });
    });
    const sizes = db.dish_sizes.filter((s) => s.dish_id === d.id);
    if (sizes.length) d.price = Math.min(...sizes.map((s) => s.price));
    db.dish_choice_groups = db.dish_choice_groups.filter((x) => x.dish_id !== d.id);
    (p.choice_group_ids || []).forEach((g, n) => db.dish_choice_groups.push({ dish_id: d.id, group_id: g, sort_order: n + 1 }));
    return done(d.id);
  },
  deleteDish(id) {
    const db = getDb();
    db.dishes = db.dishes.filter((d) => d.id !== id);
    db.dish_sizes = db.dish_sizes.filter((s) => s.dish_id !== id);
    db.dish_choice_groups = db.dish_choice_groups.filter((x) => x.dish_id !== id);
    for (const o of db.orders) for (const i of o.order_items) if (i.dish_id === id) i.dish_id = null;
    return done(undefined);
  },
  setDishAvailable(id, available) {
    const d = getDb().dishes.find((x) => x.id === id);
    if (!d) return fail("NOT_FOUND");
    d.is_available = available;
    return done(undefined);
  },
  setDishVisible(id, visible) {
    const d = getDb().dishes.find((x) => x.id === id);
    if (!d) return fail("NOT_FOUND");
    d.is_visible = visible;
    return done(undefined);
  },
  reorderDishes(ids) {
    const db = getDb();
    ids.forEach((id, n) => {
      const d = db.dishes.find((x) => x.id === id);
      if (d) d.sort_order = n + 1;
    });
    return done(undefined);
  },
};

// ── add-ons ────────────────────────────────────────────────────────
function addonRow(db, a) {
  return { ...a, category_addons: db.category_addons.filter((x) => x.addon_id === a.id).map((x) => ({ category_id: x.category_id })) };
}

export const addons = {
  getAddons() {
    const db = getDb();
    return reply([...db.addons].sort(bySort).map((a) => addonRow(db, a)));
  },
  getAddon(id) {
    const db = getDb();
    const a = db.addons.find((x) => x.id === id);
    return a ? reply(addonRow(db, a)) : fail("PGRST116");
  },
  createAddon({ category_ids, ...f }) {
    const db = getDb();
    if (db.addons.some((a) => a.name.toLowerCase() === f.name.trim().toLowerCase())) return fail("23505");
    const a = {
      id: uid(), name: f.name.trim(), price: Number(f.price) || 0, diet: f.diet || null, badge: blank(f.badge),
      is_available: f.is_available ?? true, sort_order: Math.max(-1, ...db.addons.map((x) => x.sort_order)) + 1,
      created_at: now(), updated_at: now(),
    };
    db.addons.push(a);
    (category_ids || []).forEach((cid) => {
      const n = db.category_addons.filter((x) => x.category_id === cid).length;
      db.category_addons.push({ category_id: cid, addon_id: a.id, sort_order: n + 1 });
    });
    return done(a);
  },
  updateAddon(id, { category_ids, ...f }) {
    const db = getDb();
    const a = db.addons.find((x) => x.id === id);
    if (!a) return fail("NOT_FOUND");
    if (f.name && db.addons.some((x) => x.id !== id && x.name.toLowerCase() === f.name.trim().toLowerCase())) return fail("23505");
    Object.assign(a, f, f.name ? { name: f.name.trim() } : {}, { badge: f.badge === undefined ? a.badge : blank(f.badge), updated_at: now() });
    if (category_ids !== undefined) {
      const before = new Set(db.category_addons.filter((x) => x.addon_id === id).map((x) => x.category_id));
      db.category_addons = db.category_addons.filter((x) => x.addon_id !== id || category_ids.includes(x.category_id));
      for (const cid of category_ids) {
        if (before.has(cid)) continue;
        const n = db.category_addons.filter((x) => x.category_id === cid).length;
        db.category_addons.push({ category_id: cid, addon_id: id, sort_order: n + 1 });
      }
    }
    return done(undefined);
  },
  deleteAddon(id) {
    const db = getDb();
    db.addons = db.addons.filter((a) => a.id !== id);
    db.category_addons = db.category_addons.filter((x) => x.addon_id !== id);
    return done(undefined);
  },
  setAddonAvailable(id, available) {
    const a = getDb().addons.find((x) => x.id === id);
    if (!a) return fail("NOT_FOUND");
    a.is_available = available;
    return done(undefined);
  },
  linkAddon(categoryId, addonId) {
    const db = getDb();
    if (!db.category_addons.some((x) => x.category_id === categoryId && x.addon_id === addonId)) {
      const n = db.category_addons.filter((x) => x.category_id === categoryId).length;
      db.category_addons.push({ category_id: categoryId, addon_id: addonId, sort_order: n + 1 });
    }
    return done(undefined);
  },
  unlinkAddon(categoryId, addonId) {
    const db = getDb();
    db.category_addons = db.category_addons.filter((x) => !(x.category_id === categoryId && x.addon_id === addonId));
    return done(undefined);
  },
};

// ── choice lists ───────────────────────────────────────────────────
function groupRow(db, g) {
  return { ...g, choice_options: db.choice_options.filter((o) => o.group_id === g.id).sort(bySort) };
}

export const choices = {
  getChoiceGroups() {
    const db = getDb();
    return reply([...db.choice_groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => groupRow(db, g)));
  },
  getChoiceGroup(id) {
    const db = getDb();
    const g = db.choice_groups.find((x) => x.id === id);
    return g ? reply(groupRow(db, g)) : fail("PGRST116");
  },
  saveChoiceGroup(p) {
    const db = getDb();
    if ((p.min_select ?? 1) > (p.options || []).length) return fail("BAD_REQUEST");
    if (db.choice_groups.some((g) => g.name.toLowerCase() === p.name.trim().toLowerCase() && g.id !== p.id)) return fail("23505");
    let g = p.id ? db.choice_groups.find((x) => x.id === p.id) : null;
    if (p.id && !g) return fail("NOT_FOUND");
    if (!g) {
      g = { id: uid(), created_at: now() };
      db.choice_groups.push(g);
    }
    Object.assign(g, { name: p.name.trim(), label: p.label.trim(), min_select: Number(p.min_select), max_select: Number(p.max_select), updated_at: now() });
    const keep = new Set(p.options.filter((o) => o.id).map((o) => o.id));
    db.choice_options = db.choice_options.filter((o) => o.group_id !== g.id || keep.has(o.id));
    p.options.forEach((o, n) => {
      const row = o.id ? db.choice_options.find((x) => x.id === o.id) : null;
      const fields = { label: o.label.trim(), diet: o.diet || null, price_delta: Number(o.price_delta) || 0, is_available: o.is_available ?? true, sort_order: n + 1 };
      if (row) Object.assign(row, fields);
      else db.choice_options.push({ id: uid(), group_id: g.id, ...fields });
    });
    return done(g.id);
  },
  deleteChoiceGroup(id) {
    const db = getDb();
    if (db.dish_choice_groups.some((x) => x.group_id === id)) return fail("23503");
    db.choice_groups = db.choice_groups.filter((g) => g.id !== id);
    db.choice_options = db.choice_options.filter((o) => o.group_id !== id);
    return done(undefined);
  },
  setOptionAvailable(id, available) {
    const o = getDb().choice_options.find((x) => x.id === id);
    if (!o) return fail("NOT_FOUND");
    o.is_available = available;
    return done(undefined);
  },
  getChoiceUsage() {
    const usage = {};
    for (const r of getDb().dish_choice_groups) usage[r.group_id] = (usage[r.group_id] || 0) + 1;
    return reply(usage);
  },
};

// ── settings + dashboard ───────────────────────────────────────────
const IST = 330 * MIN;
const dayStart = () => Math.floor((Date.now() + IST) / 86400000) * 86400000 - IST;
const openSessionIds = (db) => new Set(db.sessions.filter((s) => s.status === "open").map((s) => s.id));

export const settings = {
  getSettings() {
    return reply(getDb().settings);
  },
  setOrderingOpen(open) {
    getDb().settings.ordering_open = open;
    return done(undefined);
  },
  updateSettings(fields) {
    Object.assign(getDb().settings, fields);
    return done(undefined);
  },
};

export const dashboard = {
  getDashboard() {
    const db = getDb();
    const start = dayStart();
    const today = db.orders.filter((o) => new Date(o.created_at).getTime() >= start);
    const open = openSessionIds(db);
    const live = db.orders.filter((o) => open.has(o.session_id));
    return reply({
      orderingOpen: db.settings.ordering_open,
      ordersToday: today.filter((o) => o.status !== "cancelled").length,
      valueToday: today.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.total, 0),
      cancelledToday: today.filter((o) => o.status === "cancelled").length,
      waiting: live.filter((o) => o.status === "placed").length,
      preparing: live.filter((o) => o.status === "preparing").length,
      openTables: open.size,
      activeTables: db.tables.filter((t) => t.is_active).length,
    });
  },
};

// ── tables ─────────────────────────────────────────────────────────
function tableOverview(db, t) {
  const s = db.sessions.find((x) => x.table_id === t.id && x.status === "open");
  let session = null;
  if (s) {
    const orders = db.orders.filter((o) => o.session_id === s.id);
    session = {
      id: s.id, openedAt: s.opened_at, lastOrderAt: s.last_order_at, orders: orders.length,
      placed: orders.filter((o) => o.status === "placed").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      total: orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.total, 0),
    };
  }
  return { id: t.id, label: t.label, seats: t.seats, isActive: t.is_active, sortOrder: t.sort_order, session };
}
const labelTaken = (db, label, id) => db.tables.some((t) => t.id !== id && t.label.trim().toLowerCase() === label.trim().toLowerCase());
const nextSort = (db) => Math.max(-1, ...db.tables.map((t) => t.sort_order)) + 1;

export const tables = {
  getTablesOverview() {
    const db = getDb();
    return reply(
      db.tables.map((t) => tableOverview(db, t)).sort((a, b) => a.sortOrder - b.sortOrder || labelOrder.compare(a.label, b.label)),
    );
  },
  getTable(id) {
    const t = getDb().tables.find((x) => x.id === id);
    return t ? reply(t) : fail("PGRST116");
  },
  createTable(label, seats) {
    const db = getDb();
    if (labelTaken(db, label)) return fail("23505");
    const t = { id: uid(), label: label.trim(), seats: seats || null, qr_token: uid().replace(/-/g, ""), is_active: true, sort_order: nextSort(db), token_rotated_at: null, created_at: now(), updated_at: now() };
    db.tables.push(t);
    return done(t);
  },
  createTableRange(from, to, prefix = "") {
    const db = getDb();
    const labels = [];
    for (let i = from; i <= to; i++) labels.push(`${prefix}${i}`);
    if (labels.some((l) => labelTaken(db, l))) return fail("23505");
    const first = nextSort(db);
    const rows = labels.map((label, k) => ({ id: uid(), label, seats: null, qr_token: uid().replace(/-/g, ""), is_active: true, sort_order: first + k, token_rotated_at: null, created_at: now(), updated_at: now() }));
    db.tables.push(...rows);
    return done(rows);
  },
  updateTable(id, updates) {
    const db = getDb();
    const t = db.tables.find((x) => x.id === id);
    if (!t) return fail("NOT_FOUND");
    if (updates.label != null && labelTaken(db, updates.label, id)) return fail("23505");
    Object.assign(t, updates, updates.label != null ? { label: updates.label.trim() } : {}, { updated_at: now() });
    return done(undefined);
  },
  deleteTable(id) {
    const db = getDb();
    if (db.sessions.some((s) => s.table_id === id)) return fail("23503");
    db.tables = db.tables.filter((t) => t.id !== id);
    return done(undefined);
  },
  rotateToken(id) {
    const t = getDb().tables.find((x) => x.id === id);
    if (!t) return fail("NOT_FOUND");
    t.qr_token = uid().replace(/-/g, "");
    t.token_rotated_at = now();
    return done(t.qr_token);
  },
  reorderTables(ids) {
    const db = getDb();
    ids.forEach((id, n) => {
      const t = db.tables.find((x) => x.id === id);
      if (t) t.sort_order = n + 1;
    });
    return done(undefined);
  },
  getTableOrders(tableId) {
    const db = getDb();
    const session = db.sessions.find((s) => s.table_id === tableId && s.status === "open");
    if (!session) {
      const since = Date.now() - 15 * MIN;
      const closed = db.sessions
        .filter((s) => s.table_id === tableId && s.status === "closed" && s.closed_at && new Date(s.closed_at).getTime() >= since)
        .sort((a, b) => b.closed_at.localeCompare(a.closed_at))[0];
      return reply({ session: null, orders: [], recentlyClosed: closed ? { id: closed.id, closed_at: closed.closed_at } : null });
    }
    const orders = db.orders.filter((o) => o.session_id === session.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    return reply({ session, orders });
  },
};

// ── orders ─────────────────────────────────────────────────────────
const TRANSITIONS = new Set([
  "placed>preparing", "placed>served", "placed>cancelled", "preparing>served",
  "preparing>cancelled", "preparing>placed", "served>preparing", "cancelled>placed",
]);
const withTable = (db, o) => {
  const t = db.tables.find((x) => x.id === o.table_id);
  return { ...o, table: t ? { id: t.id, label: t.label } : null };
};

export const orders = {
  setOrderStatus(orderId, from, to, reason) {
    const db = getDb();
    if (!TRANSITIONS.has(`${from}>${to}`)) return fail("BAD_TRANSITION");
    const o = db.orders.find((x) => x.id === orderId);
    const s = o && db.sessions.find((x) => x.id === o.session_id);
    if (!o || o.status !== from || s?.status !== "open") return fail("STATUS_CONFLICT");
    o.status = to;
    o.accepted_at = to === "preparing" ? o.accepted_at || now() : to === "placed" ? null : o.accepted_at;
    o.served_at = to === "served" ? now() : null;
    o.cancelled_at = to === "cancelled" ? now() : null;
    o.cancel_reason = to === "cancelled" ? blank(reason)?.slice(0, 140) || null : null;
    return done({ id: o.id, status: to }, { type: "order-update" });
  },
  freeTable(sessionId, expectedOrders, servePending = false) {
    const db = getDb();
    const s = db.sessions.find((x) => x.id === sessionId);
    if (!s) return fail("NOT_FOUND");
    if (s.status !== "open") return fail("SESSION_CLOSED");
    const list = db.orders.filter((o) => o.session_id === sessionId);
    if (list.length !== expectedOrders) return fail("SESSION_CHANGED");
    const pending = list.filter((o) => o.status === "placed" || o.status === "preparing");
    if (pending.length && !servePending) return fail("PENDING_ORDERS");
    for (const o of pending) {
      o.status = "served";
      o.served_at = now();
    }
    Object.assign(s, { status: "closed", closed_at: now(), closed_by: "demo-staff", close_reason: "freed" });
    const total = list.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.total, 0);
    return done({ sessionId, orders: list.length, total }, { type: "session-update" });
  },
  reopenSession(sessionId) {
    const db = getDb();
    const s = db.sessions.find((x) => x.id === sessionId);
    if (!s) return fail("NOT_FOUND");
    const tooOld = !s.closed_at || new Date(s.closed_at).getTime() < Date.now() - 15 * MIN;
    const busy = db.sessions.some((x) => x.table_id === s.table_id && x.status === "open");
    if (s.status !== "closed" || s.close_reason !== "freed" || tooOld || busy) return fail("CANNOT_REOPEN");
    Object.assign(s, { status: "open", closed_at: null, closed_by: null, close_reason: null });
    return done(undefined, { type: "session-update" });
  },
  getWaitingOrders() {
    const db = getDb();
    const open = openSessionIds(db);
    return reply(
      db.orders.filter((o) => o.status === "placed" && open.has(o.session_id))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((o) => withTable(db, o))
        .filter((o) => o.table),
    );
  },
  getActiveOrders() {
    const db = getDb();
    const open = openSessionIds(db);
    return reply(
      db.orders.filter((o) => open.has(o.session_id))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((o) => withTable(db, o))
        .filter((o) => o.table),
    );
  },
  getOrderHistory({ from, to, status = "all", search = "", page = 0, pageSize = 25 }) {
    const db = getDb();
    const q = search.trim().replace(/^#/, "").toLowerCase();
    const rows = db.orders
      .filter((o) => o.created_at >= from && o.created_at < to)
      .filter((o) => status === "all" || o.status === status)
      .map((o) => withTable(db, o))
      .filter((o) => !q || String(o.order_no) === q || o.table?.label.toLowerCase() === q)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return reply({ rows: rows.slice(page * pageSize, (page + 1) * pageSize), count: rows.length });
  },
};

// ── analytics (raw rows; aggregated by lib/analytics.js) ───────────
export const analytics = {
  getRows({ from, to, prevFrom, prevTo }) {
    const db = getDb();
    const inWindow = (o, a, b) => o.created_at >= a && o.created_at < b;
    const current = db.orders.filter((o) => inWindow(o, from, to));
    const previous = db.orders.filter((o) => inWindow(o, prevFrom, prevTo));
    const items = current
      .filter((o) => o.status !== "cancelled")
      .flatMap((o) => o.order_items.map((i) => ({ dish_id: i.dish_id, dish_name: i.dish_name, qty: i.qty, line_total: i.line_total })));
    const strip = ({ order_items, ...o }) => o;
    return reply({ orders: current.map(strip), previous: previous.map(strip), items });
  },
};
