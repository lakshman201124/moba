# MOBA progress tracker

**What this file is for:** if a session ends, or tokens run out, a new session reads only this file and continues. Keep it current: update the snapshot, the status table and the "Next steps" list at the end of every working session.

**To resume in a new Claude session, say:**
> Read `progress-tracker.md`, then `testing.md`, and continue from "Next steps". Don't redo anything marked done.

Last updated: **Thu 27 Nov 2026 (session 2)** · Branch: `main` (HEAD `361ff5c`) · **Nothing is committed or deployed yet.** All work below is local.

> **Session 2 headline:** Phase 0 tests are **GO**. Clean run: 68 local + 6 live read-only + 30 SQL all green, 0 unexpected failures, 0 flaky, 4 documented known-bugs deferred to later phases. Independent report at `docs/testing/phase-0-report.md`. Fixed a blocker: OneDrive had dehydrated the spec files to placeholders (`ReparsePoint`) so Playwright found 0 tests — rematerialised them (see §6). Remaining for Phase 0: owner gate → ship. Owner inputs 0.6/0.7 are Phase 1/2 inputs, not Phase 0 blockers.

---

## 1. Where we are, in one look

| Phase | Goal | Status |
|---|---|---|
| Audit (2 Nov) | First security audit | ✅ Done: `security-audit.md` |
| Capacity test (27 Nov) | How much traffic, what breaks | ✅ Done: `capacity-report.md` |
| Planning (27 Nov) | Phase-by-phase plan, tester agent | ✅ Done: `testing.md`, `.claude/agents/phase-test-engineer.md` |
| **Phase 0**: foundation + quick wins | Safety net before changing anything | ✅ **Tests GO** (68 local + 6 live + 30 SQL green); awaiting owner gate + ship |
| Phase 1: launch blockers | Kitchen alerts, menu bottleneck, big tables | ⏳ Not started (Sat 28 – Sun 29 Nov) |
| Phase 2: launch readiness | Caching, monitoring, runbook, go / no-go | ⏳ Not started (Mon 30 Nov) |
| 🚀 Launch | Menu goes live | Target **Mon 30 Nov – Tue 1 Dec** (owner to confirm the date) |
| Phase 3: hardening | Security tightening after launch | ⏳ After launch |
| Phase 4: abuse protection | QR-photo ordering, rate limits | ⏳ After launch |
| Phase 5: automation | GitHub CI on every pull request | ⏳ After launch |

---

## 2. Done so far

### 2.1 Capacity and security test (27 Nov): `capacity-report.md`
- **Live site = repo:** every deployed file matches `main`.
- **Measured capacity (live):**
  - Vercel CDN: 334 req/s, 0 errors.
  - Menu API: **ceiling ~60 req/s** (the bottleneck).
  - Cheap API calls: ≥214 req/s.
- **Local write path:** ~420 full scan→order journeys/s on a 12-core PC. Menu building costs 68% of each journey.
- **Verdict:** real guests can't overload it (a packed night uses ~3%), but one script can saturate the menu API.
- **Browser end to end against the real SQL:** 15 scenarios passed; the project SQL suite passed 30/30.
- **Findings F1–F12**, all listed in `testing.md` §3. The top ones:
  - F1: menu bottleneck.
  - F2: kitchen screen goes silent when Realtime drops.
  - F4: public sign-up is on.
  - F5: guest 100 crashes.
  - F6: 10-pending cap per table.
- One finding was withdrawn after re-checking: "two h1 on the menu gate" was wrong (the hidden heading is `display: none`).

### 2.2 Plan and agent
- `testing.md`: the master plan. Rules, the 7-step loop per phase (Analyze → Build → Test → Fix → Gate → Ship → Watch), what's broken, the timeline, every phase with about 50 test cases, exit criteria and rollback.
- `.claude/agents/phase-test-engineer.md`: the independent tester. Given a phase, it writes ~50 cases, automates them, runs them and reports GO / NO-GO. It never edits app code, never writes to live and never ships.
- `.claude/skills/frontend-testing/`: the owner's testing skill, copied into the project. The agent follows it.

