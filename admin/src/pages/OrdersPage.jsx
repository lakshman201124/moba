import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, ListOrdered, History, Armchair } from "lucide-react";
import { getTablesOverview } from "../services/tableService";
import { getAllDishes } from "../services/dishService";
import { getDashboard } from "../services/dashboardService";
import { isUuid } from "../lib/ids";
import { errorMessage } from "../lib/errors";
import { useWakeLock } from "../hooks/useWakeLock";
import { useMediaQuery, useNow } from "../hooks/useNow";
import { tableState, TABLE_STATE } from "../components/ui/StatusChip";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Drawer from "../components/ui/Drawer";
import { SegmentedLinks } from "../components/ui/Segmented";
import FloorTable from "../components/orders/FloorTable";
import TicketPanel from "../components/orders/TicketPanel";
import LiveBoard from "../components/orders/LiveBoard";
import OrderHistory from "../components/orders/OrderHistory";
import NotFoundPage from "./NotFoundPage";

const DOT = { attention: "bg-orange", occupied: "bg-cobalt", free: "bg-green", disabled: "bg-slate" };

function useDishImages() {
  const q = useQuery({ queryKey: ["dishes-all"], queryFn: getAllDishes, staleTime: 5 * 60000 });
  return useMemo(() => Object.fromEntries((q.data || []).map((d) => [d.id, d.image_path])), [q.data]);
}

export default function OrdersPage({ view }) {
  useWakeLock();
  const { tableId } = useParams();
  const images = useDishImages();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, refetchInterval: 60000 });
  const live = (dash.data?.waiting || 0) + (dash.data?.preparing || 0);

  if (tableId && !isUuid(tableId)) return <NotFoundPage message="That table doesn't exist." backTo="/orders" backLabel="Back to orders" />;

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Accept, cook and serve, table by table."
        actions={
          <SegmentedLinks
            label="Order views"
            items={[
              { to: "/orders", label: "Table view", icon: LayoutGrid, active: view === "floor" },
              { to: "/orders/live", label: "Live orders", icon: ListOrdered, count: live, active: view === "live" },
              { to: "/orders/history", label: "History", icon: History, active: view === "history" },
            ]}
          />
        }
      />
      {view === "live" ? (
        <LiveBoard images={images} />
      ) : view === "history" ? (
        <OrderHistory images={images} />
      ) : (
        <FloorView tableId={tableId} images={images} />
      )}
    </>
  );
}

function FloorView({ tableId, images }) {
  useNow(30000);
  const navigate = useNavigate();
  const xl = useMediaQuery("(min-width: 1280px)");
  const q = useQuery({ queryKey: ["tables-overview"], queryFn: getTablesOverview, refetchInterval: 30000 });
  const tables = q.data || [];
  const selected = tableId ? tables.find((t) => t.id === tableId) : null;
  const close = () => navigate("/orders");

  const counts = { attention: 0, occupied: 0, free: 0, disabled: 0 };
  for (const t of tables) counts[tableState(t)]++;

  if (q.error) return <div className="panel"><ErrorState message={errorMessage(q.error)} onRetry={q.refetch} /></div>;

  const floor = (
    <section
      className="relative rounded-[20px] border border-line bg-[#FAFAF7] p-3 sm:p-4 bg-[linear-gradient(#ECEBE4_1px,transparent_1px),linear-gradient(90deg,#ECEBE4_1px,transparent_1px)] [background-size:44px_44px] [background-position:-1px_-1px]"
      aria-label="Floor plan"
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1.5 pt-0.5">
        {["attention", "occupied", "free", "disabled"].map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-meta text-ink-2">
            <span className={`h-2 w-2 rounded-full ${DOT[k]}`} aria-hidden="true" />
            {TABLE_STATE[k].label}
            <span className="font-bold text-ink tnum">{q.isLoading ? "–" : counts[k]}</span>
          </span>
        ))}
        <span className="ml-auto hidden text-cap text-ink-3 sm:inline">Tap a table to see its orders</span>
      </div>
      {q.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
          {Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton aspect-[160/128]" />)}
        </div>
      ) : !tables.length ? (
        <EmptyState icon={Armchair} title="No tables yet" message="Add your tables in Tables, then print their QR codes." />
      ) : (
        <div className="grid grid-cols-2 min-[520px]:grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1 sm:gap-2">
          {tables.map((t) => (
            <FloorTable key={t.id} table={t} selected={t.id === tableId} onSelect={() => navigate(t.id === tableId ? "/orders" : `/orders/${t.id}`)} />
          ))}
        </div>
      )}
    </section>
  );

  if (xl) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-4">
        {floor}
        <aside className="panel sticky top-6 h-[calc(100dvh-140px)] min-h-[520px] overflow-hidden" aria-label="Table orders">
          {selected ? (
            <TicketPanel key={selected.id} table={selected} images={images} onClose={close} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-lemon-soft text-lemon-ink shadow-[inset_0_0_0_1px_#EEEAA6]">
                <LayoutGrid size={20} />
              </span>
              <p className="mt-3 text-title font-bold">Pick a table</p>
              <p className="mt-1 text-body text-ink-2">
                {counts.attention > 0
                  ? `${counts.attention} ${counts.attention === 1 ? "table has" : "tables have"} a new order. They're marked in orange.`
                  : "Its orders, notes and total show here, with Accept and Free table."}
              </p>
            </div>
          )}
        </aside>
      </div>
    );
  }

  return (
    <>
      {floor}
      <Drawer open={!!selected} onClose={close} title={selected ? `Orders at ${selected.label}` : ""} width={440} bare>
        {selected && <TicketPanel key={selected.id} table={selected} images={images} onClose={close} />}
      </Drawer>
    </>
  );
}
