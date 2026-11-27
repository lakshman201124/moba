// Read-only: get_table_state with a malformed visit token. Fails at the first regex check, writes nothing.
import http from "k6/http";
const URL = __ENV.SB_URL + "/rest/v1/rpc/get_table_state";
const H = { apikey: __ENV.SB_KEY, "Content-Type": "application/json" };
export const options = {
  scenarios: { s: { executor: "constant-vus", vus: 40, duration: "20s" } },
  thresholds: { http_req_duration: [{ threshold: "p(95)<8000", abortOnFail: true }] },
  summaryTrendStats: ["med", "p(95)", "max"],
};
export default function () { http.post(URL, '{"p_visit":"x","p_device":"y"}', { headers: H }); }
