// Order and table states share one vocabulary: orange waits on staff, cobalt is in progress,
// green is done or free, slate is off. Every chip carries its word, never colour alone.
export const ORDER_STATUS = {
  placed: { label: "New", chip: "chip-new", color: "var(--color-orange)" },
  preparing: { label: "Cooking", chip: "chip-cooking", color: "var(--color-cobalt)" },
  served: { label: "Served", chip: "chip-served", color: "var(--color-green)" },
  cancelled: { label: "Cancelled", chip: "chip-off", color: "var(--color-slate)" },
};

export const TABLE_STATE = {
  attention: { label: "New order", chip: "chip-new" },
  occupied: { label: "Occupied", chip: "chip-cooking" },
  free: { label: "Free", chip: "chip-served" },
  disabled: { label: "Disabled", chip: "chip-off" },
};

export function tableState(t) {
  if (!t.isActive) return "disabled";
  if (t.session?.placed > 0) return "attention";
  if (t.session) return "occupied";
  return "free";
}

export default function StatusChip({ status }) {
  const s = ORDER_STATUS[status];
  return <span className={`chip chip-dot ${s?.chip || "chip-off"}`}>{s?.label || status}</span>;
}

export function TableChip({ state, children }) {
  const s = TABLE_STATE[state];
  return <span className={`chip chip-dot ${s.chip}`}>{children || s.label}</span>;
}
