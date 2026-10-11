import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, ChefHat, CircleCheckBig } from "lucide-react";
import { getActiveOrders } from "../../services/orderService";
import { errorMessage } from "../../lib/errors";
import { useNow, useMediaQuery } from "../../hooks/useNow";
import OrderCard from "./OrderCard";
import ErrorState from "../ui/ErrorState";
import { Segmented } from "../ui/Segmented";

const COLUMNS = [
  { status: "placed", title: "New", hint: "Waiting for staff to accept", icon: BellRing, dot: "bg-orange", empty: "No new orders. They appear here the moment a table orders." },
  { status: "preparing", title: "Cooking", hint: "Accepted, with the kitchen", icon: ChefHat, dot: "bg-cobalt", empty: "Nothing cooking right now." },
  { status: "served", title: "Served", hint: "At tables still seated", icon: CircleCheckBig, dot: "bg-green", empty: "Served orders stay here until the table is freed." },
];

// The kitchen pass: every order at a seated table, by stage.
export default function LiveBoard({ images }) {
  useNow(30000);
  const wide = useMediaQuery("(min-width: 1024px)");
  const [col, setCol] = useState("placed");
  const q = useQuery({ queryKey: ["active-orders"], queryFn: getActiveOrders, refetchInterval: 20000 });

  if (q.error) return <div className="panel"><ErrorState message={errorMessage(q.error)} onRetry={q.refetch} /></div>;

  const by = (s) => (q.data || []).filter((o) => o.status === s);
  const served = by("served").reverse();
  const lists = { placed: by("placed"), preparing: by("preparing"), served };
  const shown = wide ? COLUMNS : COLUMNS.filter((c) => c.status === col);

  return (
    <div>
      {!wide && (
        <div className="mb-3">
          <Segmented
            label="Stage"
            value={col}
            onChange={setCol}
            plain
            options={COLUMNS.map((c) => ({ value: c.status, label: c.title, count: lists[c.status].length }))}
          />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {shown.map((c) => (
          <section key={c.status} className="rounded-[18px] bg-[#EDEDE7] p-2 min-w-0" aria-labelledby={`col-${c.status}`}>
            <header className="flex items-center gap-2 px-2.5 pt-1.5 pb-2.5">
              <span className={`h-2 w-2 rounded-full ${c.dot}`} aria-hidden="true" />
              <h2 id={`col-${c.status}`} className="text-body font-bold">{c.title}</h2>
              <span className="tab-count !bg-surface tnum">{q.isLoading ? "–" : lists[c.status].length}</span>
              <span className="ml-auto hidden text-cap text-ink-3 xl:inline">{c.hint}</span>
            </header>
            <div className="space-y-2">
              {q.isLoading ? (
                Array.from({ length: 2 }, (_, i) => <div key={i} className="skeleton h-36 !bg-surface" />)
              ) : !lists[c.status].length ? (
                <div className="rounded-[14px] border border-dashed border-line-strong px-4 py-8 text-center">
                  <c.icon size={18} className="mx-auto text-ink-3" />
                  <p className="mt-2 text-meta text-ink-2 max-w-[30ch] mx-auto">{c.empty}</p>
                </div>
              ) : (
                lists[c.status].map((o) => <OrderCard key={o.id} order={o} images={images} variant="ticket" showTable />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
