import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Download, QrCode, Share2, Printer, RotateCcw, Trash2, X, ArrowRight, Minus, Plus } from "lucide-react";
import { updateTable, deleteTable, rotateToken, getTable } from "../../services/tableService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import { qrDataUrl, qrSvgString, tableCardPng, downloadBlob, tableUrl } from "../../lib/qr";
import { tableShort, tableTitle, durationMin, rupee, plural } from "../../lib/format";
import { tableState, TableChip } from "../ui/StatusChip";
import { TableGlyph } from "../orders/FloorTable";
import Switch from "../ui/Switch";
import Field from "../ui/Field";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useQuery } from "@tanstack/react-query";

const fileName = (label) => label.toLowerCase().replace(/\s+/g, "-");

function refresh(id) {
  queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
  queryClient.invalidateQueries({ queryKey: ["table", id] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export async function printTableCard(table) {
  const blob = await tableCardPng(table.qr_token, table.label, "/logo-full.webp");
  const url = URL.createObjectURL(blob);
  const holder = document.createElement("div");
  holder.className = "print-only";
  const img = new Image();
  img.alt = "";
  holder.appendChild(img);
  document.body.appendChild(holder);
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  window.print();
  setTimeout(() => {
    holder.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function ActionRow({ icon: Icon, children, hint, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left transition-colors disabled:opacity-45 ${
        danger ? "border-[#F4D3CF] text-red hover:bg-red-soft" : "border-line hover:bg-sunken"
      }`}
    >
      <Icon size={18} className={danger ? "" : "text-ink-2"} />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">{children}</span>
        {hint && <span className={`block text-cap ${danger ? "text-red/80" : "text-ink-3"}`}>{hint}</span>}
      </span>
    </button>
  );
}

export default function TableDetail({ overview, onClose }) {
  const navigate = useNavigate();
  const id = overview.id;
  const tq = useQuery({ queryKey: ["table", id], queryFn: () => getTable(id) });
  const table = tq.data;
  const state = tableState(overview);
  const session = overview.session;

  const [label, setLabel] = useState(overview.label);
  const [seats, setSeats] = useState(overview.seats || "");
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    setLabel(overview.label);
    setSeats(overview.seats || "");
  }, [overview.id, overview.label, overview.seats]);

  useEffect(() => {
    if (!table?.qr_token) return;
    let live = true;
    qrDataUrl(table.qr_token, 360).then((u) => live && setQr(u));
    return () => {
      live = false;
    };
  }, [table?.qr_token]);

  const dirty = label.trim() !== overview.label || String(seats || "") !== String(overview.seats || "");
  const seatsNum = seats === "" ? null : Number(seats);
  const labelError = !label.trim() ? "Give the table a name, like T5 or Patio 2." : null;

  const save = useMutation({
    mutationFn: () => updateTable(id, { label: label.trim(), seats: seatsNum }),
    onSuccess: () => {
      refresh(id);
      toast.success(`${tableShort(label.trim())} saved.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const active = useMutation({
    mutationFn: (on) => updateTable(id, { is_active: on }),
    onSuccess: (_d, on) => {
      refresh(id);
      toast.success(on ? `${tableShort(overview.label)} takes orders again.` : `${tableShort(overview.label)} is turned off. Its QR can't order.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const rotate = useMutation({
    mutationFn: () => rotateToken(id),
    onSuccess: () => {
      refresh(id);
      setConfirm(null);
      toast.success("New QR code made. Print it and replace the old one.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      toast.success(`${tableShort(overview.label)} deleted.`);
      navigate("/tables", { replace: true });
    },
    onError: (e) => {
      setConfirm(null);
      toast.error(errorMessage(e));
    },
  });

  async function run(kind, fn) {
    if (!table) return;
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("That didn't work. Try downloading the card instead.");
    } finally {
      setBusy(null);
    }
  }

  const card = () => tableCardPng(table.qr_token, table.label, "/logo-full.webp");

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h2 font-bold tracking-[-0.02em]">{tableTitle(overview.label)}</h2>
            <TableChip state={state} />
          </div>
          <p className="mt-1 text-meta text-ink-3">{overview.seats ? plural(overview.seats, "seat", "seats") : "Seats not set"}</p>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm -mr-1.5" aria-label="Close table details">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 divide-line [&>*]:py-5">
        <div className="grid grid-cols-2 gap-3">
          <figure className="relative flex aspect-[160/128] items-center justify-center rounded-[14px] bg-[#FAFAF7] bg-[linear-gradient(#ECEBE5_1px,transparent_1px),linear-gradient(90deg,#ECEBE5_1px,transparent_1px)] [background-size:22px_22px]">
            <TableGlyph seats={seatsNum || overview.seats} state={state} />
            <figcaption className="relative text-title font-extrabold">{tableShort(label.trim() || overview.label)}</figcaption>
          </figure>
          <div className="flex aspect-[160/128] items-center justify-center rounded-[14px] bg-white shadow-[0_0_0_1px_var(--color-line)]">
            {qr ? <img src={qr} alt={`QR code for ${tableShort(overview.label)}`} className="h-[86%] w-auto" /> : <div className="skeleton h-[80%] aspect-square" />}
          </div>
          <div className="col-span-2 min-w-0">
            <p className="text-body font-bold flex items-center gap-1.5"><QrCode size={15} /> Table QR code</p>
            <p className="mt-0.5 text-cap text-ink-2">Guests scan it to open the menu and order from this table.</p>
            <p className="mt-1 text-cap text-ink-3 break-all">{table ? tableUrl(table.qr_token) : "…"}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!labelError && dirty) save.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Table name" error={dirty ? labelError : null} hint="Printed on the card. Short is best: T5, Patio 2.">
            {(p) => <input {...p} className="input" maxLength={20} value={label} onChange={(e) => setLabel(e.target.value)} />}
          </Field>
          <Field label="Seats">
            {(p) => (
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-secondary btn-icon" aria-label="Fewer seats" disabled={!seatsNum || seatsNum <= 1} onClick={() => setSeats(Math.max(1, (seatsNum || 1) - 1))}>
                  <Minus size={16} />
                </button>
                <input {...p} type="number" min={1} max={50} className="input w-20 text-center" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="–" />
                <button type="button" className="btn btn-secondary btn-icon" aria-label="More seats" disabled={seatsNum >= 50} onClick={() => setSeats(Math.min(50, (seatsNum || 0) + 1))}>
                  <Plus size={16} />
                </button>
              </div>
            )}
          </Field>
          {dirty && (
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={save.isPending || !!labelError}>
                {save.isPending ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setLabel(overview.label); setSeats(overview.seats || ""); }}>
                Discard
              </button>
            </div>
          )}
        </form>

        <Switch
          checked={overview.isActive}
          onChange={(on) => active.mutate(on)}
          disabled={active.isPending || !!session}
          label="Takes orders"
          description={session ? "Free the table first to turn it off." : overview.isActive ? "Guests at this table can order from its QR." : "Off: its QR shows the menu but can't order."}
        />

        {session && (
          <Link to={`/orders/${id}`} className="group flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cobalt" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-bold">Seated for {durationMin(session.openedAt)}</span>
              <span className="block text-cap text-ink-2">
                {plural(session.orders, "order", "orders")} · {rupee(session.total)}
                {session.placed > 0 && ` · ${session.placed} new`}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-meta font-bold text-cobalt-ink group-hover:underline underline-offset-2">Orders <ArrowRight size={14} /></span>
          </Link>
        )}

        <div className="space-y-2">
          <p className="text-meta font-bold text-ink-2">Print and share</p>
          <ActionRow icon={Download} hint="Logo, table name and QR, ready to print" disabled={!table || busy} onClick={() => run("card", async () => downloadBlob(await card(), `moba-table-${fileName(table.label)}.png`))}>
            {busy === "card" ? "Making the card…" : "Download table card"}
          </ActionRow>
          <ActionRow icon={QrCode} hint="Just the code, as a sharp SVG" disabled={!table || busy} onClick={() => run("svg", async () => downloadBlob(new Blob([await qrSvgString(table.qr_token)], { type: "image/svg+xml" }), `moba-qr-${fileName(table.label)}.svg`))}>
            Download QR code
          </ActionRow>
          <ActionRow
            icon={Share2}
            hint="Send the card to a printer shop or WhatsApp"
            disabled={!table || busy}
            onClick={() =>
              run("share", async () => {
                const blob = await card();
                const file = new File([blob], `moba-table-${fileName(table.label)}.png`, { type: "image/png" });
                if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: `${tableTitle(table.label)} QR card`, files: [file] });
                else {
                  downloadBlob(blob, file.name);
                  toast("Sharing isn't available here, so the card was downloaded.");
                }
              })
            }
          >
            Share table card
          </ActionRow>
          <ActionRow icon={Printer} hint="Opens your printer with the card" disabled={!table || busy} onClick={() => run("print", () => printTableCard(table))}>
            {busy === "print" ? "Preparing…" : "Print table card"}
          </ActionRow>
        </div>

        <div className="space-y-2 pb-2">
          <p className="text-meta font-bold text-ink-2">Careful</p>
          <ActionRow icon={RotateCcw} danger hint="The printed code stops working right away" onClick={() => setConfirm("rotate")}>
            Replace QR code
          </ActionRow>
          <ActionRow
            icon={Trash2}
            danger
            disabled={!!session}
            hint={session ? "Free the table first" : "Tables with past orders can only be turned off"}
            onClick={() => setConfirm("delete")}
          >
            Delete table
          </ActionRow>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "rotate"}
        onClose={() => setConfirm(null)}
        onConfirm={() => rotate.mutate()}
        title={`Replace the QR code for ${tableShort(overview.label)}?`}
        message="The printed code stops working right away. Guests who scan it will see an error until you print and place the new card."
        confirmLabel="Replace QR code"
        danger
        loading={rotate.isPending}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate()}
        title={`Delete ${tableShort(overview.label)}?`}
        message="This can't be undone. If the table has taken orders before, it can't be deleted: turn it off instead."
        confirmLabel="Delete table"
        danger
        loading={del.isPending}
      />
    </div>
  );
}
