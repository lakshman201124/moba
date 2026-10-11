import { Fragment, useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ReceiptText, Search } from "lucide-react";
import { getOrderHistory } from "../../services/orderService";
import { RANGES, rangeWindow } from "../../lib/analytics";
import { errorMessage } from "../../lib/errors";
import { formatDateTime, formatTime, rupee, tableShort } from "../../lib/format";
import StatusChip from "../ui/StatusChip";
import ErrorState from "../ui/ErrorState";
import EmptyState from "../ui/EmptyState";
import RangeSelect from "../dashboard/RangeSelect";
import { Segmented } from "../ui/Segmented";
import { ItemLines } from "./OrderCard";

const PAGE = 25;
const STATUSES = [
  { value: "all", label: "All" },
  { value: "served", label: "Served" },
  { value: "preparing", label: "Cooking" },
  { value: "placed", label: "New" },
  { value: "cancelled", label: "Cancelled" },
];

function summary(items = []) {
  const names = items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.dish_name}` : i.dish_name));
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
}

export default function OrderHistory({ images }) {
  const [range, setRange] = useState("today");
  const [status, setStatus] = useState("all");
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(term), 300);
    return () => clearTimeout(t);
  }, [term]);
  useEffect(() => setPage(0), [range, status, search]);

  const q = useQuery({
    queryKey: ["order-history", range, status, search, page],
    queryFn: () => {
      const w = rangeWindow(range);
      return getOrderHistory({
        from: new Date(w.from).toISOString(),
        to: new Date(w.to).toISOString(),
        status,
        search,
        page,
        pageSize: PAGE,
      });
    },
    placeholderData: keepPreviousData,
  });

  const rows = q.data?.rows || [];
  const count = q.data?.count || 0;
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const multiDay = range === "week" || range === "month";

  return (
    <section className="panel overflow-hidden" aria-label="Order history">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
        <RangeSelect value={range} onChange={setRange} />
        <Segmented label="Status" value={status} onChange={setStatus} options={STATUSES} plain size="sm" />
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Search orders</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Order number or table"
            className="input pl-9"
            inputMode="search"
          />
        </label>
      </div>

      {q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} />
      ) : q.isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : !rows.length ? (
        <EmptyState
          icon={ReceiptText}
          title={search ? "No order matches that" : "No orders in this period"}
          message={search ? "Search by order number (like 1042) or table name (like T4)." : "Try a longer date range."}
        />
      ) : (
        <div className={`transition-opacity ${q.isPlaceholderData ? "opacity-60" : ""}`}>
          <table className="hidden w-full text-left md:table">
            <thead>
              <tr className="bg-sunken text-cap font-semibold text-ink-3">
                <th className="py-2.5 pl-5 pr-3 font-semibold">Order</th>
                <th className="px-3 font-semibold">{multiDay ? "Placed" : "Time"}</th>
                <th className="px-3 font-semibold">Table</th>
                <th className="px-3 font-semibold">Items</th>
                <th className="px-3 text-right font-semibold">Total</th>
                <th className="px-3 font-semibold">Status</th>
                <th className="w-12 pr-4" aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const isOpen = open === o.id;
                return (
                  <Fragment key={o.id}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : o.id)}
                      className={`cursor-pointer border-t border-line text-body transition-colors hover:bg-sunken ${isOpen ? "bg-sunken" : ""}`}
                    >
                      <td className="py-3 pl-5 pr-3 font-bold tnum">#{o.order_no}</td>
                      <td className="px-3 text-ink-2 tnum whitespace-nowrap">{multiDay ? formatDateTime(o.created_at) : formatTime(o.created_at)}</td>
                      <td className="px-3 whitespace-nowrap">
                        <span className="font-semibold">{tableShort(o.table?.label)}</span>
                        <span className="text-ink-3"> · Guest {o.guest_no}</span>
                      </td>
                      <td className="px-3 text-ink-2 max-w-[340px] truncate">{summary(o.order_items)}</td>
                      <td className="px-3 text-right font-semibold tnum">{rupee(o.total)}</td>
                      <td className="px-3"><StatusChip status={o.status} /></td>
                      <td className="pr-4 text-right">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Hide" : "Show"} items for order ${o.order_no}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(isOpen ? null : o.id);
                          }}
                        >
                          <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-sunken">
                        <td colSpan={7} className="px-5 pb-4">
                          <div className="rounded-[14px] border border-line bg-surface p-4 max-w-[640px]">
                            <ItemLines items={o.order_items || []} images={images} />
                            {o.cancel_reason && <p className="mt-3 text-meta text-ink-3">Cancelled: {o.cancel_reason}</p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <ul className="md:hidden divide-line">
            {rows.map((o) => {
              const isOpen = open === o.id;
              return (
                <li key={o.id}>
                  <button onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-[9px] bg-sunken border border-line px-1.5 text-cap font-bold">
                      {tableShort(o.table?.label)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-bold tnum">#{o.order_no} <span className="font-medium text-ink-3">· {multiDay ? formatDateTime(o.created_at) : formatTime(o.created_at)}</span></span>
                      <span className="block truncate text-cap text-ink-3">{summary(o.order_items)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-body font-semibold tnum">{rupee(o.total)}</span>
                      <StatusChip status={o.status} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <ItemLines items={o.order_items || []} images={images} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <p className="text-meta text-ink-3 tnum">
              {page * PAGE + 1}–{Math.min(count, (page + 1) * PAGE)} of {count.toLocaleString("en-IN")} orders
            </p>
            <div className="flex gap-1.5">
              <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={15} /> Newer
              </button>
              <button className="btn btn-secondary btn-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                Older <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
