# MOBA security audit

Date: 2026-11-02 · Scope: `site/` (diner menu), `supabase/migrations/` (backend), `admin/` (staff app, light pass)

---

## 1. Approach

### What is being protected
| Asset | Why it matters |
|---|---|
| Table QR token (`dining_tables.qr_token`) | It is the only thing that lets someone place an order. Whoever holds it can order to that table. |
| Kitchen queue (`orders`) | Fake orders waste food and staff time and block real guests. |
| Diner device ID (`moba:device`) | Identifies a "guest" and decides which orders a phone can see. |
| Staff accounts | Can change prices and menu text, rotate QR codes, close tables. |
| Menu content | Rendered on every diner's phone. If it can carry HTML, it can carry an attack. |

### Trust boundaries
1. **Phone → Supabase RPC.** The browser is fully attacker-controlled. Anything the client checks (TTL, cart, price) must be re-checked on the server.
2. **Staff → menu → diner.** Text staff type is rendered on diner phones. A compromised or careless staff account must not be able to run script on diners.
3. **Physical QR → URL.** The QR sticker is the root credential. Anyone who photographs it holds it.

### How each test is run
| Layer | Method | Tool |
|---|---|---|
| Client (XSS, storage, token handling, UI states) | Load `site/` on a local server, drive it, mock Supabase responses with `page.route()` so no real data is touched | Playwright MCP (`browser_run_code_unsafe`, `browser_navigate`, `browser_evaluate`) |
| Backend authorization (RLS, grants, RPC exposure, auth settings) | Direct REST calls with the public publishable key, exactly as an attacker would | Playwright MCP `page.request` |
| Backend business logic (pricing, limits, sessions) | Read the SQL. Live probes only where the call is guaranteed to fail validation and roll back | Code review + Playwright MCP |
| Headers / CSP / supply chain | Read `vercel.json`, HTML `<script>` tags, run `npm audit` | Code review + shell |

### Safety rules for this run
- **No real orders.** Every live `place_order` probe is built to fail a validation check, so the transaction rolls back and nothing is written.
- **No load or DoS tests against the live project.** Rate-limit and flood tests are proven from the SQL and listed as "needs staging" for a live run.
- **No account creation, no writes to storage.** Write-permission probes are crafted to violate a NOT NULL column, so even a broken permission can't persist a row.
- **Client exploits are proven with mocked responses** (Playwright network interception), not by planting data in the database.

### Severity scale
| Level | Meaning |
|---|---|
| **Critical** | Direct financial loss or full compromise, no special access needed |
| **High** | Anyone with a QR photo, or any diner, can disrupt the restaurant or other guests |
| **Medium** | Needs staff access, a second bug, or a determined attacker; or removes a key defence layer |
| **Low** | Hardening, defence in depth, hygiene |
| **Info** | Observation, no action strictly required |

### Order of work
1. Read every client file and every migration, map data flow from QR scan to kitchen.
2. Write the test catalogue (section 2) before running anything.
3. Run the catalogue with Playwright MCP, record pass / fail / blocked with evidence.
4. Rank failures by severity (section 3) and list what production still lacks (section 4).

---

## 2. Test catalogue and results

**123 test cases.** 78 were executed with Playwright MCP: 45 in the browser against `site/` on `localhost:5501`, and 33 as live API calls to the Supabase project. 43 more were done by code or config review and shell checks; 1 is operational only and 1 was not run.

| | Count |
|---|---|
| Pass | 85 |
| **Fail** | **32**: 3 critical, 6 high, 8 medium, 15 low |
| Info only | 5 |
| Not run | 1 |
| **Fixed since** | **11**: C05, C06, B04, B05 (section 7); A01, A05, A06, A07, A11, A12, A14 with visit tokens (section 8, **not yet deployed**) |
| **Reduced** | A08, A16, F01, F02 (section 8) |

How each test ran: **PW** = Playwright MCP in the browser · **Live** = Playwright MCP `page.request` against the live Supabase project · **Review** = read the code/SQL/config · **Shell** = grep, git, `npm audit`.

Nothing was written to the live database. Every live `place_order` probe failed a validation check (all returned 400), so no order, session or row was created.

