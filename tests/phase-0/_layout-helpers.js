// Helpers for phase-0/layout.spec.js only. Shared selectors stay in support/pages.js; these are
// measurements and small flows the page objects don't have yet (see the support suggestions in the
// Phase 0 report).
import { expect } from "../support/fixtures.js";
import { qrFor } from "../support/data.js";

/**
 * Scan table n, then open the menu straight on a category (/menu.html#<category>).
 * `guest.scanAndOpen(n, category)` can't be used for that: its `expectOpen()` waits for the
 * "Most loved" rail, which is hidden while a category view is showing.
 */
export async function scanAndOpenCategory(g, n, category) {
  await g.home.goto(qrFor(n));
  await g.menu.goto(category);
  await expect(g.page.locator("html")).not.toHaveClass(/\bgated\b/);
  await expect(g.page.locator("#catView")).toBeVisible();
  await expect(g.page.locator("#grid [data-open]").first()).toBeVisible();
}

/** Web fonts settle the final line widths; wait for them (resolves even when they fail to load). */
export async function fontsSettled(page) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

/** Width of the scrollable page vs. the window, in CSS px. */
export function pageWidths(page) {
  return page.evaluate(() => ({
    scrollWidth: document.scrollingElement.scrollWidth,
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

/**
 * The visible elements that stick out past the right edge of the window, widest first.
 * Only for the failure message, so a red test says which element causes the sideways scroll.
 */
export function overflowingElements(page, limit = 5) {
  return page.evaluate((max) => {
    const vw = window.innerWidth;
    const out = [];
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.right <= vw + 0.5) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
      out.push({ el: `${el.tagName.toLowerCase()}${id}${cls}`, right: Math.round(r.right), width: Math.round(r.width) });
    }
    return out.sort((a, b) => b.right - a.right).slice(0, max);
  }, limit);
}

/**
 * Soft, retrying check that the screen has no sideways scroll:
 * document.scrollingElement.scrollWidth <= window.innerWidth.
 * Retries (web-first) so an intro animation that starts off-screen can settle; a lasting overflow
 * still fails, and the message lists the elements that cause it.
 */
export async function expectNoSidewaysScroll(page, screen) {
  await fontsSettled(page);
  const soft = expect.configure({ soft: true });
  let last = null;
  await soft
    .poll(async () => {
      last = await pageWidths(page);
      return last.scrollWidth - last.innerWidth;
    }, { message: `${screen}: page is wider than the window (scrollWidth - innerWidth, px)` })
    .toBeLessThanOrEqual(0);
  if (last && last.scrollWidth > last.innerWidth) {
    const culprits = await overflowingElements(page);
    soft(culprits, `${screen}: ${JSON.stringify(last)}; elements past the right edge`).toEqual([]);
  }
}

/** Every visible h1 on the page. Playwright's `visible` = non-empty box and not visibility:hidden. */
export const visibleH1 = (page) => page.locator("h1").filter({ visible: true });

/** The favicon <link>s a page declares, as { rel, href (as written), url (absolute), sizes, type }. */
export function iconLinks(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => ({
      rel: l.getAttribute("rel"),
      href: l.getAttribute("href"),
      url: l.href,
      sizes: l.getAttribute("sizes"),
      type: l.getAttribute("type"),
    })));
}

/**
 * Record every same-origin response with status >= 400 while `load` runs. Returns the list
 * (filled in place) so the test can assert on it after the page has loaded.
 */
export function watchSameOriginErrors(page, origin) {
  const bad = [];
  page.on("response", (r) => {
    if (r.url().startsWith(origin) && r.status() >= 400) bad.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return bad;
}
