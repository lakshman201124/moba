# Phase 0 report: go / no-go for the gate

**Phase:** 0 (Foundation and quick wins), `testing.md` section 5.
**Tester:** `phase-test-engineer` (independent; did not write the code or the specs under test).
**Date:** 2026-11-27.
**What this covers:** independent verification of the Phase 0 baseline suite — a fresh run of all local
projects, the live read-only smoke, and the SQL suite — plus a review of every `test.fail()` known-bug and a
spot-check that the gate-critical P0 specs assert real outcomes.

---

## 1. Verdict: **GO**

Judged only against the Phase 0 exit criteria (`testing.md` line 113):

| Exit criterion | Result | Evidence |
|---|---|---|
| Every baseline test passes locally | **Met** | 68 passed across `api`, `iphone`, `android`, `iphone-se`; 0 unexpected failures; 0 flaky. The 4 known-bug cases are `test.fail()` expected-failures (counted as passed). |
| Live smoke passes | **Met** | 6/6 live read-only specs passed (`P0-SMOKE-01…06`). |
| Change 0.5 (public sign-up off) confirmed | **Met** | `P0-SMOKE-06` passed: live `/auth/v1/settings` reports `disable_signup: true`. The owner has turned sign-up off. |

All three gate conditions are satisfied. Nothing P0 is red. **Phase 0 is safe to ship.**

The two deferred items 0.6 (plan decision) and 0.7 (staging project) are **not** Phase 0 exit criteria —
they are inputs the owner owes Phase 1/2 — so they do not block this gate.

---

## 2. Totals

Cases are counted from the catalogue (`docs/testing/phase-0-test-cases.md`): 56 Phase 0 cases + 3 framework
cases = 59 unique IDs, every one automated (0 manual). "Passed" below counts test instances in the runs
(a `@devices` case runs on up to 3 device projects, so instances exceed case count).

| | Written (cases) | Automated | Passed | Failed | Flaky | Manual | Known-bug (`test.fail`) |
|---|---|---|---|---|---|---|---|
| **Total** | 59 | 59 | 68 local + 6 live + 30 SQL | 0 | 0 | 0 | 4 |
| P0 | 24 (41%) | 24 | all green | 0 | 0 | 0 | 0 |
| P1 | 24 | 24 | all green | 0 | 0 | 0 | 2 (SEC-09 is P2; see note) |
| P2 | 11 | 11 | all green | 0 | 0 | 0 | — |

Priority split of the 56 Phase 0 cases per the catalogue: 24 P0, 24 P1, 8 P2 (the 3 framework cases are all
P0). Known-bugs by priority: `P0-SEC-10` (P1), `P0-SEC-09` (P2), `P0-LAYOUT-03` (P2, on the two WebKit device
projects).

**Runs executed (all on 2026-11-27):**
- Local baseline: `npx playwright test --grep-invert @after-ship --project=api --project=iphone --project=android --project=iphone-se` → **68 passed (2.0m)**, including 4 expected-failures (`x`).
- Live read-only smoke: `npx playwright test --project=live --grep-invert @after-ship` → **6 passed (4.1s)**.
- SQL suite: `supabase/tests/visit_tokens.test.sql` on a fresh `moba_sqltest` DB (stubs + all migrations + seed) → **30/30 PASS, exit 0**.
- `npx playwright test --list` → **75 tests in 10 files** (files were already materialized; no OneDrive rehydration needed).

---

## 3. Failures

**None.** No real (unexpected) failure occurred in any run. No bug reports are owed from this verification.

---

## 4. Documented known-bugs (expected-failures), with owning phase

Each is a correct assertion that the app genuinely violates today, wrapped in `test.fail()` so the suite stays
green now and flips red the moment the bug is fixed. I confirmed each has guard preconditions (so a broken
setup is not mistaken for the known bug), is owned by a later phase, and is **not** a Phase 0 gate (P0) issue.

| ID | Pri | What it proves (correct behaviour asserted) | Why it fails today | Owning phase |
|---|---|---|---|---|
| `P0-SEC-09` | P2 | Guest notes contain no bidi / zero-width format chars (`\p{Cf}`) — no kitchen-ticket spoofing. | `place_order` strips only `[[:cntrl:]]`; U+202E / U+200B survive (F12 / audit E14). Preconditions assert 200 + note present. | **Phase 3** ("strip spoofing characters from notes"). |
| `P0-SEC-10` | P1 | Home page renders `get_restaurant_info` (hours, address, Instagram) as text; no injected markup, no `javascript:` link. | `site/index.html` inline script builds `#visit-*` with unescaped `innerHTML`, and the CSP allows `'unsafe-inline'` (new bug **P0-BUG-01**, same class as audit C05). Requires a staff account to inject. Preconditions wait for info to load. | **Phase 3** (CSP without `'unsafe-inline'` + output escaping). |
| `P0-LAYOUT-03` | P2 | After a click/tap on the order button, Escape returns focus to `#listBtn`. | On WebKit a clicked button does not take focus, so `openLayer()` stores `<body>` as `returnTo` and focus is lost (**P0-BUG-LAYOUT-01**). `test.fail` is gated to `browserName === "webkit"`, so it still passes on Chromium/Android, and the keyboard-activated variant passes on every engine. | Later phase (the WebKit focus nit). |