### A. QR token and table session

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| A01 | QR token is stored somewhere a page script can't read | PW | ~~FAIL~~ **Fixed**: the QR token is kept only in this tab until it is swapped for a visit token, then deleted. The visit token can order for 5 min | Low |
| A02 | Token is removed from the address bar after scan | PW | Pass | |
| A03 | Back button / history doesn't reveal the token | PW | Pass | |
| A04 | 7 malformed tokens (`<script>`, uppercase, 31 and 33 chars, `../`, SQL, `%00`) are rejected and the URL is cleaned | PW | Pass | |
| A05 | Client 4-hour TTL can't be bypassed | PW | ~~FAIL~~ **Fixed**: the server enforces the window. A phone clock pushed an hour ahead still gets `VISIT_EXPIRED` (E5) | High |
| A06 | Server enforces token or visit expiry | Review | ~~FAIL~~ **Fixed**: visit tokens order for 5 min (V14), read until the table is freed or `session_idle_hours` (V18, V24) | Critical |
| A07 | A guest from a previous visit can't order into the next party's session | Review | ~~FAIL~~ **Fixed**: after Free table a saved token gets `VISIT_EXPIRED`, even with time left (V20, E8) | Critical |
| A08 | Ordering needs presence at the table | Review | **Still open, reduced**: someone holding a *photo* of the QR can scan it and get 5 minutes. They can no longer order from a saved link, and a table holds at most 10 unaccepted orders. Needs a PIN or OTP (section 8) | High |
| A09 | Token can't be guessed | Review | Pass: 128-bit random (`gen_random_uuid`) | |
| A10 | Unknown token and bad-format token give the same answer (no oracle) | Live | Pass: both `INVALID_TABLE` | |
| A11 | Tokens rotate on a schedule | Review | ~~FAIL~~ **Fixed in effect**: visit tokens expire on their own. Rotating the QR now also ends every open visit at that table (V22) | Low |
| A12 | "Visit ended" is enforced by the server | PW | ~~FAIL~~ **Fixed**: the server returns `visitEnded` and refuses orders (V18–V20) | High |
| A13 | Token never leaks in the `Referer` header | PW | Pass: 61 third-party requests, all carry origin only | |
| A14 | Token is cleared when the guest leaves | PW | ~~FAIL~~ **Fixed**: a shared phone can order only within 5 min of a scan, and the visit is dropped once the table is freed (E7) | Low |
| A15 | QR sticker swapped for a phishing QR | n/a | Operational: needs a tamper-evident sticker and a printed domain | Info |
| A16 | Device ID can't be forged or reset | PW | **Still open, reduced**: still client-chosen, but a visit token works only with the device ID it was issued to (V08) | Medium |

### B. Client storage

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| B01 | Unknown dish IDs in a tampered cart are dropped | PW | Pass | |
| B02 | Tampered qty 999 → 20, qty −5 dropped, 5000-char note → 140, fake add-on dropped | PW | Pass | |
| B03 | HTML in a stored cart note renders as text | PW | Pass | |
| B04 | Tampered menu cache is replaced by the live menu | PW | ~~FAIL~~ **Fixed**: was ₹1 "POISONED Prawns" after a live fetch. Fresh data is now compared by content, not version | Low |
| B05 | `PRICE_CHANGED` repairs a stale menu | PW | ~~FAIL~~ **Fixed**: menu, cache and the open order sheet's total now refresh; the retry sends ₹339 instead of ₹1 | Low |
| B06 | `__proto__` keys in stored cart don't pollute prototypes | PW | Pass | |
| B07 | Idempotency key is reused only for an identical cart | Review | Pass | |

### C. XSS and DOM injection (Supabase responses mocked with payloads in every field)

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| C01 | Search box `"><img onerror>` | PW | Pass | |
| C02 | URL hash `#"><img onerror>` and `<svg onload>` | PW | Pass | |
| C03 | Category name, short, ko, blurb, `art` attribute breakout | PW | Pass | |
| C04 | Category notes (title, ko, text, dt/dd), group name/ko/lede | PW | Pass | |
| **C05** | **Choice-option labels in "Your orders"** | PW | ~~FAIL~~ **Fixed**: options went through `.join()` without `esc()`, and the script ran. Before: `security-evidence/C05-xss-placed-order.png`; after: `C05-fixed-placed-order.png` | High |
| C06 | Order status on the "Order placed" screen | PW | ~~FAIL~~ **Fixed**: `o.status`, order number, guest number and quantity are now escaped in both order views | Low |
| C07 | Dish name, description, note, badge | PW | Pass | |
| C08 | Image path `x" onerror="…` | PW | Pass | |
| C09 | Dish builder: size label, choice label, option label | PW | Pass | |
| C10 | Add-on name and badge | PW | Pass | |
| C11 | Placed order: dish name, add-on, note, table label | PW | Pass | |
| C12 | Guest-typed line note in the cart | PW | Pass | |
| C13 | Toast messages | PW | Pass | |
| C14 | Clickjacking | PW | Pass on Vercel (`frame-ancestors 'none'`, `X-Frame-Options: DENY`). Any other host (tested locally) can be framed | Info |
| C15 | Error `detail` echoing attacker input is never printed raw | Review | Pass: used only as a lookup key | |
| C16 | No `eval`, `new Function`, `document.write` | Review | Pass | |

