import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ChefHat, DoorOpen, Undo2, X, Ban, Armchair } from "lucide-react";
import { getTableOrders } from "../../services/tableService";
import { reopenSession, setOrderStatus } from "../../services/orderService";
import { errorMessage } from "../../lib/errors";
import { tableShort, tableTitle, formatTime, durationMin, rupee, plural } from "../../lib/format";
import { tableState, TableChip } from "../ui/StatusChip";
import OrderCard from "./OrderCard";
import FreeTableDialog from "./FreeTableDialog";
import { invalidateOrders } from "../dashboard/WaitingList";
import { useNow } from "../../hooks/useNow";

function useReopen(label) {
  return useMutation({
    mutationFn: (sessionId) => reopenSession(sessionId),
    onSuccess: () => {
      invalidateOrders();
      toast.success(`${label} reopened with its orders.`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

// The live ticket for one table: every order of the current visit, and the table's actions.
export default function TicketPanel({ table, images, onClose }) {
  useNow(30000);
  const navigate = useNavigate();
  const [freeOpen, setFreeOpen] = useState(false);
  const label = tableShort(table.label);
  const state = tableState(table);

  const live = useQuery({
    queryKey: ["table-live", table.id],
    queryFn: () => getTableOrders(table.id),
    refetchInterval: 15000,
  });
  const reopen = useReopen(label);

  const session = live.data?.session;
  const orders = live.data?.orders || [];
  const placed = orders.filter((o) => o.status === "placed");
  const total = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.total, 0);

  const acceptAll = useMutation({
    mutationFn: async () => {
      for (const o of placed) await setOrderStatus(o.id, "placed", "preparing");
    },
    onSuccess: () => toast.success(`${plural(placed.length, "order", "orders")} accepted for ${label}.`),
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: invalidateOrders,
  });

  function handleFreed(result) {
    navigate("/orders");
    toast(
      (t) => (
        <span className="flex items-center gap-3">
          {label} is free.
          <button
            className="font-bold text-cobalt-ink underline underline-offset-2"
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
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h2 font-bold tracking-[-0.02em]">{tableTitle(table.label)}</h2>
            <TableChip state={state} />
          </div>
          <p className="mt-1 text-meta text-ink-3">
            {table.seats ? `${table.seats} seats` : "Seats not set"}
            {session && (
              <>
                {" · "}Seated {formatTime(session.opened_at)} · <span className="tnum">{durationMin(session.opened_at)}</span>
              </>
            )}
          </p>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm -mr-1.5" aria-label="Close table">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto divide-line">
        {live.isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 2 }, (_, i) => <div key={i} className="skeleton h-36" />)}</div>
        ) : live.error ? (
          <p className="p-5 text-body text-red">{errorMessage(live.error)}</p>
        ) : !table.isActive ? (
          <div className="px-5 py-10 text-center">
            <Ban size={22} className="mx-auto text-ink-3" />
            <p className="mt-2 text-title font-bold">{label} is turned off</p>
            <p className="mt-1 text-body text-ink-2">Its QR code can't take orders. Turn it back on in Tables.</p>
            <Link to={`/tables/${table.id}`} className="btn btn-secondary mt-4">Open in Tables</Link>
          </div>
        ) : !session ? (
          <div className="px-5 py-10 text-center">
            <Armchair size={22} className="mx-auto text-green-ink" />
            <p className="mt-2 text-title font-bold">{label} is free</p>
            <p className="mt-1 text-body text-ink-2 max-w-[34ch] mx-auto">When guests scan its QR code and order, their orders show up here.</p>
            {live.data?.recentlyClosed && (
              <button onClick={() => reopen.mutate(live.data.recentlyClosed.id)} disabled={reopen.isPending} className="btn btn-secondary mt-4">
                <Undo2 size={15} /> Reopen visit freed at {formatTime(live.data.recentlyClosed.closed_at)}
              </button>
            )}
          </div>
        ) : !orders.length ? (
          <p className="px-5 py-10 text-center text-body text-ink-2">The table is seated but hasn't ordered yet.</p>
        ) : (
          orders.map((o) => <OrderCard key={o.id} order={o} images={images} variant="flat" />)
        )}
      </div>

      {session && (
        <footer className="border-t border-line px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] bg-surface">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-meta text-ink-2">Table total</p>
              <p className="text-cap text-ink-3">{plural(orders.length, "order", "orders")} · before tax</p>
            </div>
            <p className="text-h1 font-bold tracking-[-0.02em]">{rupee(total)}</p>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {placed.length > 0 ? (
              <button onClick={() => acceptAll.mutate()} disabled={acceptAll.isPending} className="btn btn-primary btn-lg">
                <ChefHat size={17} />
                {acceptAll.isPending ? "Accepting…" : placed.length > 1 ? `Accept ${placed.length} new` : "Accept order"}
              </button>
            ) : (
              <Link to="/orders/live" className="btn btn-secondary btn-lg">Kitchen board</Link>
            )}
            <button onClick={() => setFreeOpen(true)} className="btn btn-danger-outline btn-lg">
              <DoorOpen size={17} /> Free table
            </button>
          </div>
        </footer>
      )}

      {session && (
        <FreeTableDialog
          open={freeOpen}
          onClose={() => setFreeOpen(false)}
          session={{ ...session, table_id: table.id }}
          orders={orders}
          label={label}
          onFreed={handleFreed}
        />
      )}
    </div>
  );
}
