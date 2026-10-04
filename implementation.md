# MOBA - Implementation Plan

> This document is the technical blueprint for building MOBA's digital menu. It is created AFTER `visual-direction.md` is locked. Every decision here serves the creative direction defined there.

**Prerequisite:** [visual-direction.md](visual-direction.md) must be `LOCKED & APPROVED` before this plan is finalized.

---

## 1. Tech Stack

### Framework Decision

| Option | Why It Fits | Trade-off |
|--------|-------------|-----------|
| **Next.js 14+ (App Router)** | SSR for fast QR-scan load, React ecosystem, excellent animation library support | Heavier than needed for a menu |
| **Astro** | Ultra-fast static output, perfect for content-heavy menu, ships zero JS by default | Less animation library ecosystem |
| **Vite + React** | Lightweight SPA, fast dev, great for animation-heavy single-page menu | No SSR, slightly slower first load |

**Recommended:** _To be decided based on animation level from visual direction_
- Animation level 1-2 → Astro (speed wins)
- Animation level 3-5 → Next.js or Vite + React (animation ecosystem wins)

### Supporting Libraries

| Purpose | Library | Why |
|---------|---------|-----|
| **Animations** | GSAP + ScrollTrigger | Industry standard for complex scroll animations, timeline control, morphing |
| **Micro-interactions** | Framer Motion | Declarative React animations, gestures, layout animations |
| **Complex vector animation** | Lottie (lottie-web) | For After Effects exported animations (Korean illustrations, mascot) |
| **CSS** | Tailwind CSS + custom properties | Rapid development, design tokens, responsive utilities |
| **Icons** | Custom SVG set | Korean-themed, brand-specific icons |
| **Fonts** | Variable fonts via @font-face | Performance + design flexibility |
| **Data** | Static JSON / Headless CMS | Menu data management |
| **Deployment** | Vercel / Netlify / Cloudflare Pages | Edge-deployed, fast globally |

---

## 2. Asset Pipeline

### Where to Get/Create Each Asset Type

#### Illustrations & SVGs

| Asset Type | Source | How |
|------------|--------|-----|
| **Custom Korean illustrations** | AI Generation (Midjourney / DALL-E / Ideogram) | Generate with specific prompts (see Section 2.1), then vectorize in Figma or Illustrator |
| **Pattern/texture SVGs** | Create in Figma / SVG code | Hand-crafted geometric Korean patterns |
| **Icon set** | Custom SVG | Design in Figma, export as optimized SVG |
| **Background decorations** | Mix of AI + hand-drawn | Generate base in AI, refine in vector editor |
| **Animated illustrations** | Lottie (After Effects → Bodymovin) or GSAP path animation | For mascot, floating elements, loading states |
| **Hangul decorative elements** | Custom typography / SVG | Set specific Hangul characters as decorative art |

#### Photography

| Asset Type | Source | How |
|------------|--------|-----|
| **Food photos (if client has)** | Client-provided | Process through consistent filter pipeline |
| **Food photos (if needed)** | Professional shoot / AI generation | Shoot list from visual direction OR Midjourney food prompts |
| **Textures/backgrounds** | Unsplash / Pexels / AI generation | Korean-themed textures (paper, fabric, ceramic) |

#### Fonts

| Type | Recommended Source |
|------|-------------------|
| **Korean display** | Google Fonts (Noto Sans KR, Black Han Sans, Do Hyeon, Jua) |
| **English display** | Google Fonts or self-hosted (based on visual direction) |
| **Body text** | Google Fonts (Inter, DM Sans, or paired with Korean font) |

### 2.1 AI Image Generation Prompts

> These prompt templates will be finalized after visual direction is locked. Below are template structures.

**Korean Illustration Style Prompt Template:**
```
[style] illustration of [subject], Korean [era] inspired,
[color palette from visual direction], [mood],
flat vector style, clean lines, suitable for web SVG,
white/transparent background, --ar 1:1 --v 6
```

**Food Photography Prompt Template (if AI-generated):**
```
Professional food photography of [dish name],
Korean restaurant setting, [angle: overhead/45-degree/close-up],
[lighting: warm/natural/dramatic], [styling: banchan spread/stone bowl/wooden table],
appetizing, high detail, --ar 4:3 --v 6
```

**Background Texture Prompt Template:**
```
Seamless [texture type] pattern, Korean [element] inspired,
[colors from palette], subtle, tileable, digital art,
suitable for web background, --ar 1:1 --tile --v 6
```

