import { useState } from "react";
import { ORDER_STATUS } from "../ui/StatusChip";

// Fixed slot order (validated for colour-blind separation): served, cooking, new, cancelled.
const ORDER = ["served", "preparing", "placed", "cancelled"];
const R = 62;
const STROKE = 18;
const C = 2 * Math.PI * R;
const GAP = 3;

export default function StatusDonut({ status, loading, rangeLabel }) {
  const [hover, setHover] = useState(null);
  const total = ORDER.reduce((a, k) => a + (status?.[k] || 0), 0);
  let offset = 0;
  const parts = ORDER.map((k) => {
    const n = status?.[k] || 0;
    const len = total ? (n / total) * C : 0;
    const part = { k, n, len, offset };
    offset += len;
    return part;
  });
  const visible = parts.filter((p) => p.n > 0);
  const focus = hover ? parts.find((p) => p.k === hover) : null;

  return (
    <section className="panel p-5 h-full" aria-labelledby="status-title">
      <h2 id="status-title" className="panel-title">Order status</h2>
      <p className="text-cap text-ink-3 mt-0.5">{rangeLabel}</p>

      <div className="mt-4 flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-6">
        <div className="relative h-[164px] w-[164px] shrink-0">
          {loading ? (
            <div className="skeleton h-full w-full !rounded-full" />
          ) : (
            <svg viewBox="0 0 164 164" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="82" cy="82" r={R} fill="none" stroke="#EEEDE8" strokeWidth={STROKE} />
              {visible.map((p) => (
                <circle
                  key={p.k}
                  cx="82"
                  cy="82"
                  r={R}
                  fill="none"
                  stroke={ORDER_STATUS[p.k].color}
                  strokeWidth={hover === p.k ? STROKE + 4 : STROKE}
                  strokeDasharray={`${Math.max(0.5, p.len - (visible.length > 1 ? GAP : 0))} ${C}`}
                  strokeDashoffset={-p.offset}
                  opacity={hover && hover !== p.k ? 0.35 : 1}
                  className="transition-[opacity,stroke-width] duration-150"
                  onMouseEnter={() => setHover(p.k)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </svg>
          )}
          {!loading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-h2 font-bold">{focus ? focus.n : total}</span>
              <span className="text-cap text-ink-3">{focus ? ORDER_STATUS[focus.k].label.toLowerCase() : "placed"}</span>
            </div>
          )}
        </div>

        <ul className="w-full space-y-1">
          {parts.map((p) => {
            const pct = total ? Math.round((p.n / total) * 100) : 0;
            return (
              <li
                key={p.k}
                onMouseEnter={() => setHover(p.k)}
                onMouseLeave={() => setHover(null)}
                className={`flex items-center gap-2.5 rounded-[9px] px-2 py-1.5 transition-colors ${hover === p.k ? "bg-hover" : ""}`}
              >
                <span className="h-2.5 w-2.5 rounded-[3px] shrink-0" style={{ background: ORDER_STATUS[p.k].color }} aria-hidden="true" />
                <span className="flex-1 text-body text-ink-2">{ORDER_STATUS[p.k].label}</span>
                <span className="text-body font-bold tnum">{loading ? "–" : p.n}</span>
                <span className="w-10 text-right text-cap text-ink-3 tnum">{loading ? "" : `${pct}%`}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
