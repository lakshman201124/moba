import http from "k6/http";
import { check } from "k6";
export const options = {
  scenarios: { s: { executor: "ramping-vus", startVUs: 10, stages: [{ duration: "10s", target: 100 }, { duration: "15s", target: 100 }] } },
  thresholds: { http_req_failed: [{ threshold: "rate<0.05", abortOnFail: true }] },
  summaryTrendStats: ["med", "p(95)", "p(99)", "max"],
};
export default function () {
  const r = http.get("https://moba-h5ag.vercel.app/menu.html", { headers: { "Accept-Encoding": "br, gzip" } });
  check(r, { "200": (x) => x.status === 200, "cdn hit": (x) => x.headers["X-Vercel-Cache"] === "HIT" });
}
