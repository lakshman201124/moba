# PRODUCT.md - MOBA

## What it is
MOBA is a Korean resto-cafe in India. This project is its **QR-scanned, mobile-first digital menu** - a static, browse-only menu experience (no ordering, no cart, no backend). Diners scan a code at the table and land in a creative, animated space that makes them hungry and then lets them browse the full menu.

## Name & meaning (brand engine)
MOBA = 모으다 (moeuda, "to gather") + 밥 (bap, "rice / any shared meal"). Tagline: **"Gather for food."** Cultural root: in Korea you greet friends with 밥 먹었어? ("have you eaten?"). Sign-offs: 같이 밥 먹어요 (let's eat together), 맛있게 드세요 (enjoy), 직접 만듭니다 (we make it ourselves).

## Audience & scene
In-restaurant diners of all ages, on their own phones, under restaurant lighting, hungry, deciding what to order. Success = they feel delighted, understand the brand in seconds, and can find any dish fast.

## Mode
**Persuade -> Operate.** The opening (gather scene, TV, signature spotlight) persuades and sets the vibe; the menu itself is Operate (scan, find, read a dish). The menu's scanability always outranks expression.

## Brand commitments (locked with the client)
- **Logo:** official MOBA logo (italic orange wordmark, cobalt outline, 모바, chopstick-stripe mark, "Korean Resto-Cafe"). File: `assets/branding/moba-logo.svg` (needs a clean rebuild; see visual-direction.md 0D).
- **Palette:** 60% orange `#FF531B` / 30% pale yellow `#F6F396` / 10% light blue `#8BBEE9`; cobalt `#3069B8` as outline/ink accent; logo orange `#F05B41` only inside the logo. Ink `#1B1A2E`, cream `#FFF8E7`.
- **Display type:** Bagel Fat One (fat bubbly; matches the client's "Mocha Mochi" pick), uppercase, includes Hangul + ₹. Body: rounded grotesk (TBD).
- **Mascot:** a cheeky, deadpan white bear in a backwards red cap; hand-inked outline, pink cheeks. Appears throughout and reacts. Source art in `assets/moba-branding/moscot/`.
- **Voice:** cheeky, hungry, loud. Street-pop Korean snack-packaging energy: stickers, giant cropped type, Hangul labels, speech bubbles, sparkles.
- **Silent** experience (no audio). Design approved visually (show, then decide). Design before animation.

## Menu (real content)
12 categories, ~123 items, prices in INR (taxes extra). Full map in `menu-structure.md`. Highlights: Moba Signatures (Rabokki, Cream Cheese Bun), Rameyon (flat ₹339), Gimbap & Toppoki, Korean Starters, Crispy Bites, Street Snacks (K-Corn Dogg, K-Nachos), Mandu, K-Rice & Noodle, Toast/Melts/Burgers, Salads & Soups, Boba Bar (39 drinks), K-Desserts. 3 heat levels: Mild / Hot / Very Hot.

## Constraints
- Mobile-first, fast on 4G after a QR scan (target < 3s to usable).
- No ordering/payment/accounts. Static content.
- Self-host fonts (subset Bagel Fat One). 60fps on mid-range phones.
- Dish photos: mockup/placeholder now, swapped for final shots later; every image slot must be replaceable.

## Supporting docs
`project.md` (overview), `visual-direction.md` (locked creative Q&A), `menu-structure.md` (menu data), `moodboard/index.html` (117 references).
