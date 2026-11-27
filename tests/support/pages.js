// Page objects: the only place that knows the site's selectors. Specs talk to these, so a markup
// change means fixing one file, not every test.
import { expect } from "@playwright/test";

export class HomePage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.menuLink = page.getByRole("link", { name: /open the menu/i }).first();
  }
  /** Open the home page, optionally as a QR scan (/?t=<qr>). */
  async goto(qr) {
    await this.page.goto(qr ? `/?t=${qr}` : "/");
  }
}

export class MenuPage {
  constructor(page) {
    this.page = page;
    this.gate = page.locator(".gate");
    this.gateTitle = page.locator(".gate__title");
    this.gateMsg = page.locator(".gate__msg");
    this.gateNote = page.locator(".gate__note");
    this.gateRetry = page.locator(".gate [data-retry]");
    this.rail = page.locator("#rail");
    this.railCards = page.locator("#rail .card");
    this.tiles = page.locator("#tiles .tile");
    this.grid = page.locator("#grid");
    this.gridDishes = page.locator("#grid .dish");
    this.badge = page.locator("#badge");
    this.listBtn = page.locator("#listBtn");
    this.toast = page.locator("#toast");
    this.vegToggle = page.locator("#vegToggle");
    this.searchBtn = page.locator("#searchBtn");
    this.searchInput = page.locator("#searchInput");
    this.searchResults = page.locator("#searchBody .result__open");
    // Dish detail / builder
    this.detail = page.locator("#detail");
    this.detailTitle = page.locator("#detailTitle");
    this.buyBtn = page.locator("#buyBtn");
    this.lineNote = page.locator("#lineNote");
  }

  async goto(category) {
    await this.page.goto(`/menu.html${category ? `#${category}` : ""}`);
  }

  /** True while the scan gate covers the page. */
  async isGated() {
    return this.page.evaluate(() => document.documentElement.classList.contains("gated"));
  }

  async expectOpen() {
    await expect(this.page.locator("html")).not.toHaveClass(/\bgated\b/);
    await expect(this.railCards.first()).toBeVisible();
  }

  async expectGate(title) {
    await expect(this.gateTitle).toHaveText(title);
    await expect(this.page.locator("html")).toHaveClass(/\bgated\b/);
  }

  /** Show one category's dish grid. */
  async showCategory(slug) {
    await this.page.evaluate((s) => { location.hash = s; }, slug);
    await expect(this.page.locator(`#grid [data-open]`).first()).toBeVisible();
  }

  addBtn(dishId) {
    return this.page.locator(`#grid [data-add="${dishId}"]`);
  }

  /** Tap "+" on a dish in its category grid (dishes without options go straight to the order). */
  async quickAdd(dish) {
    await this.showCategory(dish.category);
    await this.addBtn(dish.id).first().click();
  }

  async openDish(dish) {
    await this.showCategory(dish.category);
    await this.page.locator(`#grid [data-open="${dish.id}"]`).first().click();
    await expect(this.detail).toBeVisible();
  }

  size(sizeId) { return this.detail.locator(`[data-size="${sizeId}"]`); }
  option(optionId) { return this.detail.locator(`input[value="${optionId}"]`); }
  addon(addonId) { return this.detail.locator(`input[data-addon][value="${addonId}"]`); }
  detailStep(dir) { return this.detail.locator(`[data-step="${dir > 0 ? 1 : -1}"]`); }

  /** Simulate the phone coming back to the foreground (runs the page's visibilitychange handler). */
  async foreground() {
    await this.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  }
}

export class OrderSheet {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator("#listSheet");
    this.body = page.locator("#listBody");
    this.lines = page.locator("#listBody .line");
    this.total = page.locator("#total");
    this.count = page.locator("#totalCount");
    this.placeBtn = page.locator("#placeBtn");
    this.clearBtn = page.locator("#clearList");
    this.tableSlot = page.locator("#tableSlot");
    this.banner = page.locator("#orderingBanner");
    this.placed = page.locator(".placed");
    this.doneId = page.locator(".done__id");
    this.doneStatus = page.locator(".done .status-chip");
  }

  async open() {
    await this.page.locator("#listBtn").click();
    await expect(this.sheet).toBeVisible();
  }

  async close() {
    await this.page.keyboard.press("Escape");
    await expect(this.sheet).toBeHidden();
  }

  /** +1 / -1 on the n-th line (0-based). */
  step(index, dir) {
    return this.body.locator(`.line [data-step="${dir > 0 ? 1 : -1}"]`).nth(index);
  }

  async place() {
    await this.placeBtn.click();
  }

  /** Place and wait for the "Order placed" screen. Returns its "Order #N · T1 · Guest 1" text. */
  async placeAndConfirm() {
    await this.placeBtn.click();
    await expect(this.doneId).toBeVisible();
    return (await this.doneId.innerText()).replace(/\s+/g, " ").trim();
  }
}
