const IST = { timeZone: "Asia/Kolkata" };

const timeFmt = new Intl.DateTimeFormat("en-IN", { ...IST, hour: "numeric", minute: "2-digit", hour12: true });
const dateFmt = new Intl.DateTimeFormat("en-IN", { ...IST, day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("en-IN", { ...IST, weekday: "long", day: "numeric", month: "long" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  ...IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
});

export function formatTime(dateStr) {
  return timeFmt.format(new Date(dateStr)).replace(/\s?(am|pm)$/i, (m) => m.toUpperCase());
}

export function formatDate(dateStr) {
  return dateFmt.format(new Date(dateStr));
}

export function formatDateTime(dateStr) {
  return dateTimeFmt.format(new Date(dateStr)).replace(/\s?(am|pm)$/i, (m) => m.toUpperCase());
}

export function todayLong() {
  return longDateFmt.format(new Date());
}

export function rupee(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

// ₹950 · ₹12.4K · ₹1.2L: Indian lakh for big totals.
export function rupeeCompact(n) {
  const v = Number(n || 0);
  if (v >= 100000) return `₹${trim(v / 100000)}L`;
  if (v >= 1000) return `₹${trim(v / 1000)}K`;
  return `₹${v}`;
}
const trim = (x) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toString();

export function tableLabel(label) {
  if (!label) return "";
  return /^\d+$/.test(label) ? `Table ${label}` : label;
}

// Headings say "Table T4", keeping the T4 staff use on every tile; named tables stay as they are.
export function tableTitle(label) {
  if (!label) return "";
  const m = /^T?(\d+)$/i.exec(label.trim());
  return m ? `Table T${m[1]}` : label;
}

// "T4" stays "T4", "4" becomes "T4": the short form used on floor tiles.
export function tableShort(label) {
  if (!label) return "";
  return /^\d+$/.test(label) ? `T${label}` : label;
}

export function relativeTime(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  return `${hrs}h ${min % 60}m ago`;
}

export function minutesSince(dateStr) {
  return Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
}

export function durationMin(dateStr) {
  const min = minutesSince(dateStr);
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  return `${hrs}h ${min % 60}m`;
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
