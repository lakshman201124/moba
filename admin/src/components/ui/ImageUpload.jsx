import { useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { uploadMenuImage, imageUrl } from "../../services/storageService";

const DEFAULT_SHAPES = [{ key: "square", label: "Square", w: 112, h: 112, radius: 16 }];

export default function ImageUpload({ value, onChange, folder, size = 112, label = "Photo", shapes }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const allShapes = shapes && shapes.length ? shapes : DEFAULT_SHAPES;
  const [shapeKey, setShapeKey] = useState(allShapes[0].key);
  const url = imageUrl(value);

  const active = allShapes.find((s) => s.key === shapeKey) || allShapes[0];
  const pw = active.w || size;
  const ph = active.h || size;
  const pr = typeof active.radius === "string" ? active.radius : `${active.radius ?? 16}px`;

  async function take(file) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadMenuImage(file, folder));
    } catch (err) {
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files?.[0]);
          }}
          disabled={busy}
          style={{ width: pw, height: ph, borderRadius: pr }}
          aria-label={url ? `Replace ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
          className={`group relative shrink-0 overflow-hidden border transition-colors ${
            url ? "border-line" : "border-dashed border-line-strong bg-sunken hover:bg-hover"
          } ${over ? "!border-cobalt !bg-cobalt-soft" : ""}`}
        >
          {url ? (
            <>
              <img src={url} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/45 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                <RefreshCw size={18} />
              </span>
            </>
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1.5 text-ink-2">
              <ImagePlus size={22} strokeWidth={1.75} />
              <span className="text-cap font-semibold">{busy ? "Uploading…" : "Add photo"}</span>
            </span>
          )}
          {busy && url && <span className="absolute inset-0 skeleton !rounded-none opacity-70" />}
        </button>
        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              take(file);
            }}
          />
          <p className="text-body font-semibold">{label}</p>
          <p className="text-meta text-ink-3 mt-0.5">JPEG, PNG or WebP. Drop a file or click to choose.</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? "Uploading…" : url ? "Replace" : "Choose file"}
            </button>
            {url && (
              <button type="button" className="btn btn-ghost btn-sm text-red hover:!text-red" disabled={busy} onClick={() => onChange(null)}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {allShapes.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-cap text-ink-3 font-medium whitespace-nowrap">Preview as</label>
          <select
            className="select !h-8 !text-meta !min-w-0 max-w-[200px]"
            value={shapeKey}
            onChange={(e) => setShapeKey(e.target.value)}
          >
            {allShapes.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
