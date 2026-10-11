import { supabase } from "../lib/supabase";
import { pick } from "./pick";

// PostgREST returns at most 1,000 rows per request, so read a range in pages.
async function readAll(build) {
  const size = 1000;
  const out = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < size) return out;
  }
}

const ORDER_COLS = "id, order_no, table_id, status, total, item_count, created_at";

const live = {
  // Raw rows for a window and its comparison window; lib/analytics.js does the sums.
  async getRows({ from, to, prevFrom, prevTo }) {
    const [orders, previous, items] = await Promise.all([
      readAll(() =>
        supabase.from("orders").select(ORDER_COLS).gte("created_at", from).lt("created_at", to).order("created_at"),
      ),
      readAll(() =>
        supabase.from("orders").select(ORDER_COLS).gte("created_at", prevFrom).lt("created_at", prevTo).order("created_at"),
      ),
      readAll(() =>
        supabase
          .from("order_items")
          .select("id, dish_id, dish_name, qty, line_total, orders!inner(created_at, status)")
          .gte("orders.created_at", from)
          .lt("orders.created_at", to)
          .neq("orders.status", "cancelled")
          .order("id"),
      ),
    ]);
    return { orders, previous, items: items.map(({ orders: _o, ...i }) => i) };
  },
};

export const { getRows } = pick("analytics", live);
