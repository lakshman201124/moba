// Proves the framework itself: fresh DB per test, the bridge, the guest fixture and page objects.
import { test, expect } from "../support/fixtures.js";
import { DISH } from "../support/data.js";

test("@phase0 @p0 P0-FRAME-01 a guest can scan, order, and the order lands in this test's database", async ({ guest, db }) => {
  const g = await guest();
  await g.scanAndOpen(1);
  await g.menu.quickAdd(DISH.brownie);
  await expect(g.menu.badge).toHaveText("1");
  await g.sheet.open();
  await expect(g.sheet.total).toHaveText("₹89");
  const done = await g.sheet.placeAndConfirm();
  expect(done).toMatch(/ORDER #\d+ · T1 · GUEST 1/i);
  expect(await db.sql("select count(*) || ':' || max(total) from public.orders")).toBe("1:89");
});

test("@phase0 @p0 P0-FRAME-02 every test starts with an empty database", async ({ db }) => {
  expect(await db.sql("select count(*) from public.orders")).toBe("0");
  expect(await db.sql("select count(*) from public.table_visits")).toBe("0");
});
