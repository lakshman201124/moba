import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowRight, CircleCheckBig, ChevronRight } from "lucide-react";
import { getWaitingOrders, setOrderStatus } from "../../services/orderService";
import { queryClient } from "../../lib/queryClient";
import { tableShort, relativeTime, rupee, plural } from "../../lib/format";
import { errorMessage } from "../../lib/errors";
import { useNow } from "../../hooks/useNow";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";

export function invalidateOrders() {
  for (const key of ["waiting-orders", "active-orders", "dashboard", "tables-overview", "table-live", "analytics", "order-history"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export default function WaitingList() {
  useNow(30000);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["waiting-orders"],
    queryFn: getWaitingOrders,
    refetchInterval: 30000,
  });

  const accept = useMutation({
    mutationFn: (id) => setOrderStatus(id, "placed", "preparing"),
    onSuccess: (_r, id) => {
      const o = data?.find((x) => x.id === id);
      toast.success(o ? `#${o.order_no} accepted. It's with the kitchen.` : "Order accepted.");
      invalidateOrders();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      invalidateOrders();
    },
  });

  const count = data?.length || 0;

  return (
    <section className="panel h-full flex flex-col" aria-labelledby="waiting-title">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h2 id="waiting-title" className="panel-title flex items-center gap-2">
            Waiting to accept
            {count > 0 && <span className="badge">{count}</span>}
          </h2>
          <p className="text-cap text-ink-3 mt-0.5">Oldest first</p>
        </div>
        <Link to="/orders/live" className="inline-flex items-center gap-1 text-meta font-semibold text-ink-2 hover:text-ink">
          Live orders <ArrowRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2 px-5 pb-5">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[60px]" />)}
        </div>
      ) : error ? (
        <ErrorState compact message={errorMessage(error)} onRetry={refetch} />
      ) : !count ? (
        <EmptyState icon={CircleCheckBig} compact title="All caught up" message="New orders land here the moment a table orders." />
      ) : (
        <ul className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto max-h-[360px]">
          {data.map((o) => {
            const busy = accept.isPending && accept.variables === o.id;
            return (
              <li key={o.id} className="group flex items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-sunken">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-orange-soft text-body font-bold text-orange-ink">
                  {tableShort(o.table?.label)}
                </span>
                <Link to={`/orders/${o.table?.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold">
                    <span className="tnum">#{o.order_no}</span>
                    <span className="text-ink-3 font-medium"> · Guest {o.guest_no}</span>
                  </p>
                  <p className="truncate text-cap text-ink-3">
                    {plural(o.item_count, "item", "items")} · <span className="tnum">{rupee(o.total)}</span> · {relativeTime(o.created_at)}
                  </p>
                </Link>
                <button onClick={() => accept.mutate(o.id)} disabled={busy} className="btn btn-primary btn-sm">
                  {busy ? "Accepting…" : "Accept"}
                </button>
                <Link to={`/orders/${o.table?.id}`} className="btn btn-ghost btn-icon btn-sm hidden sm:inline-flex" aria-label={`Open ${tableShort(o.table?.label)}`}>
                  <ChevronRight size={16} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
