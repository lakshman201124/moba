# MOBA - Digital Menu Project

## Project Overview

**MOBA** (Moida + Bob) is a Korean-based resto-cafe. This project is a **QR-based, mobile-first digital menu** that customers scan at their table to browse the menu, see dishes, and place orders.

The client wants a **funky, playful, award-winning agency-level** website that captures the **Korean vibe** and attracts customers through sheer creative energy. Reference sites include Mana Yerba Mate and similar playful, animated food/beverage brand sites.

---

## Update (Oct 2026): what the brief really is

- **Not a standard website.** It is an animated, mobile-first experience built on the name's meaning: MOBA = 모으다 (to gather) + 밥 (shared meal), tagline **"Gather for food"**. It opens with a scene of people (hands, cutlery, the bear) gathering around dishes, then **View Menu**, then the menu. A small optional game is being considered (the user will share a reference link).
- **Order of work (user decision): design first, animation later.** Wireframes, layouts, backgrounds, category cards and the dish bottom sheet are designed and approved visually before any motion is built. The user approves from visual mockups, so the approach is show-then-decide.
- **Real content exists:** `assets/moba-branding/Moba menu dump Aug 2026.pdf` (14 pages, 12 categories, about 123 items, INR). Mapped in [menu-structure.md](menu-structure.md).
- **Locked so far:** palette 60% orange / 30% yellow / 10% light blue (blue to be re-confirmed), Bagel Fat One display type, animated bear mascot, silent experience, bottom-sheet dish detail, browse-only, English with Hangul accents. See [visual-direction.md](visual-direction.md) for the full Q&A log.

---

## Source of Truth

> The front-end must be **100% creative, funky, and playful**. It must attract customers. This is award-winning agency-level work — not a generic restaurant template. Every pixel, animation, and interaction must feel intentional, Korean-inflected, and delightful.

---

## Project Structure

```
mobaa/
├── project.md                    # This file - master project overview
├── visual-direction.md           # Visual identity, design system, creative direction
├── implementation.md             # Technical implementation plan, step-by-step build
├── assets/                       # Client-provided assets (logos, photos, references)
│   ├── references/               # Reference site screenshots, mood boards
│   ├── branding/                 # Logo, brand marks, color swatches
│   ├── photos/                   # Food photography, cafe photos
│   └── illustrations/            # Custom illustrations, SVGs
├── src/                          # Source code
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page-level components
│   ├── styles/                   # Global styles, CSS variables, animations
│   ├── assets/                   # Compiled/optimized assets
│   ├── animations/               # Animation configs, Lottie files, GSAP timelines
│   └── data/                     # Menu data (JSON/API)
├── public/                       # Static files
└── package.json
```

---

## What We Are Building

### Core Product: QR-Based Mobile Digital Menu

1. **QR Code Entry** — Customer scans a QR code at the table
2. **Mobile-First Menu** — Responsive, touch-optimized menu experience
3. **Category Browsing** — Korean food categories with playful navigation
4. **Dish Detail Views** — Each dish with photo, description, price, spice level, dietary tags
5. **Cart & Order Summary** — Simple add-to-cart with order review (optional, depends on client needs)

### Design Goals

- Korean-inspired visual identity (Hangul typography accents, traditional color palettes remixed with modern pop)
- Funky, playful interactions (micro-animations, scroll effects, hover states)
- Award-winning level polish (smooth transitions, creative layouts, unexpected delights)
- Fast, accessible, works on all phones

---

## Project Phases

### Phase 0: Asset Collection & Creative Brief
- Collect all client assets (logo, photos, brand guidelines)
- Gather reference sites and mood boards
- Define what the client loves and hates
- **Output:** Populated `assets/` folder, filled `visual-direction.md`

### Phase 1: Visual Direction (see [visual-direction.md](visual-direction.md))
- Establish the full creative direction through structured Q&A with the user
- Define color palette, typography, illustration style, animation philosophy
- Create mood boards and visual reference sheets
- Define the "personality" of the menu
- **Output:** Complete `visual-direction.md` with all creative decisions locked

### Phase 2: Implementation Planning (see [implementation.md](implementation.md))
- Technical stack decisions
- Component architecture
- Animation strategy (GSAP, Framer Motion, Lottie, CSS)
- Asset pipeline (where to source/create illustrations, SVGs, photos)
- AI image generation prompts for custom assets
- Claude Code skills and MCP servers to leverage
- **Output:** Complete `implementation.md` with step-by-step build plan

### Phase 3: Design & Prototype
- Build the design system (tokens, components, spacing, typography scale)
- Create key screen mockups in Figma or as HTML prototypes
- User testing of navigation flow
- Client sign-off on visual direction
- **Output:** Approved design mockups

### Phase 4: Development
- Set up project (Next.js / Astro / Vite — decided in implementation plan)
- Build component library
- Implement animations and interactions
- Integrate menu data
- Mobile-first responsive implementation
- **Output:** Working digital menu

### Phase 5: Polish & Launch
- Performance optimization (target: Lighthouse 95+)
- Cross-browser/device testing
- QR code generation and table card design
- Domain setup and deployment
- **Output:** Live, production-ready digital menu

---

## Key Files

| File | Purpose |
|------|---------|
| [project.md](project.md) | Master overview (this file) |
| [visual-direction.md](visual-direction.md) | Creative direction — colors, type, illustration, animation, vibe |
| [implementation.md](implementation.md) | Technical plan — stack, components, asset pipeline, build steps |
| [moodboard/index.html](moodboard/index.html) | Visual moodboard: 117 references (your folder, print menu, 65 researched). Open in a browser, heart favourites, copy picks. Rebuild with `moodboard/_source/build_moodboard.py` |
| [menu-structure.md](menu-structure.md) | Real menu: 12 categories, ~123 items, option patterns, data model, content issues |

---

## Client Requirements Summary

- **Business:** MOBA (Moida + Bob), Korean resto-cafe
- **Product:** QR-based digital menu for in-restaurant use
- **Audience:** Diners at the restaurant (all ages, mobile users)
- **Vibe:** Funky, playful, Korean-inspired, modern, award-winning
- **Platform:** Mobile-first web (accessed via QR code)
- **References:** Mana Yerba Mate and similar creative food brand sites
- **Non-negotiables:** Must feel Korean, must be playful, must attract and delight customers

---

## Next Steps

1. **User provides assets** — Logo, brand colors, food photos, any existing materials
2. **Visual Direction Q&A** — Work through `visual-direction.md` to lock creative decisions
3. **Implementation plan** — Finalize tech stack and build strategy
4. **Build** — Execute the plan phase by phase
