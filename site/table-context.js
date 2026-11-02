(() => {
  "use strict";
  // The table's QR opens /?t=<qr token>. That token is held for this tab only, until menu.js swaps it
  // for a visit token (start_visit) and forgets it. The visit token orders for a few minutes after the
  // scan, then the guest scans again; the server enforces both, this file only remembers.
  const SCAN_KEY = "moba:scan";
  const VISIT_KEY = "moba:visit:v1";
  const QR = /^[0-9a-f]{32}$/;
  const VISIT = /^[0-9a-f]{64}$/;
  const mem = {};
  const box = (name) => ({
    read(k) { try { return JSON.parse(window[name].getItem(k) || "null"); } catch { return mem[k] ?? null; } },
    write(k, v) {
      mem[k] = v;
      try { v ? window[name].setItem(k, JSON.stringify(v)) : window[name].removeItem(k); } catch {}
    },
  });
  const tab = box("sessionStorage");
  const phone = box("localStorage");

  // Phones from before visit tokens kept the QR token itself for 4 hours.
  try { localStorage.removeItem("moba:table:v2"); } catch {}

  const url = new URL(location.href);
  const t = url.searchParams.get("t");
  if (t !== null) {
    if (QR.test(t)) tab.write(SCAN_KEY, { qr: t });
    url.searchParams.delete("t");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }

  window.MOBA_TABLE = {
    // A QR scanned in this tab and not yet swapped for a visit.
    scan() {
      const v = tab.read(SCAN_KEY);
      return v && QR.test(v.qr) ? v.qr : null;
    },
    clearScan() { tab.write(SCAN_KEY, null); },
    // { visit, orderBy } from start_visit. orderBy is this phone's clock, for the UI only.
    get() {
      const v = phone.read(VISIT_KEY);
      return v && VISIT.test(v.visit) ? v : null;
    },
    set(v) { phone.write(VISIT_KEY, v); },
    canOrder() {
      const v = this.get();
      return !!v && Date.now() < v.orderBy;
    },
    // The server said the ordering window is over; keep the visit for reading orders.
    closeWindow() {
      const v = this.get();
      if (v) phone.write(VISIT_KEY, { ...v, orderBy: 0 });
    },
    drop() { phone.write(VISIT_KEY, null); },
  };

  // menu.html loads this with data-gate: hide the page before it paints unless this phone can order
  // now. menu.js then either lifts the gate or shows the scan screen.
  if (document.currentScript?.hasAttribute("data-gate") && !window.MOBA_TABLE.canOrder()) {
    document.documentElement.classList.add("gated");
  }
})();
