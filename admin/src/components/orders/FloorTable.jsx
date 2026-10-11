import { tableShort, durationMin } from "../../lib/format";
import { tableState, TABLE_STATE } from "../ui/StatusChip";

// Top-down table drawn from its seat count: one chair per seat, tinted by state.
const PAINT = {
  free: { top: "#EAF6EE", edge: "#A9D8B6", chair: "#C3E5CC", ink: "text-green-ink" },
  occupied: { top: "#EAF0FA", edge: "#A9C3E8", chair: "#C5D7F1", ink: "text-cobalt-ink" },
  attention: { top: "#FFEDE5", edge: "#FFAE90", chair: "#FFCBB6", ink: "text-orange-ink" },
  disabled: { top: "#F1F2F5", edge: "#D3D5DE", chair: "#E3E4EA", ink: "text-slate-ink" },
};

const W = 160;
const H = 128;

function layout(seats) {
  const n = Math.max(1, Math.min(seats || 4, 12));
  if (n <= 2) return { w: 64, top: 0, bottom: 0, left: 1, right: n - 1 };
  const ends = n >= 7 ? 2 : 0;
  const long = n - ends;
  const top = Math.ceil(long / 2);
  return { w: Math.min(120, 40 + top * 26), top, bottom: long - top, left: ends / 2, right: ends / 2 };
}

function Chairs({ count, side, tx, ty, tw, th, fill }) {
  const out = [];
  const horizontal = side === "top" || side === "bottom";
  for (let i = 0; i < count; i++) {
    if (horizontal) {
      const step = tw / count;
      const cx = tx + step * i + step / 2;
      const y = side === "top" ? ty - 15 : ty + th + 5;
      out.push(<rect key={`${side}${i}`} x={cx - 10} y={y} width="20" height="10" rx="5" fill={fill} />);
    } else {
      const step = th / count;
      const cy = ty + step * i + step / 2;
      const x = side === "left" ? tx - 15 : tx + tw + 5;
      out.push(<rect key={`${side}${i}`} x={x} y={cy - 10} width="10" height="20" rx="5" fill={fill} />);
    }
  }
  return out;
}

export function TableGlyph({ seats, state, className = "absolute inset-0 h-full w-full" }) {
  const p = PAINT[state];
  const l = layout(seats);
  const th = 66;
  const tx = (W - l.w) / 2;
  const ty = (H - th) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true">
      <Chairs count={l.top} side="top" tx={tx} ty={ty} tw={l.w} th={th} fill={p.chair} />
      <Chairs count={l.bottom} side="bottom" tx={tx} ty={ty} tw={l.w} th={th} fill={p.chair} />
      <Chairs count={l.left} side="left" tx={tx} ty={ty} tw={l.w} th={th} fill={p.chair} />
      <Chairs count={l.right} side="right" tx={tx} ty={ty} tw={l.w} th={th} fill={p.chair} />
      <rect x={tx} y={ty} width={l.w} height={th} rx="14" fill={p.top} stroke={p.edge} strokeWidth="1.5" strokeDasharray={state === "disabled" ? "4 3" : undefined} />
    </svg>
  );
}

export default function FloorTable({ table, selected, onSelect }) {
  const state = tableState(table);
  const p = PAINT[state];
  const s = table.session;
  const meta = s ? durationMin(s.openedAt) : table.seats ? `${table.seats} seats` : "Seats not set";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${tableShort(table.label)}, ${TABLE_STATE[state].label}${s ? `, seated ${durationMin(s.openedAt)}` : ""}${s?.placed ? `, ${s.placed} new` : ""}`}
      className={`group relative flex aspect-[160/128] w-full items-center justify-center rounded-[16px] transition-[background-color,box-shadow] duration-200 ${
        selected ? "bg-lemon-soft shadow-[0_0_0_2px_#E2DB55]" : "hover:bg-surface/80 hover:shadow-[0_0_0_1px_var(--color-line)]"
      }`}
    >
      <TableGlyph seats={table.seats} state={state} />
      <span className={`relative flex flex-col items-center leading-tight ${p.ink}`}>
        <span className="text-title font-extrabold text-ink">{tableShort(table.label)}</span>
        <span className="text-[11px] font-semibold opacity-90 tnum">{meta}</span>
        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {s?.placed ? `${s.placed} new` : TABLE_STATE[state].label}
        </span>
      </span>
      {state === "attention" && (
        <span className="absolute right-[14%] top-[10%] h-3 w-3 rounded-full bg-orange ring-2 ring-surface animate-pulse-ring" aria-hidden="true" />
      )}
    </button>
  );
}
