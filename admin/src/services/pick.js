import { isDemo } from "../lib/demo";

// Demo mode swaps every service call for its in-browser twin (src/demo/api.js). The demo code is
// its own chunk, loaded only when demo mode is on.
const demoApi = () => import("../demo/api");

export function pick(group, live) {
  if (!isDemo) return live;
  const out = {};
  for (const name of Object.keys(live)) {
    out[name] = (...args) => demoApi().then((m) => m[group][name](...args));
  }
  return out;
}
