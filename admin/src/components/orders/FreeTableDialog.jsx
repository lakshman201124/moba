import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { freeTable } from "../../services/orderService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import { rupee, plural } from "../../lib/format";
import ConfirmDialog from "../ui/ConfirmDialog";
import toast from "react-hot-toast";

export default function FreeTableDialog({
  open,
  onClose,
  session,
  orders,
  label,
  onFreed,
}) {
  const [servePending, setServePending] = useState(false);

  const pending = orders.filter(
    (o) => o.status === "placed" || o.status === "preparing",
  );
  const total = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((a, o) => a + o.total, 0);

  const mutation = useMutation({
    mutationFn: () =>
      freeTable(session.id, orders.length, pending.length > 0),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
      onFreed(result);
    },
    onError: (err) => {
      const code = err?.code || err?.message;
      if (code === "SESSION_CHANGED") {
        queryClient.invalidateQueries({
          queryKey: ["table-live", session.table_id],
        });
        toast.error("New orders arrived. Refresh and try again.");
        onClose();
      } else {
        toast.error(errorMessage(err));
      }
    },
  });

  const hasPending = pending.length > 0;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      title={`Free ${label}?`}
      confirmLabel={hasPending ? "Mark served & free" : "Free table"}
      danger={hasPending}
      loading={mutation.isPending}
    >
      {hasPending ? (
        <>
          <p className="text-ink/70 mb-2">
            {plural(pending.length, "order isn't", "orders aren't")} marked
            served yet:
          </p>
          <ul className="text-sm text-ink/60 list-disc ml-5 mb-3">
            {pending.map((o) => (
              <li key={o.id}>
                #{o.order_no} · Guest {o.guest_no} — {o.status}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink/50">
            Ghost or prank orders should be cancelled from their cards first.
          </p>
        </>
      ) : (
        <p className="text-ink/70">
          {plural(orders.length, "order", "orders")} · {rupee(total)}. The next
          guests start with a fresh order list.
        </p>
      )}
    </ConfirmDialog>
  );
}
