import { Link } from "react-router-dom";
import { Armchair } from "lucide-react";
import { tableShort, durationMin } from "../../lib/format";
import { tableState, TABLE_STATE } from "../ui/StatusChip";
import EmptyState from "../ui/EmptyState";

export const TILE = {
  attention: "bg-orange-soft text-orange-ink border-[#FFC9B4] hover:border-orange",
  occupied: "bg-cobalt-soft text-cobalt-ink border-[#C9D9F1] hover:border-cobalt",
  free: "bg-green-soft text-green-ink border-[#C6E6CF] hover:border-green",
  disabled: "bg-slate-soft text-slate-ink border-[#DCDDE5] hover:border-slate",
};
const DOT = { attention: "bg-orange", occupied: "bg-cobalt", free: "bg-green", disabled: "bg-slate" };

export default function TableStatusGrid({ tables, loading }) {
  const counts = { attention: 0, occupied: 0, free: 0, disabled: 0 };
  for (const t of tables || []) counts[tableState(t)]++;

  return (
    <section className="panel p-5 h-full flex flex-col" aria-labelledby="table-status-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="table-status-title" className="panel-title">Table status</h2>
        <Link to="/orders" className="text-meta font-semibold text-ink-2 hover:text-ink">Floor plan</Link>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
        {["occupied", "free", "attention", "disabled"].map((k) =>
          k === "attention" && !counts.attention ? null : (
            <li key={k} className="flex items-center gap-1.5 text-cap text-ink-2">
              <span className={`h-2 w-2 rounded-full ${DOT[k]}`} aria-hidden="true" />
              {TABLE_STATE[k].label} <span className="font-bold text-ink tnum">{counts[k]}</span>
            </li>
          ),
        )}
      </ul>

      {loading ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton h-[52px]" />)}
        </div>
      ) : !tables?.length ? (
        <EmptyState icon={Armchair} compact title="No tables yet" message="Add tables to print their QR codes." />
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {tables.map((t) => {
            const s = tableState(t);
            return (
              <Link
                key={t.id}
                to={`/orders/${t.id}`}
                title={`${tableShort(t.label)}: ${TABLE_STATE[s].label}${t.session ? `, seated ${durationMin(t.session.openedAt)}` : ""}`}
                aria-label={`${tableShort(t.label)}, ${TABLE_STATE[s].label}`}
                className={`relative flex h-[52px] flex-col items-center justify-center rounded-[10px] border transition-colors ${TILE[s]}`}
              >
                <span className="text-body font-bold">{tableShort(t.label)}</span>
                {t.session && <span className="text-[10px] font-semibold opacity-80 tnum">{durationMin(t.session.openedAt)}</span>}
                {s === "attention" && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange ring-2 ring-surface animate-pulse-ring" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
