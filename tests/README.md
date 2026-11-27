# MOBA test suite (Playwright Test)

The plan is in `../testing.md`. This file explains how the suite works and how to write a test.

## Run it

```powershell
cd tests
npm install                 # first time only
npx playwright install chromium webkit   # first time only
npx playwright test --grep @phase0       # one phase
npx playwright test                      # everything, including live read-only smoke
npx playwright test --project=live       # only the live smoke checks
npx playwright show-report               # open the HTML report
```

Needs PostgreSQL 17 installed (`C:\Program Files\PostgreSQL\17\bin`, or set `PG_BIN`) and Python 3. The first run creates a private test database server on port 54329 in `%LOCALAPPDATA%\moba-test-pg`, outside OneDrive. It never touches the real Supabase project.

## How it works

```
Playwright ──► bridge.py (127.0.0.1:5510) ──► local Postgres (port 54329)
                serves site/ with the live      template DB = stubs + all migrations
                security headers, answers       + seed.sql + support/fixtures.sql
                /rest/v1/rpc/* as role anon     → cloned fresh for EVERY test
```

- **Fresh database per test.** The `db` fixture clones the template (~1 s), so tests can change prices, close ordering or free tables without affecting each other. The template rebuilds itself when a migration, the seed or `fixtures.sql` changes.
- **Same SQL as production.** The bridge calls the real functions (`start_visit`, `place_order`…) as the `anon` role, so grants and business rules are the real ones.
- **Not covered locally:** Supabase Auth, Realtime, Storage, and PostgREST's own behaviour. Those need the staging project (Phase 1).

## Projects (devices)

| Project | What runs | Device |
|---|---|---|
| `api` | `*.api.spec.js`, no browser | none |
| `iphone` | every browser spec | iPhone 15 (WebKit) |
| `android` | specs tagged `@devices` | Pixel 7 (Chromium) |
| `iphone-se` | specs tagged `@devices` | iPhone SE, 320 px wide (WebKit) |
| `live` | `*.live.spec.js`, **read-only** | Desktop Chrome against `moba-h5ag.vercel.app` |

## Writing a test

```js
import { test, expect } from "../support/fixtures.js";   // never from @playwright/test directly
import { DISH } from "../support/data.js";

test("@phase0 @p0 P0-FLOW-01 guest orders one dish", async ({ guest, db }) => {
  const g = await guest();                 // a new phone, using this test's database
  await g.scanAndOpen(1);                  // scan table T1's QR, open the menu
  await g.menu.quickAdd(DISH.brownie);
  await g.sheet.open();
  await expect(g.sheet.total).toHaveText("₹89");
  await g.sheet.placeAndConfirm();
  expect(await db.sql("select count(*) from public.orders")).toBe("1");
});
```

### Fixtures (`support/fixtures.js`)
| Fixture | Gives you |
|---|---|
| `db` | `sql(q)` as postgres · `asAnon(q)` · `asStaff(q)` (owner) · `asNonStaff(q)` (signed-in, not staff) · `json(q)`. SQL errors throw `SqlError` with `.sqlstate` and `.text` (e.g. `P0001` / `INVALID_VISIT`) |
| `api` | `rpc(fn, args)` → `{status, body}` · `scan(n, device?)` → visit · `order(visit, items, total, clientOrderId?)` · `state(visit)` |
| `guest` | `await guest(options?)` → `{ page, context, home, menu, sheet, rpcCalls, errors, scanAndOpen(n, category?) }`. Call it twice for two phones |

### Page objects (`support/pages.js`)
`HomePage`, `MenuPage` (gate, grid, dish builder, badge, toast, search, veg toggle) and `OrderSheet` (lines, total, place, done screen). Add selectors there, not in specs.

### Test data (`support/data.js`)
Tables `T1`–`T50` (QR = `qrFor(n)`; `T49` is inactive), staff owner `STAFF_ID`, and dishes with fixed IDs: `brownie` ₹89, `lemonIceTea` ₹139, `wings` (sizes), `singleScoop` (pick 1), `doubleScoop` (pick 1–2), and add-ons.

### Rules
- Title format: `@phaseN @p0|@p1|@p2 <CASE-ID> what it proves`. Add `@devices` to also run on Android and iPhone SE.
- Web-first assertions (`await expect(locator).toHaveText()`), not sleeps. To simulate time passing, change the database (for example `update table_visits set order_until = now() - interval '1 second'`), don't wait.
- `*.live.spec.js` must be read-only: page loads, and API calls whose input fails validation. Never create anything on live.
- No retries. A flaky test is a bug in the test.
