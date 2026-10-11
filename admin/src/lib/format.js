const IST = { timeZone: "Asia/Kolkata" };

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  ...IST,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  ...IST,
  day: "numeric",
  month: "short",
});

export function formatTime(dateStr) {
  return timeFmt.format(new Date(dateStr));
}

export function formatDate(dateStr) {
  return dateFmt.format(new Date(dateStr));
}

export function rupee(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

export function tableLabel(label) {
  if (!label) return "";
  return /^\d+$/.test(label) ? `Table ${label}` : label;
}

export function relativeTime(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  return `${hrs}h ${min % 60}m ago`;
}

export function durationMin(dateStr) {
  const min = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (min < 1) return "< 1 min";
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  return `${hrs}h ${min % 60}m`;
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
