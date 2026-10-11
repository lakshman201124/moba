import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOverlay } from "./useOverlay";

const WIDTHS = { sm: "md:max-w-[420px]", md: "md:max-w-[520px]", lg: "md:max-w-[680px]" };

export default function Modal({ open, onClose, title, description, children, footer, size = "md", wide }) {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-6">
      <div className="absolute inset-0 bg-ink/35 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${WIDTHS[wide ? "lg" : size]} max-h-[92dvh] flex flex-col bg-surface rounded-t-[20px] md:rounded-[18px] shadow-pop animate-sheet-up md:animate-pop-in`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-h3 font-bold">{title}</h2>
            {description && <p className="text-body text-ink-2 mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm -mr-1.5 -mt-0.5" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-line">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
