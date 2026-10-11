import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, QrCode, MoreHorizontal, Pencil, ArrowLeft, ArrowRight, Power, Armchair, Printer } from "lucide-react";
import { getTablesOverview, updateTable, reorderTables, getTable } from "../services/tableService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import { isUuid } from "../lib/ids";
import { tableShort, durationMin, plural } from "../lib/format";
import { useMediaQuery, useNow } from "../hooks/useNow";
import { tableState, TableChip } from "../components/ui/StatusChip";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Drawer from "../components/ui/Drawer";
import Menu, { MenuItem, MenuSeparator } from "../components/ui/Menu";
import TableDetail, { printTableCard } from "../components/tables/TableDetail";
import AddTableModal from "../components/tables/AddTableModal";
import { TILE } from "../components/dashboard/TableStatusGrid";
import NotFoundPage from "./NotFoundPage";

export default function TablesPage() {
  useNow(30000);
  const { tableId } = useParams();
  const navigate = useNavigate();
  const xl = useMediaQuery("(min-width: 1280px)");
  const [addOpen, setAddOpen] = useState(false);

  const q = useQuery({ queryKey: ["tables-overview"], queryFn: getTablesOverview, refetchInterval: 60000 });
  const tables = q.data || [];
  const selected = tableId ? tables.find((t) => t.id === tableId) : null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
  const toggle = useMutation({
    mutationFn: ({ id, on }) => updateTable(id, { is_active: on }),
    onSuccess: (_d, { on, label }) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(on ? `${label} takes orders again.` : `${label} is turned off.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const reorder = useMutation({
    mutationFn: (ids) => reorderTables(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["tables-overview"] });
      const before = queryClient.getQueryData(["tables-overview"]);
      queryClient.setQueryData(["tables-overview"], ids.map((id, n) => ({ ...before.find((t) => t.id === id), sortOrder: n + 1 })));
      return { before };
    },
    onError: (e, _ids, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["tables-overview"], ctx.before);
      toast.error(errorMessage(e));
    },
    onSettled: refresh,
  });

  function move(i, d) {
    const ids = tables.map((t) => t.id);
    const [id] = ids.splice(i, 1);
    ids.splice(i + d, 0, id);
    reorder.mutate(ids);
  }

  if (tableId && !isUuid(tableId)) return <NotFoundPage message="That table doesn't exist." backTo="/tables" backLabel="All tables" />;

  const active = tables.filter((t) => t.isActive).length;
  const seats = tables.filter((t) => t.isActive).reduce((a, t) => a + (t.seats || 0), 0);
  const close = () => navigate("/tables");

  const grid = q.error ? (
    <div className="panel"><ErrorState message={errorMessage(q.error)} onRetry={q.refetch} /></div>
  ) : q.isLoading ? (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
      {Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton h-[138px] !rounded-[16px]" />)}
    </div>
  ) : !tables.length ? (
    <div className="panel">
      <EmptyState icon={Armchair} title="No tables yet" message="Add your tables to print a QR code for each one. Guests scan it to order from their seat." action="Add tables" actionIcon={Plus} onAction={() => setAddOpen(true)} />
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-2.5 sm:gap-3">
      {tables.map((t, i) => {
        const s = tableState(t);
        const label = tableShort(t.label);
        const isSel = t.id === tableId;
        return (
          <div
            key={t.id}
            className={`group relative rounded-[16px] border bg-surface p-3.5 shadow-panel transition-[box-shadow,border-color] ${
              isSel ? "!bg-lemon-soft border-[#E2DB55] shadow-[0_0_0_2px_#E2DB55]" : "border-line hover:border-line-strong hover:shadow-raise"
            } ${!t.isActive ? "bg-sunken" : ""}`}
          >
            <button
              onClick={() => navigate(isSel ? "/tables" : `/tables/${t.id}`)}
              className="absolute inset-0 rounded-[16px]"
              aria-label={`${label} details`}
            />
            <div className="pointer-events-none relative flex items-start justify-between gap-2">
              <span className={`inline-flex h-10 min-w-12 items-center justify-center rounded-[10px] border px-2.5 text-title font-extrabold ${TILE[s]}`}>
                {label}
              </span>
              <span className="pointer-events-auto">
                <Menu
                  label={`${label} actions`}
                  width={208}
                  trigger={(p) => (
                    <button {...p} className="btn btn-ghost btn-icon btn-sm -mr-1.5 -mt-1">
                      <MoreHorizontal size={18} />
                    </button>
                  )}
                >
                  <MenuItem icon={Pencil} onSelect={() => navigate(`/tables/${t.id}`)}>Edit details</MenuItem>
                  <MenuItem
                    icon={Printer}
                    onSelect={() => getTable(t.id).then(printTableCard).catch(() => toast.error("Couldn't prepare the card."))}
                  >
                    Print table card
                  </MenuItem>
                  <MenuItem icon={ArrowLeft} disabled={i === 0 || reorder.isPending} onSelect={() => move(i, -1)}>Move earlier</MenuItem>
                  <MenuItem icon={ArrowRight} disabled={i === tables.length - 1 || reorder.isPending} onSelect={() => move(i, 1)}>Move later</MenuItem>
                  <MenuSeparator />
                  <MenuItem
                    icon={Power}
                    disabled={!!t.session}
                    hint={t.session ? "Seated" : undefined}
                    onSelect={() => toggle.mutate({ id: t.id, on: !t.isActive, label })}
                  >
                    {t.isActive ? "Turn off" : "Turn on"}
                  </MenuItem>
                </Menu>
              </span>
            </div>
            <p className="pointer-events-none relative mt-3 text-meta text-ink-2">
              {t.seats ? plural(t.seats, "seat", "seats") : "Seats not set"}
              {t.session && <span className="text-ink-3"> · {durationMin(t.session.openedAt)}</span>}
            </p>
            <div className="pointer-events-none relative mt-2.5 flex items-center justify-between gap-2">
              <TableChip state={s} />
              <QrCode size={18} className="text-ink-3 group-hover:text-ink" aria-hidden="true" />
            </div>
          </div>
        );
      })}
      <button
        onClick={() => setAddOpen(true)}
        className="flex min-h-[124px] flex-col items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-line-strong text-meta font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:bg-surface hover:text-ink"
      >
        <Plus size={18} /> Add table
      </button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Tables"
        subtitle={q.data ? `${plural(active, "table", "tables")} taking orders · ${seats} seats. Each has its own QR code.` : "Your tables and their QR codes."}
        actions={
          <button onClick={() => setAddOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Add table
          </button>
        }
      />

      {xl ? (
        <div className={`grid items-start gap-4 ${selected ? "grid-cols-[minmax(0,1fr)_400px]" : "grid-cols-1"}`}>
          {grid}
          {selected && (
            <aside className="panel sticky top-6 h-[calc(100dvh-140px)] min-h-[560px] overflow-hidden animate-slide-in" aria-label={`${tableShort(selected.label)} details`}>
              <TableDetail key={selected.id} overview={selected} onClose={close} />
            </aside>
          )}
        </div>
      ) : (
        <>
          {grid}
          <Drawer open={!!selected} onClose={close} title={selected ? `${tableShort(selected.label)} details` : ""} width={440} bare>
            {selected && <TableDetail key={selected.id} overview={selected} onClose={close} />}
          </Drawer>
        </>
      )}

      <AddTableModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={(row) => row?.id && navigate(`/tables/${row.id}`)} />
    </>
  );
}
