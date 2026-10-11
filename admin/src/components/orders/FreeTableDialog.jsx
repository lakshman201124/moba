import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { freeTable } from "../../services/orderService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import { rupee, plural } from "../../lib/format";
import { ORDER_STATUS } from "../ui/StatusChip";
import ConfirmDialog from "../ui/ConfirmDialog";
import { invalidateOrders } from "../dashboard/WaitingList";

export default function FreeTableDialog({ open, onClose, session, orders, label, onFreed }) {
  const pending = orders.filter((o) => o.status === "placed" || o.status === "preparing");
  const total = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.total, 0);
  const hasPending = pending.length > 0;

  const mutation = useMutation({
    mutationFn: () => freeTable(session.id, orders.length, hasPending),
    onSuccess: (result) => {
      invalidateOrders();
      onClose();
      onFreed(result);
    },
    onError: (err) => {
      const code = err?.code || err?.message;
      queryClient.invalidateQueries({ queryKey: ["table-live", session.table_id] });
      toast.error(code === "SESSION_CHANGED" ? "New orders just arrived at this table. Check them, then free it." : errorMessage(err));
      onClose();
    },
  });

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      title={`Free ${label}?`}
      confirmLabel={hasPending ? "Mark served and free" : "Free table"}
      cancelLabel="Not yet"
      danger={hasPending}
      loading={mutation.isPending}
    >
      {hasPending ? (
        <>
          <p className="flex items-start gap-2 rounded-[10px] bg-orange-soft px-3 py-2.5 text-body text-orange-ink font-semibold">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {plural(pending.length, "order isn't", "orders aren't")} served yet. Freeing the table marks {pending.length === 1 ? "it" : "them"} served.
          </p>
          <ul className="mt-3 space-y-1 text-body text-ink-2">
            {pending.map((o) => (
              <li key={o.id} className="flex justify-between gap-3">
                <span className="tnum">#{o.order_no} · Guest {o.guest_no}</span>
                <span className="font-semibold">{ORDER_STATUS[o.status].label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-meta text-ink-3">If an order is a mistake or a prank, cancel it from its card first.</p>
        </>
      ) : (
        <p className="text-body text-ink-2">
          {plural(orders.length, "order", "orders")} · <span className="font-bold text-ink tnum">{rupee(total)}</span>. The next guests start
          with a fresh order list. You can undo this for 15 minutes.
        </p>
      )}
    </ConfirmDialog>
  );
}
