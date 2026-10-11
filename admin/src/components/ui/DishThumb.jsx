import { useState } from "react";
import { ImageOff } from "lucide-react";
import { imageUrl } from "../../lib/image";

// A dish or category photo. With no photo it shows a quiet "no photo yet" tile, which is a real
// state the owner can fix from the dish editor.
export default function DishThumb({ path, size = 44, radius = 12, className = "", alt = "" }) {
  const [broken, setBroken] = useState(false);
  const url = imageUrl(path);
  const style = { width: size, height: size, borderRadius: radius };

  if (!url || broken) {
    return (
      <span
        style={style}
        className={`shrink-0 inline-flex items-center justify-center bg-sunken border border-line text-ink-3 ${className}`}
        title="No photo yet"
      >
        <ImageOff size={Math.max(14, Math.round(size * 0.34))} strokeWidth={1.75} aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      style={style}
      className={`shrink-0 object-cover bg-sunken ${className}`}
    />
  );
}