All four expected-failures (`P0-SEC-09` on `api`; `P0-SEC-10` on `iphone`; `P0-LAYOUT-03` on `iphone` and
`iphone-se`) are legitimate and hide no Phase-0-gate issue.

**Note for the owner (not a gate blocker):** `P0-BUG-01` (the `P0-SEC-10` home-page XSS) is a genuine
high-severity stored-XSS class bug. It is correctly deferred to Phase 3, but exploiting it requires a staff
account that can edit restaurant settings. Worth keeping visible on the Phase 3 list; it does not affect the
Phase 0 go/no-go.

### Gate-critical P0 specs spot-checked (assert real DB outcomes, not something trivially true)

- `P0-API-04` (re-pricing): rejects a tampered `price:1` line with `PRICE_CHANGED` / server total `876` and 0 rows written, then verifies the written `order_items.line_total` = `289,189,398` and `orders` = `876:4`.
- `P0-EDGE-06` (lost reply / idempotency): asserts exactly 1 order in the DB after offline + lost-reply retries, every `place_order` carries the same `p_client_order_id`, and `moba:pending` is cleared.
- `P0-EDGE-07` (triple-tap): one in-flight request (by both route-hold count and RPC count), DB `orders` = `1:367:3`.
- `P0-API-03` (stolen token): a visit token from another phone → `INVALID_VISIT`; each phone's `get_table_state` sees only its own orders; DB exactly 1 order.
- Permissions: `P0-SEC-01…04` green locally and corroborated by the SQL suite (anon denied on all 16 tables and every `staff_*` function; non-staff gets `NOT_STAFF`).

---

## 5. Regressions in earlier phases

None applicable. Phase 0 is the first phase; there is no earlier Playwright suite to regress. The project SQL
suite (`visit_tokens.test.sql`) re-ran clean at 30/30, matching the capacity report's earlier result.

---

## 6. What was NOT tested, and why

- **F1 menu throughput / capacity** — no load tests in Phase 0 (owned by Phase 1; live k6 only while the restaurant is closed).
- **F2 kitchen-screen Realtime drops** — needs the staging Supabase project (owner item 0.7) and a real tablet; owned by Phase 1. The bridge does not carry Supabase Realtime, and `staff_*` functions are not reachable through it (permission tests use `db.asAnon` / `db.asNonStaff` instead).
- **F5 100th-guest crash** and **F6 big-table cap** — owned by Phase 1.
- **F11 restocked dish stays sold out** and the 15 s `TIMEOUT` path — owned by Phase 3 / covered indirectly by `P0-EDGE-06`.
- **Live write paths** — forbidden by the rules; live is read-only. `P0-SMOKE-07` (favicon served on live) is tagged `@after-ship` and was intentionally excluded here; run it after the Phase 0 favicon is deployed.
- **Staff sign-in on live** — no credentials and none needed for Phase 0.

---

## 7. Exact commands to re-run

```powershell
cd "C:\Users\LAKSHMAN\OneDrive\Desktop\mobaa last\tests"

# If Playwright reports "0 tests" (OneDrive placeholders), rematerialize from the repo root first, then re-run:
#   node -e "const fs=require('fs'),path=require('path');function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.name==='node_modules')continue;if(e.isDirectory())w(p);else{const b=fs.readFileSync(p);const t=p+'.rm';fs.writeFileSync(t,b);fs.rmSync(p);fs.renameSync(t,p);}}}w('tests/phase-0');w('tests/support');w('site');w('supabase');console.log('ok')"

# Sanity: expect ~75 tests in 10 files
npx playwright test --list

# Local baseline (expect 68 passed, incl. 4 expected-failures shown as x)
npx playwright test --grep-invert @after-ship --project=api --project=iphone --project=android --project=iphone-se

# Live read-only smoke (expect 6 passed; never creates data on live)
npx playwright test --project=live --grep-invert @after-ship

# After the favicon is deployed to live, the post-ship live check:
npx playwright test --project=live   # includes @after-ship P0-SMOKE-07
```

SQL suite (fresh throwaway DB; the test cluster on port 54329 is started by the Playwright run):

```bash
PGBIN="/c/Program Files/PostgreSQL/17/bin"
"$PGBIN/createdb" -p 54329 -U postgres moba_sqltest
for f in supabase/tests/supabase-stubs.sql supabase/migrations/*.sql supabase/seed.sql; do \
  PGCLIENTENCODING=UTF8 "$PGBIN/psql" -p 54329 -U postgres -d moba_sqltest -v ON_ERROR_STOP=1 -q -f "$f"; done
"$PGBIN/psql" -p 54329 -U postgres -d moba_sqltest -f supabase/tests/visit_tokens.test.sql   # expect 30/30 PASS
```
