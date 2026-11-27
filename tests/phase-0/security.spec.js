// Phase 0 · SEC: stored XSS on the guest's phone. Staff-editable text and guest notes must render as
// text. The CSP allows 'unsafe-inline' (site/vercel.json), so output escaping is the only defence.
import { test, expect } from "../support/fixtures.js";
import { ADDON, DISH } from "../support/data.js";
import { XSS, expectNoInjectedMarkup, lit, scanAndOpenOn } from "./_sec-helpers.js";

test("@phase0 @p1 P0-SEC-07 XSS payloads in a dish name, option label and add-on name render as text on the menu, builder, cart and placed order", async ({ guest, db }) => {
  // 1) Staff-editable text carrying markup.
  await db.sql(`
    update public.dishes         set name  = ${lit(XSS.dishName)}    where id = '${DISH.brownie.id}';
    update public.choice_options set label = ${lit(XSS.optionLabel)} where id = '${DISH.singleScoop.options.vanilla}';
    update public.addons         set name  = ${lit(XSS.addonName)}   where id = '${ADDON.extraBoba.id}';`);

  // 2) Browse and build an order with all three.
  const g = await guest();
  const { page, menu, sheet } = g;
  await scanAndOpenOn(g, 1, "desserts");

  // Grid card name.
  await expect(page.locator(`#grid [data-open="${DISH.brownie.id}"]`)).toHaveText(XSS.dishName);
  await menu.quickAdd(DISH.brownie);
  await expect(menu.badge).toHaveText("1");

  // Builder chip.
  await menu.openDish(DISH.singleScoop);
  // `has` takes a locator relative to the chip, so not menu.option() (which is rooted at #detail).
  const vanillaChip = menu.detail.locator("label.chip", { has: page.locator(`input[value="${DISH.singleScoop.options.vanilla}"]`) });
  await expect(vanillaChip).toHaveText(XSS.optionLabel);
  // Tap the chip like a guest does (its <span> sits over the transparent radio).
  await vanillaChip.click();
  await expect(menu.option(DISH.singleScoop.options.vanilla)).toBeChecked();
  await menu.buyBtn.click();
  await expect(menu.detail).toBeHidden();
  await expect(menu.badge).toHaveText("2");

  // Boba "Add-ons" list under the grid, then the builder's add-on label.
  await menu.showCategory("boba");
  await expect(page.locator("#extras .extra__name").filter({ hasText: XSS.addonName })).toHaveCount(1);
  await menu.openDish(DISH.lemonIceTea);
  const bobaAddon = menu.detail.locator("label.addon", { has: page.locator(`input[data-addon][value="${ADDON.extraBoba.id}"]`) });
  await expect(bobaAddon.locator(".addon__name")).toContainText(XSS.addonName);
  await bobaAddon.click();
  await expect(menu.addon(ADDON.extraBoba.id)).toBeChecked();
  await menu.buyBtn.click();
  await expect(menu.detail).toBeHidden();
  await expect(menu.badge).toHaveText("3");
  await expectNoInjectedMarkup(page);

  // 3) Cart lines.
  await sheet.open();
  await expect(sheet.lines).toHaveCount(3);
  await expect(sheet.lines.nth(0).locator(".line__name")).toHaveText(XSS.dishName);
  await expect(sheet.lines.nth(1).locator(".line__opt")).toHaveText(`Flavour: ${XSS.optionLabel}`);
  await expect(sheet.lines.nth(2).locator(".line__opt")).toHaveText(`With ${XSS.addonName}`);
  await expect(sheet.total).toHaveText("₹347");
  await expectNoInjectedMarkup(page);

  // "Order placed" lines (the server's copy of the order).
  await sheet.placeAndConfirm();
  const doneLines = page.locator(".done .line");
  await expect(doneLines).toHaveCount(3);
  await expect(doneLines.nth(0).locator(".line__name")).toHaveText(`1×${XSS.dishName}`);
  await expect(doneLines.nth(1).locator(".line__opt")).toHaveText(`Flavour: ${XSS.optionLabel}`);
  await expect(doneLines.nth(2).locator(".line__opt")).toHaveText(`+ ${XSS.addonName}`);
  await expectNoInjectedMarkup(page);

  // "Your orders" in the sheet after the phone polls the table.
  await page.getByRole("button", { name: "Order something else" }).click();
  await expect(sheet.sheet).toBeHidden();
  await menu.foreground();
  await sheet.open();
  const placedLines = sheet.placed.locator(".line");
  await expect(placedLines).toHaveCount(3);
  await expect(placedLines.nth(0).locator(".line__name")).toHaveText(`1×${XSS.dishName}`);
  await expect(placedLines.nth(1).locator(".line__opt")).toHaveText(`Flavour: ${XSS.optionLabel}`);
  await expect(placedLines.nth(2).locator(".line__opt")).toHaveText(`+ ${XSS.addonName}`);

  // Nothing ran, nothing was injected, no script errors.
  await expectNoInjectedMarkup(page);
  expect(g.errors).toEqual([]);

  // The database keeps the raw text: escaping happens on output, not on input.
  expect(await db.json(`
    select json_build_object(
      'dish',   (select dish_name           from public.order_items where dish_id = '${DISH.brownie.id}'),
      'option', (select choices->0->'options'->>0 from public.order_items where dish_id = '${DISH.singleScoop.id}'),
      'addon',  (select addons->0->>'name'   from public.order_items where dish_id = '${DISH.lemonIceTea.id}'))`))
    .toEqual({ dish: XSS.dishName, option: XSS.optionLabel, addon: XSS.addonName });
});

