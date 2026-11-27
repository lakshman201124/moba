// Area helpers for phase-0/flow.spec.js only.
//
// The shared page objects in support/pages.js cover the gate, grid, badge and the sheet's total /
// place button. The FLOW cases also check the dish builder's error and price, each cart line's
// details, the "Order placed" screen and the "Your orders" status list, so those selectors live
// here instead of in the specs. Candidates to move into support/pages.js (see the run report).
import { expect } from "../support/fixtures.js";
import { qrFor } from "../support/data.js";

/** Extra selectors on the dish builder (#detail). */
export class BuilderExtras {
  constructor(page) {
    this.page = page;
    this.detail = page.locator("#detail");
    this.buyPrice = page.locator("#buyPrice");
    this.qty = page.locator("#qty");
    this.sizeGroupLabel = page.locator("#sizeLabel");
    this.addonRows = page.locator("#detail label.addon");
    this.addonNames = page.locator("#detail label.addon .addon__name");
    this.addonPrices = page.locator("#detail label.addon .addon__price");
  }
  /** The n-th choice group (0-based, in the dish's order) as a <fieldset>. */
  choiceGroup(index) {
    return this.detail.locator(`fieldset.opt[data-opt="${index}"]`);
  }
  legend(index) { return this.choiceGroup(index).locator("legend"); }
  legendHint(index) { return this.choiceGroup(index).locator("legend small"); }
  groupError(index) { return this.choiceGroup(index).locator(".opt__error"); }
}

/** Extra selectors on the order sheet (#listSheet): cart lines, the done screen, "Your orders". */
export class SheetExtras {
  constructor(page) {
    this.page = page;
    this.title = page.locator("#listTitle");
    this.tableChip = page.locator("#tableSlot .table-chip");
    // Cart (editable) lines
    this.cartLines = page.locator("#listBody > ul.lines > li.line");
    this.emptyTitle = page.locator("#listBody .empty .empty__title");
    // "Order placed" screen
    this.done = page.locator("#listBody .done");
    this.doneLines = page.locator("#listBody .done li.line");
    this.doneCount = page.locator("#listBody .done__total span");
    this.doneTotal = page.locator("#listBody .done__total strong");
    this.orderAgain = page.getByRole("button", { name: "Order something else" });
    // "Your orders at T<n>"
    this.placedTitle = page.locator("#listBody .placed__title");
    this.placedOrders = page.locator("#listBody .placed__order");
    this.placedFine = page.locator("#listBody .placed__fine");
  }
  lineName(line) { return line.locator(".line__name"); }
  lineOpts(line) { return line.locator(".line__opt"); }
  lineNote(line) { return line.locator(".line__note"); }
  lineMeta(line) { return line.locator(".line__meta"); }
  placedSummary(order) { return order.locator("summary > span").first(); }
  placedChip(order) { return order.locator(".status-chip"); }
  placedSub(order) { return order.locator(".placed__sub"); }
  placedTotal(order) { return order.locator(".placed__total"); }
}

/**
 * Every order in this test's database with its items, oldest first, as plain JSON.
 * Read as postgres (the test's own clone), never through the public API.
 */
export async function ordersInDb(db) {
  return db.json(`
    select coalesce(json_agg(json_build_object(
             'id', o.id, 'order_no', o.order_no, 'table', t.label, 'status', o.status,
             'guest_no', o.guest_no, 'item_count', o.item_count, 'total', o.total,
             'accepted_at', o.accepted_at, 'served_at', o.served_at,
             'items', (select coalesce(json_agg(json_build_object(
                                'dish_id', i.dish_id, 'dish_name', i.dish_name, 'size_label', i.size_label,
                                'choices', i.choices, 'addons', i.addons, 'note', i.note, 'diet', i.diet,
                                'qty', i.qty, 'unit_price', i.unit_price, 'line_total', i.line_total)
                              order by i.sort_order), '[]'::json)
                         from public.order_items i where i.order_id = o.id))
           order by o.created_at), '[]'::json)
      from public.orders o
      join public.dining_tables t on t.id = o.table_id`);
}

/** Index of the first call to `fn` in a guest's rpcCalls list (-1 when it was never called). */
export const firstCall = (calls, fn) => calls.indexOf(fn);

/**
 * Scan table n's QR, then open the menu on a category (e.g. "desserts").
 *
 * Stand-in for guest.scanAndOpen(n, category): that fixture ends with menu.expectOpen(), which waits
 * for the "Most loved" rail card to be VISIBLE. When the menu opens on a category (#desserts) the
 * rail's view is hidden, so the fixture times out even though the menu opened fine. Here "open"
 * means: not gated, and the category's dish grid is showing.
 */
export async function scanAndOpenAt(g, n, category) {
  await g.home.goto(qrFor(n));
  await g.menu.goto(category);
  await expect(g.page.locator("html")).not.toHaveClass(/\bgated\b/);
  await expect(g.menu.railCards.first()).toBeAttached();
  await expect(g.page.locator("#catView")).toBeVisible();
  await expect(g.page.locator("#grid [data-open]").first()).toBeVisible();
}

/**
 * Tap a choice chip or add-on row the way a guest does: on its label. The real <input> is an
 * invisible (opacity 0) layer under the label's text, so Playwright's check() on the input is
 * refused ("<span> intercepts pointer events"); a finger lands on the label, which toggles it.
 */
export async function tapChoice(input) {
  await input.locator("xpath=ancestor::label[1]").click();
}