### D. Backend authorization (live Supabase, anon key)

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| D01 | SELECT `dining_tables` (holds every QR token) | Live | Pass: 401, 42501 | |
| D02 | SELECT `orders` | Live | Pass | |
| D03 | SELECT `order_items` | Live | Pass | |
| D04 | SELECT `table_sessions` | Live | Pass | |
| D05 | SELECT `staff` | Live | Pass | |
| D06 | SELECT `restaurant_settings` | Live | Pass | |
| D07 | SELECT on the 9 menu tables | Live | Pass | |
| D08 | INSERT into `orders` | Live | Pass: permission denied, never reaches constraints | |
| D09 | UPDATE `dining_tables.qr_token` | Live | Pass | |
| D10 | DELETE `dishes` | Live | Pass | |
| D11 | UPDATE `restaurant_settings.ordering_open` | Live | Pass | |
| **D12** | **anon EXECUTE on the 10 `staff_*` functions** | Live | **FAIL**: all 10 run and stop at `require_staff()` (`NOT_STAFF`). Migration `…0700_function_grants.sql` is not in effect on the live DB | Medium |
| D13 | `private.*` helpers unreachable (5 functions, plus a `Content-Profile: private` attempt) | Live | Pass: 404 / 406 | |
| D14 | `get_public_menu` exposes no internal fields | Live | Pass: no token, hash, sort, visible or user fields | |
| D15 | OpenAPI schema needs the secret key | Live | Pass | |
| D16 | GraphQL disabled | Live | Pass | |
| D17 | anon can't list storage buckets or objects | Live | Pass | |
| **D18** | **Public sign-up disabled** | Live | **FAIL**: `disable_signup: false`, so anyone can create an account | Medium |
| D19 | Anonymous sign-ins off | Live | Pass | |
| D20 | Email confirmation required | Live | Pass (`mailer_autoconfirm: false`) | |
| D21 | Errors don't reveal schema | Live | **FAIL**: messages name tables and functions | Low |
| D22 | CORS | Live | `*` for any origin; by design for a publishable key | Info |
| D23 | Realtime: anon receives no `orders` events | Not run | Needs a staging project and a real order while subscribed | |

### E. Order integrity (`place_order`)

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| E01 | Bad token format → `INVALID_TABLE` | Live | Pass | |
| E02 | Bad device ID → `BAD_REQUEST` | Live | Pass | |
| E03 | `p_items` not an array | Live | Pass | |
| E04 | Empty cart | Live | Pass | |
| E05 | 31 lines | Live | Pass | |
| E06 | Null `client_order_id` | Live | Pass | |
| E07 | SQL injection in token, device and dish ID | Live | Pass: regex and UUID casts, no dynamic SQL | |
| E08 | Unknown table | Live | Pass | |
| E09 | Price tampering: server recomputes every line, mismatch → `PRICE_CHANGED` | Review | Pass (live run needs a test-table token) | |
| E10 | qty 1–20 per line, 50 items per order | Review | Pass | |
| E11 | Option or add-on from another dish, or duplicated | Review | Pass | |
| E12 | Sold-out dish, hidden dish, hidden category | Review | Pass | |
| E13 | Replay of the same `client_order_id` returns the same order | Review | Pass | |
| E14 | Note sanitising | Review | **FAIL**: control chars stripped, but bidi overrides (U+202E) and zero-width chars pass, which can spoof the kitchen ticket | Low |
| E15 | Ordering-closed enforced by the server | Review | Pass | |
| **E16** | **Guest-number cap** | Review | **FAIL**: `guest_no` is capped at 99. After 99 device IDs in one session every new guest gets a DB error, so the table is locked until staff free it | Medium |
| E17 | Integer overflow on totals | Review | Pass | |
| E18 | `get_table_state` returns only this device's orders | Review | Pass | |
| E19 | Raw DB error text never reaches the guest | PW | Pass: generic toast | |
| E20 | Staff status changes are compare-and-set | Review | Pass | |

