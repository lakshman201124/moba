// Phase 0 baseline, area LAYOUT: screens on three phone widths (iPhone 15 393 px, Pixel 7 412 px,
// iPhone SE 320 px). Cases: docs/testing/phase-0-test-cases.md, section LAYOUT.
// Everything here is @devices, so it runs on the iphone, android and iphone-se projects.
import { test, expect } from "../support/fixtures.js";
import { DISH } from "../support/data.js";
import {
  expectNoSidewaysScroll, iconLinks, scanAndOpenCategory, visibleH1, watchSameOriginErrors,
} from "./_layout-helpers.js";

const GATE_NONE = "Scan to see the menu"; // menu.js GATES.none

test("@phase0 @p2 @devices P0-LAYOUT-01 no sideways scroll on home, the open menu (top and Crispy Bites) and the gate", async ({ guest }) => {
  const g = await guest();

  await test.step("1) home", async () => {
    await g.home.goto();
    await expect(g.home.heading).toBeVisible();
    await expectNoSidewaysScroll(g.page, "home");
  });

  await test.step("2) open menu, Most loved", async () => {
    await g.scanAndOpen(1);
    await expectNoSidewaysScroll(g.page, "menu top");
  });

  await test.step("3) open menu, Crispy Bites", async () => {
    await g.menu.showCategory("crispy");
    await expect(g.page.locator("#catView")).toBeVisible();
    await expectNoSidewaysScroll(g.page, "menu crispy");
  });

  await test.step("4) visitor gate (a new phone, no scan)", async () => {
    const visitor = await guest();
    await visitor.menu.goto();
    await visitor.menu.expectGate(GATE_NONE);
    await expectNoSidewaysScroll(visitor.page, "gate");
  });
});

test("@phase0 @p2 @devices P0-LAYOUT-02 exactly one visible h1 per screen; hidden headings don't count", async ({ guest }) => {
  const g = await guest();

  await test.step("home", async () => {
    await g.home.goto();
    await expect(visibleH1(g.page)).toHaveCount(1);
    await expect(visibleH1(g.page)).toHaveText(/Gather\s*for food/i);
  });

  await test.step("open menu: the 1x1 sr-only 'MOBA menu' heading is the only h1", async () => {
    await g.scanAndOpen(1);
    await expect(visibleH1(g.page)).toHaveCount(1);
    await expect(visibleH1(g.page)).toHaveText("MOBA menu");
  });

  await test.step("open menu with the Brownie dialog open: the dish title is an h2", async () => {
    await g.menu.openDish(DISH.brownie);
    await expect(g.menu.detailTitle).toHaveText(DISH.brownie.name);
    await expect(g.page.locator("#detailTitle")).toHaveJSProperty("tagName", "H2");
    await expect(visibleH1(g.page)).toHaveCount(1);
    await expect(visibleH1(g.page)).toHaveText("MOBA menu");
  });

  await test.step("visitor gate: the menu's h1 is display:none under html.gated", async () => {
    const visitor = await guest();
    await visitor.menu.goto();
    await visitor.menu.expectGate(GATE_NONE);
    await expect(visibleH1(visitor.page)).toHaveCount(1);
    await expect(visibleH1(visitor.page)).toHaveText(GATE_NONE);
    // The menu's own h1 is still in the DOM, just hidden: it must not count.
    const menuH1 = visitor.page.locator("h1", { hasText: "MOBA menu" });
    await expect(menuH1).toHaveCount(1);
    await expect(menuH1).toBeHidden();
  });
});

/**
 * P0-LAYOUT-03 steps 1-4. `activateOrderButton` is how step 3 opens the order sheet: a click/tap
 * (the case as written) or the keyboard.
 */
