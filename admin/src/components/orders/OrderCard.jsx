import { Fragment, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Check, ChefHat, Undo2, X, MessageSquareText, MoreHorizontal } from "lucide-react";
import { setOrderStatus } from "../../services/orderService";
import { errorMessage } from "../../lib/errors";
import { formatTime, rupee, minutesSince, tableShort } from "../../lib/format";
import StatusChip from "../ui/StatusChip";
import DietMark from "../ui/DietMark";
import DishThumb from "../ui/DishThumb";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Menu, { MenuItem, MenuSeparator } from "../ui/Menu";
import { invalidateOrders } from "../dashboard/WaitingList";

// The likely next step is a button; corrections and cancelling live in the "⋯" menu.
const ACTIONS = {
  placed: {
    main: [
      { to: "preparing", label: "Accept", icon: ChefHat, kind: "primary" },
      { to: "served", label: "Served", icon: Check, kind: "secondary" },
    ],
    more: [{ to: "cancelled", label: "Cancel order", icon: X, danger: true }],
  },
  preparing: {
    main: [{ to: "served", label: "Mark served", icon: Check, kind: "success" }],
    more: [
      { to: "placed", label: "Back to new", icon: Undo2 },
      { to: "cancelled", label: "Cancel order", icon: X, danger: true },
    ],
  },
  served: { main: [], more: [{ to: "preparing", label: "Back to cooking", icon: Undo2 }] },
  cancelled: { main: [{ to: "placed", label: "Restore", icon: Undo2, kind: "ghost" }], more: [] },
};

