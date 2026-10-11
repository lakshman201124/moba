import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getTablesOverview,
  createTable,
  createTableRange,
  updateTable,
  reorderTables,
} from "../services/tableService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import { tableLabel, durationMin } from "../lib/format";
import { useState } from "react";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Switch from "../components/ui/Switch";
import toast from "react-hot-toast";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";

export default function TablesPage() {
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  const { data: tables, isLoading, error, refetch } = useQuery({
    queryKey: ["tables-overview"],
    queryFn: getTablesOverview,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => updateTable(id, { is_active: active }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] }),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const reorder = useMutation({
    mutationFn: (ids) => reorderTables(ids),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] }),
    onError: (err) => toast.error(errorMessage(err)),
  });

  function moveTable(idx, dir) {
    const ids = tables.map((t) => t.id);
    const [id] = ids.splice(idx, 1);
    ids.splice(idx + dir, 0, id);
    reorder.mutate(ids);
  }

  if (isLoading)
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-16" count={6} />
      </div>
    );
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl">Tables</h1>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
          <Plus size={16} /> Add table
        </button>
      </div>

      {!tables?.length ? (
        <EmptyState
          title="No tables yet"
          message="Add your tables to print their QR codes."
          action="Add tables"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {tables.map((t, i) => (
            <div
              key={t.id}
              className="card flex items-center gap-3 cursor-pointer hover:border-cobalt transition-colors"
              onClick={() => navigate(`/tables/${t.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{tableLabel(t.label)}</p>
                <p className="text-xs text-ink/50">
                  {t.seats ? `${t.seats} seats` : ""}
                  {t.session
                    ? ` · Occupied for ${durationMin(t.session.openedAt)}`
                    : " · Free"}
                </p>
              </div>

              <Switch
                checked={t.isActive}
                onChange={(on) => {
                  if (t.session) {
                    toast.error("Free the table first.");
                    return;
                  }
                  toggleActive.mutate({ id: t.id, active: on });
                }}
                disabled={!!t.session || toggleActive.isPending}
                label=""
              />

              <div
                className="flex flex-col gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => moveTable(i, -1)}
                  disabled={i === 0 || reorder.isPending}
                  className="p-1 rounded hover:bg-ink/6 disabled:opacity-20"
                  aria-label="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveTable(i, 1)}
                  disabled={i === tables.length - 1 || reorder.isPending}
                  className="p-1 rounded hover:bg-ink/6 disabled:opacity-20"
                  aria-label="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTableModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

function AddTableModal({ open, onClose }) {
  const [mode, setMode] = useState("one");
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [prefix, setPrefix] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOne(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await createTable(label, seats ? Number(seats) : null);
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      toast.success(`${tableLabel(label)} added.`);
      onClose();
      setLabel("");
      setSeats("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRange(e) {
    e.preventDefault();
    const f = Number(from);
    const t = Number(to);
    if (f > t || t - f > 49) {
      toast.error("Range must be 1–50 tables.");
      return;
    }
    setLoading(true);
    try {
      await createTableRange(f, t, prefix);
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      toast.success(`${t - f + 1} tables added.`);
      onClose();
      setFrom("");
      setTo("");
      setPrefix("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add table">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("one")}
          className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
            mode === "one"
              ? "border-cobalt bg-cobalt text-white"
              : "border-line"
          }`}
        >
          One table
        </button>
        <button
          onClick={() => setMode("range")}
          className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
            mode === "range"
              ? "border-cobalt bg-cobalt text-white"
              : "border-line"
          }`}
        >
          A range
        </button>
      </div>

      {mode === "one" ? (
        <form onSubmit={handleOne}>
          <label className="block mb-3">
            <span className="text-sm font-semibold">Label</span>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={20}
              className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
              placeholder="e.g. 1, T5, Bar Left"
            />
          </label>
          <label className="block mb-4">
            <span className="text-sm font-semibold">Seats (optional)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Adding…" : "Add table"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRange}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-sm font-semibold">From</span>
              <input
                type="number"
                required
                min={1}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">To</span>
              <input
                type="number"
                required
                min={1}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
              />
            </label>
          </div>
          <label className="block mb-4">
            <span className="text-sm font-semibold">
              Prefix (optional, e.g. "T")
            </span>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              maxLength={10}
              className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Adding…" : "Add tables"}
          </button>
        </form>
      )}
    </Modal>
  );
}
