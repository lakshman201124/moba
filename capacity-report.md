# MOBA end-to-end test: capacity, structure and vulnerabilities

Date: 2026-11-27, 00:20–00:50 IST (restaurant closed) · Scope: live site `moba-h5ag.vercel.app`, live Supabase project, `site/`, `admin/`, `supabase/` · Follows the `frontend-testing` skill (discovery → scenarios → heuristics → Playwright → bug reports) and builds on `security-audit.md` (2026-11-02).

---

## 1. Verdict

| Question | Answer |
|---|---|
| Will real customers break it? | **No.** A packed night uses about 1–5% of what the system can serve. |
| What breaks first? | The **menu API** (`get_public_menu`). It tops out at **about 60 loads per second** on the live database. Everything else has far more room. |
| Can one person break it? | **Yes, easily.** 20 parallel connections from one laptop saturate the menu API. The publishable key is public and nothing rate-limits it. Because ordering shares the same database, this slows ordering and the kitchen screen too. |
| Does ordering stay correct under pressure? | **Yes.** No duplicate orders, no wrong totals, no duplicated guest numbers, under every concurrency test run. |
| Is the live site the same as the repo? | **Yes.** Every deployed file matches `main` (only the uncommitted `color-check.html` tweak differs). |
| Biggest operational risk | The **kitchen screen goes quiet if its live connection drops**: new orders still appear within 60 s, but with no sound and no pop-up, and no "offline" warning. |

Overall: the structure is sound. The server checks every price, token and limit, and the code is clean and consistent. The weak points are **one expensive, uncached, unthrottled endpoint**, **silent failure in the staff app**, and a handful of **items still open from the last audit**.

---

## 2. How this was tested

| Layer | What was run | Where | Tool |
|---|---|---|---|
| Live deploy parity | Compared every live file with the repo (line endings normalised) | Live Vercel | curl |
| Live backend security | 9 read-only probes: grants, old API removed, auth settings, RLS | Live Supabase | curl |
| **Live read capacity** | Ramp 1 → 40 parallel users on the menu API, auto-abort on >10% errors or p95 > 8 s; 4,428 requests | Live Supabase | k6 |
| Live gateway capacity | 40 parallel users on a cheap call that fails validation (writes nothing); 4,317 requests | Live Supabase | k6 |
| Live static capacity | Ramp to 100 parallel users on `menu.html`; 8,624 requests | Live Vercel CDN | k6 |
| **Write-path capacity** | Full diner journey (scan → menu → 2-line order → status) at 1–50 parallel clients | Local PostgreSQL 17 with all 10 migrations + real seed (124 dishes) + 2,000 tables | pgbench |
| Concurrency and abuse | Party of 15 ordering at once, 10× duplicate submit, 99-guest cap | Same local DB, parallel `psql` sessions | psql |
| **End to end in a browser** | The real `site/` code talking to the real SQL functions through a test bridge; 2 phones, 15 scenarios | Local, iPhone-sized viewport | Playwright |
| Staff app | Login, route guard, 5 pages in demo mode at desktop and phone width | Local Vite dev server | Playwright |
| Project test suite | `supabase/tests/visit_tokens.test.sql` on a fresh DB | Local | psql |
| Dependencies | `npm audit` in `admin/` | Local | npm |

**Safety rules followed:** no order, visit or account was created on the live project. Live load tests used only the read-only menu call and a call that fails its first validation check. The live tests ran while the restaurant was closed and were capped so they couldn't run away. All write-path load, ordering and abuse tests ran on a throwaway local database.

**Not tested:** staff sign-in on live (no credentials, and none needed), Supabase Realtime under load, and a real slow-4G phone (the timings below are from a fast connection).

---

## 3. How the system is built

