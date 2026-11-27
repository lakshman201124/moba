import { test, expect } from "../support/fixtures.js";
import { DISH } from "../support/data.js";

test("@phase0 @p0 P0-FRAME-03 the API fixture scans and orders against the test database", async ({ api }) => {
  const v = await api.scan(2);
  expect(v.visit).toMatch(/^[0-9a-f]{64}$/);
  const r = await api.order(v, [{ dish_id: DISH.brownie.id, qty: 2 }], 178);
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({ table: "T2", guestNo: 1, total: 178, status: "placed" });
});
