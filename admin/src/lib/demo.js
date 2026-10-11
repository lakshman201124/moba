// Demo mode: the whole admin runs on sample data held in this browser, with no sign-in and no
// Supabase calls. Turn it on with ?demo=1 (or the "Explore the demo" button on the sign-in page),
// or for a whole deployment with VITE_DEMO_MODE=true. ?demo=0 turns it off again.
const FLAG = "moba:admin:demo";

function readFlag() {
  try {
    const param = new URLSearchParams(window.location.search).get("demo");
    if (param === "1") localStorage.setItem(FLAG, "1");
    if (param === "0") localStorage.removeItem(FLAG);
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export const DEMO_FORCED = import.meta.env.VITE_DEMO_MODE === "true";
export const isDemo = DEMO_FORCED || readFlag();

export function enterDemo() {
  try {
    localStorage.setItem(FLAG, "1");
  } catch {}
  window.location.assign("/dashboard");
}

export function exitDemo() {
  try {
    localStorage.removeItem(FLAG);
  } catch {}
  window.location.assign("/login");
}