const BTN = {
  primary: "btn-primary",
  success: "btn-success",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

const DONE = {
  preparing: (o) => `#${o.order_no} accepted. It's with the kitchen.`,
  served: (o) => `#${o.order_no} marked served.`,
  placed: (o) => `#${o.order_no} is back to new.`,
  cancelled: (o) => `#${o.order_no} cancelled.`,
};

export function useOrderStatus(order) {
  return useMutation({
    mutationFn: ({ from, to, reason }) => setOrderStatus(order.id, from, to, reason),
    onSuccess: (_r, v) => {
      toast.success(DONE[v.to](order), { id: `status-${order.id}` });
      invalidateOrders();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      invalidateOrders();
    },
  });
}

export function ItemLines({ items, images, dense }) {
  return (
    <ul className={dense ? "space-y-2" : "space-y-3"}>
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          {!dense && <DishThumb path={images?.[item.dish_id]} size={40} radius={10} />}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <DietMark diet={item.diet} size={12} slot />
              <p className={`flex-1 min-w-0 ${dense ? "text-meta" : "text-body"} font-semibold leading-snug -mt-px`}>
                {dense && <span className="tnum text-ink-2">{item.qty}× </span>}
                {item.dish_name}
              </p>
              {!dense && <span className="text-meta text-ink-2 tnum whitespace-nowrap">×{item.qty}</span>}
              {!dense && <span className="w-16 text-right text-body font-semibold tnum whitespace-nowrap">{rupee(item.line_total)}</span>}
            </div>
            {(item.size_label || item.choices?.length > 0 || item.addons?.length > 0) && (
              <p className="mt-0.5 text-cap text-ink-3 pl-[34px]">
                {[
                  item.size_label,
                  ...(item.choices || []).map((c) => `${c.label}: ${(c.options || []).join(", ")}`),
                  ...(item.addons || []).map((a) => `+ ${a.name}`),
                ].filter(Boolean).join(" · ")}
              </p>
            )}
            {item.note && (
              <p className="mt-1.5 ml-[34px] inline-flex items-start gap-1.5 rounded-[8px] bg-lemon-soft px-2 py-1 text-cap font-semibold text-lemon-ink shadow-[inset_0_0_0_1px_#EEEAA6]">
                <MessageSquareText size={13} className="mt-px shrink-0" />
                {item.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CancelOrderModal({ open, onClose, order, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Cancel order #${order.order_no}?`}
      description="The guest's phone shows it as cancelled. You can restore it while the table is seated."
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Keep order</button>
          <button
            onClick={() => {
              onConfirm(reason.trim() || null);
              setReason("");
            }}
            disabled={loading}
            className="btn btn-danger"
          >
            Cancel order
          </button>
        </>
      }
    >
      <Field label="Reason" optional hint="Only staff see this.">
        {(p) => (
          <textarea
            {...p}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={140}
            rows={2}
            className="textarea"
            placeholder="e.g. ordered twice, wrong table"
          />
        )}
      </Field>
    </Modal>
  );
}

// One order with its lines and the actions its status allows.
export default function OrderCard({ order, images, variant = "panel", showTable }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const mutation = useOrderStatus(order);
  const actions = ACTIONS[order.status] || { main: [], more: [] };
  const items = order.order_items || [];
  const age = minutesSince(order.created_at);
  const dense = variant === "ticket";
  // "flat" sits inside a panel: hairline-separated sections instead of cards in a card.
  const flat = variant === "flat";
  const pad = flat ? "px-5" : "px-3.5";
  const late = (order.status === "placed" && age >= 8) || (order.status === "preparing" && age >= 25);

  function act(to) {
    if (to === "cancelled") return setCancelOpen(true);
    mutation.mutate({ from: order.status, to });
  }

  return (
    <article
      className={`${flat ? (order.status === "placed" ? "bg-orange-soft/45" : "") : `rounded-[14px] border bg-surface ${order.status === "placed" ? "border-[#FFC9B4]" : "border-line"}`} ${
        order.status === "cancelled" ? "opacity-70" : ""
      }`}
      aria-label={`Order ${order.order_no}`}
    >
      <header className={`flex items-center gap-2 ${pad} ${flat ? "pt-4" : "pt-3"} pb-2.5`}>
        {showTable && (
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-[8px] bg-ink px-1.5 text-cap font-bold text-white">
            {tableShort(order.table?.label)}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-body font-bold">
          <span className="tnum">#{order.order_no}</span>
          <span className="font-medium text-ink-3"> · Guest {order.guest_no}</span>
        </p>
        <span className={`text-cap tnum ${late ? "font-bold text-orange-ink" : "text-ink-3"}`} title={formatTime(order.created_at)}>
          {order.status === "served" || order.status === "cancelled" ? formatTime(order.created_at) : age < 1 ? "now" : `${age} min`}
        </span>
        <StatusChip status={order.status} />
      </header>

      <div className={`${pad} pb-3`}>
        <ItemLines items={items} images={images} dense={dense} />
        {order.status === "cancelled" && order.cancel_reason && (
          <p className="mt-2 text-cap text-ink-3">Cancelled: {order.cancel_reason}</p>
        )}
      </div>

      <footer className={`flex flex-wrap items-center gap-1.5 ${pad} ${flat ? "pb-4 pt-1" : "border-t border-line py-2.5"}`}>
        <p className="mr-auto text-body font-bold tnum">{rupee(order.total)}</p>
        {actions.main.map((a) => (
          <button
            key={a.to}
            onClick={() => act(a.to)}
            disabled={mutation.isPending}
            className={`btn btn-sm ${BTN[a.kind]}`}
          >
            <a.icon size={14} />
            {a.label}
          </button>
        ))}
        {actions.more.length > 0 && (
          <Menu
            label={`More actions for order ${order.order_no}`}
            width={196}
            trigger={(p) => (
              <button {...p} disabled={mutation.isPending} className="btn btn-ghost btn-icon btn-sm">
                <MoreHorizontal size={16} />
              </button>
            )}
          >
            {actions.more.map((a, i) => (
              <Fragment key={a.to}>
                {a.danger && i > 0 && <MenuSeparator />}
                <MenuItem icon={a.icon} danger={a.danger} onSelect={() => act(a.to)}>
                  {a.label}
                </MenuItem>
              </Fragment>
            ))}
          </Menu>
        )}
      </footer>

      <CancelOrderModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        order={order}
        loading={mutation.isPending}
        onConfirm={(reason) => {
          setCancelOpen(false);
          mutation.mutate({ from: order.status, to: "cancelled", reason });
        }}
      />
    </article>
  );
}
