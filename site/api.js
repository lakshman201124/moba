(() => {
  "use strict";
  const { supabaseUrl, supabaseKey } = window.MOBA_CONFIG;
  const DEVICE_KEY = "moba:device";

  class ApiError extends Error {
    constructor(code, detail = null) { super(code); this.code = code; this.detail = detail; }
  }

  async function rpc(fn, args, timeoutMs = 10000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const headers = { "Content-Type": "application/json", apikey: supabaseKey };
    if (supabaseKey.startsWith("eyJ")) headers.Authorization = `Bearer ${supabaseKey}`;
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST", headers, body: JSON.stringify(args || {}), signal: ctrl.signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const code = typeof body?.message === "string" && /^[A-Z_]+$/.test(body.message) ? body.message : "SERVER_ERROR";
        throw new ApiError(code, body?.details ?? null);
      }
      return body;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e.name === "AbortError" ? "TIMEOUT" : "NETWORK");
    } finally {
      clearTimeout(timer);
    }
  }

  let memDevice = null;
  function deviceId() {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
      return id;
    } catch {
      return (memDevice ||= crypto.randomUUID());
    }
  }

  window.MobaApi = {
    ApiError,
    deviceId,
    getMenu: () => rpc("get_public_menu", {}),
    getTableState: (token) => rpc("get_table_state", { p_token: token, p_device: deviceId() }),
    placeOrder: ({ token, clientOrderId, items, expectedTotal }) =>
      rpc("place_order", { p_token: token, p_device: deviceId(), p_client_order_id: clientOrderId,
                           p_items: items, p_expected_total: expectedTotal }, 15000),
    imageUrl: (path) => (path ? `${supabaseUrl}/storage/v1/object/public/menu-images/${path}` : null),
  };
})();
