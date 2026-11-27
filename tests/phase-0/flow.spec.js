// Phase 0 baseline, area FLOW: the guest happy paths end to end, on the local stack
// (real site code + real SQL through support/bridge.py, a fresh database per test).
// Cases: docs/testing/phase-0-test-cases.md, P0-FLOW-01 … P0-FLOW-06.
import { test, expect } from "../support/fixtures.js";
import { ADDON, DISH, qrFor } from "../support/data.js";
import { BuilderExtras, SheetExtras, firstCall, ordersInDb, scanAndOpenAt, tapChoice } from "./_flow-helpers.js";

const BULGOGI = "8822b1e0-00d0-4b93-80b4-54026d0f8771"; // wings' Flavour group, seed.sql

/** One guest phone plus the FLOW-only page helpers. */
async function phone(guest) {
  const g = await guest();
  return { ...g, builder: new BuilderExtras(g.page), cart: new SheetExtras(g.page) };
}

test.describe("FLOW: guest happy paths", () => {
  test("@phase0 @p0 @devices P0-FLOW-01 guest scans T1 on the home page, opens the menu, orders a Brownie and sees Order placed", async ({ guest, db }) => {
    const g = await phone(guest);
    const { page, home, menu, sheet, cart } = g;

    // 1) Scan: the QR lands on the home page, which keeps the token for this tab and cleans the URL.
    await home.goto(qrFor(1));
    await expect(page).toHaveURL((url) => !url.searchParams.has("t"));
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(home.heading).toHaveCount(1);
    await expect(home.heading).toHaveText(/Gather\s*for food/i);

    // 2–3) "Open the menu →" takes the guest into an open menu (no scan gate).
    await home.menuLink.click();
    await expect(page).toHaveURL(/\/menu\.html(?:[?#]|$)/);
    await menu.expectOpen();
    await expect(page.locator("html")).not.toHaveClass(/\bgated\b/);
    // The QR is swapped for a visit before the menu is fetched.
    const sv = firstCall(g.rpcCalls, "start_visit");
    const gm = firstCall(g.rpcCalls, "get_public_menu");
    expect(sv, `rpc calls: ${g.rpcCalls.join(", ")}`).toBeGreaterThanOrEqual(0);
    expect(gm, `rpc calls: ${g.rpcCalls.join(", ")}`).toBeGreaterThan(sv);

    // 4) Quick-add a Brownie (no options, straight into the order).
    await menu.quickAdd(DISH.brownie);
    await expect(menu.badge).toBeVisible();
    await expect(menu.badge).toHaveText("1");

    // 5) The order sheet.
    await sheet.open();
    await expect(cart.cartLines).toHaveCount(1);
    await expect(cart.lineName(cart.cartLines.first())).toHaveText("Brownie");
    await expect(sheet.count).toHaveText("1 item");
    await expect(sheet.total).toHaveText("₹89");
    await expect(cart.tableChip).toHaveText("T1");
    await expect(sheet.placeBtn).toBeEnabled();
    await expect(sheet.placeBtn).toHaveText("Place order");

    // 6) Place it.
    await sheet.placeAndConfirm();
    await expect(cart.title).toHaveText("Order placed");

    // 7) The database has exactly that order, and the screen shows its real number.
    const orders = await ordersInDb(db);
    expect(orders).toHaveLength(1);
    const [o] = orders;
    expect(o).toMatchObject({ table: "T1", status: "placed", guest_no: 1, item_count: 1, total: 89 });
    expect(o.items).toHaveLength(1);
    expect(o.items[0]).toMatchObject({ dish_id: DISH.brownie.id, dish_name: "Brownie", qty: 1, unit_price: 89, line_total: 89 });

    await expect(sheet.doneId).toHaveText(`Order #${o.order_no} · T1 · Guest 1`);
    await expect(sheet.doneStatus).toHaveText("Sent");
    await expect(cart.doneCount).toHaveText("1 item · taxes extra");
    await expect(cart.doneTotal).toHaveText("₹89");
    await expect(menu.badge).toBeHidden();

    expect(g.errors, "page errors").toEqual([]);
  });

  test("@phase0 @p0 P0-FLOW-02 placed order status moves Sent → Cooking → Served in Your orders without a reload", async ({ guest, db }) => {
    const g = await phone(guest);
    const { menu, sheet, cart } = g;

    // 1) Order a Brownie at T2.
    await g.scanAndOpen(2);
    await menu.quickAdd(DISH.brownie);
    await expect(menu.badge).toHaveText("1");
    await sheet.open();
    await sheet.placeAndConfirm();
    const [o] = await ordersInDb(db);
    expect(o).toMatchObject({ table: "T2", status: "placed", guest_no: 1 });

    // 2) Back to the menu, then reopen the sheet: empty cart, plus the order just placed.
    await cart.orderAgain.click();
    await expect(sheet.sheet).toBeHidden();
    await sheet.open();
    await expect(cart.emptyTitle).toHaveText("Hungry for more?");
    await expect(cart.placedTitle).toHaveText("Your orders at T2");
    await expect(cart.placedOrders).toHaveCount(1);
    const placed = cart.placedOrders.first();
    await expect(cart.placedSummary(placed)).toHaveText(`Order #${o.order_no} · Guest 1`);
    await expect(cart.placedChip(placed)).toHaveText("Sent");
    await expect(cart.placedSub(placed)).toHaveText("waiting for the kitchen");
    await expect(cart.placedTotal(placed)).toHaveText("₹89");
    await expect(cart.placedFine).toHaveText("Need to change something? Ask our staff.");

    // 3) The kitchen accepts it. The phone picks it up on its next get_table_state poll
    //    (coming back to the foreground runs one straight away).
    await db.asStaff(`select public.staff_set_order_status('${o.id}', 'placed', 'preparing')`);
    await menu.foreground();
    await expect(cart.placedChip(placed)).toHaveText("Cooking");
    await expect(cart.placedSub(placed)).toHaveText("만드는 중");

    // 4) Served.
    await db.asStaff(`select public.staff_set_order_status('${o.id}', 'preparing', 'served')`);
    await menu.foreground();
    await expect(cart.placedChip(placed)).toHaveText("Served");
    await expect(cart.placedSub(placed)).toHaveText("맛있게 드세요!");

    const [after] = await ordersInDb(db);
    expect(after.status).toBe("served");
    expect(after.accepted_at).not.toBeNull();
    expect(after.served_at).not.toBeNull();
    expect(g.errors, "page errors").toEqual([]);
  });

  test("@phase0 @p0 @devices P0-FLOW-03 dish with sizes starts on the first size, Large sets the price, flavour is required, size and flavour reach the order", async ({ guest, db }) => {
    const g = await phone(guest);
    const { menu, sheet, cart, builder } = g;
    const { small, large } = DISH.wings.sizes;

    // 1) The builder opens on the first size.
    await g.scanAndOpen(3);
    await menu.openDish(DISH.wings);
    await expect(menu.detailTitle).toHaveText("Korean Fried Chicken Wings");
    await expect(menu.size(small.id)).toHaveAttribute("aria-pressed", "true");
    await expect(menu.size(small.id)).toContainText(small.label);
    await expect(menu.size(large.id)).toHaveAttribute("aria-pressed", "false");
    await expect(builder.buyPrice).toHaveText("₹229");
    await expect(menu.buyBtn).toHaveText("Add to order · ₹229");

    // 2) No flavour yet: the dish is not added and the Flavour group says why.
    await expect(builder.legend(0)).toHaveText(/^Flavour\s*Pick one$/);
    await expect(builder.groupError(0)).toBeHidden();
    await menu.buyBtn.click();
    await expect(builder.groupError(0)).toBeVisible();
    await expect(builder.groupError(0)).toHaveText("Pick one to add this dish.");
    await expect(menu.detail).toBeVisible();
    await expect(menu.badge).toBeHidden();

    // 3) Large sets the price.
    await menu.size(large.id).click();
    await expect(menu.size(large.id)).toHaveAttribute("aria-pressed", "true");
    await expect(menu.size(small.id)).toHaveAttribute("aria-pressed", "false");
    await expect(builder.buyPrice).toHaveText("₹289");
    await expect(menu.buyBtn).toHaveText("Add to order · ₹289");

    // 4) Pick Bulgogi: the error clears.
    await tapChoice(menu.option(BULGOGI));
    await expect(menu.option(BULGOGI)).toBeChecked();
    await expect(builder.groupError(0)).toBeHidden();

    // 5) Add, check the cart line, place.
    await menu.buyBtn.click();
    await expect(menu.detail).toBeHidden();
    await expect(menu.badge).toHaveText("1");
    await sheet.open();
    await expect(cart.cartLines).toHaveCount(1);
    const line = cart.cartLines.first();
    await expect(cart.lineName(line)).toHaveText("Korean Fried Chicken Wings");
    await expect(cart.lineOpts(line)).toHaveText(["Large · 6 pcs", "Flavour: Bulgogi"]);
    await expect(sheet.total).toHaveText("₹289");
    await sheet.placeAndConfirm();

    const orders = await ordersInDb(db);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ table: "T3", total: 289, item_count: 1 });
    expect(orders[0].items).toHaveLength(1);
    expect(orders[0].items[0]).toMatchObject({
      dish_id: DISH.wings.id,
      size_label: "Large · 6 pcs",
      choices: [{ label: "Flavour", options: ["Bulgogi"] }],
      unit_price: 289,
      qty: 1,
      line_total: 289,
      diet: "nonveg",
    });
    expect(g.errors, "page errors").toEqual([]);
  });

  test("@phase0 @p0 P0-FLOW-04 Single Scoop needs a flavour, Double Scoop allows at most 2, and the choices reach the order", async ({ guest, db }) => {
    const g = await phone(guest);
    const { menu, sheet, cart, builder } = g;
    const single = DISH.singleScoop;
    const double = DISH.doubleScoop;

    // 1) Single Scoop without a flavour is refused.
    await scanAndOpenAt(g, 4, "desserts");
    await menu.openDish(single);
    await expect(menu.detailTitle).toHaveText("Single Scoop");
    await expect(builder.legend(0)).toHaveText(/^Flavour\s*Pick one$/);
    await expect(builder.legendHint(0)).toHaveText("Pick one");
    await menu.buyBtn.click();
    await expect(builder.groupError(0)).toBeVisible();
    await expect(builder.groupError(0)).toHaveText("Pick one to add this dish.");
    await expect(menu.detail).toBeVisible();
    await expect(menu.badge).toBeHidden();

    // 2) Strawberry clears the error and the dish goes in at ₹89.
    await tapChoice(menu.option(single.options.strawberry));
    await expect(menu.option(single.options.strawberry)).toBeChecked();
    await expect(builder.groupError(0)).toBeHidden();
    await expect(menu.buyBtn).toHaveText("Add to order · ₹89");
    await menu.buyBtn.click();
    await expect(menu.detail).toBeHidden();
    await expect(menu.badge).toHaveText("1");

    // 3) Double Scoop: two flavours at most; the third box locks.
    await menu.openDish(double);
    await expect(menu.detailTitle).toHaveText("Double Scoop");
    await expect(builder.legend(0)).toHaveText(/^Flavours\s*Pick up to 2$/);
    await expect(builder.legendHint(0)).toHaveText("Pick up to 2");
    await tapChoice(menu.option(double.options.vanilla));
    await tapChoice(menu.option(double.options.chocolate));
    await expect(menu.option(double.options.vanilla)).toBeChecked();
    await expect(menu.option(double.options.chocolate)).toBeChecked();
    await expect(menu.option(double.options.strawberry)).toBeDisabled();
    await expect(menu.option(double.options.strawberry)).not.toBeChecked();
    await expect(menu.buyBtn).toHaveText("Add to order · ₹169");
    await menu.buyBtn.click();
    await expect(menu.detail).toBeHidden();
    await expect(menu.badge).toHaveText("2");

    // 4) Both lines carry their choices; place.
    await sheet.open();
    await expect(cart.cartLines).toHaveCount(2);
    await expect(cart.lineName(cart.cartLines.nth(0))).toHaveText("Single Scoop");
    await expect(cart.lineOpts(cart.cartLines.nth(0))).toHaveText(["Flavour: Strawberry"]);
    await expect(cart.lineName(cart.cartLines.nth(1))).toHaveText("Double Scoop");
    await expect(cart.lineOpts(cart.cartLines.nth(1))).toHaveText(["Flavours: Vanilla + Chocolate"]);
    await expect(sheet.total).toHaveText("₹258");
    await expect(sheet.count).toHaveText("2 items");
    await sheet.placeAndConfirm();

    const orders = await ordersInDb(db);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ table: "T4", total: 258, item_count: 2 });
    expect(orders[0].items).toHaveLength(2);
    expect(orders[0].items[0]).toMatchObject({
      dish_id: single.id, qty: 1, unit_price: 89, line_total: 89,
      choices: [{ label: "Flavour", options: ["Strawberry"] }],
    });
    expect(orders[0].items[1]).toMatchObject({
      dish_id: double.id, qty: 1, unit_price: 169, line_total: 169,
      choices: [{ label: "Flavours", options: ["Vanilla", "Chocolate"] }],
    });
    expect(g.errors, "page errors").toEqual([]);
  });

  test("@phase0 @p0 P0-FLOW-05 add-on and quantity steppers keep the line and order totals right", async ({ guest, db }) => {
    const g = await phone(guest);
    const { menu, sheet, cart, builder } = g;

    // 1) Lemon Ice Tea lists the Boba Bar add-ons.
    await scanAndOpenAt(g, 5, "boba");
    await menu.openDish(DISH.lemonIceTea);
    await expect(menu.detailTitle).toHaveText("Lemon Ice Tea");
    await expect(builder.addonRows).toHaveCount(3);
    await expect(builder.addonNames).toHaveText([/^Extra boba/, /^Coconut jelly/, /^Ice cream scoop/]);
    await expect(builder.addonPrices).toHaveText(["+₹30", "+₹30", "+₹59"]);

    // 2) Extra boba, two cups.
    await tapChoice(menu.addon(ADDON.extraBoba.id));
    await expect(menu.addon(ADDON.extraBoba.id)).toBeChecked();
    await expect(builder.buyPrice).toHaveText("₹169");
    await menu.detailStep(1).click();
    await expect(builder.qty).toHaveText("2");
    await expect(menu.buyBtn).toHaveText("Add 2 to order · ₹338");
    await menu.buyBtn.click();
    await expect(menu.detail).toBeHidden();
    await expect(menu.badge).toHaveText("2");

    // 3) The cart line, then its stepper up and back down.
    await sheet.open();
    await expect(cart.cartLines).toHaveCount(1);
    const line = cart.cartLines.first();
    await expect(cart.lineName(line)).toHaveText("Lemon Ice Tea");
    await expect(cart.lineOpts(line)).toHaveText(["With Extra boba"]);
    await expect(cart.lineMeta(line)).toHaveText("₹169 each · ₹338");
    await expect(sheet.total).toHaveText("₹338");
    await expect(sheet.count).toHaveText("2 items");

    await sheet.step(0, 1).click();
    await expect(sheet.count).toHaveText("3 items");
    await expect(sheet.total).toHaveText("₹507");
    await expect(cart.lineMeta(cart.cartLines.first())).toHaveText("₹169 each · ₹507");

    await sheet.step(0, -1).click();
    await expect(sheet.count).toHaveText("2 items");
    await expect(sheet.total).toHaveText("₹338");
    await expect(cart.lineMeta(cart.cartLines.first())).toHaveText("₹169 each · ₹338");
    await expect(menu.badge).toHaveText("2");

    // 4) Place.
    await sheet.placeAndConfirm();
    const orders = await ordersInDb(db);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ table: "T5", total: 338, item_count: 2 });
    expect(orders[0].items).toHaveLength(1);
    expect(orders[0].items[0]).toMatchObject({
      dish_id: DISH.lemonIceTea.id, qty: 2, unit_price: 169, line_total: 338,
      addons: [{ name: "Extra boba", price: 30 }],
    });
    expect(g.errors, "page errors").toEqual([]);
  });

  test("@phase0 @p0 P0-FLOW-06 a kitchen note reaches the order and the same dish with and without a note stays two lines", async ({ guest, db }) => {
    const g = await phone(guest);
    const { menu, sheet, cart } = g;
    const NOTE = "No nuts, extra warm please";

    // 1) Brownie with a note, from the builder.
    await scanAndOpenAt(g, 6, "desserts");
    await menu.openDish(DISH.brownie);
    await expect(menu.detailTitle).toHaveText("Brownie");
    await menu.lineNote.fill(NOTE);
    await expect(menu.buyBtn).toHaveText("Add to order · ₹89");
    await menu.buyBtn.click();
    await expect(menu.detail).toBeHidden();
    await expect(menu.badge).toHaveText("1");

    // 2) Another Brownie straight from the grid, no note.
    await menu.quickAdd(DISH.brownie);
    await expect(menu.badge).toHaveText("2");

    // 3) Two separate lines, the note on the first only.
    await sheet.open();
    await expect(cart.cartLines).toHaveCount(2);
    await expect(cart.lineName(cart.cartLines.nth(0))).toHaveText("Brownie");
    await expect(cart.lineName(cart.cartLines.nth(1))).toHaveText("Brownie");
    await expect(cart.lineNote(cart.cartLines.nth(0))).toHaveText(`"${NOTE}"`);
    await expect(cart.lineNote(cart.cartLines.nth(1))).toHaveCount(0);
    await expect(sheet.total).toHaveText("₹178");
    await expect(sheet.count).toHaveText("2 items");

    await sheet.placeAndConfirm();
    await expect(cart.doneLines).toHaveCount(2);
    await expect(cart.lineNote(cart.doneLines.nth(0))).toHaveText(`"${NOTE}"`);
    await expect(cart.lineNote(cart.doneLines.nth(1))).toHaveCount(0);
    await expect(cart.doneTotal).toHaveText("₹178");

    const orders = await ordersInDb(db);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ table: "T6", total: 178, item_count: 2 });
    const items = orders[0].items;
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.dish_name === "Brownie" && i.qty === 1 && i.line_total === 89)).toBe(true);
    expect(items.map((i) => i.note)).toEqual([NOTE, null]);
    expect(g.errors, "page errors").toEqual([]);
  });
});