```
Guest phone ── QR (/?t=<qr token>) ──► Vercel CDN: index.html, menu.html, menu.js (static)
     │                                        │
     │  POST /rest/v1/rpc/*  (publishable key, no login)
     ▼                                        ▼
Supabase (Cloudflare edge, Chennai) ──► PostgREST ──► Postgres (one shared database)
     start_visit       swap QR token for a 5-min visit token (hash stored)
     get_public_menu   builds the whole 89 KB menu JSON on every call   ◄── the bottleneck
     get_table_state   polled every 20 s (order active) / 60 s (idle)
     place_order       re-prices every line, locks the table row, writes the order
     get_restaurant_info  called on every home-page visit
                                              ▲
Staff tablet (admin/, React) ── login ── RLS + staff_* functions
     └── Realtime websocket on orders + table_sessions, plus a 60 s backup poll
```

What each phone sends during one visit: 1 scan swap, 1 menu load (plus one more each time it returns after more than 60 s), a status poll every 20–60 s, and 1–3 orders.

---

## 4. Capacity: how much traffic it holds

### 4.1 Live, measured

**Menu API (`get_public_menu`)**: the expensive call (89 KB raw, 16 KB gzipped)

| Parallel users | Requests / sec | Median | p95 | Errors |
|---|---|---|---|---|
| 5 | 21 | 236 ms | 289 ms | 0 |
| 10 | 40 | 239 ms | 317 ms | 0 |
| 20 | 57 | 346 ms | 483 ms | 0 |
| 40 | **59** | **650 ms** | **928 ms** | 0 |

Throughput stops rising at about 20 parallel users while latency doubles. That is the ceiling: **about 60 menu loads per second**.

**Cheap call (same gateway, almost no database work):** 214 requests/sec at 40 users, median 179 ms, flat. It was still not saturated, so **the menu query itself is the bottleneck**, not Supabase's gateway.

**Static site (Vercel CDN):** 334 requests/sec at 100 users, 0 errors, 100% cache hits, median 206 ms. The test machine's bandwidth was the limit, not Vercel. Static hosting won't break.

### 4.2 Write path, measured on a local copy (12-core PC)

| Parallel clients | Full journeys / sec | Avg journey | Failures |
|---|---|---|---|
| 1 | 63 | 16 ms | 0 |
| 10 | 393 | 25 ms | 0 |
| 25 | 407 | 61 ms | 0 |
| 50 | 420 (saturated) | 119 ms | 0 |

Cost of each step with one client: **menu 10.7 ms (68% of the journey)**, order 3.7 ms, status 0.7 ms, scan 0.5 ms. The menu alone saturates at about 560/sec (about 89/sec per CPU core). Status polls reach 10,000/sec.

Comparing the live menu ceiling (60/s) with the local one (560/s), the live database is roughly 9× slower than this PC. That's typical of a small shared-CPU Supabase plan. Applying that ratio gives an **estimated live ceiling of ~45 complete scan-to-order journeys per second**. This figure is an estimate, not a measurement.

### 4.3 What that means in people

| Scenario | Load it creates | Share of capacity |
|---|---|---|
| Packed night: 30 tables × 4 guests, everyone opens the menu within the same minute | 2 menu loads/s, 6 polls/s | ~3% |
| Large event: 300 people scan within one minute | 5 menu loads/s | ~8% |
| Home page goes viral (the menu is gated, so only the home page loads) | Vercel CDN, plus 1 cheap `get_restaurant_info` call per visit | Fine up to ~200 visits/s measured |
| **One script hammering the menu API** | **60 loads/s from 20 connections** | **100%: every guest's menu, orders and the kitchen screen slow down** |

**Bottom line:** real guests can't break it. A deliberate script can.

### 4.4 Limits built into the rules (by design, not capacity)

| Limit | Value | What a guest sees |
|---|---|---|
| Un-accepted orders per table | 10 | `TABLE_BUSY` |
| Orders per table | 20 per 10 min | `RATE_LIMITED` |
| Orders per phone | 6 per 10 min | `RATE_LIMITED` |
| Scans per table / per phone | 120 / 10 per 10 min | "One moment" |
| Guests per sitting | 99 | **a crash, see F5** |
| Ordering window after a scan | 5 min | "Scan again" |

Tested: a party of 15 tapping Place order at the same instant → 10 orders went through (guest numbers 1–10, one session), **5 were refused with `TABLE_BUSY`** until the kitchen accepts some.