### 2.3 Phase 0 work so far
| Item | Status | Details |
|---|---|---|
| 0.1 Playwright Test framework | ✅ | `tests/` with its own `package.json` (Playwright 1.65.1, axe-core 4.14.1). Chromium 1255 + WebKit 2388 installed. Projects: `api`, `iphone` (WebKit), `android`, `iphone-se`, `live` (read-only) |
| 0.2 Local test backend | ✅ | `tests/support/bridge.py` (loopback only, applies the production CSP headers) + private Postgres 17 on port 54329 in `%LOCALAPPDATA%\moba-test-pg\data`. **Each test gets its own fresh database clone (~1 s).** Template = stubs + all migrations + seed + `tests/support/fixtures.sql` (tables T1–T50, T49 inactive, a staff owner) |
| Framework proof | ✅ | `tests/phase-0/framework*.spec.js`: 3/3 pass (WebKit iPhone + API) |
| 0.3 Agent + skill | ✅ | See 2.2 |
| 0.4 Favicon | ✅ local, not shipped | `site/assets/favicon-32.png`, `site/assets/apple-touch-icon.png`, `site/favicon.ico`, and `<link>` tags in `site/index.html` + `site/menu.html`. Verified locally: the 404 is gone, no console errors |
| ~50 baseline tests | ✅ **GO** | 59 cases automated (0 manual). Clean run: **68 local + 6 live + 30 SQL green**, 0 unexpected fails, 0 flaky, 4 known-bug `test.fail()` deferred (SEC-09/F12→Ph3, SEC-10/P0-BUG-01 home XSS→Ph3, LAYOUT-03 WebKit focus→later). Catalogue: `docs/testing/phase-0-test-cases.md`. Independent go/no-go: `docs/testing/phase-0-report.md`. Leftover mutant probes deleted; `.gitignore` updated (`node_modules`, `test-results*`) |
| 0.5 Turn off public sign-up | ✅ **Confirmed off on live** | `P0-SMOKE-06` reads live `/auth/v1/settings` → `disable_signup: true`. F4 closed |
| 0.6 Tell Claude your plans | ⏳ **Owner** | Supabase Free or Pro? Vercel Hobby or Pro? |
| 0.7 Create a staging Supabase project | ⏳ **Owner** | Free second project, e.g. "moba-staging". Needed for Phase 1 kitchen tests |

---

## 3. Next steps (in order)

**✅ Done this session (2):** report produced and independently verified (GO); suite re-run clean (68 local + 6 live + 30 SQL); `test.fail()` known-bugs reviewed; OneDrive placeholder blocker fixed (§6); mutant probes deleted; `.gitignore` updated; `testing.md` §8 and this file updated. *(Optional later: fold `tests/phase-0/_*-helpers.js` into `tests/support/`.)*

1. **Gate (owner):** approve Phase 0 from `docs/testing/phase-0-report.md`.
2. **Ship Phase 0** (after approval):
   - Create branch `phase-0-foundation`.
   - Commit the favicon, `tests/`, `docs/testing/`, `testing.md`, `capacity-report.md`, `progress-tracker.md`, `.claude/agents/`, `.claude/skills/`, `scripts/loadtest/` and the evidence screenshots.
   - Do **not** commit the owner's `site/color-check.html` edit unless asked.
   - Open a PR, check the Vercel preview, merge, then run `npx playwright test --project=live` (including `@after-ship` — favicon served on live).
3. **Owner inputs for Phase 1/2** (not Phase 0 blockers): **0.6** Supabase Free/Pro? Vercel Hobby/Pro? · **0.7** create a free staging Supabase project (needed for 1B kitchen tests). *(0.5 sign-up already off.)*
4. **Start Phase 1:** tell Claude "Run phase 1". See `testing.md` §5 Phase 1.

---

## 4. Future phases (summary; full detail in `testing.md` §5)

| Phase | Changes | Needs from owner |
|---|---|---|
| **1. Launch blockers** (Sat–Sun) | **1A** pre-built menu (cache row + trigger, ≥3× capacity) · **1B** kitchen screen: Offline bar, refetch on reconnect, chime for polled orders · **1C** "table full" message instead of the crash at guest 100; pending cap `max(10, seats × 2)` | Paste one SQL file in the Supabase SQL editor; confirm the cap; staging project; test on a real kitchen tablet |
| **2. Launch readiness** (Mon) | Browser caching headers · one-command live smoke · uptime monitor · launch runbook · night-before load re-test · device matrix | Uptime-service account; plan upgrade decision (Supabase Pro ~$25/mo for no pausing and backups; Vercel Pro if on Hobby) |
| **Code freeze** | Mon night: emergency fixes only | |
| **3. Hardening** (launch week) | CSP without `'unsafe-inline'` · GSAP integrity hashes · admin package upgrades · staff two-factor login · note sanitising · Wi-Fi password exposure decision · remove `color-check.html` and 2.8 MB of unused files · restocked-dish refresh · move inline SVG art into a cached file | Decide whether the Wi-Fi password is public |
| **4. Abuse protection** | QR-photo protection (table PIN or staff confirm) · rate limiting · order-flood alert | Choose PIN vs staff confirm |
| **5. Automation** | GitHub Actions: SQL tests + Playwright + `npm audit` on every PR; nightly staging E2E; live smoke after deploys | None |

