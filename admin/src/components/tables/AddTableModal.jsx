import { useState } from "react";
import toast from "react-hot-toast";
import { createTable, createTableRange } from "../../services/tableService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import { tableShort } from "../../lib/format";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import { Segmented } from "../ui/Segmented";

export default function AddTableModal({ open, onClose, onAdded }) {
  const [mode, setMode] = useState("one");
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("4");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [prefix, setPrefix] = useState("T");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const f = Number(from);
  const t = Number(to);
  const rangeOk = from && to && f >= 1 && t >= f && t - f <= 49;
  const preview = rangeOk ? (t - f < 4 ? Array.from({ length: t - f + 1 }, (_, i) => `${prefix}${f + i}`).join(", ") : `${prefix}${f}, ${prefix}${f + 1} … ${prefix}${t}`) : null;

  function reset() {
    setLabel("");
    setFrom("");
    setTo("");
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (mode === "range" && !rangeOk) {
      setError("Use a range of 1 to 50 tables, like 1 to 12.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "one") {
        const row = await createTable(label.trim(), seats ? Number(seats) : null);
        toast.success(`${tableShort(label.trim())} added. Its QR code is ready to print.`);
        onAdded?.(row);
      } else {
        await createTableRange(f, t, prefix.trim());
        toast.success(`${t - f + 1} tables added.`);
      }
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      reset();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Add tables"
      description="Each table gets its own QR code. Guests scan it to order."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" form="add-table" disabled={loading || (mode === "one" ? !label.trim() : !rangeOk)} className="btn btn-primary">
            {loading ? "Adding…" : mode === "one" ? "Add table" : rangeOk ? `Add ${t - f + 1} tables` : "Add tables"}
          </button>
        </>
      }
    >
      <Segmented
        label="How many"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError("");
        }}
        plain
        options={[
          { value: "one", label: "One table" },
          { value: "range", label: "A numbered run" },
        ]}
      />
      <form id="add-table" onSubmit={submit} className="mt-4 space-y-4">
        {mode === "one" ? (
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <Field label="Name" hint="Like T13, Patio 2 or Bar Left">
              {(p) => <input {...p} required value={label} onChange={(e) => setLabel(e.target.value)} maxLength={20} className="input" data-autofocus autoFocus />}
            </Field>
            <Field label="Seats">
              {(p) => <input {...p} type="number" min={1} max={50} value={seats} onChange={(e) => setSeats(e.target.value)} className="input" />}
            </Field>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Prefix" optional>
                {(p) => <input {...p} value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={10} className="input" />}
              </Field>
              <Field label="From">
                {(p) => <input {...p} type="number" min={1} required value={from} onChange={(e) => setFrom(e.target.value)} className="input" data-autofocus />}
              </Field>
              <Field label="To">
                {(p) => <input {...p} type="number" min={1} required value={to} onChange={(e) => setTo(e.target.value)} className="input" />}
              </Field>
            </div>
            <p className="text-meta text-ink-3">{preview ? <>Adds <span className="font-semibold text-ink">{preview}</span>. Set seats per table afterwards.</> : "Up to 50 at a time."}</p>
          </>
        )}
        {error && <p role="alert" className="rounded-[10px] bg-red-soft px-3 py-2 text-meta font-semibold text-red">{error}</p>}
      </form>
    </Modal>
  );
}