test("@phase0 @p1 P0-SEC-08 An XSS payload in a guest note renders as text in the cart, on \"Order placed\" and in \"Your orders\"", async ({ guest, db }) => {
  const g = await guest();
  const { page, menu, sheet } = g;
  const shown = `"${XSS.note}"`; // the site wraps a note in quotes

  // 1) Note typed into the dish builder.
  await scanAndOpenOn(g, 2, "desserts");
  await menu.openDish(DISH.brownie);
  await menu.lineNote.fill(XSS.note);
  await menu.buyBtn.click();
  await expect(menu.detail).toBeHidden();
  await expect(menu.badge).toHaveText("1");

  // 2) Cart.
  await sheet.open();
  await expect(sheet.lines.locator(".line__note")).toHaveText(shown);
  await expectNoInjectedMarkup(page);

  // "Order placed".
  await sheet.placeAndConfirm();
  await expect(page.locator(".done .line__note")).toHaveText(shown);
  await expectNoInjectedMarkup(page);

  // "Your orders".
  await page.getByRole("button", { name: "Order something else" }).click();
  await expect(sheet.sheet).toBeHidden();
  await menu.foreground();
  await sheet.open();
  await expect(sheet.placed.locator(".line__note")).toHaveText(shown);

  await expectNoInjectedMarkup(page);
  expect(g.errors).toEqual([]);

  // Stored verbatim (no control characters to strip).
  expect(await db.json("select json_agg(note) from public.order_items")).toEqual([XSS.note]);
});

test("@phase0 @p1 P0-SEC-10 The home page renders restaurant info as text", async ({ guest, db }) => {
  // 1) Staff-editable restaurant info carrying markup and a javascript: link.
  await db.sql(`
    update public.restaurant_settings
       set hours_text = ${lit(XSS.hours)}, address = ${lit(XSS.address)}, instagram_url = ${lit(XSS.instagram)}
     where id = 1`);

  // 2) A visitor opens the home page; wait for the visit info to load (precondition, true today too).
  const g = await guest();
  const { page, home } = g;
  await home.goto();
  await expect(page.locator("#visit-hours")).not.toContainText("Loading");
  await expect(page.locator("#visit-address")).not.toContainText("Loading");

  // KNOWN BUG P0-BUG-01: site/index.html (inline script after config.js) builds #visit-hours,
  // #visit-address, #visit-follow, #visit-links and #footer-links with innerHTML from unescaped
  // get_restaurant_info values, and the CSP allows inline handlers ('unsafe-inline'). Anyone who can
  // edit restaurant_settings (any staff account) can run script on every visitor's phone.
  // Fix: build these with textContent / createElement and allow only http(s) / tel / wa.me links.
  test.fail(true, "KNOWN BUG P0-BUG-01: home page restaurant info is rendered with unescaped innerHTML");
  await expect(page.locator("#visit-hours")).toContainText(XSS.hours);
  await expect(page.locator("#visit-address")).toContainText(XSS.address);
  await expectNoInjectedMarkup(page);
});