### 4.5 Plan quotas to check in the dashboards

These can stop the service before CPU does. They are standard plan limits, so confirm them on your own usage pages:
- **Supabase Free**: about 5 GB egress a month, and the project **pauses after a week with no traffic**. One diner visit is roughly 50–150 KB of API traffic, so 5 GB covers tens of thousands of visits.
- **Vercel Hobby** is for non-commercial use. A restaurant's production site belongs on Pro.
- **Supabase Realtime** connection and message limits only apply to staff tablets (phones poll instead), so they won't be a problem.

---

## 5. End-to-end results (frontend-testing skill)

All flows ran in an iPhone-sized browser against the real SQL functions.

### 5.1 Happy path: **pass**
Scan QR → URL cleaned, QR kept only in this tab → open menu → visit token swapped in, QR deleted → add Brownie ×1 and Lemon Ice Tea ×2 → total ₹367 → **triple-tap Place order → exactly 1 request, 1 order** (#16029 · T1 · Guest 1, ₹367, 3 items, correct in the DB). Screenshots: `security-evidence/e2e-cart.png`, `e2e-order-placed.png`.

### 5.2 Edge cases

| # | Scenario | Result |
|---|---|---|
| E1 | Price changes while the dish is in the cart (₹89 → ₹99) | Pass: "Prices were just updated…", total refreshes to ₹99, retry succeeds |
| E2 | Kitchen accepts the order | Pass: phone shows "Cooking 만드는 중" on the next poll |
| E3 | Dish sells out before ordering | Pass: "Brownie just sold out.", line marked, Place disabled |
| E4 | Ordering switched off | Pass: banner shown, Place disabled |
| E5 | Network drops while placing | Pass: "We couldn't reach the kitchen. Tap Place order again.", cart kept |
| E5b | Server takes more than 15 s | Pass: same message; retry creates exactly 1 order |
| E6 | Second phone at the same table | Pass: Guest 2 |
| E7 | 5-minute window runs out | Pass: whole page becomes "Scan again", cart saved (`e2e-window-expired.png`) |
| E7b | Reload after expiry | Pass: 0 API calls |
| E8 | Staff free the table | Pass: "Thanks for eating with us!", visit deleted from the phone (`e2e-table-freed.png`) |
| E9 | Sold-out dish comes back in stock | **Minor fail**: the phone keeps it marked sold out until its next menu refresh (F11) |
| C1 | 15 guests order at the same instant | Integrity pass; 5 refused with `TABLE_BUSY` (F6) |
| C2 | Same order sent 10× at once | Pass: 10 identical replies, **1 order** |
| C3 | 100th guest in one sitting | **Fail**: raw database error (F5) |
| SQL | Project suite `visit_tokens.test.sql` | **30 / 30 pass** |

### 5.3 Staff app (admin)
- Login: one `h1`, labelled inputs, correct `autocomplete`, native required-field checks. `/orders` without a session redirects to `/login?next=%2Forders`. Pass.
- Demo mode, 5 pages at 1280 px and 390 px: one `h1` each, no horizontal scroll, no console errors, bottom nav on phones. Pass (`admin-demo-phone-orders.png`).
- **Real-time checks from the skill:** new-order sound and toast exist, and sound can be muted (pass). **There is no Live / Offline indicator, and orders found by the backup poll make no sound** (fail, F2).

### 5.4 UI heuristics on the live site
- Home: one `h1`, no horizontal scroll at 390 px, first paint 1.06 s on a fast connection, **780 KB over 32 requests**.
- Menu gate: loads in 0.8 s. (An earlier draft said it had two `h1`s. That was wrong: the "MOBA menu" heading is `display: none` while the gate shows, so only one is ever visible. Corrected 2026-11-27.)
- No favicon: `/favicon.ico` returns 404 on every visit.

---

## 6. Findings, ranked

### F1 · HIGH · The menu API is the bottleneck and an unauthenticated slowdown lever
- **Steps:** send `POST /rest/v1/rpc/get_public_menu` with the public key from 20 parallel connections (one laptop).
- **Expected:** the menu is cheap to serve; one client can't affect other guests.
- **Actual:** every call rebuilds the full 89 KB menu with nested subqueries (10.7 ms of CPU locally, far more on live). The live ceiling is ~60/s, and 20 connections reach it. Nothing limits a single client. Ordering and the staff screen share that database CPU.
- **Fix (best value in this report):** precompute the menu. Keep one row holding the finished JSON, rebuilt by the `bump_menu_version` trigger whenever the menu changes, so `get_public_menu` becomes a single-row read (~0.5 ms, roughly a 20× higher ceiling). Optionally also serve it as a static `menu.json` through the CDN. Longer term, put a rate limit in front (Cloudflare or a Vercel edge function).

### F2 · HIGH (operational) · The kitchen screen fails silently when Realtime drops
- **Steps:** staff tablet on Orders; Wi-Fi blips or Supabase Realtime reconnects; a guest orders.
- **Expected:** a visible "Offline / reconnecting" state, and every new order rings once the connection is back.
- **Actual:** `useLiveOrders.js` calls `.subscribe()` with no status callback. There is no indicator, no refetch on reconnect, and orders missed during the gap appear only through the 60 s poll, **with no sound and no toast**. A kitchen relying on the chime can miss orders.
- **Fix:** handle `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT` and `CLOSED`; show a red "Offline" bar; on reconnect, refetch at once. Compare waiting-order IDs before and after each poll, and play the sound and toast for any new ones.

### F3 · HIGH (carried over) · A photo of the QR still allows ordering
Unchanged from audit A08. Whoever scans a photo gets a 5-minute window, and fake orders are capped at 10 pending per table. It needs proof of presence: a table PIN that changes when the table is freed, or staff confirming each new phone's first order.

### F4 · MEDIUM · Public sign-up is still on (live, verified today)
`/auth/v1/settings` reports `disable_signup: false`. Non-staff accounts can't do anything (the admin signs them out), but anyone can create accounts and trigger sign-up emails. **Fix:** Supabase dashboard → Authentication → turn off "Allow new users to sign up". This is a 1-minute change.

### F5 · MEDIUM · The 100th guest in a sitting gets a crash and the table locks
- **Steps (reproduced on the real SQL):** a sitting with 99 guests; a new phone orders.
- **Actual:** `orders_guest_no_check` violation. The phone shows a generic server error, every newcomer at that table is blocked until staff free it, and the raw error text (constraint name and full row) reaches the client.
- **Fix:** count distinct guests in `place_order` and return a clear `TABLE_FULL`, or drop the 99 cap.

### F6 · MEDIUM (business rule) · Big groups hit `TABLE_BUSY` at 10 pending orders
A party of 15 ordering separately → 5 refused until the kitchen accepts some. **Decide:** scale the cap with `seats`, or nudge large tables to order on one phone.

### F7 · MEDIUM (carried over) · Script hardening still open
- CSP still allows `'unsafe-inline'` scripts (live header checked today).
- The 3 GSAP files from cdnjs have **no `integrity=`** hashes.
- **No staff MFA** (no `mfa` or `aal2` anywhere in the code).

### F8 · MEDIUM (carried over) · Admin dependencies: 4 high advisories
`npm audit` today: react-router / react-router-dom / turbo-stream (fixed in 7.18.7) and zod (fixed in 4.6.7, a major upgrade), plus 2 low in supabase-js. Unchanged since 2026-11-02.

### F9 · LOW · Heavy, uncached home page
- `index.html` is **377 KB, 320 KB of which is inline SVG** (147 KB after Brotli). HTML is sent with `max-age=0`, so every visit downloads it again.
- First visit totals **780 KB over 32 requests**, including about 10 Korean font files.
- Every image and script also revalidates on each visit (`max-age=0, must-revalidate`).
- That puts the "usable in under 3 s on 4G" goal at risk.
- **Fix:** move the SVG artwork into one cached sprite file, and send `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` and the `?v=` files from `vercel.json`.

### F10 · LOW · Production hygiene
- The temporary `color-check.html` is live.
- 2.8 MB of unused assets are deployed (`corndog.png`, `assets/dishes/*.jpg`, plus the old `menu-data.js` that references them). `k-rice.jpg` is 0 bytes.
- There's no favicon.

### F11 · LOW · A restocked dish stays "sold out" on the phone
After a `DISH_UNAVAILABLE`, the line stays blocked until the menu refreshes, which only happens when the guest leaves the app and comes back after more than 60 s. Re-fetch the menu when the order sheet opens if the last fetch is older than about 30 s.

### F12 · LOW · Other
- `get_restaurant_info` is public and will expose `wifi_password`, phone and email to the whole internet once filled in (it is empty today). Decide whether the Wi-Fi password should be public.
- Note sanitising still strips only control characters, so bidi and zero-width characters can still spoof kitchen tickets (audit E14).
- There is no CI: the SQL suite and these load tests run by hand.

---

## 7. Status of the 2026-11-02 audit

| Item | Status today |
|---|---|
| Visit tokens (A05–A07, A11, A12, A14) | **Fixed and live**: `start_visit` exists, the old `p_token` API returns "function not found" |
| D12 anon could run `staff_*` functions | **Fixed live**: "permission denied for function" |
| G04 HSTS | **Present live** (`max-age=63072000; includeSubDomains; preload`) |
| C05/C06 XSS, B04/B05 cache | Fixed (live code matches the repo) |
| D18 public sign-up | **Still open** (F4) |
| E16 99-guest cap | **Still open, now reproduced** (F5) |
| A08 photo of the QR | Still open (F3) |
| G02 CSP, G03 SRI, H02 MFA | Still open (F7) |
| G10 admin dependencies | Still open (F8) |
| E14 bidi characters in notes | Still open (F12) |

---

## 8. Suggested plan

| Order | Work | Effort | Fixes |
|---|---|---|---|
| 1 | Turn off public sign-up | 1 min, dashboard | F4 |
| 2 | Precompute the menu JSON (cache row + trigger) | ~1 migration, half a day | F1 (≈20× more headroom, removes the slowdown lever) |
| 3 | Realtime status bar + refetch on reconnect + sound for poll-found orders | ~half a day, `useLiveOrders.js` | F2 |
| 4 | `TABLE_FULL` instead of the crash; review the 10-pending cap | ~1 hour SQL | F5, F6 |
| 5 | Cache headers in `vercel.json`, SVG sprite, delete test page and dead assets, favicon | ~half a day | F9, F10 |
| 6 | SRI on GSAP, move inline scripts out and drop `'unsafe-inline'`, upgrade admin deps | ~1 day | F7, F8 |
| 7 | Staff MFA; presence proof for QR photos (table PIN) | 1–2 days | F3, F7 |
| 8 | CI: SQL suite + `scripts/security-check.mjs` + a small k6 smoke test on every deploy | ~half a day | regressions |

After step 2, re-run `scripts/loadtest/live-menu.js` to confirm the ceiling moved.

---

## 9. Re-running these tests

Everything is in `scripts/loadtest/` (not committed):

| File | What it does |
|---|---|
| `live-menu.js` | k6 ramp on the live menu API, self-aborting. `SB_URL=… SB_KEY=… k6 run live-menu.js` |
| `live-cheap.js` | k6, 40 users on a call that fails validation (gateway ceiling) |
| `live-static.js` | k6, 100 users on the Vercel CDN |
| `lifecycle.sql`, `menu.sql`, `poll.sql` | pgbench scripts for a local DB built from `supabase/tests/supabase-stubs.sql` + `supabase/migrations/*.sql` + `supabase/seed.sql` (load the seed with `PGCLIENTENCODING=UTF8`) plus test tables `T1…T2000` with `qr_token = md5('t'||n)`. Run with `PGOPTIONS="-c role=anon"` |
| `tests/support/bridge.py` (moved there 27 Nov) | Test-only server: serves `site/` and answers `/rest/v1/rpc/*` from the local DB, so the real `menu.js` can be driven end to end. `python bridge.py <site dir> 5510`. Never deploy it |

Only run the live k6 scripts while the restaurant is closed. The menu test saturates the live database by design.
