import { supabase } from "../lib/supabase";

// "2" before "10"; the RPC sorts labels as plain text, which puts 10 before 2.
const labelOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export async function getTablesOverview() {
  const { data, error } = await supabase.rpc("staff_tables_overview");
  if (error) throw error;
  return [...(data || [])].sort(
    (a, b) => a.sortOrder - b.sortOrder || labelOrder.compare(a.label, b.label),
  );
}

// New tables go after the existing ones, in the order they were typed.
async function nextSortOrder() {
  const { data, error } = await supabase
    .from("dining_tables")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? 0) + 1;
}

export async function getTable(id) {
  const { data, error } = await supabase
    .from("dining_tables")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createTable(label, seats) {
  const { data, error } = await supabase
    .from("dining_tables")
    .insert({ label, seats: seats || null, sort_order: await nextSortOrder() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createTableRange(from, to, prefix = "") {
  const first = await nextSortOrder();
  const rows = [];
  for (let i = from; i <= to; i++) {
    rows.push({ label: `${prefix}${i}`, seats: null, sort_order: first + (i - from) });
  }
  const { data, error } = await supabase
    .from("dining_tables")
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function updateTable(id, updates) {
  const { error } = await supabase
    .from("dining_tables")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTable(id) {
  const { error } = await supabase
    .from("dining_tables")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function rotateToken(tableId) {
  const { data, error } = await supabase.rpc("staff_rotate_table_token", {
    p_table_id: tableId,
  });
  if (error) throw error;
  return data;
}

export async function reorderTables(ids) {
  const { error } = await supabase.rpc("staff_reorder", {
    p_kind: "tables",
    p_ids: ids,
  });
  if (error) throw error;
}

export async function getTableOrders(tableId) {
  const { data: sessions, error: sErr } = await supabase
    .from("table_sessions")
    .select("*")
    .eq("table_id", tableId)
    .eq("status", "open")
    .limit(1);
  if (sErr) throw sErr;
  if (!sessions?.length) {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: closed, error: cErr } = await supabase
      .from("table_sessions")
      .select("id, closed_at")
      .eq("table_id", tableId)
      .eq("status", "closed")
      .gte("closed_at", since)
      .order("closed_at", { ascending: false })
      .limit(1);
    if (cErr) throw cErr;
    return { session: null, orders: [], recentlyClosed: closed?.[0] || null };
  }

  const session = sessions[0];
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });
  if (oErr) throw oErr;

  return { session, orders: orders || [] };
}