### F. Abuse and rate limiting

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| **F01** | **Per-device limit (6 / 10 min) can't be bypassed** | Review | **Still open, reduced**: fresh UUIDs still bypass it, but each needs its own scan (120 scans per table per 10 min) | Medium |
| **F02** | **Per-table limit stops a flood** | Review | **Reduced**: new cap of 10 unaccepted orders per table (`TABLE_BUSY`, V26), so a flood stalls until staff act | Medium |
| F03 | Human or staff confirmation for a new device's first order | Review | **FAIL**: none | Medium |
| F04 | Rate-limited message shown | PW | Pass | |
| F05 | Polling backs off (20 s / 60 s) and pauses in a hidden tab | Review | Pass | |
| F06 | Triple-click on Place order sends one request | PW | Pass | |
| F07 | No reply → message after 15 s | PW | Pass | |
| F08 | Oversized body (500 KB note) | Live | Accepted and processed (976 ms) before rejection | Low |
| F09 | 15 parallel token lookups | Live | No throttling (all 400, 557 ms); fine at 128-bit entropy | Info |

### G. Transport, headers, supply chain

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| G01 | Security headers in `site/vercel.json` | Review | Pass: CSP, XFO, nosniff, Referrer-Policy, Permissions-Policy | |
| **G02** | **CSP blocks inline script** | Review | **FAIL**: `script-src 'unsafe-inline'`, so C05's `onerror` runs even on Vercel | Medium |
| **G03** | **Subresource Integrity on CDN scripts** | Shell | **FAIL**: 3 cdnjs GSAP scripts, 0 `integrity=` | Medium |
| G04 | HSTS | Review | **FAIL**: not set in `vercel.json` (check live response headers after deploy) | Low |
| G05 | CSP present on non-Vercel hosting | PW | **FAIL**: no `<meta>` CSP fallback | Low |
| G06 | No secret or service-role key in repo, build or git history | Shell | Pass (3 hits, all detector code or docs) | |
| G07 | `admin/.env` not tracked | Shell | Pass | |
| G08 | No source maps in `admin/dist` | Shell | Pass | |
| G09 | Admin build refuses a secret key | Review | Pass | |
| **G10** | **Admin production deps** | Shell | **FAIL**: `npm audit` 4 high (react-router XSS / open redirect, turbo-stream DoS, zod memory DoS), 2 low (auth-js) | Medium |
| G11 | Admin dev deps | Shell | **FAIL**: vite and esbuild dev-server advisories | Low |
| G12 | All third-party resources over HTTPS | PW | Pass | |
| G13 | Third-party runtime dependencies (Google Fonts, cdnjs) | Review | **FAIL**: an outage or compromise of either breaks or owns the page | Low |

### H. Admin app (light pass)

| ID | Test | How | Result | Sev |
|---|---|---|---|---|
| H01 | A signed-in non-staff user is signed out | Review | Pass | |
| **H02** | **MFA for staff** | Review | **FAIL**: password only, and one staff login can edit prices, menu text (feeds C05) and QR codes | Medium |
| H03 | Owner vs staff permissions | Review | **FAIL**: `role` column exists but nothing checks it | Low |
| H04 | Deactivated staff lose access immediately | Review | Pass: `is_staff()` checked per call | |
| H05 | No `dangerouslySetInnerHTML` | Review | Pass | |
| H06 | Admin CSP has no `'unsafe-inline'` script | Review | Pass | |
| H07 | Demo mode can be switched on in production (`?demo=1`) | Review | **FAIL**: harmless data-wise, but fake orders on a real staff screen will confuse | Low |
| H08 | Password-reset redirect is allow-listed | Review | Check the Supabase dashboard redirect list | Info |
| H09 | Login brute-force protection | Review | **FAIL**: Supabase defaults only, no CAPTCHA | Low |

### J. Front-end behaviour

| ID | Test | How | Result |
|---|---|---|---|
| J01 | Menu down, no cache → error and retry | PW | Pass |
| J02 | Menu down, cache present → cached menu | PW | Pass |
| J03 | No token → "scan the QR", no Place button | PW | Pass |
| J04 | `INVALID_TABLE` → token dropped, message | PW | Pass |
| J05 | Ordering closed → banner, button disabled | PW | Pass |
| J06 | Table inactive → message, no button | PW | Pass |
| J07 | 375 px wide: no horizontal scroll (landing, menu, category) | PW | Pass |
| J08 | Dish dialog: focus moves in, Escape closes, focus returns | PW | Pass |
| J09 | Landing page also captures the QR token | PW | Pass |
| J10 | Console never prints the token | PW | Pass |

---

## 3. Findings ranked by severity

### 1. CRITICAL: a photo of the QR is a permanent licence to order (A05–A08, A12, A16)

