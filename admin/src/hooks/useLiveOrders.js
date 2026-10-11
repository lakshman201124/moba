import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { queryClient } from "../lib/queryClient";
import { isDemo } from "../lib/demo";
import { tableShort } from "../lib/format";
import { notifyNewOrder } from "../components/orders/NewOrderToast";

const SOUND_KEY = "moba:admin:sound";
let audioUnlocked = false;
let audio = null;

export function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent("moba:sound", { detail: on }));
}

export function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    audio = new Audio("/new-order.wav");
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    }).catch(() => {});
  } catch {}
}

function playSound() {
  if (!isSoundEnabled() || !audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

const LIVE_KEYS = ["tables-overview", "dashboard", "waiting-orders", "active-orders", "analytics", "order-history"];

function labelFor(tableId) {
  const tables = queryClient.getQueryData(["tables-overview"]);
  const t = tables?.find((x) => x.id === tableId);
  return t ? tableShort(t.label) : null;
}

export function useLiveOrders() {
  const waitingRef = useRef(0);
  const titleBase = useRef(document.title);

  const invalidateAll = useCallback(() => {
    for (const key of LIVE_KEYS) queryClient.invalidateQueries({ queryKey: [key] });
  }, []);

  const onInsert = useCallback((order, label) => {
    playSound();
    waitingRef.current++;
    document.title = `(${waitingRef.current}) ${titleBase.current}`;
    notifyNewOrder({ ...order, table_label: label || labelFor(order.table_id) });
  }, []);

  useEffect(() => {
    let stop = () => {};

    if (isDemo) {
      let alive = true;
      import("../demo/store").then(({ subscribe, startSimulator }) => {
        if (!alive) return;
        const unsub = subscribe((event) => {
          invalidateAll();
          queryClient.invalidateQueries({ queryKey: ["table-live"] });
          if (event.type === "order-insert") onInsert(event.order, tableShort(event.order.table_label));
        });
        const stopSim = startSimulator();
        stop = () => {
          unsub();
          stopSim();
        };
      });
      const onFocus = () => {
        waitingRef.current = 0;
        document.title = titleBase.current;
      };
      window.addEventListener("focus", onFocus);
      return () => {
        alive = false;
        stop();
        window.removeEventListener("focus", onFocus);
      };
    }

    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        invalidateAll();
        if (payload.new?.table_id) {
          queryClient.invalidateQueries({ queryKey: ["table-live", payload.new.table_id] });
        }
        if (payload.eventType === "INSERT") onInsert(payload.new);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions" }, () => {
        invalidateAll();
        queryClient.invalidateQueries({ queryKey: ["table-live"] });
      })
      .subscribe();

    const poll = setInterval(invalidateAll, 60000);

    const onFocus = () => {
      waitingRef.current = 0;
      document.title = titleBase.current;
    };
    window.addEventListener("focus", onFocus);

    return () => {
      channel.unsubscribe();
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, [invalidateAll, onInsert]);
}
