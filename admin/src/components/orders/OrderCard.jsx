import { useMutation } from "@tanstack/react-query";
import { setOrderStatus } from "../../services/orderService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import { formatTime, rupee } from "../../lib/format";
import StatusChip from "../ui/StatusChip";
import DietMark from "../ui/DietMark";
import toast from "react-hot-toast";
import { useState } from "react";
import Modal from "../ui/Modal";

const ACTIONS = {
  placed: [
    { to: "preparing", label: "Accept", primary: true },
    { to: "served", label: "Served" },
    { to: "cancelled", label: "Cancel", danger: true },
  ],
  preparing: [
    { to: "served", label: "Served", primary: true },
    { to: "cancelled", label: "Cancel", danger: true },
  ],
  served: [{ to: "preparing", label: "Undo" }],
  cancelled: [{ to: "placed", label: "Undo" }],
};

export default function OrderCard({ order, tableId }) {
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const mutation = useMutation({
    mutationFn: ({ from, to, reason }) =>
      setOrderStatus(order.id, from, to, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-live", tableId] });
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-orders"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  function doAction(to) {
    if (to === "cancelled") {
      setCancelModal(true);
      return;
    }
    mutation.mutate({ from: order.status, to });
  }

  function confirmCancel() {
    mutation.mutate({
      from: order.status,
      to: "cancelled",
      reason: cancelReason || null,
    });
    setCancelModal(false);
    setCancelReason("");
  }

  const actions = ACTIONS[order.status] || [];
  const items = order.order_items || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-sm">#{order.order_no}</span>
          <span className="text-ink/50 text-sm ml-2">
            Guest {order.guest_no} · {formatTime(order.created_at)}
          </span>
        </div>
        <StatusChip status={order.status} />
      </div>

      <div className="space-y-2 mb-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-2 text-sm">
            <DietMark diet={item.diet} size={12} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {item.qty > 1 && <span className="text-ink/50">{item.qty}× </span>}
                {item.dish_name}
              </p>
              {item.size_label && (
                <p className="text-xs text-ink/50">{item.size_label}</p>
              )}
              {item.choices?.map((c, i) => (
                <p key={i} className="text-xs text-ink/50">
                  {c.label}: {c.options?.join(", ")}
                </p>
              ))}
              {item.addons?.map((a, i) => (
                <p key={i} className="text-xs text-ink/50">+ {a.name}</p>
              ))}
              {item.note && (
                <p className="text-xs bg-lemon px-2 py-0.5 rounded mt-0.5 inline-block">
                  "{item.note}"
                </p>
              )}
            </div>
            <span className="text-xs text-ink/50 whitespace-nowrap">
              {rupee(item.line_total)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t-2 border-line">
        <span className="font-bold">{rupee(order.total)}</span>
        <div className="flex gap-2">
          {actions.map((a) => (
            <button
              key={a.to}
              onClick={() => doAction(a.to)}
              disabled={mutation.isPending}
              className={
                a.primary
                  ? "btn-primary text-sm py-2 px-4"
                  : a.danger
                    ? "btn-ghost text-sm py-2 px-3 text-nonveg"
                    : "btn-ghost text-sm py-2 px-3"
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <Modal
        open={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Cancel order"
      >
        <p className="text-sm text-ink/60 mb-3">
          Optional reason (only staff see this):
        </p>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          maxLength={140}
          rows={2}
          className="w-full rounded-lg border-2 border-line bg-cream px-3 py-2 text-sm focus:border-cobalt focus:outline-none mb-4"
          placeholder="e.g. ghost order, wrong table"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setCancelModal(false)}
            className="btn-secondary"
          >
            Keep
          </button>
          <button onClick={confirmCancel} className="btn-danger">
            Cancel order
          </button>
        </div>
      </Modal>
    </div>
  );
}
