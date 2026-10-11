import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

// Shared behaviour for modals and drawers: Escape closes, focus moves in and is kept inside,
// focus returns to whatever opened it, and the page behind stops scrolling.
export function useOverlay(open, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const panel = panelRef.current;

    openCount++;
    document.documentElement.style.overflow = "hidden";

    const first = panel?.querySelector("[data-autofocus]") || panel?.querySelector(FOCUSABLE);
    requestAnimationFrame(() => (first || panel)?.focus({ preventScroll: true }));

    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    panel?.addEventListener("keydown", onKey);

    return () => {
      panel?.removeEventListener("keydown", onKey);
      openCount--;
      if (!openCount) document.documentElement.style.overflow = "";
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return panelRef;
}
