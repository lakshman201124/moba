import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

const MenuContext = createContext(null);

// A small action menu (the "⋯" on a row, the date range picker). Rendered in a portal at a
// fixed position so a scrolling or clipped container never cuts it off.
export default function Menu({ trigger, children, align = "end", width = 220, label }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const listRef = useRef(null);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) anchorRef.current?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      const list = listRef.current;
      if (!r || !list) return;
      const h = list.offsetHeight;
      const w = list.offsetWidth;
      let left = align === "end" ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      let top = r.bottom + 6;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(listRef.current?.querySelectorAll('[role^="menuitem"]:not([disabled])') || [])];
    requestAnimationFrame(() => {
      const list = items();
      (list.find((el) => el.getAttribute("aria-checked") === "true") || list[0])?.focus({ preventScroll: true });
    });
    function onDown(e) {
      if (!listRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) close(false);
    }
    function onKey(e) {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === "Tab") {
        close(false);
      }
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <>
      {trigger({
        ref: anchorRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-label": label,
        onClick: (e) => {
          e.stopPropagation();
          setPos(null);
          setOpen((v) => !v);
        },
      })}
      {open &&
        createPortal(
          <MenuContext.Provider value={close}>
            <div
              ref={listRef}
              role="menu"
              aria-label={label}
              onClick={(e) => e.stopPropagation()}
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
              className="fixed z-[80] rounded-[14px] border border-line bg-surface p-1.5 shadow-pop animate-pop-in"
            >
              {children}
            </div>
          </MenuContext.Provider>,
          document.body,
        )}
    </>
  );
}

export function MenuItem({ icon: Icon, children, onSelect, danger, disabled, hint }) {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        close(true);
        onSelect?.();
      }}
      className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-body font-medium text-left transition-colors focus-visible:outline-none disabled:opacity-40 ${
        danger ? "text-red hover:bg-red-soft focus:bg-red-soft" : "text-ink hover:bg-hover focus:bg-hover"
      }`}
    >
      {Icon && <Icon size={16} className={danger ? "" : "text-ink-2"} />}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-cap text-ink-3">{hint}</span>}
    </button>
  );
}

export function MenuCheckItem({ checked, children, onSelect, hint }) {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={() => {
        close(true);
        onSelect?.();
      }}
      className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-body text-left text-ink hover:bg-hover focus:bg-hover focus-visible:outline-none"
    >
      <span className={`flex-1 truncate ${checked ? "font-bold" : "font-medium"}`}>{children}</span>
      {hint && <span className="text-cap text-ink-3">{hint}</span>}
      <Check size={16} strokeWidth={2.5} className={checked ? "text-ink" : "invisible"} />
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-line" role="separator" />;
}

export function MenuLabel({ children }) {
  return <p className="px-2.5 pt-1.5 pb-1 text-cap font-semibold text-ink-3">{children}</p>;
}