> **Status (section 8):** steps 1–3 below are built and tested, not yet deployed. Visit tokens order for 5 minutes per scan and end when the table is freed. Step 4 (presence proof) is still open; the plan is phone OTP later.

The table token never expires on the server and there is no per-visit session. Anyone who ever scanned the code, or saw it in an Instagram post or Google review photo, can place real orders to that table from home, today or months from now, until staff manually rotate it. The 4-hour TTL and the "visit ended" check exist only in the browser and are bypassed by editing `localStorage`.

**Fix: add a visit (session) token.**
1. New `table_visits` table: `id`, `session_id`, `device_hash`, `token_hash`, `expires_at`, `created_at`.
2. New RPC `start_visit(p_qr_token, p_device, p_pin)` returns a random 256-bit `visit_token` (store only its hash). Expiry is about 3 hours, and it ends early when the table is freed.
3. `place_order` and `get_table_state` take the `visit_token`, not the QR token. Reject when expired or when `table_sessions.status <> 'open'`. Freeing a table kills every visit token for it, so last night's guest can't order into tonight's session.
4. **Prove presence** with one of:
   - (a) a 4-digit table PIN shown on the staff screen or a table tent, regenerated each time the table is freed;
   - (b) the first order from a new visit lands as `awaiting_confirmation` and staff tap to accept.

   Option (a) is cheaper for staff; (b) needs no extra printing.
5. Keep the QR token as a bootstrap only, and rotate it when stickers are reprinted.

### 2. HIGH: scripted fake-order flood (F01, F02, F03)
The per-device limit uses a client-chosen UUID, so it doesn't limit anything. The per-table cap allows 120 orders an hour per table, and every table can be hit in parallel.
**Fix:** finding 1 removes most of this. Also:
- Rate-limit per visit token and per IP (`current_setting('request.headers', true)::json->>'x-forwarded-for'`).
- Cap unaccepted (`placed`) orders per table at about 3.
- Optionally add Cloudflare Turnstile to `start_visit`.

### 3. HIGH: stored XSS on every diner's phone (C05, plus G02 lets it run)
`menu.js:732` prints choice-option labels from placed orders without escaping. A staff account (no MFA, H02) can set an option label like `<img src=x onerror=…>`, which is 40 characters, inside the DB limit. It then runs on the phone of every guest who orders that dish and views "Your orders", where it can read the table token and device ID. The deployed CSP allows inline handlers, so it is not blocked.
**Status:** the sink is fixed (`.map(esc)`, re-tested). Still to do: remove `'unsafe-inline'` from `script-src` by moving the inline `<script>` blocks (3 in `index.html`, 1 in `menu.html`) into files, so the next missed `esc()` can't run.

### 4. MEDIUM
| # | Finding | Fix |
|---|---|---|
| 4a | **D12**: anon can execute all `staff_*` functions on the live DB; one missed `require_staff()` in a future function would be a full breach | Apply `supabase/migrations/20261011000700_function_grants.sql` to the live project (`supabase db push`), then re-run D12: expect "permission denied for function" |
| 4b | **D18**: public sign-up on | Supabase dashboard → Authentication → Sign In / Providers → turn off "Allow new users to sign up". Invite staff instead |
| 4c | **E16**: 99-guest cap locks a table | Cap distinct devices per session in `place_order` and return a clear `TABLE_FULL` error, or drop the `guest_no ≤ 99` check |
| 4d | **G03**: no SRI on GSAP | Add `integrity="sha512-…" crossorigin="anonymous"` (cdnjs publishes the hashes) or self-host the three files |
| 4e | **G10**: 4 high npm advisories in admin | `npm i react-router-dom@latest zod@latest @supabase/supabase-js@latest` in `admin/`, then re-test login and routing |
| 4f | **H02**: no staff MFA | Turn on Supabase TOTP MFA and require `aal2` in `is_staff()` |

### 5. LOW
- ~~B04/B05~~: fixed.
- ~~C06~~: fixed.
- **A14**: drop the token when the visit ends.
- **E14**: strip `\p{Cf}` (bidi, zero-width) from notes.
- **G04**: add HSTS.
- **G05**: add a `<meta>` CSP.
- **D21**: verbose errors.
- **H03**: owner-only actions (QR rotation, prices).
- **H07**: build admin with demo mode off.
- **H09**: CAPTCHA on login.
- **A11**: scheduled rotation.
- **G11, G13, F08**: dev-dependency advisories, third-party runtime dependencies, oversized request bodies.

---

