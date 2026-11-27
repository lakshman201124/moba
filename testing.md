# MOBA testing plan: phase by phase to launch

Owner: you (decisions, approvals) · Builder: Claude (main session) · Tester: the `phase-test-engineer` agent (`.claude/agents/phase-test-engineer.md`)
Started: Fri 27 Nov 2026 · **Launch target: Mon 30 Nov – Tue 1 Dec 2026 (confirm the date)**
Evidence behind every item: `capacity-report.md` (measured 27 Nov) and `security-audit.md` (2 Nov).

---

## 1. Read this first: the 3 rules

1. **One phase at a time.** A phase isn't done until its tests pass and you approve it. The next phase doesn't start before that.
2. **The builder never grades its own work.** Claude makes the change; a separate agent, which didn't write the code, tests it. That's how real teams catch what the author can't see.
3. **Live is sacred.** No test ever creates orders, visits or accounts on the live restaurant. Live gets read-only checks only. Load tests on live run only while the restaurant is closed.

---

## 2. How every phase runs (the loop)

```
 1 ANALYZE ──► 2 BUILD ──► 3 TEST ──► 4 FIX ──► 5 GATE ──► 6 SHIP ──► 7 WATCH
   agent        Claude      agent      Claude    you         Claude     everyone
```

| Step | Who | What happens | Output |
|---|---|---|---|
| 1. Analyze | Agent | Reads this phase, the code it touches and the business rules; lists what could go wrong | Risk list in the phase's test-case file |
| 2. Build | Claude | Makes the phase's changes on a branch | Code + a pull request (PR) |
| 3. Test | Agent | Writes **~50 test cases** for the phase, turns them into Playwright tests, runs them | `docs/testing/phase-N-test-cases.md`, specs in `tests/` |
| 4. Fix | Claude | Every failure becomes a bug report, then a fix, then the test is re-run | All P0 tests green |
| 5. Gate | **You** | Read the agent's go / no-go report and approve | `docs/testing/phase-N-report.md` |
| 6. Ship | Claude (+ you for the database) | Vercel preview link → smoke test on the preview → merge → database SQL if any → smoke test on live | Change is live |
| 7. Watch | Everyone | Check live for 30 minutes; the rollback steps are written in the phase | Phase closed ✓ |

### Words you'll see
| Word | Meaning |
|---|---|
| **Test case** | One thing to check, in plain English: steps + what should happen |
| **Spec** | The test case turned into code (`*.spec.js`) that Playwright runs by itself |
| **P0 / P1 / P2** | Priority. P0 = money, orders or the kitchen; if a P0 fails, nothing ships |
| **Mock** | Faking the backend's answer, to test a screen state (like "sold out") without touching the database |
| **Smoke test** | A 1-minute read-only check that live still works after a deploy |
| **Regression** | Something that used to work and broke. Old tests re-run every phase to catch these |
| **Flaky** | A test that fails randomly. Treated as a bug in the test and fixed, never ignored |
| **Gate** | The go / no-go decision before shipping |
| **Rollback** | The exact steps to undo a change if live misbehaves |

---

## 3. What's broken today (ranked for launch)

| ID | Problem | Hurts launch? | Phase |
|---|---|---|---|
| F4 | Public sign-up is on: anyone can create accounts | Yes, cheap to fix | 0 (you) |
| F2 | Kitchen screen goes silent (no sound, no warning) if its live connection drops | **Yes: missed orders on a busy night** | 1 |
| F1 | Menu is rebuilt on every load; ~60/sec ceiling; one script can slow everything | **Yes: one bad actor can slow launch night** | 1 |
| F5 | 100th guest at one sitting crashes and blocks the table | Unlikely, but crashes are bad | 1 |
| F6 | More than 10 waiting orders at one table → "table busy" (launch groups are big) | **Yes: big launch-party tables** | 1 |
| — | Plan limits: Supabase Free pauses after 7 idle days and has no backups; Vercel Hobby is non-commercial | Yes, if you're on those plans | 0 check, 2 decide |
| F9 | Home page 780 KB, nothing cached by browsers | Slower on 4G | 2 (caching), 3 (size) |
| — | No monitoring: nobody is told if live goes down | Yes | 2 |
| F10 | No favicon (404 on every visit) | Small | **0, fixed today** |
| F7 | Loose script policy (CSP), no integrity hashes on GSAP, no staff two-factor login | After launch | 3 |
| F8 | 4 high-severity package warnings in the admin app | After launch | 3 |
| F11 | Restocked dish stays "sold out" on the phone for a while | Small | 3 |
| F12 | Wi-Fi password will be public once filled in; note spoofing characters; verbose DB errors | After launch | 3 |
| F10 | Temporary `color-check.html` live; 2.8 MB unused files deployed | After launch | 3 |
| F3 | A photo of a table QR still allows ordering (5 min, capped) | After launch | 4 |

