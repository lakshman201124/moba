import { supabase } from "../lib/supabase";
import { pick } from "./pick";

const ORDER_WITH_TABLE = "*, order_items(*), table:dining_tables(id, label), session:table_sessions!inner(status)";

const live = {
  async setOrderStatus(orderId, from, to, reason) {
    const { data, error } = await supabase.rpc("staff_set_order_status", {
      p_order_id: orderId,
      p_from: from,
      p_to: to,
      p_reason: reason || null,
    });
    if (error) throw error;
    return data;
  },

  async freeTable(sessionId, expectedOrders, servePending = false) {
    const { data, error } = await supabase.rpc("staff_free_table", {
      p_session_id: sessionId,
      p_expected_orders: expectedOrders,
      p_serve_pending: servePending,
    });
    if (error) throw error;
    return data;
  },

  async reopenSession(sessionId) {
    const { error } = await supabase.rpc("staff_reopen_session", { p_session_id: sessionId });
    if (error) throw error;
  },

  // Only orders in an open visit: staff_set_order_status refuses closed ones, and the
  // dashboard's "waiting" count (staff_dashboard) is also limited to open visits.
  async getWaitingOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_WITH_TABLE)
      .eq("status", "placed")
      .eq("session.status", "open")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).filter((o) => o.table);
  },

  // Every order at a table that is still seated: the kitchen board.
  async getActiveOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_WITH_TABLE)
      .eq("session.status", "open")
      .order("created_at", { ascending: true })
      .order("sort_order", { referencedTable: "order_items" });
    if (error) throw error;
    return (data || []).filter((o) => o.table);
  },

  // Past and present orders, newest first. `search` matches an order number or a table name.
  async getOrderHistory({ from, to, status = "all", search = "", page = 0, pageSize = 25 }) {
    let q = supabase
      .from("orders")
      .select("*, order_items(*), table:dining_tables!inner(id, label)", { count: "exact" })
      .gte("created_at", from)
      .lt("created_at", to)
      .order("created_at", { ascending: false })
      .order("sort_order", { referencedTable: "order_items" })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (status !== "all") q = q.eq("status", status);
    const term = search.trim().replace(/^#/, "");
    if (term) q = /^\d+$/.test(term) ? q.eq("order_no", Number(term)) : q.ilike("table.label", term);
    const { data, error, count } = await q;
    if (error) throw error;
    return { rows: data || [], count: count ?? 0 };
  },
};

export const {
  setOrderStatus, freeTable, reopenSession, getWaitingOrders, getActiveOrders, getOrderHistory,
} = pick("orders", live);