**Mascot/Character Prompt Template (if needed):**
```
Cute [character description] character, Korean [style] design,
[brand colors], simple flat illustration, expressive,
multiple poses, character sheet, white background, --v 6
```

---

## 3. Claude Code Skills & MCP Servers to Use

### Recommended Claude Code Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `/frontend-design` | Frontend design patterns and creative direction | When building the component library and layouts |
| `/design-taste-frontend` | High-taste frontend design decisions | When making aesthetic choices in code |
| `/impeccable` | Award-winning quality visual builds | When building the final polished pages |
| Core 3D/Animation skills (`/gsap-scrolltrigger`, `/motion-framer`, `/threejs-webgl`) | Complex animations | When implementing scroll effects, transitions, and ambient animation |
| Animation component skills (`/animejs`, `/lottie-animations`, `/react-spring-physics`, `/scroll-reveal-libraries`) | Specific animation implementations | When building individual animated components |
| `/dataviz` | If any data visualization is needed | Menu popularity charts, spice level meters |
| `/artifact-design` | Design system for prototyping | When building quick prototypes to show client |
| `/code-review` | Quality assurance | Before each major milestone |

### MCP Servers & Tools

| Tool | Purpose | When |
|------|---------|------|
| **Figma MCP** | Design mockups, component design, design system | Phase 3 — design & prototype |
| **Browser (built-in)** | Preview and test the menu live | Throughout development |
| **Playwright** | Automated testing across viewports | Phase 5 — polish |
| **Context7** | Library documentation lookups | When implementing with GSAP, Framer Motion, etc. |

### External Tools for Asset Creation

| Tool | Purpose |
|------|---------|
| **Midjourney / DALL-E / Ideogram** | Generate Korean illustrations, food art, textures |
| **Figma** | Design system, component design, SVG creation |
| **SVG OMG** | Optimize SVGs for web |
| **Squoosh / Sharp** | Optimize photos for mobile (WebP, AVIF) |
| **LottieFiles** | Browse/create Lottie animations |
| **remove.bg** | Remove backgrounds from food photos |

---

## 4. Component Architecture

### Component Tree

```
<App>
├── <SplashScreen />           # Brand intro animation (if visual direction says yes)
├── <MenuShell>                # Main menu wrapper
│   ├── <Header />             # Logo, restaurant name, table number
│   ├── <CategoryNav />        # Horizontal scroll or tab navigation
│   ├── <MenuSection>          # One per category
│   │   ├── <SectionHeader />  # Category name with Korean accent
│   │   ├── <MenuItem />       # Individual dish card
│   │   │   ├── <FoodImage />  # Photo/illustration with lazy loading
│   │   │   ├── <ItemInfo />   # Name, description, tags
│   │   │   ├── <Price />      # Price with currency formatting
│   │   │   └── <AddButton />  # Add to order (if applicable)
│   │   └── ...
│   ├── <Cart />               # Floating cart summary (if applicable)
│   └── <Footer />             # Cafe info, social links
├── <BackgroundLayer />        # Ambient illustrations, patterns, animations
└── <TransitionLayer />        # Page transition overlays
```

### Key Components to Build

| Component | Complexity | Animation Level | Notes |
|-----------|-----------|-----------------|-------|
| `SplashScreen` | High | Heavy | Brand moment, sets the tone, Korean-themed intro |
| `CategoryNav` | Medium | Medium | Smooth scroll/tab switching with Korean category names |
| `MenuItem` | Medium | Medium | Staggered entrance, hover/tap effects |
| `FoodImage` | Medium | Low-Medium | Lazy load with blur-up, subtle parallax |
| `BackgroundLayer` | High | Heavy | Floating illustrations, ambient motion |
| `SectionHeader` | Low | Medium | Korean typography treatment, reveal animation |
| `Price` | Low | Low | Number animation on appear |
| `Cart` | Medium | Medium | Slide-up, count badge animation |

---

## 5. Animation Strategy

### Animation Layers

```
Layer 1: Background     — Ambient floating Korean illustrations, subtle patterns
Layer 2: Content Entry  — Staggered reveals, slide-ins, fades as items enter viewport
Layer 3: Interaction    — Hover effects, tap responses, button feedback
Layer 4: Navigation     — Page/section transitions, category switching
Layer 5: Special        — Splash screen, loading states, empty states
```