### Open decisions (defaults Claude will use unless told otherwise)
| Decision | Default |
|---|---|
| Pending-order cap per table | `max(10, seats × 2)` |
| QR-photo protection | After Phase 3 |
| Delivery | A branch + pull request per phase, tried on the Vercel preview first |
| Database changes on live | Claude gives the exact SQL; owner pastes it in the Supabase SQL editor (no Supabase CLI or Docker on this PC) |
| Test language | JavaScript |

---

## 5. How to run things

```powershell
cd "C:\Users\LAKSHMAN\OneDrive\Desktop\mobaa last\tests"
npx playwright test --grep @phase0 --grep-invert @after-ship   # Phase 0 suite
npx playwright test --project=live                             # live read-only smoke
npx playwright show-report                                     # HTML report
```

- The test Postgres starts on its own when the tests run. Its data lives in `%LOCALAPPDATA%\moba-test-pg`, log in `postgres.log` next to it. To stop it: `pg_ctl -D "%LOCALAPPDATA%\moba-test-pg\data" stop`.
- The bridge starts on its own (Playwright `webServer`), or manually: `python support/bridge.py "<repo>\site" 5510`.
- Load tests: `scripts/loadtest/` (k6 for live, **only while the restaurant is closed**; pgbench for local).

## 6. Lessons learned (avoid repeating)

- On Windows, `pg_ctl start` hangs if you wait on it from Node, because the server inherits its output handles. `support/db.js` starts it detached and polls `pg_isready`.
- Never put a database folder inside OneDrive. The test cluster lives in `%LOCALAPPDATA%`.
- **OneDrive dehydrates idle repo files into Files-On-Demand placeholders (`ReparsePoint`); Playwright's scanner skips them and reports "0 tests".** Reading or `attrib +P` (pin) does not reliably clear it. Fix = rematerialise (rewrite each file: read bytes → delete → write back). Command in `docs/testing/phase-0-report.md` §7 and in Claude memory. Confirm `npx playwright test --list` shows ~75 tests in 10 files before trusting a run.
- Load `supabase/seed.sql` with `PGCLIENTENCODING=UTF8`, or the Korean text fails.
- The test bridge can run SQL, so it binds to `127.0.0.1` only.
- Pillow is broken in this Python. Images were made with the browser's canvas via Playwright instead.
- Live k6 tests saturate the real database by design. Run them only when the restaurant is closed.
- The owner prefers plain-language explanations, piece by piece, with a clear go / no-go at each step.

## 7. Key files

| File | What |
|---|---|
| `progress-tracker.md` | This file: status and handoff |
| `testing.md` | Master plan (phases, rules, exit criteria) |
| `capacity-report.md` | 27 Nov measurements and findings F1–F12 |
| `security-audit.md` | 2 Nov audit |
| `.claude/agents/phase-test-engineer.md` | Tester agent |
| `tests/README.md` | How the test framework works |
| `docs/testing/phase-N-test-cases.md`, `phase-N-report.md` | Per-phase cases and results |

## 8. Change log

| When | What |
|---|---|
| 2026-11-27 ~00:20–00:50 | Capacity + security test, `capacity-report.md` |
| 2026-11-27 ~01:00 | `testing.md`, tester agent, skill copied in, favicon (local) |
| 2026-11-27 ~01:15–01:45 | Playwright Test framework, local test backend, framework proof 3/3 |
| 2026-11-27 ~01:45 | Phase 0 test workflow `wf_c2ea82fb-ae4` started |
| 2026-11-27 ~02:00 | This tracker created |
| 2026-11-27 session 2 | Fixed OneDrive placeholder blocker (Playwright found 0 tests); deleted mutant probes; updated `.gitignore`; re-ran suite clean (68 local + 6 live + 30 SQL green) |
| 2026-11-27 session 2 | Independent `phase-test-engineer` re-verified Phase 0 → **GO**; wrote `docs/testing/phase-0-report.md`; updated `testing.md` §8 and this tracker |
