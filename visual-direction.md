# MOBA - Visual Direction

> This document defines the complete visual identity and creative direction for MOBA's digital menu. It is built through structured Q&A with the user — every section starts with questions to collect the creative brief, followed by the locked decisions.

---

## How This Document Works

Each section below has two parts:
1. **Questions** — What the agent needs to ask the user to make creative decisions
2. **Direction** — The locked decision once the user answers (filled in during the Q&A process)

Status key: `[PENDING]` = needs user input | `[PARTIAL]` = some decisions made | `[LOCKED]` = decision made

---

## 0. Asset Analysis (what the provided files already tell us) `[LOCKED]`

### A. MOBA's existing brand (from `assets/menu mockuo  design/` - 3 mockups)
- **Name / tagline:** MOBA, "Korean Kitchen", "Gather for food", "Korean comfort bowl". Hangul wordmark 모바 shown in a speech bubble.
- **Mascot:** a white bear with a red backwards-style cap with a buckle, rosy cheeks, always eating (noodles, tteokbokki, fried chicken) from a bowl or basket. Blue chopstick-sparkle "action lines" around it.
- **Packaging language:** cream bowls printed with a blue "MOBA" wordmark + bear face; a blue flower-seal emblem; black baskets lined with branded paper. This is the product world to reuse in imagery.
- **Palette seen:** butter yellow (#FFE14D-ish), cobalt/azure blue, red-orange (price pills, CTA), cream card surfaces, red (cap). Exact values to be extracted from the palette image the user is sending.
- **Type seen:** ultra-heavy condensed display with a hard offset drop shadow/outline (RAMEYON, TTEOKBOKKI), same family in blue for item names, small tracked caps for labels ("KOREAN KITCHEN"), clean grotesk for descriptions, Hangul in a rounded bold sans.
- **UI patterns seen:** rounded cream "card" container on a yellow textured background (brush-stroke blue slashes), orange pill prices, small status chips (BEST / SPICY / VEG / chili icons), Spice Guide panel (Mild, Medium, Spicy, Extra Spicy), "Choose your filling" panel (Chicken, Beef, Tofu, Seafood), Add-ons list with prices, "Explore Menu >" hand-drawn red pill CTA, doodle arrows pointing at dishes with bilingual labels (TOPPOKI 떡볶이), Instagram-post-style cards with ORDER pill.
- **Currency:** Indian rupee (₹). Items seen: Rameyon (Teri Gochujang, Creamy Gochujang, Spicy Soy Ramen, Ssamjang Bean, Buldak, Bulgogi, Kimchi), Tteokbokki, Jjajangmyeon, Korean Fried Chicken, Bibimbap, Gimbap.
- **Caveat:** the mockup food photos look AI-generated. They are usable as placeholders (user decision) and must be swapped for real or re-generated, consistent assets later.

### B. Reference sites (`assets/*.jpg`) and what to steal
| Reference | Take this |
|-----------|-----------|
| **Nooch (green/yellow/pink)** | Giant cropped letters filling the screen, full-bleed color-blocked sections, product tilted in from the corners, a small cartoon character with a speech bubble, scrolling marquee strip of keywords, saturated photo shoots on flat colored sets |
| **nôm (Vietnamese branding)** | Oversized type behind overlapping photo cards, starburst + oval stickers ("nom time!"), outlined tag chips, quote-style callouts |
| **Heyday Cannings** | Section-by-section color changes, polaroid photo cards tilted at angles, ingredients floating as illustrated stickers, polka-dot texture, handwritten sign-off, retro heavy serif headlines |
| **Brambleroot Kitchen** | Single hue family with thick offset outlines on cards, checkerboard divider strip, curly hand-drawn arrows, peel-corner "TOP" badges, rounded outlined buttons |
| **Waffinity** | Wavy scalloped section dividers, a drawn squiggly path linking food items, numbered rotated sticky cards, repeated huge outlined/solid headline text behind the hero |
| **"My Spots" app (download.jpg)** | Mobile card grid: each card its own solid color, photo inset with rounded corners, big bold item title bottom-left, tiny meta pills, staggered/masonry columns, full-width black pill CTA |

### D. The official logo (`assets/branding/moba-logo.svg`, supplied by the user)
- **Lockup:** italic heavy "MOBA" in red-orange with a thick cobalt outline and white sticker keyline, Hangul "모바" in cobalt on white below it, an angled chopstick-stripe mark (orange / yellow / blue stripes, outlined in cobalt) wrapping the top and bottom, tagline "Korean Resto-Cafe" in rounded bold cobalt.
- **Logo colors (sampled from the SVG):** orange `#F05B41` (also `#E0614E`), brand blue `#3069B8` (also `#2F6BBF`), yellow `#F7CA5B`, white fill.
- **This logo supersedes the "MOBA" wordmark in the mockups** (the mockups use a chunky upright blue wordmark; the official one is italic orange with a blue outline). Use the official logo everywhere; treat mockup wordmarks as layout placeholders.
- **It already matches the 60/30/10 system:** orange and yellow are the logo's own colors, and the blue gives a ready-made outline color.
- **Technical condition (needs fixing before production):** the file is an auto-trace (VTracer) of a WhatsApp JPEG: 742 KB, about 1,555 paths, jagged edges and pale fringe pixels along every edge, and it had a full-canvas white background rectangle (already removed in `moba-logo.svg`; untouched copy kept as `moba-logo.original.svg`). Fine for splash testing, not fine for a 60fps mobile site or for large display sizes.
- **Source image:** the user also supplied the raster the trace came from (1080x982 JPG, saved as `assets/branding/moba-logo.source.jpg`). No vector or larger original is available yet, so a clean rebuild is the realistic path.
- **Fix plan:** (1) ask the client for the original vector (AI/PDF) or a high-res PNG (2000px+) if one exists; (2) if none exists, rebuild it as a clean hand-built SVG of roughly 5-10 KB (stripe mark and outlines as simple paths, wordmark traced at high precision then simplified, Hangul as outlined path); (3) export variants: full lockup, MOBA-only, 모바-only, stripe-mark-only (for loaders/favicon), single-color for stamps.

### E. The user's own reference folder (`assets/moba-branding/`, copied from Downloads; PDF + 13 subfolders)
The user curated these, so they outrank the agent-found research. What each one tells us:

| Folder / file | What it is | Take-away |
|---|---|---|
| `Moba menu dump Aug 2026.pdf` | The real print menu: 14 pages, ~123 items | Content source of truth (see `menu-structure.md`). Also an existing visual system: white/lavender page, navy headings, orange price pills, yellow + blue callout boxes, scalloped awning edge top and bottom, orange-dot + blue-wave divider, Seoul skyline illustration, bilingual Hangul labels, per-category tint (boba/desserts pastel cards), confetti dots |
| `moscot/` (2 images) | The bear in 2 states: arms-crossed grumpy-cheeky on orange; bear in denim overalls with a backwards red cap and a hand-drawn look | Defines the personality: **cheeky, deadpan, slightly annoyed, lovable**. Hand-inked outlines with soft pink cheeks. Source art for the mascot sheet; not yet a pose set |
| `menu starting/` (3 images) | VARKA lunch menu, KOGU menu, and the MOBA mockup: top-down dishes on flat color with outlined **hands and cutlery reaching in from the edges**, sparkle crosses, curved Hangul/English labels pointing at dishes | **This is the "gather for food" opening.** See section 0F |
| `loading screen/` | Illustrated Korean cheese stick pulled apart into a long stretchy string, with Hangul written on it | **Loader idea: a stretching cheese pull as the progress bar.** Fits the MOBA Cream Cheese Bun and Cheese Corn Dogg |
| `popup screen ideas/` | Just Eat pizza that slides in a toggle track ("PIZZA MODE ON"); JL Patisserie receipt printing out of a slot with the dish on it | **Pop-up / dish-detail ideas:** the dish as a toggle knob, the detail sheet as a receipt printed from a slot. Strong fit for the bottom sheet |
| `menu page reference/` (3 images) | Indonesian wavy red/cream split page with dishes zig-zagging down the wave and a giant "MENU" word; a Korean green/cream menu with a circular color sweep, a hanbok-hat line drawing, Hangul brush type; a dark theme with dishes linked by a thin curved line | **Category-page ideas:** a wavy two-tone split with dishes alternating left/right down the wave; a thin line connecting dishes; giant MENU/Hangul words between dishes |
| `components referfernce/` | Instagram-post frame in muted green with Korean flower seals, noodle pull from chopsticks, repeating wave pattern | The flower-seal emblem from the mockups; a noodle being lifted out of a bowl |
| `categories/` (2 images) | Receipt-printer slot with a pastry on a paper slip (Mango passionfruit cheesecake); Liu Chinese Kitchen noodles-and-chopsticks post | **Category card idea:** a receipt/ticket card per category; a hand-and-chopsticks hero |
| `dishes/` (5 images + root chili PNG) | Bibimbap (bowl and white-bowl), glossy Korean fried chicken on a speckled plate (cutout), tteokbokki in a bowl and in a cast-iron pan (cutout), a cutout-friendly red chili | Placeholder dish photography; the chicken and the pan tteokbokki are transparent-cutout style, which is the format we want. Photography is not MOBA's real menu items (menu has no bibimbap) |
| `background/` | Red field with yellow line-icons: dome cloche, ramen bowl with steam, fried egg, burger, chopsticks, chili, spoon and fork, pizza, plate, sausage | **Background pattern idea:** a tiled line-icon wallpaper in a 2-color pair. Must be redrawn with MOBA-relevant icons (ramen, tteok, corn dogg, boba, kimchi jar, cheese bun, chopsticks, chili) |
| `illustrations/` | Flat, textured, tattooed-hands-holding-a-huge-burger poster on black, plus a stick-figure waiter | Style cue: oversized food + hands + a wide-open mouth = hungry and loud. Hands as characters |
| `sketches and drawings/` (7 files) | Korean doodle sets (hanbok couple, palace, fan, soju, kimchi, tiger, magpie, Namsan tower, bibimbap bowl, speech bubble "안녕하세요", Gwanghwamun/Seoul line art), cartoon hanbok couple | The **Korean motif library** to redraw in MOBA's line style: palace roof, N Seoul Tower, fan, tiger, magpie, soju bottle, cloud swirls, drum, flag-less. `download.png` is blank/transparent |
| root `2b9b3fad...jpg`, `6b5027b7...jpg`, `25872d31...jpg`, `8ed4ad77...jpg`, `b0f05bdb...jpg` | Yellow + sky-blue blob/amoeba pattern (`#FED602` yellow on a sky blue); yellow-and-blue frame with offset square stickers (`#8BBEE9` sky blue); red retro phone "Hello.." on yellow; a confused white goose on cobalt; rising wavy-stripe arrows on yellow | **Background shapes and attitude:** liquid blobs in yellow + sky blue, offset-shadow square stickers, playful single-gag characters, big empty color fields |
| `WhatsApp Image ...2.35.11 PM.jpeg` | The logo raster (same as `assets/branding/moba-logo.source.jpg`) | Logo source |

**Two important findings:**
1. **The user's own blue is stronger than the `#B9E2F5` we proposed.** Their blob/frame references use a clear sky blue (`#8BBEE9` sampled; the blob blue looks about `#6FBBE8`) with yellow `#FED602`/`#F7DC00`. The locked 10% light blue should probably move to `#8BBEE9`. (Flagged in section 2.)
2. **The print menu is calm, the references are loud.** The PDF is a clean, light, navy-and-pastel system; the brief and the references (nôm, Nooch, VARKA, KOGU) are bold, orange-and-yellow, sticker-heavy. The digital menu follows the loud brief but reuses the PDF's content structure, option panels, Hangul labels, icons, skyline and scalloped-edge motif.

### F. THE CONCEPT: "GATHER FOR FOOD" (user brief, to be refined with the user's link)
- Brand idea (from the PDF): MOBA = 모으다 (to gather) + 밥 (shared meal). The experience must *feel* like people gathering around food.
- **Opening scene (proposed, from the `menu starting/` references):** a top-down table in flat orange/yellow. Outlined hands (white fill, blue ink lines) holding spoons, forks, chopsticks and a cup slide in from the screen edges toward food placed around the centered logo. Curved labels with doodle arrows name each dish in English + Hangul. Sparkle crosses and speech bubbles. The bear peeks in with a cheeky face. A red hand-drawn pill says **VIEW MENU**.
- **Then:** tapping VIEW MENU is the "everyone sits down" moment and moves to the menu home (category cards).
- **Possible game (user idea, to scope later):** a small tap/drag mini-game on the loading or gathering screen (for example, catch falling food in the bowl, serve dishes to the hands, feed the bear). The user will send a link showing what they mean. Keep it optional and skippable so QR scanners reach the menu in under 3 seconds.
- **Hero concept proposed by the user (PENDING approval):** a retro TV on the right of the hero (reference: `assets/references/hero-tv-euphoria-sugupta.jpg`, a color-blocked yellow page with a giant headline and a wooden TV). The animation plays INSIDE the TV screen, driven by scroll (video -> frames played back while scrolling; other techniques to compare). The next frame is a **VIEW MENU** CTA. Illustrations and creative backgrounds run through the whole page. It is a static, browse-only digital menu, not a website: no nav bar, blog, shop or cart. Evaluation and adjustments: see the Q&A log (row 19).
- **Loader:** a stretching cheese pull (`loading screen/` reference) as the progress bar; the bear tugs it.
- **Guideline:** animation work comes AFTER layouts, wireframes and backgrounds are approved (user decision), but every wireframe frame must leave room for the hands, the bear and the stickers so the animation can drop in.

### C. Synthesis
MOBA = **street-pop Korean snack-packaging energy + app-card UX**: the existing yellow/blue/red-orange brand and bear mascot, expressed through the color-blocked, sticker-heavy, giant-type language of the references, packaged into a fast mobile card-grid menu.

---

## Q&A Log (decisions made with the user so far)
| # | Question | Decision |
|---|----------|----------|
| 1 | Mascot role | **Animated star** - bear on every screen, reacts to taps, multiple poses |
| 2 | Palette | **60% orange `#FF531B`, 30% yellow `#F6F396`, 10% light blue `#B9E2F5`**, sampled from the nôm reference image (light blue hex approved: use recommended values). Brand blue `#3069B8` from the logo = outline/ink accent |
| 3 | Animation level | **4 - Dynamic** (scroll reveals, giant type, parallax floaters, morphs, bouncy taps; 60fps budget) |
| 4 | Food imagery | **Mix**: use mockup shots as placeholders now, swap later |
| 5 | Functionality | **Browse only** (no cart / ordering / backend) |
| 6 | Navigation | **Splash, then category cards grid**; tap a card opens that category's page with a transition |
| 7 | Korean vibe | **Modern Seoul street-pop** (Hangul as stickers/giant bg type, sparkles, speech bubbles, flower-seal emblem) |
| 8 | Language | **English with Hangul accents** (no translation toggle) |
| 10 | Brand feel | **Cheeky, hungry, loud** |
| 11 | Typography | **Reference: "Mocha Mochi" (Afkari Studio), a fat bubbly uppercase display font.** Free web match chosen: **Bagel Fat One** (Google Fonts), including its Hangul. Confirm, or buy the real font license (see section 3) |
| 12 | Mascot file | **User has a vector/PNG of the bear**; will send it (pending). Build from it, do not redesign |
| 13 | Sound | **Silent**; visual bear reactions only |
| 14 | Process order | **Design first** (wireframes, layouts, backgrounds, menu categories), **animation later** (user decision) |
| 15 | Dish detail | **Bottom sheet** (slides up over the category page; ideas: receipt-from-a-slot, dish-as-toggle) |
| 16 | Product type | **Not a normal website**: an animated "people gather for food" experience, possibly with a small game; user will send a link. Then "View Menu", then the menu |
| 17 | Layout approach | User wants to **see and approve visuals** (mockups), not answer abstract layout questions. Agents are collecting references; user will also send mockups |
| 18 | Menu content | **Real menu PDF supplied** (14 pages, ~123 items, 12 categories); mapped in `menu-structure.md`. Spice levels are Mild / Hot / Very Hot |
| 19 | TV hero idea | **Proposed (pending approval):** animation inside a retro TV on the hero, scrubbed by scroll, then a View Menu CTA frame. Evaluation: good fit with "gather" (a shared screen people gather around, mukbang/K-drama vibe), but adapt it: portrait layout (TV tilted, bleeding off the right edge), keep the scroll sequence short (2-3 screens) with a View Menu button always reachable, use vector/Lottie for the mascot animation and keep frame sequences for photographic food only, with a reduced-motion poster fallback |
| 20 | TV content | **User:** the TV plays a short vintage TV-ad style clip; the bear does not have to be in it. Vintage human or other characters gathering and eating. Evaluation: yes; do the vintage look with cheap CSS overlays (scanlines, grain) over light flat animation; bear can appear as the closing "sting" / end card |
| 21 | Exploded-layer scroll section | **User idea (pending):** after the TV hero, a scroll-pinned section for RAMEYON that opens layer by layer, labels each ingredient with hotspot dots, then a VIEW MENU CTA. Reference: Pinterest pin "Burger shop website home page Animation" (poster saved at `assets/references/exploded-burger-scroll-poster.jpg`; video itself not inspected because Pinterest requires login). Proposed twist: reverse it so the ingredients **gather** into the bowl (ties to MOBA = to gather). Candidate dish: Rameyon, or Rabokki (the signature, ramyeon + tteok = rabokki) |
| 22 | Noodle thread (home scroll story) | **User idea, proposed and wireframed (pending approval):** replace the old travelling bowl and the Rabokki "exploded bowl" block with ONE fat SVG noodle strand that starts draped over the "GATHER FOR FOOD" headline (user decision: start on the letters, not in the TV), follows the scroll down the whole home page and falls into a ramyeon pot in a new **RAMEYON** signature section. Shape reference: user's blue squiggle poster (fat flat stroke, horizontal S-bends). Illustration reference: RamenChick hero (thick outline, flat fills, toppings bursting). Full spec in section 5A; working prototype in `wireframes/home.html` |
| 23 | Home colour pass (`site/home.html`) | **User decisions:** yellow (lemon `#F6F396`) hero with orange headline; 10% light blue changed to **`#8BBEE9`** (from the user's own references, replaces `#B9E2F5`); outlined noodle (style A); supplied logo SVG used in the top bar until a clean one arrives. **Applied rules:** brand blue `#3069B8` for every outline and hard shadow (logo style), big headlines get a blue stroke + shadow; text on orange or sky is ink (cream on `#FF531B` is only 3:1); section rhythm lemon hero, blue marquee, orange menu CTA, sky Rameyon (yellow pot on sky), lemon reviews, orange band, cream collage, orange ring, blue visit, orange footer. Body font Jua |
| 24 | Page transition | **User request:** Mana Yerba Mate style bubble splash between pages, **orange + yellow only, no blue**. Analysed manayerbamate.com: a Lottie (`transition-faster.json`, 60fps, ~1.5s) pops 7 big circles at scattered points on a 2000x2000 canvas with 0-15 frame staggers, then a second set rotated -90deg; the next page is revealed by circles growing as holes; a `#firstCercle` grows from the clicked button. **Built** as `site/bubble-transition.js` (no dependencies): tap -> orange circle from the finger -> orange bubbles -> yellow bubbles on top with pop-away droplets -> navigate; destination starts flat yellow (pre-paint snippet in `<head>`) -> yellow holes open onto orange -> orange holes open onto the page. Any link with `data-bubble` uses it. Reduced motion: plain navigation |
| 9 | Logo | **Official logo supplied** (`assets/branding/moba-logo.svg`): orange/blue/yellow italic sticker lockup; needs a clean rebuild or original file (see section 0D) |

---

## 1. Brand Identity & Personality `[PENDING]`

### Questions to Ask User

- What does "MOBA" mean to you beyond Moida + Bob? Is there a story behind the name?
- If MOBA were a person, how would you describe their personality? (e.g., loud and energetic? calm and cool? quirky and weird?)
- What 3 adjectives must a customer feel when they open the menu?
- What Korean cultural elements are important to represent? (e.g., street food culture, K-pop energy, traditional hanok calm, soju night vibes, cute/kawaii-adjacent)
- Are there any Korean brands, restaurants, or cafes whose vibe you admire?
- What should MOBA absolutely NOT feel like? (e.g., "not corporate", "not minimalist", "not cheap")

### Direction (partial, from assets)
- **Name story (from the PDF, LOCKED):** MOBA = 모으다 (moeuda, to gather) + 밥 (bap, rice / any shared meal). "In Korea you don't ask a friend how they are. You ask 밥 먹었어? - have you eaten?" Sign-offs: 같이 밥 먹어요 (let's eat together), 맛있게 드세요 (enjoy your meal), 직접 만듭니다 (we make it ourselves).
- **Brand promises:** made in-house every day, 100% in-house sauces, no artificial flavours or colours, fresh fruit never syrup.
- Tagline: "Gather for food". Descriptor: "Korean Resto-Cafe" (official logo) / "Korean Kitchen / Korean comfort bowl" (mockups).
- Mascot-led brand (white bear, red cap). Personality inferred: cheeky, hungry, cozy-loud, shareable.
- **Three feelings (LOCKED): cheeky, hungry, loud.** Street-snack energy; the bear is a greedy little troublemaker; copy is punchy and playful; everything slightly too big and too bright.
- Still to ask: what MOBA must NOT feel like, story behind the name.

---

## 2. Color Palette `[LOCKED]`

### Questions to Ask User

- Do you have existing brand colors? If yes, provide hex codes or a logo file
- What is the general mood: warm (reds, oranges, yellows) / cool (blues, greens) / mixed?
- Should it feel neon/electric, earthy/natural, pastel/soft, or bold/saturated?
- Any colors that are absolutely off-limits?
- Reference: Korean color associations
  - **Red (빨강)** — passion, energy, gochujang, street food stalls
  - **Blue (파랑)** — calm, trust, ocean/Jeju vibes
  - **Yellow (노랑)** — warmth, joy, Korean mustard, golden fried
  - **Green (초록)** — freshness, matcha, banchan, nature
  - **Black (검정)** — sophistication, K-fashion, night markets
  - **White (하양)** — clean, rice, minimalism
  - **Pink (분홍)** — playful, cherry blossom, K-beauty

### Direction

**Status:** LOCKED. The user approved the palette and said to use the recommended values (page orange `#FF531B`, light blue `#B9E2F5`, brand blue `#3069B8` from the logo as outline color, logo orange `#F05B41` only inside the logo artwork). Ratio and base hues come from the user's nôm reference; hex values sampled from its pixels.

**The 60 / 30 / 10 rule (LOCKED by user):**
| Share | Role | Color | Hex | Source |
|-------|------|-------|-----|--------|
| 60% | Orange: dominant section backgrounds, giant type, buttons, price pills | Tangerine-red orange | `#FF531B` | sampled from nôm wordmark and pills |
| 30% | Yellow: secondary backgrounds, cards, panels | Pale lemon | `#F6F396` | sampled from nôm background |
| 10% | Light blue: accents only (stickers, chips, one card in a grid, highlights) | Sky/powder blue | `#B9E2F5` (proposed) | nôm's cool tint was mint `#C9E7DC`; the user said light blue, so we shift it to blue. Confirm. |

**Support colors (do not count toward the 60/30/10, keep tiny):**
- Ink: near-black navy/brown `#1B1A2E` (proposed) for outlines, body text, hard drop shadows
- Cream `#FFF8E7` (proposed) for card surfaces and legibility
- Sticker pink `#FFDAEF` (sampled from the nôm sticker), used only as a small sticker color, optional
- Bear red cap `#E8332A` (proposed) appears only on the mascot

**New flag from the user's own references (to confirm):** their blob and frame backgrounds use a more saturated sky blue (`#8BBEE9` sampled) and yellow `#FED602`. Proposal: change the locked 10% light blue from `#B9E2F5` to `#8BBEE9` so it matches what the user actually picked; keep the 30% pale-lemon `#F6F396` for large areas and use `#FED602` only for small high-energy accents (stickers, buttons). Also add a category-tint system for menu sections (the PDF tints each category differently: the boba and dessert cards are pastel brown / green / purple / pink); under the 60/30/10 rule these tints live only inside card interiors.

**Open points to confirm with the user:**
1. RESOLVED by the supplied logo: the official logo is orange `#F05B41` + brand blue `#3069B8` + yellow `#F7CA5B`, and it stays exactly as designed. Brand blue becomes the outline/ink-accent color (stickers, card outlines, small headings), used in small doses so the 10% light-blue budget holds. Sub-question: should page backgrounds use the nôm orange `#FF531B` (more electric) or the logo orange `#F05B41` (softer)? Recommendation: `#FF531B` for big backgrounds, `#F05B41` only inside the logo artwork.
2. RESOLVED: the palette is approved as is; mockups are layout references only, not color references.
3. Contrast: orange on yellow and cream text on orange must pass AA at body sizes; body text will be ink, headline type may be orange on yellow because it is 40px+ (large text).

**Secondary/Accent:** light blue (10%) plus the sticker pink, used sparingly
**Background Strategy:** _To be defined (dark mode? light mode? both? gradient?)_
**Korean Color Story:** _How colors tie to the Korean identity_

---

## 3. Typography `[PARTIAL]`

### Questions to Ask User

- Do you want Hangul (Korean script) as a decorative element, or only English?
- Should headings feel hand-drawn/brush-like, geometric/modern, or serif/elegant?
- Any existing fonts in use for MOBA branding?
- How important is readability vs. style? (Menu must be readable, but headers can be wild)
- Do you like the look of any of these styles:
  - Brush/calligraphy style (traditional Korean feel)
  - Chunky/rounded (playful, bubble-tea shop vibe)
  - Sharp/geometric (modern Seoul street style)
  - Handwritten/quirky (indie cafe feel)

### Direction

**Reference font (user's pick):** "Mocha Mochi" by Afkari Studio: ultra-fat, bubbly, uppercase-only display face with wobbly rounded counters (`assets/references/font-reference-mocha-mochi.jpg`). I could not confirm its seller or license online, so we cannot self-host it yet. This replaces the "heavy condensed + hard shadow" look of the mockups.

**Display Font (Headings): Bagel Fat One** (Google Fonts, free, open license). Chosen from a side-by-side test (`assets/references/font-candidates-comparison.png`) against Modak, Chango, Rubik Bubbles, Gasoek One and Climate Crisis: it is the closest to Mocha Mochi's fat rounded shapes, and it is the only candidate whose Hangul matches the Latin weight and style (모바 떡볶이 render as bold bubbly glyphs, the others fall back to thin default Korean). It also includes ₹. Use uppercase for headings, as Mocha Mochi does.
**Accent Font (Decorative Hangul):** Bagel Fat One as well, so Hangul stickers and giant background Hangul look like part of the same brand.
**Body Font (descriptions, tags):** proposed **Jua** (Google Fonts, rounded, includes Hangul) for chips, labels and short descriptions; fallback Noto Sans KR. To confirm after seeing it in the real layout.
**Price font:** Bagel Fat One, inside orange pills (₹ glyph included).
**Type Scale:** to define (mobile-first; headlines are giant, 56-120px, often cropped by the viewport edge like the nôm and Nooch references; body 15-17px).
**Font Pairing Logic:** one fat bubbly voice for everything loud (headings, prices, Hangul stickers) and one friendly rounded voice for reading; no third font.

**Technical notes:**
- Bagel Fat One's full TTF is about 1.5 MB (the Hangul set is large). Production must subset it to Latin + digits + ₹ + only the Hangul syllables actually used (a few dozen), as WOFF2, which should come to roughly 20-50 KB. Do this in the build step, not at runtime.
- Self-host the fonts (no Google Fonts request on a QR scan over mobile data), `font-display: swap`, preload the display font.
- If the client insists on the exact Mocha Mochi shapes, they must buy a web/app license from the seller; confirm it supports embedding on a website. Until then Bagel Fat One is the production font.

### Recommended Font Sources
- Google Fonts (free, web-optimized)
- Adobe Fonts (if client has Creative Cloud)
- Noto Sans KR / Noto Serif KR (excellent Korean + Latin support)
- Custom display fonts from foundries like TypeType, Klim, or free alternatives

---

## 4. Illustration & Graphic Style `[PENDING]`

### Questions to Ask User

- What illustration style appeals to you:
  - **Flat vector** — clean, Slack/Notion-like
  - **Hand-drawn/doodle** — sketchy, imperfect, warm
  - **Kawaii/cute** — big eyes, rounded, playful characters
  - **Street art/graffiti** — bold, urban, Seoul alley walls
  - **Retro/vintage** — old Korean movie poster style
  - **Abstract/geometric** — shapes, patterns, modern art
  - **Mixed media** — combine illustration with photography
- Should there be a mascot or character? (e.g., a little Korean chef, a dancing kimchi jar, a cool cat in hanbok)
- What Korean motifs should appear? (e.g., clouds/mists, waves, taegeuk patterns, hanji paper textures, ceramic patterns, street signs)
- Should food items be illustrated, photographed, or both?
- Do you want background illustrations (e.g., a street scene, a kitchen, abstract patterns)?

### Direction

**Primary Illustration Style:** Kawaii-cartoon with thick dark outlines and flat fills (matches the bear), plus doodle accents (sparkles, speed lines, hand-drawn arrows, speech bubbles, stickers).
**Mascot/Character:** YES, animated star. The bear (white, red cap) appears on every screen and reacts to taps. Needs a pose sheet: eating noodles, holding chicken, waving, celebrating, sleepy/idle, pointing, chili-sweating (for spice), shrugging.
**Korean Motifs:** Flower-seal emblem, Hangul labels/giant bg type; cloud/wave/bojagi not decided (see section 8).
**Food Representation:** Hybrid: photographic hero bowls (placeholder = mockup shots) on flat color sets, with illustrated stickers/doodles around.
**Background Treatment:** _What goes behind the menu content_

### Asset Creation Plan
- **What to create:** _List of needed illustrations_
- **How to create:** _AI generation (Midjourney/DALL-E prompts), manual SVG, sourced from libraries_
- **Prompt templates:** _For AI-generated assets_
- **SVG libraries to source from:** _Specific sources_

---

## 5. Animation & Motion Design `[PENDING]`

### Questions to Ask User

- How animated should the experience be? Scale of 1-5:
  1. Subtle — gentle fades, smooth scrolls
  2. Moderate — hover effects, page transitions
  3. Energetic — scroll-triggered reveals, playful micro-interactions
  4. Dynamic — parallax, morphing shapes, continuous motion
  5. Maximum — everything moves, immersive experience
- What kind of entrance animations for menu items?
  - Fade in, slide up, bounce, flip, stagger, pop
- Should there be ambient background animation? (floating illustrations, particles, subtle movement)
- Any specific interactions you've seen and loved? (Pull references from sites you like)
- Should animations be continuous or triggered by user action?
- How do you feel about sound? (tap sounds, ambient music — or silent?)

### Direction

**Animation Level:** 4 - Dynamic (LOCKED).
**Sound:** None (LOCKED). Silent experience; the bear reacts visually when a dish is tapped (munch, wiggle, sweat from spice). Remaining to ask: entrance style, splash concept, exact bear reactions, reduced-motion fallback.
**Entrance Animations:** _How elements appear_
**Scroll Behavior:** _What happens as user scrolls_
**Micro-interactions:** _Button hovers, taps, toggles_
**Background Animation:** _Ambient motion strategy_
**Page Transitions:** _How pages/sections change_
**Performance Budget:** _Max animation weight for mobile_

### Animation Tooling Decision
- **CSS Animations:** For simple transitions and hover states
- **GSAP (GreenSock):** For complex timelines, scroll-triggered animations, morphing
- **Framer Motion:** For React-based declarative animations
- **Lottie:** For complex vector animations exported from After Effects
- **Custom SVG animation:** For illustrated elements with path animation

---

## 5A. Signature Scroll Story: "The Noodle Thread" `[PROPOSED - wireframed]`

**Prototype:** `wireframes/home.html` (serve with the `wireframes` launch config, open `/wireframes/home.html`, scroll). The wireframe stays greyscale; the noodle is the only colour so its role reads clearly.

### The idea in one line
One noodle lies across the headline, finds its way down the page and lands in the pot. Everything on the home page is connected by that single strand, which is the brand line ("gather for food": everything comes together in one bowl) turned into motion.

### Why this beats the old travelling bowl
- The bowl was a solid object floating over content: clumsy, covered text, no story. A **line** reads as a guide, not an obstacle: it leads the eye down the page and frames sections instead of covering them.
- It gives the home page **one hero animation** in place of three competing ones (travelling bowl, exploded bowl, collage).
- It ends at a clear payoff (the pot fills up) and hands off straight to "See all Rameyon", so the animation sells a dish.
- **Rameyon instead of Rabokki:** a single noodle pulled from a pot IS ramyeon; Rabokki needs tteok to make sense. Rabokki stays the headline item on the menu page's Signatures category.

### Story beats (scroll order)
| # | Where | What happens | Layer |
|---|-------|--------------|-------|
| 1 | Hero headline | On load the noodle draws itself (2.2 s) ON TOP of the letters: it rests across the top of GATHER with a gentle wave, curls in a loop over the R, then hangs down to the right of FOR FOOD, clear of the paragraph and buttons. A hand-drawn arrow under the CTAs says "scroll to slurp" (RamenChick arrow doodle). On scroll it runs down past the TV (mobile: right edge; desktop: the gap between headline and TV). The TV is a supporting element, not the origin | over letters |
| 2 | Pojangmacha stall | The strand swings to the right edge and drapes over the stall's awning like a hanging bulb wire | over stall |
| 3 | Marquee | Crosses the dark marquee band diagonally, right to left: the most graphic moment, cream on near-black | over marquee |
| 4 | Menu CTA card | Runs down the left gutter and **tucks behind** the card (the card sits above the noodle), so it reads as depth / weaving, never covers the CTA | under card |
| 5 | Rameyon stage | On an empty stage below the heading the strand does 4 big horizontal S-bends: the **blue poster shape**, at full size, the money shot | open stage |
| 6 | The pot | Drops into the pot. Landing sequence (scrubbed): pot squash and stretch, noodle pile rises, toppings fly in and gather (tofu, kimchi, soft egg, bok choy, scallion rings), flat steel chopsticks land across the rim, steam draws upward, sparkles, "후루룩" (huruk, the Korean slurp word) sticker pops, "₹339 every bowl" seal stamps in | pot front over noodle |

Scrolling back up retracts the noodle to the headline ("slurps it back"); the headline drape always stays; the landing rewinds too.

### Visual spec
**Noodle stroke** (one path drawn four times with the same geometry):
| Layer | Colour | Width (mobile / desktop) | Note |
|-------|--------|--------------------------|------|
| Hard shadow | Ink `#1B1A2E` at 16% | W+7, offset 5,8 px | brand hard drop shadow, done as a stroke, no CSS filters |
| Outline | Ink `#1B1A2E` | W+7 | ties it to the bear / pot illustration style; keeps contrast on pale yellow |
| Body | Cooked wheat `#F4D27F` | **W = 22 / 34 px** | fat like the poster; round caps, so the tip is a round noodle end |
| Shine | Cream `#FFF3D1` | 0.24 W, offset up-left | one light direction for the whole page |

Colour reasoning: a pure cream noodle disappears on the 30% pale-lemon `#F6F396` areas; cooked wheat plus an ink outline holds on orange `#FF531B`, yellow, cream and the dark marquee.

**Two styles to choose from:**
- **A. Outlined kawaii (recommended, built):** ink outline + shine; matches the bear and the RamenChick-style pot.
- **B. Pure poster:** no outline, flat solid wheat, wider (W = 30 / 48). More graphic and modern, but weaker on yellow sections.

**The pot:** Korean **yellow nickel ramyeon pot (양은냄비)** with side handles and a couple of dents, not a Japanese ceramic bowl. It is THE icon of Korean ramyeon (eaten straight from the pot, lid as a plate) and separates MOBA from ramen-shop clichés. Final art: thick ink outline, flat fills, yellow `#FED602` pot, broth orange-red. Toppings only from the real menu: tofu / paneer / chicken / fish, soft egg (Extra Rameyon Egg), kimchi (Kimchi on the Side), bok choy, shiitake, scallions. **No pork chashu or narutomaki** (not on the menu, and Japanese).

**Layering trick that makes it "fall in":** the pot is two SVGs. The *back* half (rim + broth) sits under the noodle; the *front* half (pile, toppings, body, handles, chopsticks) sits over it. So the strand is seen dropping over the back rim into the broth and then disappears behind the front wall.

**Path rules (so it never fights the content):**
- Long vertical runs live in the **side gutters** (they can bleed off-canvas, like the cropped giant type).
- Horizontal crossings happen only **in gaps between sections** or over decorative bands (marquee), never over headings or body copy.
- Cards and headings that must stay clean are lifted above the noodle (`.over`); decorative art sits under it.
- The S-bends only happen on the empty Rameyon stage.

### Motion spec
- **Library:** GSAP 3 + ScrollTrigger (free; self-host in production).
- **Drawing:** `stroke-dasharray` / `stroke-dashoffset` on the four strands. Animating dashoffset only repaints; no layout.
- **Tip follows the eye:** we precompute a lookup table (path length vs. y) and draw exactly enough noodle for the tip to sit at **62% of the viewport height**. So the tip moves at reading speed whether the path is running vertically or sweeping sideways. (A plain linear scrub would race across horizontal bends and crawl on vertical runs.)
- **Feel:** `gsap.quickTo` with 0.55 s `power3.out` lag, so the noodle trails your thumb slightly, which feels elastic and wet without real physics.
- **Path is generated, not hand-drawn:** built at runtime from invisible marker elements (`.nd`, each with `data-x` mobile / `data-xd` desktop as a fraction of viewport width) plus the stage and pot positions. Copy changes, font loading and resizing just rebuild it. Rebuild on `document.fonts.ready` and on width-only resizes (ignore iOS address-bar height changes).
- **Curve maths:** between markers, cubic curves with vertical tangents (the strand hangs and swoops); on the stage, horizontal-tangent U-bends (both control points on the far side), which reproduce the poster's lens-shaped loops and chain smoothly.
- **Landing:** one ScrollTrigger timeline, scrubbed (0.6) over the 40% of viewport height after the tip reaches the pot mouth. **No pinning**: pinning would detach the document-space strand from a pinned pot, and keeping the page free-scrolling keeps "View Menu" reachable.
- **Intro:** on load the strand writes itself over the headline (2.2 s, power2.inOut), then scroll takes over. The headline drape is built from the real line boxes of "GATHER" and "FOR FOOD" (DOM Range rects), so it sits on the letters at any size.

### Accessibility & performance
- `aria-hidden` on the whole layer; it carries no information.
- `prefers-reduced-motion`: the noodle is drawn complete and static and the pot shows full. (Option to discuss: show only the stage S-bends + pot and hide the page-long strand.)
- One SVG, four paths, no filters, no blur: fine for mid-range Android at 60 fps. Lookup sampling every 4 px runs once per rebuild.
- Never block scrolling, never hijack scroll speed.

### Assets to produce
1. Noodle stroke: no asset, it is code (colours and widths above).
2. Ramyeon pot illustration as **two SVG layers** (back: rim + broth; front: pile, body, handles), plus each topping as its own SVG group so it can fly in.
3. Flat steel chopsticks (+ optional long Korean spoon).
4. "후루룩" sticker and the "₹339 every bowl" seal, set in Bagel Fat One.
5. Headline drape: no asset, generated from the headline's text boxes at runtime (it re-fits if the font or copy changes).
6. Hand-drawn "scroll to slurp" arrow.

### Open questions for the user
1. Noodle style A (outlined, recommended) or B (pure poster)?
2. ~~Start point~~ **Decided:** draped over "GATHER FOR FOOD" (curl over the R).
3. Pot: yellow nickel pot (recommended) or a ceramic bowl like the RamenChick reference?
4. Keep the "후루룩" slurp sticker? (Bear: out of scope for now, user decision.)
5. Rameyon section copy: "Slurp-worthy · every bowl ₹339" + "Seven bowls, one price" (from the PDF) OK?

---

## 6. Layout & Composition `[PENDING]`

### Questions to Ask User

- How should the menu be organized:
  - **Single long scroll** — everything on one page, scroll through categories
  - **Tabbed categories** — tap to switch between Korean BBQ, Noodles, Drinks, etc.
  - **Card-based grid** — Pinterest/Instagram-style grid of dishes
  - **Immersive full-screen** — one dish at a time, swipe through
  - **Hybrid** — combine approaches
- Should there be a hero/splash screen before the menu? (brand moment, animation intro)
- How dense should the menu feel? Spacious and airy vs. packed and energetic?
- Do you want a sticky navigation? Floating cart? Bottom tab bar?

### Direction

**Flow (proposed, to approve with wireframes):** Loader (cheese pull) -> Gather scene (hands + cutlery + dishes around the logo, bear, "VIEW MENU") -> Menu home (12 category cards) -> Category page -> Dish bottom sheet. Optional small game on the gather/loader step.
**Dish detail (LOCKED):** bottom sheet.
**Spice display:** 3 levels only (Mild, Hot, Very Hot, plus an Extra Hot flavour badge on Buldak). See `menu-structure.md`.
**Menu Structure:** Browse-only (no cart, ordering or backend). Splash, then a home grid of category cards, each opening a category page. 12 categories (see `menu-structure.md`).
**Navigation Pattern:** Category cards grid (two-column staggered, each card its own solid color, like the "My Spots" reference) with a shared-element transition into the category page.
**Hero/Splash:** YES, modelled on the "MOBA / Gather for food / Explore Menu" mockup: dishes around the logo, bear, red hand-drawn CTA pill. Concept to detail with the user.
**Density:** _Spacious vs. dense_
**Mobile Gestures:** _Swipe, pull, tap behavior_

---

## 7. Photography Direction `[PENDING]`

### Questions to Ask User

- Do you have professional food photos already?
- If not, will you shoot new ones? (We can provide a shot list and styling guide)
- What style of food photography:
  - **Overhead flat-lay** — Instagram-popular, shows the full spread
  - **45-degree angle** — classic restaurant menu angle
  - **Close-up/macro** — texture-focused, appetizing details
  - **Lifestyle/context** — food on table with hands, chopsticks, atmosphere
  - **Styled editorial** — art-directed, high fashion food
- Should photos have a consistent filter/treatment? (warm, cool, high-contrast, matte, film grain)
- Any Korean food styling cues? (banchan spread, sizzling stone bowls, steam rising)

### Direction

**Photo Source:** Mockup shots as placeholders now, swap for final real or regenerated shots later (so every image slot must be a replaceable, cut-out PNG/WebP).
**Style:** _To be defined_
**Treatment/Filter:** _Consistent post-processing_
**Shot List:** _If new photos needed_

---

## 8. Korean Vibe Specifics `[PENDING]`

### Questions to Ask User

- What era/style of Korean culture to channel:
  - **Modern Seoul** — neon signs, Gangnam style, tech-forward
  - **Traditional** — hanbok patterns, celadon ceramics, temple calm
  - **Street food** — pojangmacha (tent bars), market chaos, soju bottles
  - **K-pop/K-drama** — high energy, colorful, dramatic
  - **Vintage/retro** — 70s-80s Korean signage, old movie posters
  - **Fusion** — mix traditional with modern pop
- Should Hangul appear as:
  - Decorative background texture
  - Category headers (with English translations)
  - Random floating characters (aesthetic)
  - Not at all
- Any specific Korean design elements:
  - Neon signs (Korean street style)
  - Hanji (traditional paper) textures
  - Bojagi (patchwork fabric) patterns
  - Ceramic/porcelain patterns
  - Wave and cloud motifs
  - Taegeuk (yin-yang) inspired shapes

### Direction

**Korean Era/Style:** Modern Seoul street-pop (LOCKED): K-snack-packaging energy, not traditional.
**Hangul Usage:** Sticker labels and bilingual headings (e.g. SPICE GUIDE 매운맛 단계), giant background Hangul type. English-only content (LOCKED).
**Cultural Elements:** _Which to use and where_
**How Far to Push It:** _Subtle nods vs. full immersion_

---

## 9. Reference Sites & Inspiration `[PENDING]`

### Questions to Ask User

- From the Mana Yerba Mate site, what specifically do you love? (animations? colors? layout? vibe?)
- List 3-5 other websites whose design you admire (doesn't have to be restaurants)
- Any websites whose design you HATE? (helps define boundaries)
- Show me any Pinterest boards, Instagram accounts, or design references you've saved

### Direction

**Love List:** _Sites/designs to draw from_
**Hate List:** _What to avoid_
**Specific Elements to Reference:** _Exact things to emulate_

### Reference Site Analysis
_Agent will analyze provided reference sites and extract:_
- Color patterns
- Animation techniques
- Layout strategies
- Typography choices
- Illustration styles
- Interaction patterns

---

## 10. Content & Menu Structure `[PENDING]`

### Questions to Ask User

- How many menu categories? List them all
- Approximate number of items per category?
- Does each item need: photo, description, price, spice level, dietary tags, allergens?
- Any special sections? (Chef's specials, seasonal items, drinks, desserts)
- Do you want item customization on the menu? (spice level selector, add-ons)
- Multiple languages? (English + Korean?)
- Do prices change? How often is the menu updated?

### Direction

**Categories:** Seen in mockups: Rameyon (라면), Tteokbokki (떡볶이), Jjajangmyeon (짜장면), Korean Fried Chicken (치킨), Bibimbap (비빔밥), Gimbap (김밥), plus Add-ons. Full list + all items/prices still to collect from the user.
**Item Format:** _What each menu item shows_
**Special Sections:** _Any unique sections_
**Language:** _Single or multi-language_
**Update Frequency:** _How the menu data is managed_

---

## Visual Direction Summary `[PENDING]`

> This section is filled after all above sections are locked.

**One-line creative brief:** _To be defined_

**Mood in 5 words:** _To be defined_

**If MOBA's menu were a movie, it would be:** _To be defined_

**The customer should feel:** _To be defined_

---

## Sign-Off

- [ ] Brand identity locked
- [ ] Color palette locked
- [ ] Typography locked
- [ ] Illustration style locked
- [ ] Animation level locked
- [ ] Layout structure locked
- [ ] Photography direction locked
- [ ] Korean vibe specifics locked
- [ ] References analyzed
- [ ] Menu content structure defined
- [ ] Client approved visual direction

**Status:** `NOT STARTED` | `IN PROGRESS` | `LOCKED & APPROVED`
