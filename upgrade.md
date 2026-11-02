# MOBA site upgrade

Design polish pass on the live site in `site/`. Eight changes, listed in page order.
Animation work uses **GSAP 3.12.5**, which is already loaded on both pages from cdnjs. No new libraries.

Status: items 1–7 are applied and checked in the browser (`site` server, port 5501). Nothing is committed.

| # | Page | Change | Files |
|---|------|--------|-------|
| 1 | Landing | Full "MOBA 모바 Korean Resto-Cafe" logo inside the TV | `site/index.html` |
| 2 | Landing | Remove the "See all Rameyon →" button | `site/index.html` |
| 3 | Landing | Slim down the "The menu" card, keep the Open the menu button | `site/index.html` |
| 4 | Landing | Footer: cream background, full logo instead of the "MOBA" word | `site/index.html` |
| 5 | Menu | Top-left circle logo becomes a back arrow to the landing page | `site/menu.html`, `site/menu.css` |
| 6 | Menu | Most-loved card photos are ovals, make them circles | `site/menu.css` |
| 7 | Menu | Add-to-cart animation: medium pace, one pace for every beat | `site/menu.js`, `site/menu.css` |
| 8 | Both | Check, screenshot, hand back | n/a |

---

## Logo to use

Asset folder review (`assets/branding/` and `site/assets/`):

| File | What it is | Use it for |
|------|-----------|-----------|
| `site/assets/logo-full.webp` | MOBA 모바 + "Korean Resto-Cafe" lockup | TV screen, footer (this is the one that was asked for) |
| `site/assets/logo-mark.webp` | MOBA 모바 mark only, no tagline | stays in the landing top bar |
| `assets/branding/moba-logo.supplied.png` | Same lockup, 1080 px, white background | source file, do not ship |
| `assets/branding/moba-logo.svg` | Traced vector (740 KB) | too heavy for the page, do not ship |

`logo-full.webp` is already in `site/assets/`, so nothing needs copying.

---

## 1. TV logo (landing, hero)

- **Now:** the TV screen shows `assets/logo-mark.webp`, which is only MOBA 모바.
- **Change:** point the `<img>` inside `.screen` at `assets/logo-full.webp` and set the alt text to `MOBA 모바 Korean Resto-Cafe`.
- **Sizing:** no CSS change. `.screen img` is already `object-fit: contain` inside a white screen, so the taller lockup fits without cropping.
- **Done when:** the TV shows MOBA, 모바 and "Korean Resto-Cafe" in full, centred, nothing clipped.

## 2. Remove "See all Rameyon" (landing, Rameyon section)

- **Change:** delete `<a data-bubble href="menu.html#rameyon" class="pill">See all Rameyon →</a>` from `.sigcap`.
- **Keep:** the sentence above it ("Seven bowls, one price…") and the "Rameyon" link in the nav panel and footer.
- **Done when:** the Rameyon section ends with the paragraph and no button.

## 3. Menu card (landing, orange "The menu" section)

- **Remove:**
  - the sentence "12 categories, every dish made in our kitchen. Pick your plate."
  - the "12 categories" chip
- **Keep:** "The menu" heading, the 메뉴 tag, the **Open the menu →** button, and the two remaining chips (Mild · Hot · Very hot, Prices in ₹).
- **Spacing:** with the sentence gone, the 메뉴 tag and the button would sit side by side on one line. Make the tag its own row (`.menucta .hang { display: block; width: fit-content; margin: 0 auto 24px }`) so the button drops underneath.
- **Done when:** the card reads heading → 메뉴 → button → two chips → the corn dog line.

## 4. Footer (landing)

- **Background:** `footer { background: var(--orange) }` becomes cream (`var(--cream)`, the same cream as the corn dog section), not pure white. Text stays ink, so it reads clearly. The blue marquee strip and the blue legal bar stay as they are.
- **Other white:** the TV screen was `#fff` and is now `var(--cream)` too, so the site has no pure-white backgrounds left.
- **Logo:** replace `<div class="footword d loud-cream">MOBA</div>` with `<img class="footlogo" src="assets/logo-full.webp" alt="MOBA 모바 Korean Resto-Cafe">`.
  - Centred, `width: min(70vw, 360px)`, `height: auto`.
  - Remove the now unused `.footword` rule.
