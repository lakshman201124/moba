import { useEffect } from "react";

export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock = null;

    async function request() {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {}
    }

    request();

    const onVisChange = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      lock?.release().catch(() => {});
    };
  }, []);
}
