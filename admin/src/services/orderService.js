import { supabase } from "../lib/supabase";

export async function setOrderStatus(orderId, from, to, reason) {
  const { data, error } = await supabase.rpc("staff_set_order_status", {
    p_order_id: orderId,
    p_from: from,
    p_to: to,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}

export async function freeTable(sessionId, expectedOrders, servePending = false) {
  const { data, error } = await supabase.rpc("staff_free_table", {
    p_session_id: sessionId,
    p_expected_orders: expectedOrders,
    p_serve_pending: servePending,
  });
  if (error) throw error;
  return data;
}

export async function reopenSession(sessionId) {
  const { error } = await supabase.rpc("staff_reopen_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

// Only orders in an open visit: staff_set_order_status refuses closed ones, and the
// dashboard's "waiting" count (staff_dashboard) is also limited to open visits.
export async function getWaitingOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), table:dining_tables(id, label), session:table_sessions!inner(status)")
    .eq("status", "placed")
    .eq("session.status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).filter((o) => o.table);
}
