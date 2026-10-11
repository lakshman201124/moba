import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getTable,
  getTableOrders,
  updateTable,
  deleteTable,
  rotateToken,
} from "../services/tableService";
import { queryClient } from "../lib/queryClient";
import { isUuid } from "../lib/ids";
import { tableLabel, rupee, formatTime } from "../lib/format";
import { errorMessage } from "../lib/errors";
import {
  qrDataUrl,
  qrSvgString,
  tableCardPng,
  downloadBlob,
} from "../lib/qr";
import { useState, useEffect } from "react";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import StatusChip from "../components/ui/StatusChip";
import DietMark from "../components/ui/DietMark";
import toast from "react-hot-toast";
import { ArrowLeft, Download, Share2, RotateCcw, Trash2 } from "lucide-react";

export default function TableDetailPage() {
  const { tableId } = useParams();
  return isUuid(tableId) ? <TableDetailView tableId={tableId} /> : <NotFound />;
}

function TableDetailView({ tableId }) {
  const navigate = useNavigate();

  const {
    data: table,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["table", tableId],
    queryFn: () => getTable(tableId),
  });

  const { data: live } = useQuery({
    queryKey: ["table-live", tableId],
    queryFn: () => getTableOrders(tableId),
    refetchInterval: 15000,
  });

  if (isLoading)
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-60 mb-4" />
        <Skeleton className="h-80" />
      </div>
    );
  if (error)
    return error.code === "PGRST116" ? (
      <NotFound />
    ) : (
      <ErrorState message={error.message} onRetry={refetch} />
    );
  if (!table) return <NotFound />;

  const label = tableLabel(table.label);
  const orders = live?.orders || [];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => navigate("/tables")}
        className="btn-ghost text-sm -ml-3"
      >
        <ArrowLeft size={16} /> All tables
      </button>

      <h1 className="font-display text-2xl">{label}</h1>

      <QrSection table={table} label={label} />
      <EditSection table={table} label={label} />
      <DangerSection
        table={table}
        label={label}
        hasOrders={orders.length > 0}
        navigate={navigate}
      />
      <NowSection orders={orders} label={label} tableId={tableId} />
    </div>
  );
}