## 4. What is still missing for production

1. **Visit/session tokens with server-side expiry and presence proof** (finding 1). This is the single biggest gap.
2. **Real abuse controls**: limits that a client can't reset, a cap on unaccepted orders, optional CAPTCHA.
3. **Live DB matches the repo**: migration 7 isn't applied. Add a CI step that runs `scripts/security-check.mjs` against the deployed project after every migration.
4. **Staff account hardening**: MFA, sign-ups off, owner-only actions.
5. **A strict CSP**: no `'unsafe-inline'`, SRI or self-hosted GSAP, HSTS.
6. **A staging Supabase project** so the write-path tests (rate limits, guest cap, realtime leak) can run without touching real orders.
7. **Monitoring**: alert when a table gets more than N orders in 10 minutes, or orders arrive while the table has no open session in the staff app.
8. **Dependency hygiene**: patch admin deps, add `npm audit` and a secret scanner to CI.
9. **Automated test suite**: these checks are currently MCP runs. Port them to `@playwright/test` specs so they run on every commit.

---

## 5. Not run, and how to unblock

| Tests | Why not | What unblocks them |
|---|---|---|
| E09–E13 live | Need a valid table token; the only QR in the repo is from admin demo mode | A token for one test table. The probes fail validation and roll back, so no orders are created |
| F01, F02, E16 live | They create real orders | A staging Supabase project or a branch |
| D23 Realtime leak | Needs an order inserted while anon is subscribed | Same staging project |

---

## 6. Tools that would extend this audit

Already in your downloaded plugin marketplace (`anthropics/claude-plugins-official`), not installed yet:
- `claude-security`: whole-repo and diff security scan with verified patch suggestions
- `security-guidance`: a hook that flags insecure patterns while code is being edited

Worth adding:
- **Supabase MCP** (`supabase-community/supabase-mcp`), pointed at a staging project in read-only mode. It lets the SQL-level checks (grants, RLS, function privileges) run directly instead of being inferred from REST responses.
- **Supabase Security Advisor** (dashboard → Advisors, built on `supabase/splinter`). It lints RLS, `search_path` and exposed functions.
- **gitleaks** (`gitleaks/gitleaks`): secret scanning in CI and pre-commit.
- **Semgrep** (`semgrep/semgrep`): static rules for `innerHTML` sinks, which would have caught C05.
- **OWASP ZAP** (`zaproxy/zaproxy`): automated DAST against a staging deploy.
- **OWASP ASVS** (`OWASP/ASVS`) and **WSTG** (`OWASP/wstg`): the checklists this catalogue can grow against.

---

## 7. Fix log

**2026-11-02, `site/menu.js` (cache-buster `menu.js?v=7` in `menu.html`). Not committed.**

| Finding | Change | Re-test (Playwright MCP) |
|---|---|---|
| C05 | `lineHTML`: `(c.options || []).map(esc).join(", ")`; placed quantity escaped | Payload in option label → shown as text, 0 handlers fired. Normal labels still render ("Mac & Cheese" displays correctly, not as `&amp;`) |
| C06 | `ordersHTML` and `renderDone`: escape `orderNo`, `guestNo`, `status` (class and text) | Payloads in all four fields → shown as text, 0 handlers fired. Normal order shows "Order #42 · Guest 1", class `status-chip--preparing` |
| B04 | New `state.menuSig` (JSON of the last ingested menu). Boot and `refreshMenu` compare fresh data against it, not the version number | Poisoned cache with the live version → grid shows ₹339 and the cache is rewritten with live data |
| B05 | `refreshMenu` redraws an open order sheet, same rule `pollTableState` already uses | Stale ₹1 cart → after `PRICE_CHANGED` the sheet shows ₹339 and the retry sends 339 |
| (smoke) | n/a | Live menu loads: 12 categories, 9 rail cards, no page errors |

Cost of the cache change: one `JSON.stringify` of the menu (~90 KB) per fetch. A side effect: toggling "ordering open" now also refreshes the menu view, because it is part of the payload.

---

## 8. Visit tokens: 5-minute ordering window per scan

**2026-11-02. Not committed, not deployed.**

### How it works now
1. The guest scans the QR. `table-context.js` keeps the QR token in **this tab only** (`sessionStorage`) and strips it from the URL.
2. `menu.js` calls `start_visit(qr, device)`. The server returns a random 256-bit **visit token**, stored only as a SHA-256 hash and tied to that device ID. The phone keeps the visit token and deletes the QR token.
3. For **5 minutes** (`restaurant_settings.visit_order_minutes`) the visit token can place orders. After that, `place_order` returns `VISIT_EXPIRED`, the whole menu page is replaced by the "Scan again" screen (section 9), and the cart stays.
4. The visit token can still **read** this phone's orders until staff free the table (`visitEnded`), or `session_idle_hours` pass.
5. **Free table** ends every visit that ordered at that session. **Rotate QR** ends every open visit at that table.