- **Done when:** the footer is cream, the logo sits centred above the blue strip, links are readable. `logo-full.webp` has a transparent background, so it sits on cream with no white box.

## 5. Back arrow (menu page, top bar)

- **Now:** `.band__home` is a cream circle holding the MOBA mark, top left of the sticky band.
- **Change:** keep the same 54 px circle and the same link (`index.html`, `data-bubble` so the bubble transition still plays), but put an arrow inside instead of the logo.
  - Use the existing `#i-back` icon from the sprite in `menu.html` (the same arrow the card rail uses).
  - Ink-coloured arrow on the cream circle, 24 px, `aria-label="Back to MOBA home"`.
- **Done when:** the top-left control is an arrow, tapping it returns to the landing page with the bubble transition.

## 6. Oval photos in "Most loved" (menu page)

- **Symptom:** photo cards in the Most loved rail are taller than wide (measured 184 × 218 and 186 × 227), while placeholder plates are 183 × 183.
- **Cause:** `.plate` is a square (`aspect-ratio: 1`) but its photo is a normal in-flow `<img>` with `height: 100%`. The browser lets the photo's own proportions push the plate taller, because an aspect-ratio box can't shrink below its content. The 50 % radius then draws an oval.
- **Fix (`menu.css`):** take the photo out of the layout so it can't size the plate.
  - `.plate img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }`
  - The photo clips itself with its own 50 % radius. Do not put `overflow: hidden` on `.plate`, because the line-art plates let their steam strokes rise past the circle.
  - `object-fit: cover` already centre-crops, so the photo fills the circle with no stretching.
- **Scope:** `.plate` is shared, so the dish grid and the dish detail hero get the same guarantee.
- **Done when:** every plate in the rail, the grid and the detail view measures width = height, and photos fill the circle.

## 7. Add-to-cart pace (menu page)

- **Now:** the plate flies to the order button in 0.75 s using `power1.in` / `back.in(2.4)` easing, which starts slowly then snaps into the corner. The badge and button bounce afterwards in 0.7 s and 0.8 s with different elastic strengths. The result reads as one quick flick.
- **Target:** medium pace, easy to follow. Not slow, not instant. All beats share one tempo.
- **Implementation (GSAP, in `menu.js`):** one `ADD_PACE` object at the top of the file, used by every beat.

  | Beat | Was | Now |
  |------|-----|-----|
  | Plate flight to the order button | 0.75 s, `power1.in` + `back.in(2.4)` | 1.2 s, `power2.inOut` on both axes, smooth start and landing |
  | Spin while flying | 220° | 180° over the same 1.2 s |
  | Badge bump on landing | 0.7 s elastic | 0.9 s, same elastic strength |
  | Order button wiggle | 0.8 s elastic | 0.9 s, same elastic strength |
  | `+` button press (CSS) | 0.25 s | 0.35 s |

  The `menu.js` and `menu.css` links in `menu.html` go from `?v=5` to `?v=6` so phones don't keep the old files.

- **Same everywhere:** the quick `+` on a card, the `+` on a grid dish, and "Add to order" in the dish detail all call the same `fly()` and `updateBadge()`, so one change covers them all.
- **Reduced motion:** untouched. `G` is already null when the visitor prefers reduced motion.
- **Done when:** a tap on `+` shows the plate travelling for a little over a second, landing, then the badge popping, all at the same relaxed speed.

## 8. Check

- Landing at phone width (375) and desktop: TV logo, no Rameyon button, slim menu card, cream footer with logo.
- Menu at phone width and desktop: back arrow works, all plates round, add-to-cart pace feels even.
- No console errors on either page.
- Nothing committed. Review the diff first.

---

## Notes and assumptions

- "MOBA Stokafe" in the brief is read as **MOBA Korean Resto-Cafe**, the lockup in `logo-full.webp`.
- "Keep a contour variable" in item 3 was unclear. It is read as "keep the rest of the card", so the two remaining chips stay. Delete them too if only the heading and button should remain.
- The "Illustration slot" stall drawing under the TV is a placeholder and is not part of this pass.
- `site/assets/dishes/k-rice.jpg` is a 0-byte file, so that dish falls back to line art. Not part of this pass, but worth replacing.
