import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus, IndianRupee, ReceiptText, Armchair, HandCoins } from "lucide-react";
import { rupee } from "../../lib/format";
import { tableState } from "../ui/StatusChip";

const SEGMENT = {
  attention: "bg-orange",
  occupied: "bg-cobalt",
  free: "bg-green",
  disabled: "bg-[#D5D6DE]",
};

function Delta({ value, compare }) {
  if (value == null) return <p className="text-cap text-ink-3">No orders to compare {compare.replace("vs. ", "with ")}</p>;
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="flex items-center gap-1 text-cap">
      <span className={`inline-flex items-center gap-0.5 font-bold ${flat ? "text-ink-2" : up ? "text-green-ink" : "text-red"}`}>
        <Icon size={14} strokeWidth={2.5} />
        {flat ? "No change" : `${Math.abs(value)}%`}
      </span>
      <span className="text-ink-3">{compare}</span>
    </p>
  );
}

// Each figure gets a neutral icon tile so it's found by shape, kept out of the state colours.
function Tile({ label, value, children, loading, tone, icon: Icon }) {
  return (
    <div className="panel px-4 py-3.5 sm:px-5 sm:py-4 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-meta font-semibold text-ink-2">{label}</p>
        {Icon && (
          <span className="-mr-1 -mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-line bg-sunken text-ink-2 sm:h-9 sm:w-9" aria-hidden="true">
            <Icon size={17} strokeWidth={1.9} />
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-2 space-y-2">
          <div className="skeleton h-8 w-28" />
          <div className="skeleton h-3.5 w-36" />
        </div>
      ) : (
        <>
          <p className={`-mt-1 text-h2 sm:text-kpi font-bold tracking-[-0.02em] ${tone || ""}`}>{value}</p>
          <div className="mt-1.5 min-h-4">{children}</div>
        </>
      )}
    </div>
  );
}

export default function StatsRow({ stats, compare, loading, live, tables, tablesLoading, showLive }) {
  const active = (tables || []).filter((t) => t.isActive);
  const occupied = active.filter((t) => t.session).length;
  const free = active.length - occupied;
  const disabled = (tables || []).length - active.length;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
      <Tile label="Revenue" icon={IndianRupee} value={rupee(stats?.revenue)} loading={loading}>
        <Delta value={stats?.delta.revenue} compare={compare} />
      </Tile>

      <Tile label="Orders" icon={ReceiptText} value={stats?.orders ?? 0} loading={loading}>
        {showLive && live?.waiting > 0 ? (
          <Link to="/orders/live" className="inline-flex items-center gap-1.5 text-cap font-bold text-orange-ink hover:underline underline-offset-2">
            <span className="h-1.5 w-1.5 rounded-full bg-orange animate-pulse-ring" aria-hidden="true" />
            {live.waiting} waiting to accept · {live.preparing} cooking
          </Link>
        ) : (
          <Delta value={stats?.delta.orders} compare={compare} />
        )}
      </Tile>

      <Tile
        label="Tables occupied"
        icon={Armchair}
        loading={tablesLoading}
        value={
          <>
            {occupied}
            <span className="text-ink-3 font-semibold"> / {active.length}</span>
          </>
        }
      >
        <div className="flex gap-[2px]" role="img" aria-label={`${occupied} of ${active.length} tables occupied, ${free} free${disabled ? `, ${disabled} disabled` : ""}`}>
          {(tables || []).map((t) => (
            <span key={t.id} className={`h-1.5 flex-1 first:rounded-l-full last:rounded-r-full ${SEGMENT[tableState(t)]}`} />
          ))}
        </div>
        <p className="mt-1.5 text-cap text-ink-3">
          <span className="font-bold text-green-ink">{free} free</span>
          {disabled > 0 && ` · ${disabled} disabled`}
        </p>
      </Tile>

      <Tile label="Average order" icon={HandCoins} value={rupee(stats?.avg)} loading={loading}>
        <Delta value={stats?.delta.avg} compare={compare} />
      </Tile>
    </div>
  );
}