### Limits added
| Limit | Value | Error |
|---|---|---|
| Scans per phone | 10 per 10 min | `RATE_LIMITED` |
| Scans per table | 120 per 10 min | `RATE_LIMITED` |
| Unaccepted (`placed`) orders per table | 10 | `TABLE_BUSY` |

### Files
| File | Change |
|---|---|
| `supabase/migrations/20261102000100_visit_tokens.sql` | `table_visits` table (RLS on, no grants), `start_visit`, new `get_table_state` / `place_order` taking `p_visit`, old QR-token versions **dropped**, `staff_rotate_table_token` ends visits, explicit grants |
| `site/table-context.js` | Holds the scan per tab, stores `{ visit, orderBy }`, deletes the old `moba:table:v2` key |
| `site/api.js` | `startVisit`, and `p_visit` instead of `p_token` |
| `site/menu.js` | Swaps the scan on load, closes the window live, handles `INVALID_VISIT`, `VISIT_EXPIRED` and `TABLE_BUSY` |
| `site/menu.html`, `site/index.html` | Cache-busters: `table-context.js?v=2`, `api.js?v=2`, `menu.js?v=8` |
| `scripts/security-check.mjs` | Tests the new API, plus a check that would have caught D12 (staff functions must say "permission denied") |
| `supabase/tests/` | Stubs and a 30-check SQL suite; runs on plain Postgres and exits non-zero on failure |

### Tests
- **SQL, 30/30 pass** (`supabase/tests/visit_tokens.test.sql`, run on a fresh local PostgreSQL 17 with all 8 migrations). The suite covers:
  - a QR token used as a visit token: refused (V09)
  - a token copied to another phone: refused (V08)
  - ordering after 5 minutes: refused (V14), but status stays readable (V16) and retries are idempotent (V15)
  - a re-scan keeps the same guest number (V17)
  - after Free table: orders hidden, and a departed guest can't order (V18–V20)
  - the next party starts clean (V21)
  - QR rotation ends open visits (V22, V23)
  - limits: scans per phone (V25), unaccepted orders per table (V26)
  - the old functions are gone (V29)
- **Browser, mocked API, 14/14 pass**:
  - the QR token is never in `localStorage`
  - the window closes on screen without a reload
  - server expiry wins over a tampered phone clock
  - rotated or unknown QR shows the right message
  - offline retry works
  - visit ended clears the phone
  - `TABLE_BUSY` shows its message
- **End to end, browser → local Postgres with the new migration** (through a test-only bridge):
  - scan → Order #14 · Table 5 · Guest 1
  - after 5 min the server refuses
  - re-scan → Order #15 · Guest 1
  - Free table → the saved token gets `VISIT_EXPIRED`, and the phone forgets the visit

  Screenshots: `security-evidence/visit-token-*.png`.

### Deploy (do these together; old phones fail until they load `menu.js?v=8`)
1. `supabase db push` applies **both** pending migrations, `…0700_function_grants.sql` and this one.
2. Deploy `site/`.
3. Run `scripts/security-check.mjs` against the live project. Tests 3b and 6a–6d should pass.

### What this does not stop
- **A photo of the QR.** Scanning a photo gives 5 minutes like a real scan. Closing that needs proof of presence:
  - a table PIN that changes when the table is freed; or
  - phone OTP: it doesn't prove presence, but it names whoever ordered and lets you block them.
- **Guests who browse longer than 5 minutes** must scan again before ordering. Watch whether this annoys real guests; `visit_order_minutes` can be raised without a deploy.
- The QR still opens the landing page, so a re-scan means one more tap on "Open the menu". Pointing table QRs at `/menu.html?t=…` would save that tap; `admin/src/lib/qr.js` builds the URL.
- `ordering-system.md` still describes the old `p_token` API.

---

## 9. What DevTools shows, and the menu gate

**2026-11-02. Checked with Playwright MCP on `localhost:5501`; admin by reading `admin/dist` and `admin/src`.**