### Specific Animation Plans

| Element | Technique | Library | Description |
|---------|-----------|---------|-------------|
| Menu items entering viewport | Intersection Observer + stagger | GSAP ScrollTrigger | Items slide up and fade in with 100ms stagger delay |
| Category tab switch | Layout animation | Framer Motion | Smooth content crossfade with sliding indicator |
| Food images | Blur-up lazy load | CSS + JS | Low-res placeholder blurs into full image |
| Background illustrations | Continuous float | CSS keyframes | Korean motifs gently float and rotate |
| Add-to-cart button | Spring physics | Framer Motion | Bouncy scale + haptic-like feedback |
| Price display | Count-up | GSAP | Numbers animate from 0 to price on scroll-enter |
| Splash screen | Choreographed sequence | GSAP Timeline | Logo reveal → brand animation → menu entrance |
| Scroll progress | SVG path draw | GSAP DrawSVG | Korean-themed scroll progress indicator |
| Parallax backgrounds | Scroll-linked parallax | GSAP ScrollTrigger | Depth layers for background illustrations |

### Performance Budget

- **Total JS bundle (animations):** < 80KB gzipped
- **Largest Contentful Paint:** < 2.5s on 4G
- **First Input Delay:** < 100ms
- **Cumulative Layout Shift:** < 0.1
- **Animation frame rate:** 60fps minimum on mid-range phones
- **Prefer CSS animations** for simple transitions (cheaper than JS)
- **Use `will-change`** sparingly, only on animated elements
- **Lazy load** all below-fold images and non-critical animations

---

## 6. Step-by-Step Build Order

### Step 1: Project Setup
```
1.1  Initialize project (framework from Section 1)
1.2  Configure Tailwind CSS with custom design tokens
1.3  Set up font loading (Korean + English fonts)
1.4  Create CSS custom properties for colors, spacing, typography
1.5  Set up animation library (GSAP / Framer Motion)
1.6  Create folder structure
1.7  Set up linting, formatting
```

### Step 2: Design System & Tokens
```
2.1  Define color tokens (from visual direction palette)
2.2  Define typography scale (mobile-first)
2.3  Define spacing scale
2.4  Define border radius, shadows, effects
2.5  Create base component styles
2.6  Build utility classes for Korean-specific design patterns
```

### Step 3: Static Layout
```
3.1  Build MenuShell layout (mobile viewport)
3.2  Build Header with logo placement
3.3  Build CategoryNav (horizontal scroll or tabs)
3.4  Build MenuItem card (no animation yet)
3.5  Build SectionHeader with Korean typography
3.6  Build Footer
3.7  Test layout at all mobile widths (320px - 428px)
```

### Step 4: Content & Data
```
4.1  Structure menu data as JSON
4.2  Create category mappings (English + Korean names)
4.3  Add placeholder images (replaced with real assets later)
4.4  Implement dynamic rendering from data
4.5  Add dietary tags, spice levels, descriptions
```

### Step 5: Background & Illustration Layer
```
5.1  Create/source Korean-themed SVG illustrations
5.2  Build BackgroundLayer component
5.3  Position floating illustrations
5.4  Add ambient CSS animations (float, rotate, drift)
5.5  Optimize SVGs (SVGO, remove unnecessary paths)
5.6  Test performance with background animations
```

### Step 6: Entrance & Scroll Animations
```
6.1  Set up GSAP ScrollTrigger
6.2  Add staggered entrance for MenuItem components
6.3  Add SectionHeader reveal animations
6.4  Add FoodImage blur-up loading
6.5  Test scroll performance on real devices
```

### Step 7: Interaction Animations
```
7.1  Add hover/tap effects to MenuItem cards
7.2  Add button press animations (AddButton, CategoryNav)
7.3  Add category switch transition
7.4  Add micro-interactions (toggles, tags, badges)
```

### Step 8: Splash Screen & Transitions
```
8.1  Design splash screen animation concept
8.2  Build GSAP timeline for splash sequence
8.3  Add page/section transition animations
8.4  Add loading skeleton states
```

### Step 9: Real Assets Integration
```
9.1  Replace placeholder images with real food photos
9.2  Optimize all images (WebP/AVIF, responsive sizes)
9.3  Integrate final illustrations and SVGs
9.4  Load custom Lottie animations (if any)
9.5  Final font loading optimization
```

