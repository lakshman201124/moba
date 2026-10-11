import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { uploadMenuImage, imageUrl } from "../../services/storageService";

export default function ImageUpload({ value, onChange, folder, round = true }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const url = imageUrl(value);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    <div className="flex items-center gap-4">
      <div
        className={`w-24 h-24 bg-cream border-2 border-line overflow-hidden flex items-center justify-center shrink-0 ${
          round ? "rounded-full" : "rounded-xl"
        }`}
      >
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus size={28} className="text-ink/30" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
        <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : url ? "Replace photo" : "Add photo"}
        </button>
        {url && (
          <button type="button" className="btn-ghost text-sm text-nonveg" disabled={busy} onClick={() => onChange(null)}>
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
