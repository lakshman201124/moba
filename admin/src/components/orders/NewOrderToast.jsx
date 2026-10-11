import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { BellRing, X } from "lucide-react";
import { rupee, plural } from "../../lib/format";

export function notifyNewOrder(order) {
  toast.custom(
    (t) => (
      <div
        role="status"
        className={`pointer-events-auto flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-[16px] border border-line bg-surface p-3.5 shadow-pop transition-all duration-200 ${
          t.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-soft text-orange-ink animate-pulse-ring">
          <BellRing size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-bold">
            New order <span className="tnum">#{order.order_no}</span>
            {order.table_label && <span className="text-ink-2 font-semibold"> · {order.table_label}</span>}
          </p>
          <p className="text-meta text-ink-2 mt-0.5">
            {plural(order.item_count || 1, "item", "items")} · {rupee(order.total)}
          </p>
          <Link
            to={order.table_id ? `/orders/${order.table_id}` : "/orders/live"}
            onClick={() => toast.dismiss(t.id)}
            className="mt-2 inline-flex text-meta font-bold text-cobalt-ink hover:underline underline-offset-2"
          >
            Open order
          </Link>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="btn btn-ghost btn-icon btn-sm -mr-1 -mt-1" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    ),
    { duration: 8000, id: `order-${order.id}` },
  );
}