async function dialogFocusFlow(g, activateOrderButton) {
  const { page, menu, sheet } = g;
  await scanAndOpenCategory(g, 13, DISH.brownie.category);

  const brownieBtn = page.locator(`#grid [data-open="${DISH.brownie.id}"]`);
  await expect(brownieBtn).toHaveCount(1);
  const backBtn = menu.detail.getByRole("button", { name: "Back to the menu" });
  const closeOrderBtn = sheet.sheet.getByRole("button", { name: "Close your order" });

  await test.step("1) Enter on the Brownie name opens the dish dialog and moves focus into it", async () => {
    await brownieBtn.focus();
    await expect(brownieBtn).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(menu.detail).toBeVisible();
    await expect(menu.detail).toHaveAttribute("role", "dialog");
    await expect(menu.detail).toHaveAttribute("aria-modal", "true");
    await expect(menu.detailTitle).toHaveText(DISH.brownie.name);
    await expect(page.getByRole("dialog", { name: DISH.brownie.name })).toBeVisible();
    await expect(backBtn).toBeFocused();
    await expect(page.locator("#app")).toHaveJSProperty("inert", true);
  });

  await test.step("2) Escape closes it and gives focus back to the Brownie name", async () => {
    await page.keyboard.press("Escape");
    await expect(menu.detail).toBeHidden();
    await expect(brownieBtn).toBeFocused();
    await expect(page.locator("#app")).toHaveJSProperty("inert", false);
  });

  await test.step("3) the order button opens the sheet with focus on 'Close your order'", async () => {
    await activateOrderButton();
    await expect(sheet.sheet).toBeVisible();
    await expect(closeOrderBtn).toBeFocused();
  });

  await test.step("4) Escape closes the sheet and gives focus back to the order button", async () => {
    await page.keyboard.press("Escape");
    await expect(sheet.sheet).toBeHidden();
    await expect(menu.listBtn).toBeFocused();
  });
}

test("@phase0 @p2 @devices P0-LAYOUT-03 dish dialog and order sheet move focus in, close on Escape and give focus back", async ({ guest, browserName }) => {
  // KNOWN BUG P0-BUG-LAYOUT-01: on WebKit (Safari, every iPhone browser) a clicked/tapped button
  // does not take focus, so openLayer() in site/menu.js stores <body> as `returnTo`
  // (`const returnTo = document.activeElement`), closeTop()'s `returnTo.focus()` does nothing, and
  // after Escape focus is lost to <body> instead of going back to #listBtn. Chromium (Android)
  // focuses the clicked button, so it passes there. Correct behaviour asserted below; this flips
  // red on WebKit once the opener is passed to openLayer() explicitly.
  test.fail(browserName === "webkit", "KNOWN BUG P0-BUG-LAYOUT-01: focus not returned to the order button after a click/tap on WebKit");
  const g = await guest();
  await dialogFocusFlow(g, () => g.menu.listBtn.click());
});

// Same flow with the order button activated from the keyboard. Passes on every engine today; it keeps
// steps 1-4 guarded on WebKit while the click/tap path above is an expected failure there.
test("@phase0 @p2 @devices P0-LAYOUT-03 keyboard: Enter on the order button opens the sheet, Escape gives focus back to it", async ({ guest }) => {
  const g = await guest();
  await dialogFocusFlow(g, async () => {
    await g.menu.listBtn.focus();
    await g.page.keyboard.press("Enter");
  });
});

test("@phase0 @p2 @devices P0-LAYOUT-04 local favicon links resolve with 200", async ({ guest, baseURL }) => {
  const origin = new URL(baseURL).origin;

  for (const path of ["/", "/menu.html"]) {
    await test.step(`${path}: declares both icons, each loads, no same-origin error during load`, async () => {
      const g = await guest();
      const errors = watchSameOriginErrors(g.page, origin);
      // The home page asks the backend for the visit info after load; wait for it so it's covered too.
      const info = path === "/" ? g.page.waitForResponse((r) => r.url().endsWith("/rest/v1/rpc/get_restaurant_info")) : null;
      await g.page.goto(path, { waitUntil: "load" });
      if (info) expect((await info).status()).toBe(200);

      const links = await iconLinks(g.page);
      expect(links).toEqual(expect.arrayContaining([
        expect.objectContaining({ rel: "icon", href: "assets/favicon-32.png", sizes: "32x32" }),
        expect.objectContaining({ rel: "apple-touch-icon", href: "assets/apple-touch-icon.png" }),
      ]));

      for (const { url } of links) {
        const res = await g.page.request.get(url);
        expect(res.status(), url).toBe(200);
        expect(res.headers()["content-type"], url).toMatch(/^image\/png\b/);
      }
      const ico = await g.page.request.get(`${origin}/favicon.ico`);
      expect(ico.status(), "/favicon.ico").toBe(200);

      expect(errors, `same-origin errors while loading ${path}`).toEqual([]);
    });
  }
});
