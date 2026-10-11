import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { queryClient } from "../lib/queryClient";
import toast from "react-hot-toast";
import { tableLabel } from "../lib/format";

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

export function useLiveOrders() {
  const waitingRef = useRef(0);
  const titleBase = useRef(document.title);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["waiting-orders"] });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          invalidateAll();
          if (payload.new?.table_id) {
            queryClient.invalidateQueries({
              queryKey: ["table-live", payload.new.table_id],
            });
          }
          if (payload.eventType === "INSERT") {
            playSound();
            waitingRef.current++;
            document.title = `(${waitingRef.current}) ${titleBase.current}`;
            const label = payload.new.table_id;
            toast(`New order · #${payload.new.order_no}`, {
              duration: 5000,
              icon: "🔔",
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_sessions" },
        () => {
          invalidateAll();
        },
      )
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
  }, [invalidateAll]);
}