**Not broken, measured:** thousands of website visitors are fine. The website is served by Vercel's CDN (334 req/s tested, 0 errors) and the menu is locked behind the QR, so random web traffic never reaches the expensive part. A packed restaurant night uses about 3% of capacity. **No server upgrade is needed for traffic.** The upgrades worth doing are about reliability (no pausing, backups), decided in Phase 2.

---

## 4. Timeline

| Day | Phase | Goal |
|---|---|---|
| Fri 27 Nov (today) | **Phase 0**: foundation + quick wins | Safety net in place before anything changes |
| Sat 28 – Sun 29 Nov | **Phase 1**: launch blockers | Kitchen never misses an order; menu can't be choked; big tables work |
| Mon 30 Nov | **Phase 2**: launch readiness | Caching, monitoring, smoke tests, runbook, go / no-go |
| Mon 30 Nov, night | **Code freeze** | Only emergency fixes after this |
| Launch day | 🚀 | Watch the runbook |
| Week after launch | **Phases 3 → 5** | Hardening, abuse protection, automation |

---

## 5. Phases

### Phase 0: Foundation and quick wins · today

**Goal:** a safety net that records how everything works *today*, so any change that breaks something is caught. Plus the fixes small enough to do right now.

| # | Change | Who | Status |
|---|---|---|---|
| 0.1 | Playwright Test framework in `tests/`, with its own `package.json` so the Vercel site build is untouched. Device projects: iPhone SE, iPhone 15, Pixel 7, kitchen tablet, desktop | Claude | ✅ |
| 0.2 | Local test backend: throwaway Postgres + `bridge.py`, so the real site code runs against the real SQL with zero risk to live | Claude | ✅ |
| 0.3 | `phase-test-engineer` agent and the `frontend-testing` skill in this project | Claude | ✅ done today |
| 0.4 | Favicon on the home and menu pages (removes a 404 on every visit) | Claude | ✅ done today |
| 0.5 | **Turn off public sign-up**: Supabase dashboard → Authentication → Sign In / Providers → turn off "Allow new users to sign up" | **You** | ✅ (confirmed off on live: P0-SMOKE-06, `disable_signup: true`) |
| 0.6 | **Check your plans**: Supabase (Free or Pro?) and Vercel (Hobby or Pro?) and tell Claude | **You** | ☐ |
| 0.7 | **Create a free staging Supabase project** (needed to test the kitchen screen with real login and live updates in Phase 1) | **You** | ☐ |

**Test focus (~50 cases): a baseline of today's behaviour**
| Area | ~Cases | Layer |
|---|---|---|
| Guest happy path: scan → menu → add → order → status | 6 | End to end, local |
| Menu gate states: visitor, scanned, expired, freed, invalid QR, offline, rate limited | 8 | Screens, mocked |
| Edge cases: price change, sold out, ordering closed, offline, timeout, second phone, double-tap | 10 | End to end, local |
| API replies and error codes for the 4 public calls | 10 | API, local |
| Permissions: anonymous can't read tables, orders, staff or QR codes, or run staff functions | 8 | API, local + live read-only |
| Live smoke: home, menu gate, favicon, security headers, no console errors | 5 | Live, read-only |
| Layout: no sideways scroll at 3 widths, one visible `h1`, focus order on the gate | 3 | Screens |

**Exit criteria:** every baseline test passes locally · live smoke passes · 0.5 confirmed.
**Ship:** favicon → PR → preview link → smoke on the preview → merge.
**Rollback:** revert the PR (the favicon is two `<link>` lines and two image files).

---

### Phase 1: Launch blockers · Sat 28 – Sun 29 Nov

**Goal:** the kitchen never misses an order, one person can't slow the system, and big launch tables can order.

| # | Change | Fixes | Needs from you |
|---|---|---|---|
| 1A | **Pre-built menu.** One database row holds the finished menu, rebuilt automatically whenever staff change anything. The phone's request becomes a tiny read. Site code doesn't change | F1 | Paste one SQL file into the Supabase SQL editor (rollback SQL provided) |
| 1B | **Kitchen alerts that can't go silent.** Red "Offline, reconnecting" bar; reload orders the moment the connection returns; chime and pop-up for orders found by the 60 s backup check too; never chime twice for one order | F2 | Test on a real kitchen tablet |
| 1C | **Big tables.** Clear "table is full, ask staff" message instead of the crash; waiting-order limit becomes `max(10, seats × 2)` | F5, F6 | Confirm the limit (default shown) |

**Test focus (~50 cases)**
| Area | ~Cases |
|---|---|
| Pre-built menu returns exactly the same menu as today, all 125 dishes | 3 |
| Menu updates right away after each kind of staff edit: price, sold out, hide/show dish, hide/show category, add-on, option, new dish, ordering on/off | 12 |
| Speed before vs after (local pgbench + live k6 at night): ceiling must rise at least 3× | 4 |
| Kitchen: offline bar appears and clears; reload on reconnect; chime for polled orders; no double chime; mute respected; tab title counter | 14 |
| Big tables: limit per seat count, "table full" message, party of 15 at once, guest numbers stay unique | 9 |
| Regression: the full Phase 0 suite re-run | (all) |
| Live smoke after deploy | 5 |

