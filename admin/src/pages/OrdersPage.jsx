import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getTablesOverview } from "../services/tableService";
import { useWakeLock } from "../hooks/useWakeLock";
import { tableLabel, durationMin, rupee } from "../lib/format";
import { useState } from "react";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";

const FILTERS = ["all", "occupied", "attention"];

export default function OrdersPage() {
  useWakeLock();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const { data: tables, isLoading, error, refetch } = useQuery({
    queryKey: ["tables-overview"],
    queryFn: getTablesOverview,
    refetchInterval: 60000,
  });

  if (isLoading)
    return (
      <div className="p-4 md:p-6">
        <Skeleton className="h-8 w-40 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Skeleton className="h-28" count={8} />
        </div>
      </div>
    );
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const filtered = (tables || []).filter((t) => {
    if (filter === "occupied") return t.session;
    if (filter === "attention") return t.session?.placed > 0;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-2xl mb-4">Orders</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-2 transition-colors ${
              filter === f
                ? "border-cobalt bg-cobalt text-white"
                : "border-line bg-paper text-ink/60 hover:border-cobalt"
            }`}
          >
            {f === "all"
              ? "All"
              : f === "occupied"
                ? "Occupied"
                : "Needs attention"}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState
          title="No tables match"
          message={
            filter === "all"
              ? "Add tables in the Tables tab."
              : "No tables in this state right now."
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((t) => (
            <TableTile
              key={t.id}
              table={t}
              onClick={() => navigate(`/orders/${t.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TableTile({ table, onClick }) {
  const s = table.session;
  const needsAttention = s?.placed > 0;
  const occupied = !!s;

  return (
    <button
      onClick={onClick}
      className={`card text-left transition-colors relative ${
        needsAttention
          ? "border-orange animate-pulse"
          : occupied
            ? "border-cobalt"
            : "border-dashed border-line text-ink/40"
      }`}
    >
      {needsAttention && (
        <span className="absolute -top-2 -right-2 bg-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {s.placed} new
        </span>
      )}
      <p className="font-bold text-sm">{tableLabel(table.label)}</p>
      {occupied ? (
        <>
          <p className="text-xs text-ink/50 mt-1">
            {durationMin(s.openedAt)} · {s.orders} orders
          </p>
          <p className="text-xs font-semibold mt-0.5">{rupee(s.total)}</p>
        </>
      ) : (
        <p className="text-xs mt-1">Free</p>
      )}
    </button>
  );
}