### What anyone can see in DevTools
| Panel | Diner site (`menu.html`) | Risk |
|---|---|---|
| Sources | `config.js`: Supabase project URL and **publishable** key (`sb_publishable_…`) | None by itself. It is meant to be public |
| Network | Every request carries `apikey: sb_publishable_…`. No `Authorization` header, no cookies | Same key as above |
| Application → localStorage | `moba:device` (this phone's ID), `moba:visit:v1` (this phone's visit token), cart, menu cache | The guest's own data on their own phone. The visit token orders for 5 min only |
| Application → sessionStorage | `moba:scan` (the QR token) for a moment, until it is swapped. Empty afterwards | None |
| Console | Nothing logged | None |
| **Not found anywhere** | No secret (`sb_secret_`) key, no service-role JWT, no source maps, no QR token after the swap | |

Admin (`admin/dist`, built 2026-10-12, git-ignored): only the same URL and publishable key. On a **staff** device, `localStorage` also holds the Supabase login session (`sb-<project>-auth-token`: access and refresh token). Anyone who can open DevTools on that browser can copy it and act as that staff member.

### Why the publishable key can't be hidden, and doesn't need to be
Any key a browser uses is visible in that browser; there is no way to hide it in a static site. Supabase designs the publishable key for this: it identifies the project, and everything it can do is decided by the database's grants and row-level security. This audit tested exactly that with the key (section 2, D01–D22). The key can:
- call `get_public_menu`, `start_visit`, `get_table_state` and `place_order`
- read public menu photos

Nothing else.

### What to actually do
1. **Apply the pending migrations** (`supabase db push`). Until then the key can still *execute* the 10 staff functions on the live project (D12); only the check inside each function stops them.
2. **Turn off public sign-up** (dashboard → Authentication → Sign In / Providers). Today the key plus `/auth/v1/signup` lets anyone create an account (D18).
3. **Keep the secret key out of the browser.** It belongs only in server-side places (CI secrets, the Supabase dashboard). `admin/vite.config.js` already refuses to build with one, and `scripts/security-check.mjs` greps the build. If a secret key is ever pasted into a site file, chat or repo, roll it in the dashboard (Project Settings → API Keys) the same day.
4. **Rotating the publishable key is not needed.** It was never secret, and a new one would be just as visible.
5. **Staff devices:** turn on MFA, set a session time-box or inactivity timeout (Authentication → Sessions), lock shared tablets, and sign out at closing.
6. **Optional:** a proxy (for example a Vercel function) in front of Supabase would hide the project URL. It would not add real security, because the proxy itself is callable. Not recommended.

### Menu gate: `menu.html` opens only inside a live table session
- **Website visitors** can use the home page as before. Opening the menu (any "menu" link) shows **"Scan to see the menu. Scan the QR code on your table at MOBA to browse the menu and order."** Nothing else loads: no menu request, no table request.
- **After a scan**, the menu opens for 5 minutes. When the time is up, the **whole page** is replaced by "Scan again", whether the guest is browsing, has the order sheet open or is on the "Order placed" screen. Polling stops. The cart stays on the phone, and the screen says "Your picks are saved on this phone."
- The page is hidden **before it paints** (`table-context.js` adds `html.gated` from the `<head>`), so the menu never flashes.
- Other screens:

  | Situation | Screen |
  |---|---|
  | Staff freed the table | "Thanks for eating with us!" |
  | Unknown or rotated QR | "This QR code isn't active any more" |
  | Too many scans at once | "One moment" |
  | No connection | "No connection" + **Try again** |
- Screenshots: `security-evidence/gate-*.png`.

**Tests (Playwright MCP, reduced motion because that browser window was throttling animation frames).** All pass:

| Test | Result |
|---|---|
| G1 | Visitor sees the gate; 0 API calls; hidden before first paint |
| G3 | Scan → `start_visit` first, then the menu |
| G4 | Window ends with the sheet open → gate, polling stops |
| G5 | Reload after expiry makes **0 requests** |
| G6 | A pushed-forward phone clock keeps the menu open, but the server refuses the order and the gate appears |
| G7 | Table freed → thanks screen, visit dropped |
| G8 | Unknown visit → gate |
| G9 | Unknown or rotated QR → gate |
| G10 | Offline → Try again → menu opens |
| G11 | Too many scans → "One moment" |
| G12 | Home page not gated |

The normal animated path was also checked in the app's own browser: menu → "Scan again" after a 15-second test window.

**Limit:** the gate is a screen, not a lock on the menu's *data*. `get_public_menu` still answers anyone with the publishable key, so a technical person could read the menu from the API. The menu is public information, and ordering is locked on the server, so this is fine. If you want the API closed too, `get_public_menu` can be made to require a live visit token; that also means the home page can never show live menu data.