**Exit criteria:** all P0 green · live menu ceiling re-measured and at least 3× higher · kitchen tests pass on staging · no Phase 0 regressions.
**Rollback:** 1A has a one-file undo SQL; 1B and 1C revert by PR (1C also has undo SQL).

---

### Phase 2: Launch readiness · Mon 30 Nov

**Goal:** fast on phones, someone is told if live goes down, and everyone knows what to do on launch night.

| # | Change | Who |
|---|---|---|
| 2A | Browser caching for images and versioned files (safe rules only, so updates still reach phones) | Claude |
| 2B | One-command live smoke test, run after every deploy | Claude |
| 2C | Uptime monitor on the home page and the backend (free tier of an uptime service) | You create the account, Claude configures |
| 2D | **Launch runbook**: who watches what, how to switch ordering off, how to roll back, who to call | Claude writes, you approve |
| 2E | **Plan decision**: Supabase Pro (no pausing, daily backups, about $25/month, check current pricing) and Vercel Pro if on Hobby | You |
| 2F | Night-before live load re-test (restaurant closed) + real-device check on 2–3 phones | Claude + you |

**Test focus (~50 cases)**
| Area | ~Cases |
|---|---|
| Device matrix: iPhone SE, iPhone 15, Pixel 7, tablet × home, gate, menu, order sheet, order placed | 15 |
| Speed budgets on simulated 4G: home usable < 3 s, menu < 2 s after scan | 8 |
| Accessibility scans (axe) on every screen. Start with what the design checker already flagged in `menu.html` on 27 Nov: 3 low-contrast texts and 1 popover clipped by an `overflow: hidden` parent | 8 |
| Screenshot baselines so later changes can't quietly change the look | 8 |
| Caching: right headers, and a new version still reaches the phone | 6 |
| Live smoke | 5 |

**Exit criteria = go / no-go for launch:** all P0 green · smoke green on live · monitor alerting · runbook approved · plan decision made.

---

### Phase 3: Hardening · launch week

CSP without `'unsafe-inline'` (move inline scripts into files) · integrity hashes or self-hosted GSAP · admin package upgrades (react-router 7.18.7, zod 4) · staff two-factor login · strip spoofing characters from notes · decide whether the Wi-Fi password should be public · generic database errors · remove `color-check.html` and the 2.8 MB of unused files · restocked dishes refresh on the phone · move the 320 KB of inline artwork into a cached file.
**Test focus (~50):** XSS payloads in every text field, CSP blocks inline script, admin login + routing after the upgrades, MFA flows, screenshot comparison to prove the look didn't change.

### Phase 4: Abuse protection · after launch

Close the "photo of the QR" gap: a table PIN that changes when the table is freed, or staff confirming each new phone's first order (your choice) · rate limiting in front of the backend · an alert when one table gets a flood of orders.
**Test focus (~50):** every abuse path from `security-audit.md` section F, plus the new flow end to end with a guest phone and the kitchen tablet.

### Phase 5: Automation · after launch

GitHub Actions on every pull request: SQL tests, Playwright (local layers), `npm audit`. Nightly end-to-end tests on staging. Live smoke after every deploy.
**Test focus:** the pipeline itself: a deliberately broken change must be blocked.

---

## 6. Where things live

```
testing.md                          this plan (the single source of truth)
capacity-report.md                  what was measured and found (27 Nov)
security-audit.md                   earlier security audit (2 Nov)
.claude/agents/phase-test-engineer.md   the tester agent
.claude/skills/frontend-testing/    your testing skill, used by the agent
docs/testing/phase-N-test-cases.md  ~50 cases per phase (written by the agent)
docs/testing/phase-N-report.md      results + go / no-go per phase (written by the agent)
tests/                              Playwright Test framework (from Phase 0)
  playwright.config.js              devices and environments
  support/                          local test backend, fixtures, page objects
  phase-0/ … phase-5/               specs, one folder per phase
supabase/tests/                     database tests (30 today)
scripts/loadtest/                   k6 and pgbench scripts
```

## 7. How to start a phase

Tell Claude: **"Run phase N"**. Claude builds the changes, then hands the phase to the `phase-test-engineer` agent, then brings you its report for the gate. Nothing goes live without your OK.

## 8. Status

| Phase | Build | Test (~50) | Gate | Live |
|---|---|---|---|---|
| 0 Foundation | ✅ | ✅ GO · 68 local + 6 live + 30 SQL green (4 known-bugs deferred) | ⏳ you | ☐ |
| 1 Launch blockers | ☐ | ☐ | ☐ | ☐ |
| 2 Launch readiness | ☐ | ☐ | ☐ | ☐ |
| 3 Hardening | ☐ | ☐ | ☐ | ☐ |
| 4 Abuse protection | ☐ | ☐ | ☐ | ☐ |
| 5 Automation | ☐ | ☐ | ☐ | ☐ |
