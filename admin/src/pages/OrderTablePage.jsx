import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getTable, getTableOrders } from "../services/tableService";
import { reopenSession } from "../services/orderService";
import { queryClient } from "../lib/queryClient";
import { isUuid } from "../lib/ids";
import { tableLabel, formatTime, durationMin, rupee, plural } from "../lib/format";
import { errorMessage } from "../lib/errors";
import { useWakeLock } from "../hooks/useWakeLock";
import { useState } from "react";
import OrderCard from "../components/orders/OrderCard";
import FreeTableDialog from "../components/orders/FreeTableDialog";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

export default function OrderTablePage() {
  const { tableId } = useParams();
  return isUuid(tableId) ? <OrderTableView tableId={tableId} /> : <NotFound />;
}

function OrderTableView({ tableId }) {
  useWakeLock();
  const navigate = useNavigate();
  const [freeOpen, setFreeOpen] = useState(false);

  const { data: table, isLoading: tLoading, error: tError } = useQuery({
    queryKey: ["table", tableId],
    queryFn: () => getTable(tableId),
  });

  const {
    data: live,
    isLoading: lLoading,
    error: lError,
    refetch,
  } = useQuery({
    queryKey: ["table-live", tableId],
    queryFn: () => getTableOrders(tableId),
    refetchInterval: 15000,
  });

  const reopen = useMutation({
    mutationFn: (sessionId) => reopenSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-live", tableId] });
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      toast.success("Visit reopened.");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (tLoading || lLoading)
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-60 mb-4" />
        <Skeleton className="h-48" count={3} />
      </div>
    );

  if (tError)
    return tError.code === "PGRST116" ? <NotFound /> : <ErrorState message={tError.message} onRetry={refetch} />;
  if (lError) return <ErrorState message={lError.message} onRetry={refetch} />;
  if (!table) return <NotFound />;

  const label = tableLabel(table.label);
  const session = live?.session;
  const orders = live?.orders || [];
  const total = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((a, o) => a + o.total, 0);

  function handleFreed(result) {
    navigate("/orders");
    toast(
      (t) => (
        <span>
          {label} is free{" "}
          <button
            className="font-bold underline ml-2"
            onClick={() => {
              reopen.mutate(result.sessionId);
              toast.dismiss(t.id);
            }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 10000 },
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/orders")}
        className="btn-ghost text-sm mb-3 -ml-3"
      >
        <ArrowLeft size={16} /> All tables
      </button>

      <div className="mb-4">
        <h1 className="font-display text-2xl">{label}</h1>
        {session ? (
          <p className="text-sm text-ink/50">
            Open since {formatTime(session.opened_at)} ({durationMin(session.opened_at)}) · {plural(orders.length, "order", "orders")} · {rupee(total)}
          </p>
        ) : (
          <p className="text-sm text-ink/50">
            {label} is free. Orders from its QR code will show up here.
          </p>
        )}
      </div>

      {session && orders.length > 0 && (
        <div className="space-y-3 mb-4">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} tableId={tableId} />
          ))}
        </div>
      )}

      {session && orders.length === 0 && (
        <div className="card text-center py-8 text-ink/50">
          Visit is open but no orders yet.
        </div>
      )}

      {!session && live?.recentlyClosed && (
        <div className="card text-center py-6">
          <p className="text-ink/50 mb-2">
            Freed at {formatTime(live.recentlyClosed.closed_at)}
          </p>
          <button
            onClick={() => reopen.mutate(live.recentlyClosed.id)}
            disabled={reopen.isPending}
            className="btn-ghost text-sm"
          >
            Reopen visit
          </button>
        </div>
      )}

      {session && (
        <div className="sticky bottom-20 md:bottom-4 bg-cream pt-3">
          <div className="card flex items-center justify-between">
            <div>
              <p className="font-bold">{rupee(total)}</p>
              <p className="text-xs text-ink/50">{plural(orders.length, "order", "orders")} · before tax</p>
            </div>
            <button
              onClick={() => setFreeOpen(true)}
              className="btn-secondary text-sm"
            >
              Free table
            </button>
          </div>
        </div>
      )}

      {session && (
        <FreeTableDialog
          open={freeOpen}
          onClose={() => setFreeOpen(false)}
          session={{ ...session, table_id: tableId }}
          orders={orders}
          label={label}
          onFreed={handleFreed}
        />
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto text-center py-20">
      <p className="font-bold text-lg">Table not found</p>
      <p className="text-ink/50 mt-1">This table doesn't exist or was deleted.</p>
    </div>
  );
}