### Step 10: Polish & QA
```
10.1  Cross-browser testing (Chrome, Safari, Samsung Internet, Firefox)
10.2  Cross-device testing (iPhone SE → iPhone 15 Pro Max, popular Android)
10.3  Lighthouse audit (target: Performance 95+, Accessibility 100)
10.4  Animation performance profiling (Chrome DevTools)
10.5  Reduce motion media query (accessibility)
10.6  Dark mode testing (if applicable)
10.7  QR code generation and testing
10.8  Real-world test: scan QR → load menu → browse → order flow
```

### Step 11: Deploy
```
11.1  Set up deployment (Vercel/Netlify/Cloudflare Pages)
11.2  Configure custom domain
11.3  Set up CDN for assets
11.4  Generate production QR codes
11.5  Design table cards / standees with QR code
11.6  Go live
```

---

## 7. SVG & Illustration Sourcing Guide

### Free SVG Sources for Korean-Themed Elements

| Source | What to Get | URL |
|--------|------------|-----|
| **Undraw** | General illustrations (customize colors) | undraw.co |
| **Humaaans** | People illustrations | humaaans.com |
| **SVG Repo** | Icons and simple SVGs | svgrepo.com |
| **Heroicons / Lucide** | UI icons | heroicons.com / lucide.dev |
| **Pattern Monster** | Seamless patterns | pattern.monster |
| **Haikei** | SVG background generators (waves, blobs) | haikei.app |
| **BGJar** | Background SVG patterns | bgjar.com |
| **Blobmaker** | Organic blob shapes | blobmaker.app |

### Custom Korean Elements to Create

| Element | Method | Notes |
|---------|--------|-------|
| Korean cloud motifs (구름) | SVG path by hand or AI | Traditional cloud shapes used in Korean art |
| Wave patterns (파도) | SVG pattern generator + hand edit | Korean wave motifs (different from Japanese) |
| Taegeuk-inspired shapes | Custom SVG | Abstract interpretation, not literal flag |
| Neon sign effect | CSS + SVG filter | Korean street sign aesthetic |
| Hanji texture | Background image (WebP) | Traditional paper texture overlay |
| Banchan arrangement | Illustrated SVG set | Small side dish bowl illustrations |
| Chopstick dividers | SVG | Decorative section dividers |
| Steam/smoke effects | CSS animation + SVG | Rising from hot dishes |

---

## 8. Mobile-Specific Considerations

### Touch Interactions
- Minimum tap target: 44x44px
- Swipe gestures for category navigation
- Pull-to-refresh for menu updates
- Long-press for item details (optional)
- No hover-dependent functionality (mobile has no hover)

### Performance on Mobile
- Service worker for offline menu viewing
- Preload critical fonts and hero images
- Defer non-critical animations until after LCP
- Use `content-visibility: auto` for off-screen sections
- Compress all assets for 4G speeds

### QR Code Flow
```
Customer scans QR → 
  Browser opens → 
    Splash screen (< 2s) → 
      Menu loads → 
        Category view → 
          Browse & enjoy
```

---

## 9. Deployment & Hosting

### Recommended: Vercel
- Edge deployment (fast globally)
- Automatic preview deployments
- Built-in analytics
- Easy custom domain setup
- Free tier is sufficient for a restaurant menu

### QR Code Strategy
- Generate unique QR codes per table (optional table number pass-through)
- QR points to: `https://menu.moba.cafe` or `https://moba.cafe/menu`
- Design QR code with brand colors and logo center
- Test on 10+ phones before printing
- Physical: table standees, laminated cards, stickers

---

## 10. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Page load (QR scan to menu visible) | < 3 seconds on 4G | Lighthouse, WebPageTest |
| Lighthouse Performance | 95+ | Chrome DevTools |
| Lighthouse Accessibility | 100 | Chrome DevTools |
| Animation frame rate | 60fps | Chrome DevTools Performance tab |
| Customer engagement | Average session > 2 min | Analytics |
| "Wow factor" | Client says "this is amazing" | Client feedback |

---

## Implementation Status

- [ ] Tech stack finalized
- [ ] Project initialized
- [ ] Design system built
- [ ] Static layout complete
- [ ] Data structured
- [ ] Background layer complete
- [ ] Animations implemented
- [ ] Real assets integrated
- [ ] QA complete
- [ ] Deployed
- [ ] QR codes printed

**Current Phase:** `NOT STARTED`
