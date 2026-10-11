import { useMemo, useState } from "react";
import { useElementSize } from "../../hooks/useNow";
import { rupee, rupeeCompact, plural } from "../../lib/format";
import { Segmented } from "../ui/Segmented";

const MIN_H = 232;
const M = { top: 22, right: 4, bottom: 28, left: 46 };

function niceMax(v) {
  if (v <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => (s * pow * 4) >= v) * pow;
  return step * 4;
}

// Rounded data-end, square at the baseline.
function barPath(x, y, w, h, r = 4) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export default function RevenueChart({ data, loading, fetching, rangeLabel }) {
  const [metric, setMetric] = useState("revenue");
  const [active, setActive] = useState(null);
  const [ref, { width, height }] = useElementSize();
  const H = Math.max(MIN_H, Math.floor(height));
  const series = data?.series || [];

  const geo = useMemo(() => {
    const innerW = Math.max(0, width - M.left - M.right);
    const innerH = H - M.top - M.bottom;
    const max = niceMax(Math.max(0, ...series.map((b) => b[metric])));
    const band = series.length ? innerW / series.length : 0;
    const barW = Math.max(4, Math.min(24, band - 6));
    const every = band < 34 ? Math.ceil(34 / band) : 1;
    const peak = series.reduce((best, b, i) => (b[metric] > (series[best]?.[metric] ?? -1) ? i : best), -1);
    return { innerW, innerH, max, band, barW, every, peak };
  }, [width, H, series, metric]);

  const fmt = metric === "revenue" ? rupeeCompact : (v) => String(v);
  const total = data?.[metric === "revenue" ? "revenue" : "orders"] ?? 0;
  const ticks = [0, 1, 2, 3, 4].map((k) => (geo.max / 4) * k);
  const shown = active ?? null;
  const bucket = shown != null ? series[shown] : null;

  function onKey(e) {
    if (!series.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setActive((i) => Math.max(0, Math.min(series.length - 1, (i ?? (d > 0 ? -1 : series.length)) + d)));
    } else if (e.key === "Escape") setActive(null);
  }

  return (
    <section className="panel p-5 h-full flex flex-col" aria-labelledby="revenue-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="revenue-title" className="panel-title">{metric === "revenue" ? "Revenue" : "Orders"}</h2>
          <p className="mt-1 text-h2 font-bold tracking-[-0.02em]">
            {loading ? <span className="skeleton inline-block h-7 w-32 align-middle" /> : metric === "revenue" ? rupee(total) : plural(total, "order", "orders")}
          </p>
          <p className="text-cap text-ink-3 mt-0.5">{rangeLabel} · {data?.bucket === "day" ? "by day" : "by hour"}</p>
        </div>
        <Segmented
          size="sm"
          label="Chart measure"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "orders", label: "Orders" },
          ]}
        />
      </div>

      <div
        ref={ref}
        className={`relative mt-4 flex-1 min-h-[232px] outline-none rounded-[10px] transition-opacity ${fetching ? "opacity-60" : ""}`}
        tabIndex={series.length ? 0 : -1}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        aria-label={`${metric === "revenue" ? "Revenue" : "Orders"} chart. Use the left and right arrow keys to read each bar.`}
        role="figure"
      >
        {loading || !width ? (
          <div className="absolute inset-0 flex items-end gap-2 px-12 pb-7">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skeleton flex-1" style={{ height: `${25 + ((i * 37) % 60)}%` }} />
            ))}
          </div>
        ) : (
          <svg width={width} height={H} className="absolute inset-0 block overflow-visible" onMouseLeave={() => setActive(null)}>
            {ticks.map((t) => {
              const y = M.top + geo.innerH - (t / geo.max) * geo.innerH;
              return (
                <g key={t}>
                  <line x1={M.left} x2={width - M.right} y1={y} y2={y} stroke="#EEEDE8" strokeWidth="1" />
                  <text x={M.left - 10} y={y} dy="0.32em" textAnchor="end" className="fill-ink-3 tnum" fontSize="11">
                    {fmt(t)}
                  </text>
                </g>
              );
            })}
            {series.map((b, i) => {
              const v = b[metric];
              const h = (v / geo.max) * geo.innerH;
              const cx = M.left + geo.band * i + geo.band / 2;
              const x = cx - geo.barW / 2;
              const y = M.top + geo.innerH - h;
              const on = shown === i;
              const showLabel = i % geo.every === 0 || b.current;
              return (
                <g key={b.start}>
                  {v > 0 && (
                    <path d={barPath(x, y, geo.barW, h)} fill={on ? "#3069B8" : b.current ? "#3B7ACB" : "#4A8FD8"} className="transition-[fill] duration-150" />
                  )}
                  {v === 0 && !b.future && <rect x={x} y={M.top + geo.innerH - 2} width={geo.barW} height="2" rx="1" fill="#DCDBD4" />}
                  {i === geo.peak && v > 0 && shown == null && (
                    <text x={cx} y={y - 7} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-ink-2 tnum">
                      {fmt(v)}
                    </text>
                  )}
                  {showLabel && (
                    <text
                      x={cx}
                      y={H - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={b.current ? 700 : 500}
                      className={b.current ? "fill-ink" : "fill-ink-3"}
                    >
                      {b.current && series.length > 1 && geo.band > 30 ? "Now" : b.label}
                    </text>
                  )}
                  <rect
                    x={M.left + geo.band * i}
                    y={M.top}
                    width={geo.band}
                    height={geo.innerH + 6}
                    fill="transparent"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setActive(i)}
                  />
                </g>
              );
            })}
            <line x1={M.left} x2={width - M.right} y1={M.top + geo.innerH} y2={M.top + geo.innerH} stroke="#D9D8D1" />
          </svg>
        )}

        {bucket && width > 0 && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] border border-line bg-surface px-3 py-2 shadow-raise whitespace-nowrap"
            style={{
              left: Math.max(70, Math.min(width - 70, M.left + geo.band * shown + geo.band / 2)),
              top: Math.max(54, M.top + geo.innerH - (bucket[metric] / geo.max) * geo.innerH - 8),
            }}
            role="status"
          >
            <p className="text-body font-bold tnum">{rupee(bucket.revenue)}</p>
            <p className="text-cap text-ink-2 tnum">{plural(bucket.orders, "order", "orders")}</p>
            <p className="text-cap text-ink-3">{bucket.long}{bucket.current ? " · so far" : ""}</p>
          </div>
        )}

        {!loading && series.length > 0 && series.every((b) => b[metric] === 0) && (
          <p className="absolute inset-x-0 top-[38%] text-center text-meta text-ink-3">No orders in this period yet.</p>
        )}
      </div>

      <table className="sr-only">
        <caption>{metric === "revenue" ? "Revenue" : "Orders"} for {rangeLabel}</caption>
        <thead>
          <tr><th>Period</th><th>Revenue</th><th>Orders</th></tr>
        </thead>
        <tbody>
          {series.map((b) => (
            <tr key={b.start}><td>{b.long}</td><td>{rupee(b.revenue)}</td><td>{b.orders}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
