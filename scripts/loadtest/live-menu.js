// Read-only ramp against the live get_public_menu RPC. Aborts itself on errors or slowness.
import http from "k6/http";
import { check } from "k6";
import { Trend, Counter } from "k6/metrics";

const URL = __ENV.SB_URL + "/rest/v1/rpc/get_public_menu";
const HEADERS = { apikey: __ENV.SB_KEY, "Content-Type": "application/json", "Accept-Encoding": "gzip" };
const bytes = new Counter("menu_bytes");
const byStage = new Trend("menu_ms", true);

export const options = {
  discardResponseBodies: false,
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "15s", target: 5 },
        { duration: "15s", target: 5 },
        { duration: "10s", target: 10 },
        { duration: "15s", target: 10 },
        { duration: "10s", target: 20 },
        { duration: "15s", target: 20 },
        { duration: "10s", target: 40 },
        { duration: "15s", target: 40 },
        { duration: "5s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: "rate<0.10", abortOnFail: true, delayAbortEval: "10s" }],
    http_req_duration: [{ threshold: "p(95)<8000", abortOnFail: true, delayAbortEval: "10s" }],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export default function () {
  const r = http.post(URL, "{}", { headers: HEADERS, timeout: "20s" });
  check(r, { "200": (x) => x.status === 200, "has categories": (x) => x.status === 200 && x.body.indexOf('"categories"') > 0 });
  bytes.add(Number(r.headers["Content-Length"] || 0));
  byStage.add(r.timings.duration, { vus: String(__VU <= 5 ? 5 : __VU <= 10 ? 10 : __VU <= 20 ? 20 : 40) });
}
