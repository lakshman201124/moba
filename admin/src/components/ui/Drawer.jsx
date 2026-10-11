import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOverlay } from "./useOverlay";

// A right-hand panel over the page: editing a dish while its category stays in view.
// `bare` hands the whole panel to the children (they bring their own header and close button).
export default function Drawer({ open, onClose, title, subtitle, children, footer, width = 560, headerExtra, bare }) {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ "--drawer-w": `${width}px` }}
        className="relative h-full w-full sm:w-[var(--drawer-w)] sm:max-w-[calc(100vw-48px)] bg-surface shadow-pop flex flex-col animate-slide-in sm:rounded-l-[20px]"
      >
        {bare ? children : (
        <>
        <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-line">
          <div className="min-w-0 flex-1">
            <h2 className="text-h3 font-bold truncate">{title}</h2>
            {subtitle && <p className="text-meta text-ink-3 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {headerExtra}
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm -mr-1.5" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <footer className="flex items-center gap-2 px-5 sm:px-6 py-4 border-t border-line bg-surface pb-[max(16px,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
        </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
