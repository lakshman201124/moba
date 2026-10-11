// Date windows and sums for the dashboard. Every window is in IST, the restaurant's clock.
const IST = 330 * 60000;
const DAY = 86400000;
const HOUR = 3600000;

// The business day runs 4 AM to 4 AM IST, so a service that goes past midnight is still one day.
const DAY_START = 4 * HOUR;
export const istDayStart = (t = Date.now()) => Math.floor((t + IST - DAY_START) / DAY) * DAY - IST + DAY_START;

export const RANGES = [
  { key: "today", label: "Today", compare: "vs. yesterday" },
  { key: "yesterday", label: "Yesterday", compare: "vs. same day last week" },
  { key: "week", label: "Last 7 days", compare: "vs. previous 7 days" },
  { key: "month", label: "Last 30 days", compare: "vs. previous 30 days" },
];

export function rangeWindow(key, now = Date.now()) {
  const today = istDayStart(now);
  const w = {
    today: { from: today, to: now, prevFrom: today - DAY, prevTo: now - DAY, bucket: "hour" },
    yesterday: { from: today - DAY, to: today, prevFrom: today - 8 * DAY, prevTo: today - 7 * DAY, bucket: "hour" },
    week: { from: today - 6 * DAY, to: now, prevFrom: today - 13 * DAY, prevTo: now - 7 * DAY, bucket: "day" },
    month: { from: today - 29 * DAY, to: now, prevFrom: today - 59 * DAY, prevTo: now - 30 * DAY, bucket: "day" },
  }[key];
  return { ...w, key, now };
}

export const toIso = (w) => ({
  from: new Date(w.from).toISOString(),
  to: new Date(w.to).toISOString(),
  prevFrom: new Date(w.prevFrom).toISOString(),
  prevTo: new Date(w.prevTo).toISOString(),
});

const counted = (o) => o.status !== "cancelled";

function totals(orders) {
  const kept = orders.filter(counted);
  const revenue = kept.reduce((a, o) => a + o.total, 0);
  return { revenue, orders: kept.length, avg: kept.length ? Math.round(revenue / kept.length) : 0 };
}

function change(now, before) {
  if (!before) return now ? null : 0;
  return Math.round(((now - before) / before) * 100);
}

const hourLabel = (h) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`);
const dayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric" });
const dayFmtLong = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "short" });
const dateFmtShort = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

function buckets(w, orders) {
  if (w.bucket === "hour") {
    // Service hours, widened to any hour that actually took an order.
    // Hours are counted from midnight of the business date, so 1 AM after a late service is 25.
    const midnight = istDayStart(w.from) - DAY_START;
    let first = 11;
    let last = 23;
    for (const o of orders) {
      const h = Math.floor((new Date(o.created_at).getTime() - midnight) / HOUR);
      first = Math.min(first, h);
      last = Math.max(last, h + 1);
    }
    const list = [];
    for (let h = first; h < last; h++) {
      const start = midnight + h * HOUR;
      list.push({
        start, end: start + HOUR, label: hourLabel(h % 24), long: `${hourLabel(h % 24)} – ${hourLabel((h + 1) % 24)}`,
        future: start > w.now, current: w.now >= start && w.now < start + HOUR,
      });
    }
    return list;
  }
  const list = [];
  for (let start = istDayStart(w.from); start < w.to; start += DAY) {
    list.push({
      start, end: start + DAY,
      label: w.key === "week" ? dayFmt.format(start) : dateFmtShort.format(start),
      long: dayFmtLong.format(start), future: false, current: w.now >= start && w.now < start + DAY,
    });
  }
  return list;
}

export function aggregate(w, { orders, previous, items }) {
  const cur = totals(orders);
  const prev = totals(previous);
  const status = { placed: 0, preparing: 0, served: 0, cancelled: 0 };
  for (const o of orders) status[o.status] = (status[o.status] || 0) + 1;

  const series = buckets(w, orders).map((b) => ({ ...b, revenue: 0, orders: 0 }));
  for (const o of orders) {
    if (!counted(o)) continue;
    const t = new Date(o.created_at).getTime();
    const b = series.find((x) => t >= x.start && t < x.end);
    if (b) {
      b.revenue += o.total;
      b.orders += 1;
    }
  }

  const dishes = new Map();
  for (const i of items) {
    const key = i.dish_id || `name:${i.dish_name}`;
    const d = dishes.get(key) || { key, dish_id: i.dish_id, name: i.dish_name, qty: 0, revenue: 0 };
    d.qty += i.qty;
    d.revenue += i.line_total;
    dishes.set(key, d);
  }
  const topDishes = [...dishes.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5);

  return {
    ...cur,
    bucket: w.bucket,
    cancelled: status.cancelled,
    status,
    delta: {
      revenue: change(cur.revenue, prev.revenue),
      orders: change(cur.orders, prev.orders),
      avg: change(cur.avg, prev.avg),
    },
    series,
    topDishes,
  };
}