function QrSection({ table, label }) {
  const [qrSrc, setQrSrc] = useState(null);

  useEffect(() => {
    qrDataUrl(table.qr_token, 300).then(setQrSrc);
  }, [table.qr_token]);

  async function handleDownloadCard() {
    try {
      const blob = await tableCardPng(
        table.qr_token,
        table.label,
        "/logo-full.webp",
      );
      const name = `moba-table-${table.label.toLowerCase().replace(/\s+/g, "-")}.png`;
      downloadBlob(blob, name);
    } catch {
      toast.error("Couldn't generate the card.");
    }
  }

  async function handleDownloadSvg() {
    try {
      const svg = await qrSvgString(table.qr_token);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const name = `moba-qr-${table.label.toLowerCase().replace(/\s+/g, "-")}.svg`;
      downloadBlob(blob, name);
    } catch {
      toast.error("Couldn't generate the QR.");
    }
  }

  async function handleShare() {
    try {
      const blob = await tableCardPng(
        table.qr_token,
        table.label,
        "/logo-full.webp",
      );
      const file = new File(
        [blob],
        `moba-table-${table.label}.png`,
        { type: "image/png" },
      );
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${label} QR Code`,
          files: [file],
        });
      } else {
        downloadBlob(blob, `moba-table-${table.label}.png`);
      }
    } catch (err) {
      if (err.name !== "AbortError")
        toast.error("Sharing failed. Try downloading.");
    }
  }

  return (
    <div className="card">
      <h2 className="font-bold mb-3">QR Code</h2>
      <div className="flex flex-col items-center gap-4">
        {qrSrc ? (
          <img src={qrSrc} alt={`QR code for ${label}`} className="w-48 h-48" />
        ) : (
          <Skeleton className="w-48 h-48" />
        )}
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={handleDownloadCard} className="btn-primary text-sm">
            <Download size={16} /> Table card
          </button>
          <button onClick={handleDownloadSvg} className="btn-secondary text-sm">
            <Download size={16} /> QR (SVG)
          </button>
          <button onClick={handleShare} className="btn-secondary text-sm">
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSection({ table, label }) {
  const [editLabel, setEditLabel] = useState(table.label);
  const [editSeats, setEditSeats] = useState(table.seats || "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTable(table.id, {
        label: editLabel,
        seats: editSeats ? Number(editSeats) : null,
      });
      queryClient.invalidateQueries({ queryKey: ["table", table.id] });
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      toast.success("Saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="card">
      <h2 className="font-bold mb-3">Edit</h2>
      <label className="block mb-3">
        <span className="text-sm font-semibold">Label</span>
        <input
          required
          maxLength={20}
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm font-semibold">Seats</span>
        <input
          type="number"
          min={1}
          max={50}
          value={editSeats}
          onChange={(e) => setEditSeats(e.target.value)}
          className="mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none"
        />
      </label>
      <button type="submit" disabled={saving} className="btn-primary text-sm">
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function DangerSection({ table, label, hasOrders, navigate }) {
  const [rotateOpen, setRotateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rotate = useMutation({
    mutationFn: () => rotateToken(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table", table.id] });
      toast.success("QR replaced. Print the new one.");
      setRotateOpen(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const del = useMutation({
    mutationFn: () => deleteTable(table.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      toast.success(`${label} deleted.`);
      navigate("/tables");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="card border-nonveg/30">
      <h2 className="font-bold mb-3 text-nonveg">Danger zone</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Replace QR code</p>
            <p className="text-xs text-ink/50">
              The printed QR for {label} will stop working.
            </p>
          </div>
          <button
            onClick={() => setRotateOpen(true)}
            className="btn-ghost text-sm text-nonveg"
          >
            <RotateCcw size={14} /> Replace
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Delete table</p>
            <p className="text-xs text-ink/50">
              {hasOrders
                ? "Turn it off instead — it has order history."
                : "Permanently remove this table."}
            </p>
          </div>
          <button
            onClick={() => setDeleteOpen(true)}
            disabled={hasOrders}
            className="btn-ghost text-sm text-nonveg disabled:opacity-40"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={rotateOpen}
        onClose={() => setRotateOpen(false)}
        onConfirm={() => rotate.mutate()}
        title="Replace QR code?"
        message={`The printed QR for ${label} will stop working right away. You'll need to print the new one.`}
        confirmLabel="Replace"
        danger
        loading={rotate.isPending}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => del.mutate()}
        title={`Delete ${label}?`}
        message="This can't be undone. Past orders won't be affected."
        confirmLabel="Delete"
        danger
        loading={del.isPending}
      />
    </div>
  );
}

function NowSection({ orders, label, tableId }) {
  if (!orders.length) {
    return (
      <div className="card">
        <h2 className="font-bold mb-2">Now at this table</h2>
        <p className="text-sm text-ink/50">
          No one is ordering at this table right now.
        </p>
      </div>
    );
  }

  const byGuest = {};
  for (const o of orders) {
    const g = o.guest_no;
    if (!byGuest[g]) byGuest[g] = [];
    byGuest[g].push(o);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Now at this table</h2>
        <Link
          to={`/orders/${tableId}`}
          className="text-sm font-semibold text-cobalt"
        >
          Manage in Orders →
        </Link>
      </div>
      {Object.entries(byGuest).map(([guest, guestOrders]) => (
        <div key={guest} className="mb-4 last:mb-0">
          <p className="text-xs font-bold text-ink/50 mb-1">Guest {guest}</p>
          {guestOrders.map((o) => (
            <div key={o.id} className="mb-2">
              <div className="flex items-center gap-2 text-sm mb-1">
                <span className="font-semibold">#{o.order_no}</span>
                <StatusChip status={o.status} />
              </div>
              {(o.order_items || []).map((item) => (
                <div key={item.id} className="flex gap-2 text-xs text-ink/70 ml-2">
                  <DietMark diet={item.diet} size={10} />
                  <span>
                    {item.qty > 1 ? `${item.qty}× ` : ""}
                    {item.dish_name}
                    {item.note && (
                      <span className="bg-lemon px-1 rounded ml-1">
                        "{item.note}"
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function NotFound() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto text-center py-20">
      <p className="font-bold text-lg">Table not found</p>
      <p className="text-ink/50 mt-1">
        This table doesn't exist or was deleted.
      </p>
    </div>
  );
}
