(() => {
  "use strict";
  const KEY = "moba:table:v2";
  const TTL = 4 * 60 * 60 * 1000;
  const TOKEN = /^[0-9a-f]{32}$/;
  let mem = null;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return mem; } };
  const write = (v) => {
    mem = v;
    try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {}
  };

  const url = new URL(location.href);
  const t = url.searchParams.get("t");
  if (t !== null) {
    if (TOKEN.test(t)) write({ token: t, scannedAt: Date.now() });
    url.searchParams.delete("t");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }

  window.MOBA_TABLE = {
    get() {
      const v = read();
      return v && TOKEN.test(v.token) && Date.now() - v.scannedAt < TTL ? v : null;
    },
    drop() { write(null); },
  };
})();
