# Wok & Flame menu: full code export

Exact copies of the files as they exist now.

## menu/index.html

````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F5EEDF">
  <title>Menu · Wok &amp; Flame</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600&family=Gochi+Hand&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="menu.css?v=2">
  <script>if (/[?&]from=splash/.test(location.search)) document.documentElement.classList.add("from-splash");</script>
</head>
<body>

  <!-- Line art. Food drawings are cloned inline by menu.js so their parts can be styled. -->
  <svg class="defs" width="0" height="0" aria-hidden="true">
    <defs>
      <!-- painted brush stroke behind combo prices -->
      <path id="brush" d="M7 15C25 6 72 3 119 8c6 1 9 6 7 12-1 6 3 12-3 18-30 7-82 10-113 5-6-1-8-7-6-12 1-5-1-12 3-16z M2 39c9 3 17 4 25 3 M104 5c6-1 12 0 16 2" />

      <symbol id="art-soup" viewBox="0 0 120 120">
        <g class="steam"><path d="M44 40c-6-7 4-11-1-19" /><path d="M60 36c-7-8 5-13-1-22" /><path d="M76 40c-5-6 4-10 0-17" /></g>
        <path class="o" d="M13 57c2-8 92-8 94 0 3 30-20 43-47 43S10 87 13 57z" />
        <path d="M13 57c2-8 92-8 94 0-1 8-92 9-94 0z" />
        <path d="M14 60c3 26 22 40 46 40s43-14 46-40" />
        <path d="M45 99l2 7h26l2-7" />
        <path d="M30 76c4 3 8 3 12 0s8-3 12 0 8 3 12 0 8-3 12 0 8 3 12 0" />
        <path d="M34 57c2-2 5-2 7 0M50 59c2-2 5-2 7 0M66 58c2-2 4-2 6 0" />
        <path class="o" d="M82 58c1-5 12-6 14 0-3 4-11 4-14 0z" />
        <path d="M90 55l13-27c2-4 7-2 6 2l-10 25" />
      </symbol>

      <symbol id="art-wok" viewBox="0 0 120 120">
        <g class="steam"><path d="M30 34c-3-5-2-10 2-13" /><path d="M92 30c4-4 5-8 3-13" /></g>
        <path d="M38 40l7-4 4 7-7 4z" />
        <path d="M58 22c5-3 10 2 6 6s-10 0-6-6z" />
        <path d="M78 36l6 1-1 6-6-1z" />
        <path d="M48 50c6-5 12-4 17-11" />
        <path d="M70 50h.1M42 54h.1M88 48h.1M60 44h.1" />
        <path class="o" d="M12 62h86c-2 22-22 32-42 32S14 84 12 62z" />
        <path d="M98 62l18-9" />
        <path d="M30 76c10 4 40 4 52 0" />
        <g class="flame"><path d="M42 112c-6-4-5-11 0-16 1 4 4 4 4 8 1-2 2-3 2-5 4 4 4 11-1 13z" /><path d="M58 113c-6-4-5-12 1-18 1 4 4 5 4 9 1-2 2-4 2-6 4 5 4 13-2 15z" /><path d="M75 112c-6-4-5-11 0-16 1 4 4 4 4 8 1-2 2-3 2-5 4 4 4 11-1 13z" /></g>
      </symbol>

      <symbol id="art-dimsum" viewBox="0 0 120 120">
        <g class="steam"><path d="M40 30c-5-5 3-9-1-15" /><path d="M80 32c-5-5 3-9-1-15" /></g>
        <path class="o" d="M24 57c-1-14 20-18 26-4" /><path d="M30 48l3 6M37 45l1 7M44 46l-1 7" />
        <path class="o" d="M70 55c4-14 26-10 26 3" /><path d="M76 47l2 6M83 45v7M90 48l-2 6" />
        <path class="o" d="M45 54c0-17 27-19 29 0" /><path d="M52 41l3 7M59 38v8M66 41l-2 7" />
        <path class="o" d="M12 58c1-8 95-9 96 0l-2 32c-4 9-88 9-92 0z" />
        <path d="M12 58c1 8 95 8 96 0" />
        <path d="M13 72c18 7 76 7 94 0" />
        <path d="M28 77v14M46 79v15M64 79v15M82 78v14M97 75v12" />
      </symbol>

      <symbol id="art-noodles" viewBox="0 0 120 120">
        <path d="M64 41c-4 6 4 10 0 19M69 42c-4 6 4 10 0 18M74 42c-4 6 4 10 0 17" />
        <path d="M104 6L66 40M112 14L72 42" />
        <path class="o" d="M10 62c1-8 99-9 100 0 0 28-24 42-50 42S10 90 10 62z" />
        <path d="M10 62c1 8 99 8 100 0" />
        <path d="M11 64c3 26 25 40 49 40s46-14 49-40" />
        <path d="M44 103l2 7h28l2-7" />
        <path d="M24 82l6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4" />
        <path d="M22 61c0-8 16-8 16 0M27 60c0-3 6-3 6 0" />
        <path d="M42 63c4-3 8 3 12 0M84 60l4-3M90 61l3-3" />
      </symbol>

      <symbol id="art-rice" viewBox="0 0 120 120">
        <path d="M64 44L86 6M70 46L98 12" />
        <path class="o" d="M30 48c4-13 54-13 60 0z" />
        <path d="M44 42l3-1M56 39h3M66 41l3 1M50 46l3-1M74 45l2 1M38 46l2-1" />
        <path class="o" d="M28 48L17 33l33 7M92 48l11-15-33 7" />
        <path class="o" d="M28 48h64l-9 56H37z" />
        <path d="M50 76a10 10 0 1 0 20 0a10 10 0 1 0-20 0" />
        <path d="M60 82c-4-3-3-8 0-11 0 3 3 3 3 6s-1 4-3 5z" />
      </symbol>

      <symbol id="art-skewer" viewBox="0 0 120 120">
        <path d="M12 104L104 18" />
        <path d="M104 18c3-7 13-6 11 1-1 5-8 6-11-1z" />
        <path class="o" d="M32 74l11 11-11 11-11-11z" /><path d="M28 82l4 4M33 79l4 4" />
        <path class="o" d="M44 62c6-4 12 0 14 8-6 2-12 0-14-8z" />
        <path class="o" d="M69 40l11 11-11 11-11-11z" /><path d="M65 48l4 4M70 45l4 4" />
        <path class="o" d="M81 28c6-4 12 0 14 8-6 2-12 0-14-8z" />
        <g class="flame"><path d="M82 112c-6-4-5-12 1-17 0 4 4 5 4 9 1-2 2-4 1-7 5 4 6 12 0 15z" /><path d="M99 112c-4-3-4-9 0-13 1 3 3 4 3 7 1-1 2-3 1-5 4 3 4 9-1 11z" /></g>
      </symbol>

      <symbol id="art-kadai" viewBox="0 0 120 120">
        <g class="steam"><path d="M46 38c-5-6 4-10-1-17" /><path d="M62 34c-6-7 5-12-1-20" /><path d="M78 38c-5-6 4-10-1-16" /></g>
        <path d="M18 60c-12-1-13 13 2 13M102 60c12-1 13 13-2 13" />
        <path class="o" d="M16 56c1-9 87-9 88 0 0 26-20 42-44 42S16 82 16 56z" />
        <path d="M16 56c1 8 87 8 88 0" />
        <path d="M40 56c6-4 20-4 24 0 3 3-6 5-10 2" />
        <path d="M72 54c3-5 11-5 13-1-4 4-10 4-13 1zM72 54l-4 2" />
        <path d="M34 78h.1M48 86h.1M64 88h.1M80 82h.1M42 70h.1M76 71h.1" />
      </symbol>

      <symbol id="art-handi" viewBox="0 0 120 120">
        <g class="steam"><path d="M24 40c-6-4-2-10-6-15" /><path d="M96 40c6-4 2-10 6-15" /></g>
        <path class="o" d="M55 30c0-6 10-6 10 0" />
        <path class="o" d="M34 42c6-12 46-12 52 0z" />
        <path class="o" d="M33 50c-2 4-10 8-14 16-8 18 4 36 22 38h38c18-2 30-20 22-38-4-8-12-12-14-16z" />
        <path class="o" d="M32 43c8 4 48 4 56 0v8c-8 4-48 4-56 0z" />
        <path d="M38 47h.1M48 48h.1M60 48.5h.1M72 48h.1M82 47h.1" />
        <path d="M24 76c10 5 62 5 72 0" />
        <path d="M44 88l3-3 3 3-3 3zM70 88l3-3 3 3-3 3zM57 93l3-3 3 3-3 3z" />
      </symbol>

      <symbol id="art-pasta" viewBox="0 0 120 120">
        <path class="o" d="M6 84c1-12 107-12 108 0-1 12-107 12-108 0z" />
        <path d="M22 84c2-6 74-6 76 0" />
        <path d="M82 4L71 38M64 38c4 3 10 4 14 2M65 39l-2 12M69 40l-1 12M73 40v12M77 39l1 12" />
        <path class="o" d="M42 72c4 10 40 10 44 0-4-6-40-6-44 0z" />
        <path class="o" d="M44 64c2 9 36 9 38 0-2-5-36-5-38 0z" />
        <path class="o" d="M46 57c0-8 34-8 34 0s-34 8-34 0z" />
        <path d="M49 52c4-6 25-6 28 0" />
        <path d="M40 75c-6 4-2 8 4 8M86 73c6 4 4 8-4 9" />
        <path d="M22 83c4-6 12-6 14-1-4 4-10 5-14 1z" />
        <path d="M90 84a5 4 0 1 0 10 0a5 4 0 1 0-10 0" />
      </symbol>

      <symbol id="art-sundae" viewBox="0 0 120 120">
        <path class="o" d="M28 50L18 24l7-2 10 26" />
        <path class="o" d="M30 54c-4-14 18-22 28-8 4 6 2 10 0 10" />
        <path class="o" d="M58 50c-2-16 30-18 30 4" />
        <path class="o" d="M42 46c-2-17 30-21 32-2" />
        <path d="M66 26c2-8 8-14 14-16" />
        <path class="o" d="M56 30a6 6 0 1 0 12 0a6 6 0 1 0-12 0" />
        <path class="o" d="M22 56h76c-2 20-18 30-38 30S24 76 22 56z" />
        <path d="M36 56c0 7 4 7 4 0M78 56c0 6 4 6 4 0" />
        <path d="M32 66c10 4 46 4 56 0" />
        <path d="M56 86v14M64 86v14" />
        <path class="o" d="M40 106c2-6 38-6 40 0z" />
      </symbol>

      <symbol id="art-glass" viewBox="0 0 120 120">
        <path class="o" d="M34 24h52l-8 84H42z" />
        <path d="M37 42c12 4 34-4 46 0" />
        <path d="M64 50L80 4l10 3" />
        <path d="M48 56l11-3 3 11-11 3zM62 72l10 1-1 10-10-1z" />
        <path d="M52 90a2 2 0 1 0 4 0a2 2 0 1 0-4 0M66 96a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M58 100a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0" />
        <path class="o" d="M78 26c4-8 14-8 16-2-4 6-12 6-16 2z" />
        <path class="o" d="M22 24a14 14 0 1 0 28 0a14 14 0 1 0-28 0" />
        <path d="M26 24a10 10 0 1 0 20 0a10 10 0 1 0-20 0M36 14v20M26 24h20M29 17l14 14M43 17L29 31" />
      </symbol>

      <symbol id="art-top" viewBox="0 0 120 120">
        <path class="o" d="M34 72c-16-2-18-24-4-28 2-14 18-18 26-10 6-12 24-12 30 0 8-8 24-4 26 10 14 4 12 26-4 28z" />
        <path class="o" d="M34 72v22c0 4 52 4 52 0V72" />
        <path d="M34 82c16 3 36 3 52 0M48 74v18M60 74v19M72 74v18" />
        <path d="M100 26l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM18 40l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
      </symbol>

      <!-- UI icons, 24px grid -->
      <symbol id="i-back" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" /></symbol>
      <symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
      <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
      <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
      <symbol id="i-bag" viewBox="0 0 24 24"><path d="M5 8.5h14l-1.2 11.5H6.2z" /><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" /></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><path d="M10.5 4.5a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5" /></symbol>
      <symbol id="i-bowl" viewBox="0 0 24 24"><path d="M3 12h18c0 4.5-4 7.5-9 7.5S3 16.5 3 12z" /><path d="M8.5 9c0-1.6 1.6-1.8 1.6-3.6M13.5 9c0-1.6 1.6-1.8 1.6-3.6" /></symbol>
      <symbol id="i-leaf" viewBox="0 0 24 24"><path d="M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z" /><path d="M5 19l8-8" /></symbol>
      <symbol id="i-chili" viewBox="0 0 24 24"><path d="M4.5 19.5c7.5 1 12.5-4 13.5-11-2.6-.4-4 1.2-4.8 3.4-1 3-3.8 5.6-8.7 7.6z" /><path d="M18 8.5c.2-2 1.2-3.3 2.6-3.6" /></symbol>
      <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.5l2.4 5.3 5.6.6-4.2 3.8 1.2 5.6L12 16l-5 2.8 1.2-5.6L4 9.4l5.6-.6z" /></symbol>
    </defs>
  </svg>

  <!-- continues the splash's "Let's eat!" ink wipe, then shrinks into the menu -->
  <div class="cover" id="cover" aria-hidden="true"><p>Let’s eat!</p></div>

  <div class="app" id="app">
    <main>
      <h1 class="sr-only">Wok &amp; Flame menu</h1>

      <nav class="band" aria-label="Menu sections">
        <div class="band__track" id="bandTrack">
          <span class="band__pill" id="bandPill" aria-hidden="true"></span>
        </div>
      </nav>

      <!-- Top dishes: chef's picks + combos as swipe cards, then every category -->
      <section class="view view--top" id="topView" aria-labelledby="topTitle">
        <div class="view__head">
          <h2 class="view__title" id="topTitle">Top dishes</h2>
          <p class="view__sub">Chef’s picks and combos. Swipe, tap <b>+</b> to add.</p>
        </div>
        <div class="rail" id="rail" role="list" aria-busy="true">
          <p class="rail__status">Warming up the wok…</p>
        </div>
        <div class="rail-nav" aria-hidden="true">
          <button class="round" type="button" id="railPrev" tabindex="-1"><svg class="ico"><use href="#i-back" /></svg></button>
          <button class="round" type="button" id="railNext" tabindex="-1"><svg class="ico"><use href="#i-arrow" /></svg></button>
        </div>
        <div class="explore">
          <h2 class="explore__title">The full menu</h2>
          <div class="tiles" id="tiles"></div>
        </div>
      </section>

      <!-- One category's dishes -->
      <section class="view dishes" id="catView" aria-labelledby="catTitle" hidden>
        <div class="dishes__head">
          <h2 class="cat-title" id="catTitle">Menu</h2>
          <div class="tabs" id="tabs" role="group" aria-label="Filter dishes">
            <span class="tabs__line" id="tabsLine" aria-hidden="true"></span>
          </div>
        </div>
        <div class="grid" id="grid" aria-live="polite"></div>
      </section>

      <p class="closing">Pick what you like, then show <button type="button" class="inline-link" data-open-list>your list</button> to the waiter. They’ll take it from there.</p>
    </main>
  </div>

  <nav class="dock" id="dock" aria-label="Menu actions">
    <button class="dock__btn" type="button" id="searchBtn" aria-label="Search dishes"><svg class="ico"><use href="#i-search" /></svg></button>
    <button class="dock__btn dock__veg" type="button" id="vegToggle" aria-pressed="false" aria-label="Veg only"><svg class="ico"><use href="#i-leaf" /></svg></button>
    <button class="dock__pill" type="button" id="topBtn"><svg class="ico"><use href="#i-bowl" /></svg><span>menu</span></button>
    <button class="dock__btn dock__list" type="button" id="listBtn" data-open-list aria-label="My list, empty">
      <svg class="ico"><use href="#i-bag" /></svg>
      <span class="badge" id="badge" hidden>0</span>
    </button>
  </nav>

  <!-- dish / combo detail -->
  <div class="detail" id="detail" role="dialog" aria-modal="true" aria-labelledby="detailTitle" hidden>
    <div class="detail__scrim" data-close></div>
    <div class="detail__panel" id="detailPanel"></div>
  </div>

  <!-- my list -->
  <div class="sheet" id="listSheet" role="dialog" aria-modal="true" aria-labelledby="listTitle" hidden>
    <div class="sheet__scrim" data-close></div>
    <div class="sheet__panel">
      <header class="sheet__head">
        <h2 class="sheet__title" id="listTitle">My list</h2>
        <button class="round" type="button" data-close aria-label="Close my list"><svg class="ico"><use href="#i-close" /></svg></button>
      </header>
      <p class="sheet__sub">Show this to your waiter. They’ll take your order.</p>
      <div class="sheet__body" id="listBody"></div>
      <footer class="sheet__foot" id="listFoot">
        <div class="total"><span id="totalCount">0 items</span><strong id="total">₹0</strong></div>
        <button class="text-btn" type="button" id="clearList">Clear list</button>
      </footer>
    </div>
  </div>

  <!-- search -->
  <div class="sheet sheet--search" id="searchSheet" role="dialog" aria-modal="true" aria-label="Search dishes" hidden>
    <div class="sheet__scrim" data-close></div>
    <div class="sheet__panel">
      <header class="sheet__head">
        <label class="search">
          <svg class="ico" aria-hidden="true"><use href="#i-search" /></svg>
          <input id="searchInput" type="search" placeholder="Paneer, noodles, biryani…" autocomplete="off" enterkeyhint="search" aria-label="Search dishes">
        </label>
        <button class="round" type="button" data-close aria-label="Close search"><svg class="ico"><use href="#i-close" /></svg></button>
      </header>
      <div class="sheet__body" id="searchBody"></div>
    </div>
  </div>

  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
  <script src="menu.js?v=4"></script>
</body>
</html>

````

## menu/menu.css

````css
:root {
  --cream: #F5EEDF;
  --paper: #FBF6EB;           /* card stock, a shade lighter than the table */
  --ink: #006A4E;             /* bottle green: every line and word */
  --ink-deep: #00553E;
  --ink-soft: rgba(0, 106, 78, 0.1);
  --chili: #B23E27;           /* non-veg mark, sold out, the odd underline */
  --egg: #B07514;
  --sans: "Familjen Grotesk", system-ui, sans-serif;
  --hand: "Gochi Hand", "Comic Sans MS", cursive;
  --gutter: 20px;
  --card-w: min(62vw, 252px);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dock-h: 60px;
  --dock-gap: max(14px, env(safe-area-inset-bottom));
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: 0; }
html.locked { overflow: hidden; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

body {
  background: var(--cream);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}
::selection { background: var(--ink); color: var(--cream); }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; touch-action: manipulation; }
button:disabled { cursor: default; }
a { color: inherit; }
img { display: block; max-width: 100%; }
[hidden] { display: none !important; }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; border-radius: 6px; }

.defs { position: absolute; width: 0; height: 0; overflow: hidden; }

.ico {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex: none;
}

/* food line art: strokes keep their weight at every size */
.art {
  display: block;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.1px;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.art * { vector-effect: non-scaling-stroke; }
.art .o { fill: var(--art-bg, var(--cream)); }

/* ─────────── shell ─────────── */
.app {
  max-width: 1180px;
  margin: 0 auto;
  padding-bottom: calc(var(--dock-h) + var(--dock-gap) + 28px);
  overflow-x: clip;
}

.round {
  width: 44px;
  height: 44px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  transition: background-color 0.25s, color 0.25s;
}
@media (hover: hover) {
  .round:hover { background: var(--ink); color: var(--cream); border-color: var(--ink); }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ─────────── views ─────────── */
.view__head { padding: 26px var(--gutter) 0; }
.view__title { font-family: var(--hand); font-weight: 400; font-size: 42px; line-height: 1; }
.view__sub { font-size: 15px; margin-top: 6px; max-width: 40ch; }

.explore { padding: 6px var(--gutter) 0; }
.explore__title { font-family: var(--hand); font-weight: 400; font-size: 32px; line-height: 1.1; margin-bottom: 12px; }
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.tile {
  --art-bg: var(--cream);
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 3px;
  min-height: 112px;
  padding: 12px 6px 10px;
  border: 1.5px solid var(--ink);
  border-radius: 14px;
  text-align: center;
  transition: background-color 0.3s var(--ease-out), color 0.3s var(--ease-out);
}
.tile .art { width: 46px; height: 46px; stroke-width: 1.6px; margin-bottom: 2px; }
.tile__name { font-size: 15px; font-weight: 600; line-height: 1.15; }
.tile__count { font-size: 12px; }
.tile:active { transform: scale(0.97); }
@media (hover: hover) {
  .tile:hover { --art-bg: var(--ink); background: var(--ink); color: var(--cream); }
}

/* ─────────── top dishes rail ─────────── */
.rail {
  --pad: calc(50% - var(--card-w) / 2);
  position: relative;
  display: flex;
  gap: 14px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  padding: 20px var(--pad) 34px;
  scrollbar-width: none;
}
.rail::-webkit-scrollbar { display: none; }
.rail__status { width: 100%; text-align: center; font-family: var(--hand); font-size: 24px; padding: 80px 0; }
.rail__status button { text-decoration: underline; text-underline-offset: 4px; font-family: var(--sans); font-size: 15px; font-weight: 500; min-height: 44px; margin-top: 4px; }

.card {
  --art-bg: var(--paper);
  position: relative;
  flex: none;
  width: var(--card-w);
  aspect-ratio: 1 / 1.34;
  scroll-snap-align: center;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 12px;
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  background: var(--paper);
  color: var(--ink);
  transform-origin: 50% 100%;
  transition: background-color 0.45s var(--ease-out), color 0.45s var(--ease-out);
  will-change: transform;
}
.card.is-active { --art-bg: var(--ink); background: var(--ink); color: var(--cream); }

.card__hit { position: absolute; inset: 0; border-radius: inherit; z-index: 1; }
.card__hit:focus-visible { outline-offset: 4px; }
.card__lead { font-size: 15px; font-weight: 500; line-height: 1.2; pointer-events: none; }
.card__name {
  font-family: var(--hand);
  font-size: 30px;
  line-height: 1;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-wrap: balance;
  pointer-events: none;
}
.card__art {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 8px 0 4px;
  pointer-events: none;
}
.card__art { container-type: size; }
.card__art .plate { width: min(82cqw, 100cqh); aspect-ratio: 1; }
.card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  pointer-events: none;
}
.card__tag { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 500; }
.card .add {
  position: relative;
  right: auto;
  bottom: auto;
  pointer-events: auto;
  background: var(--ink);
  color: var(--cream);
}
.card .add.is-in { box-shadow: 0 0 0 2px var(--paper), 0 0 0 3.5px var(--ink); }
.card.is-active .add { background: var(--cream); color: var(--ink); }
.card.is-active .add.is-in { box-shadow: 0 0 0 2px var(--ink), 0 0 0 3.5px var(--cream); }

/* painted combo price */
.stamp {
  position: absolute;
  z-index: 2;
  right: -10px;
  bottom: 60px;
  pointer-events: none;
  display: grid;
  justify-items: end;
  transform: rotate(-7deg);
  min-height: 44px;
  color: var(--ink);
}
.stamp__label {
  font-family: var(--hand);
  font-size: 17px;
  line-height: 1;
  margin-right: 14px;
  margin-bottom: -2px;
  color: currentColor;
}
.card.is-active .stamp__label { color: var(--cream); }
.stamp__ink { position: relative; display: grid; place-items: center; width: 118px; height: 50px; }
.stamp__ink svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.stamp__ink use { fill: var(--ink); stroke: var(--paper); stroke-width: 3px; paint-order: stroke; }
.card.is-active .stamp__ink use { fill: var(--cream); stroke: var(--ink); }
.stamp__price {
  position: relative;
  display: inline-flex;
  font-family: var(--hand);
  font-size: 30px;
  line-height: 1;
  color: var(--cream);
  padding-top: 2px;
}
.card.is-active .stamp__price { color: var(--ink); }

/* rolling digits */
.roll { display: inline-block; height: 1em; overflow: hidden; }
.roll__col { display: flex; flex-direction: column; }
.roll__col span { display: block; height: 1em; line-height: 1; }

.rail-nav { display: none; }
@media (hover: hover) and (pointer: fine) {
  .rail-nav {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: -14px;
    margin-bottom: 10px;
  }
}

/* ─────────── dishes ─────────── */
.dishes { padding-top: 0; }

.band {
  position: sticky;
  top: 0;
  z-index: 10;
  --art-bg: var(--ink);
  background: var(--ink);
  color: var(--cream);
}
.band__track {
  position: relative;
  display: flex;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: max(8px, env(safe-area-inset-top)) var(--gutter) 8px;
  scroll-padding-inline: var(--gutter);
}
.band__track::-webkit-scrollbar { display: none; }
.band__btn {
  position: relative;
  z-index: 1;
  flex: none;
  width: 72px;
  min-height: 60px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 2px;
  padding: 4px 2px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.15;
  transition: color 0.35s var(--ease-out);
}
.band__btn .art { width: 30px; height: 30px; stroke-width: 1.4px; }
.band__btn[aria-current="true"] { color: var(--ink); --art-bg: var(--cream); }
.band__btn:focus-visible { outline-color: var(--cream); outline-offset: -2px; }
.band__pill {
  position: absolute;
  top: 8px;
  left: 0;
  height: calc(100% - 16px);
  width: 72px;
  border-radius: 12px;
  background: var(--cream);
  pointer-events: none;
}

.dishes__head { padding: 26px var(--gutter) 6px; text-align: center; }
.cat-title {
  font-family: var(--hand);
  font-weight: 400;
  font-size: 40px;
  line-height: 1.05;
}
.combo-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  min-height: 44px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 1px;
}
.tabs {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}
.tab {
  min-height: 44px;
  padding: 0 12px;
  font-size: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.tab small { font-size: 12px; font-weight: 400; margin-left: 2px; }
.tabs__line {
  position: absolute;
  left: 0;
  bottom: 6px;
  height: 2px;
  width: 0;
  border-radius: 2px;
  background: var(--chili);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px 14px;
  padding: 16px var(--gutter) 0;
}
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 30px 20px; } }
@media (min-width: 980px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

.dish { position: relative; display: flex; flex-direction: column; }
.dish__panel {
  --art-bg: var(--ink);
  position: relative;
  aspect-ratio: 1 / 1.02;
  border-radius: 14px;
  background: var(--ink);
  color: var(--cream);
  display: grid;
  place-items: center;
  overflow: hidden;
}
.dish__status,
.dish__price {
  position: absolute;
  top: 9px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}
.dish__status { left: 11px; }
.dish__price { right: 11px; font-size: 16px; font-weight: 600; top: 7px; font-variant-numeric: tabular-nums; }
.dish .plate { width: 70%; margin-top: 10%; }
.dish.is-out .plate { opacity: 0.45; }
.dish.is-out .dish__status { color: var(--cream); background: var(--chili); padding: 1px 7px; border-radius: 999px; left: 8px; }

.pick {
  position: absolute;
  left: 8px;
  bottom: 8px;
  font-family: var(--hand);
  font-size: 15px;
  line-height: 1;
  transform: rotate(-8deg);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.pick .ico { width: 14px; height: 14px; fill: currentColor; stroke-width: 1.2; }

.dish__name {
  margin-top: 10px;
  font-family: var(--hand);
  font-weight: 400;
  font-size: 21px;
  line-height: 1.08;
}
.dish__open {
  text-align: left;
  display: inline;
  line-height: inherit;
}
.dish__open::after { content: ""; position: absolute; inset: 0; border-radius: 14px; }
.dish__open:focus-visible { outline: none; }
.dish__open:focus-visible::after { outline: 2px solid var(--ink); outline-offset: 4px; }
.dish__name .mark { margin-right: 6px; vertical-align: 2px; }
.dish__desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.add {
  position: absolute;
  z-index: 2;
  right: 7px;
  bottom: 7px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--cream);
  color: var(--ink);
  display: grid;
  place-items: center;
  transition: transform 0.25s var(--ease-out);
}
.add .ico { width: 20px; height: 20px; stroke-width: 2.2; }
.add__n { font-family: var(--hand); font-size: 22px; line-height: 1; }
.add:active { transform: scale(0.92); }
.add.is-in { background: var(--cream); box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px var(--cream); }

/* plate: photo when supplied, else the category's line art on a drawn plate */
.plate {
  position: relative;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1.5px solid currentColor;
}
.plate::after {
  content: "";
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  border: 1px solid currentColor;
  opacity: 0.5;
}
.plate .art { width: 60%; position: relative; z-index: 1; }
.plate--photo { border: 0; }
.plate--photo::after { display: none; }
.plate img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 10px 22px -10px rgba(0, 0, 0, 0.5);
}

/* diet marks: the Indian veg / non-veg square */
.mark {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
  flex: none;
  border: 1.5px solid var(--m);
  border-radius: 2px;
  background: var(--paper);
}
.mark::after { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--m); }
.mark--veg { --m: var(--ink); }
.mark--nonveg { --m: var(--chili); }
.mark--nonveg::after { width: 0; height: 0; border-radius: 0; background: none; border: 4px solid transparent; border-bottom: 6.5px solid var(--m); border-top: 0; }
.mark--egg { --m: var(--egg); }

.empty {
  grid-column: 1 / -1;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 24px 0 8px;
  text-align: center;
}
.empty .plate { width: 120px; color: var(--ink); --art-bg: var(--cream); }
.empty__title { font-family: var(--hand); font-size: 26px; line-height: 1.1; }
.empty p { font-size: 15px; max-width: 30ch; }
.empty button { text-decoration: underline; text-underline-offset: 4px; font-weight: 500; min-height: 44px; }

.closing {
  margin: 44px auto 0;
  padding: 0 var(--gutter);
  max-width: 34ch;
  text-align: center;
  font-size: 15px;
}
.inline-link {
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
}

/* ─────────── dock ─────────── */
.dock {
  position: fixed;
  z-index: 20;
  left: 0;
  right: 0;
  margin-inline: auto;
  bottom: var(--dock-gap);
  width: min(calc(100% - 32px), 380px);
  height: var(--dock-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 7px;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  background: var(--cream);
}
.dock__btn {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  transition: background-color 0.25s;
}
@media (hover: hover) { .dock__btn:hover { background: var(--ink-soft); } }
.dock__veg { transition: background-color 0.3s, color 0.3s; }
.dock__veg[aria-pressed="true"] { background: var(--ink); color: var(--cream); }
@media (hover: hover) { .dock__veg[aria-pressed="true"]:hover { background: var(--ink-deep); } }
.dock__pill {
  flex: 1;
  max-width: 190px;
  height: 44px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--cream);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
}
.badge {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--chili);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ─────────── detail ─────────── */
.detail { position: fixed; inset: 0; z-index: 40; }
.detail__scrim { position: absolute; inset: 0; background: rgba(0, 40, 29, 0.42); }
.detail__panel {
  --art-bg: var(--ink);
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--cream);
  display: flex;
  flex-direction: column;
}
.detail__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: max(14px, env(safe-area-inset-top)) var(--gutter) 0;
}
.detail__crumb { font-size: 14px; font-weight: 500; }
.detail__hero { display: grid; place-items: center; padding: 18px 0 4px; }
.detail__hero .plate {
  width: min(68vw, 290px);
  background: var(--ink);
  color: var(--cream);
  border: 0;
  box-shadow: 0 0 0 6px var(--cream), 0 0 0 7.5px var(--ink);
}
.detail__hero .plate--photo { background: none; box-shadow: none; }
.detail__hero .plate .art { width: 58%; }
.detail__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px var(--gutter) 0;
}
.detail__title {
  font-family: var(--hand);
  font-weight: 400;
  font-size: clamp(34px, 10vw, 44px);
  line-height: 1;
  text-wrap: balance;
}
.detail__head .mark { width: 18px; height: 18px; margin-top: 10px; }
.detail__head .mark::after { width: 8px; height: 8px; }
.detail__pick {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 6px var(--gutter) 0;
  font-family: var(--hand);
  font-size: 19px;
  transform: rotate(-3deg);
  transform-origin: left;
}
.detail__pick .ico { width: 16px; height: 16px; fill: currentColor; stroke-width: 1.2; }

.detail__band {
  --art-bg: var(--ink);
  flex: 1;
  margin-top: 18px;
  padding: 22px var(--gutter) max(24px, env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  background: var(--ink);
  color: var(--cream);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail__band :focus-visible { outline-color: var(--cream); }
.facts {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 0;
  font-size: 15px;
  font-weight: 500;
}
.facts li { display: inline-flex; align-items: center; gap: 4px; }
.facts li + li::before { content: ""; width: 1px; height: 16px; background: currentColor; opacity: 0.5; margin: 0 12px; }
.facts .ico { width: 16px; height: 16px; stroke-width: 1.5; }
.facts .ico.on { fill: currentColor; }
.facts .ico.off { opacity: 0.4; }
.detail__desc { font-size: 17px; line-height: 1.5; max-width: 52ch; }
.detail__ing { font-size: 14px; line-height: 1.5; max-width: 60ch; }
.detail__ing b { display: block; font-family: var(--hand); font-weight: 400; font-size: 20px; margin-bottom: 2px; }
.detail__ing ul { list-style: none; display: grid; gap: 2px; font-size: 15px; }
.detail__ing li::before { content: "– "; }

.buy { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 6px; }
.buy__price { font-family: var(--hand); font-size: 46px; line-height: 1; font-variant-numeric: tabular-nums; }
.stepper {
  display: inline-flex;
  align-items: center;
  height: 50px;
  border: 1.5px solid currentColor;
  border-radius: 999px;
  padding: 0 3px;
}
.stepper button { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; }
.stepper button:disabled { opacity: 0.35; }
.stepper output { min-width: 28px; text-align: center; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.cta {
  width: 100%;
  min-height: 56px;
  border-radius: 999px;
  background: var(--cream);
  color: var(--ink);
  font-size: 17px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: transform 0.2s var(--ease-out), opacity 0.2s;
}
.cta:active { transform: scale(0.98); }
.cta:disabled { opacity: 0.5; }
.cta--remove { background: transparent; color: var(--cream); border: 1.5px solid var(--cream); }
.detail__note { font-size: 13px; text-align: center; }

/* ─────────── sheets ─────────── */
.sheet { position: fixed; inset: 0; z-index: 50; }
.sheet__scrim { position: absolute; inset: 0; background: rgba(0, 40, 29, 0.42); }
.sheet__panel {
  --art-bg: var(--cream);
  position: absolute;
  left: 0;
  right: 0;
  margin-inline: auto;
  bottom: 0;
  width: min(100%, 560px);
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  background: var(--cream);
  border-radius: 24px 24px 0 0;
  border: 1.5px solid var(--ink);
  border-bottom: 0;
  padding: 18px var(--gutter) max(18px, env(safe-area-inset-bottom));
}
.sheet__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sheet__title { font-family: var(--hand); font-weight: 400; font-size: 38px; line-height: 1; }
.sheet__sub { font-size: 15px; margin-top: 4px; }
.sheet__body { overflow-y: auto; overscroll-behavior: contain; margin: 14px calc(-1 * var(--gutter)) 0; padding: 0 var(--gutter); flex: 1; min-height: 0; }
.sheet__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1.5px solid var(--ink);
  margin-top: 8px;
  padding-top: 14px;
}
.total { display: grid; line-height: 1.1; }
.total span { font-size: 14px; }
.total strong { font-family: var(--hand); font-weight: 400; font-size: 40px; font-variant-numeric: tabular-nums; }
.text-btn { min-height: 44px; padding: 0 6px; font-size: 15px; font-weight: 500; text-decoration: underline; text-underline-offset: 4px; }

.lines { list-style: none; display: grid; }
.line {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 4px 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 106, 78, 0.25);
}
.line:last-child { border-bottom: 0; }
.line__name { font-size: 18px; font-weight: 600; line-height: 1.2; }
.line__meta { font-size: 13px; font-variant-numeric: tabular-nums; }
.line .stepper { height: 44px; }
.line .stepper button { width: 38px; height: 38px; }
.line .stepper output { min-width: 22px; font-size: 16px; }
.line__sum { grid-column: 2; font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums; }

.search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 50px;
  padding: 0 16px;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
}
.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 17px;
  color: var(--ink);
  caret-color: var(--chili);
  outline: none;
}
.search input::placeholder { color: var(--ink); opacity: 0.6; }
.search:focus-within { box-shadow: 0 0 0 3px var(--ink-soft); }
.sheet--search .sheet__panel { height: 88dvh; }
.results__label { font-family: var(--hand); font-size: 22px; margin: 4px 0 2px; }
.result {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 106, 78, 0.25);
}
.result__open { display: grid; text-align: left; gap: 2px; min-height: 44px; }
.result__name { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.result__meta { font-size: 13px; }
.result .add { position: static; margin: 0; background: var(--ink); color: var(--cream); }
.result .add.is-in { box-shadow: none; }

/* ─────────── toast, cover, flyer ─────────── */
.toast {
  position: fixed;
  z-index: 60;
  left: 0;
  right: 0;
  margin-inline: auto;
  width: max-content;
  max-width: calc(100% - 32px);
  bottom: calc(var(--dock-h) + var(--dock-gap) + 12px);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 8px 6px 18px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--cream);
  font-size: 15px;
  white-space: nowrap;
}
.toast button { min-height: 40px; padding: 0 12px; border-radius: 999px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
.toast button:focus-visible { outline-color: var(--cream); }

.cover { display: none; }
.from-splash .cover {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--ink);
  color: var(--cream);
  display: grid;
  place-items: center;
  font-family: var(--hand);
  font-size: 44px;
}

.flyer {
  position: fixed;
  z-index: 70;
  pointer-events: none;
  margin: 0;
  background: var(--ink);
  color: var(--cream);
  --art-bg: var(--ink);
  will-change: transform;
}

/* ─────────── wider screens ─────────── */
@media (min-width: 768px) {
  :root { --gutter: 40px; --card-w: 262px; }
  .view__head { padding-top: 40px; }
  .view__title { font-size: 52px; }
  .tiles { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
  .rail {
    padding-inline: var(--gutter) calc(100% - var(--gutter) - var(--card-w));
    scroll-padding-inline: var(--gutter);
  }
  .card { scroll-snap-align: start; transform-origin: 0 100%; }
  .rail-nav { justify-content: flex-start; padding-left: var(--gutter); }
  .band__track { justify-content: safe center; }
  .detail__scrim { display: block; }
  .detail__panel {
    inset: 24px 0;
    margin-inline: auto;
    width: 480px;
    border-radius: 24px;
    border: 1.5px solid var(--ink);
  }
  .detail__band { border-radius: 28px 28px 22px 22px; }
}
@media (min-width: 1180px) {
  .app { border-inline: 1.5px solid var(--ink-soft); }
}

/* ─────────── idle life in the drawings ─────────── */
.art .steam path, .art .flame path { transform-box: fill-box; }
.card.is-active .steam path,
.detail__hero .steam path { animation: rise 2.6s ease-in-out infinite; transform-origin: 50% 100%; }
.card.is-active .steam path:nth-child(2),
.detail__hero .steam path:nth-child(2) { animation-delay: -0.9s; }
.card.is-active .steam path:nth-child(3),
.detail__hero .steam path:nth-child(3) { animation-delay: -1.7s; }
.card.is-active .flame path,
.detail__hero .flame path { animation: flicker 0.9s ease-in-out infinite alternate; transform-origin: 50% 100%; }
.card.is-active .flame path:nth-child(2) { animation-delay: -0.3s; }
.card.is-active .flame path:nth-child(3) { animation-delay: -0.6s; }
@keyframes rise {
  0% { transform: translateY(4px); opacity: 0; }
  35% { opacity: 1; }
  100% { transform: translateY(-6px); opacity: 0; }
}
@keyframes flicker {
  from { transform: scaleY(0.82) skewX(-4deg); }
  to { transform: scaleY(1.08) skewX(4deg); }
}

@media (hover: hover) {
  .dish .plate { transition: transform 0.6s var(--ease-out); }
  .dish:hover .plate { transform: rotate(-8deg) scale(1.03); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 0.01ms !important; }
}

````

## menu/menu.js

````js
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // GSAP drives every authored motion; without it (or with reduced motion) the page is static but complete.
  const G = window.gsap && !reduceMotion ? window.gsap : null;

  const LIST_KEY = "wf:list";
  const VEG_KEY = "wf:veg";
  const DIET = { veg: "Veg", nonveg: "Non-veg", egg: "Contains egg" };
  const SPICE = ["Not spicy", "Mild", "Medium", "Hot"];

  const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "ico") => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: list just won't persist */ }
    },
  };

  const el = {
    app: $("#app"),
    dock: $("#dock"),
    cover: $("#cover"),
    rail: $("#rail"),
    band: $("#bandTrack"),
    bandPill: $("#bandPill"),
    title: $("#catTitle"),
    tabs: $("#tabs"),
    tabsLine: $("#tabsLine"),
    grid: $("#grid"),
    dishes: $("#catView"),
    topView: $("#topView"),
    tiles: $("#tiles"),
    badge: $("#badge"),
    listBtn: $("#listBtn"),
    veg: $("#vegToggle"),
    detail: $("#detail"),
    detailPanel: $("#detailPanel"),
    listSheet: $("#listSheet"),
    listBody: $("#listBody"),
    listFoot: $("#listFoot"),
    total: $("#total"),
    totalCount: $("#totalCount"),
    searchSheet: $("#searchSheet"),
    searchInput: $("#searchInput"),
    searchBody: $("#searchBody"),
    toast: $("#toast"),
  };

  const state = {
    cats: [],
    catById: new Map(),
    dishes: [],
    items: new Map(), // dishes + combos, by id
    cat: null,
    tab: "all",
    veg: store.get(VEG_KEY, false) === true,
    list: new Map(),
    cards: [],
    bandBtns: [],
    visIdx: -1,
  };

  // ── data ──────────────────────────────────────────────
  async function loadMenu() {
    const res = await fetch("../data/menu.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`menu.json ${res.status}`);
    return res.json();
  }

  function ingest(data) {
    state.cats = (data.categories || []).map((c) => ({ ...c, art: c.art || "wok" }));
    state.catById = new Map(state.cats.map((c) => [c.id, c]));
    state.dishes = (data.dishes || [])
      .filter((d) => state.catById.has(d.category))
      .map((d) => ({
        kind: "dish",
        available: d.available !== false,
        diet: DIET[d.diet] ? d.diet : "veg",
        spice: Math.max(0, Math.min(3, d.spice | 0)),
        portion: d.portion || "",
        ingredients: d.ingredients || "",
        ...d,
      }));
    state.items = new Map(state.dishes.map((d) => [d.id, d]));
    for (const c of state.cats) {
      if (!c.combo) continue;
      const id = `combo-${c.id}`;
      state.items.set(id, {
        id,
        kind: "combo",
        category: c.id,
        name: c.combo.name,
        price: c.combo.price,
        includes: c.combo.includes || [],
        diet: DIET[c.combo.diet] ? c.combo.diet : "veg",
        portion: plural((c.combo.includes || []).length, "item", "items"),
        available: c.combo.available !== false,
        image: c.combo.image || null,
      });
    }
    const saved = store.get(LIST_KEY, []);
    state.list = new Map(Array.isArray(saved) ? saved.filter(([id, q]) => state.items.has(id) && q > 0) : []);

  }

  const catOf = (item) => state.catById.get(item.category);
  const passesVeg = (it) => !state.veg || it.diet === "veg";
  const dishesIn = (catId) => state.dishes.filter((d) => d.category === catId && passesVeg(d));

  // ── markup helpers ────────────────────────────────────
  // Clone a food drawing inline (not <use>) so steam and flames can be styled per card.
  function art(name, cls = "art") {
    const sym = document.getElementById(`art-${name}`) || document.getElementById("art-wok");
    return `<svg class="${cls}" viewBox="${sym.getAttribute("viewBox")}" aria-hidden="true" focusable="false">${sym.innerHTML}</svg>`;
  }

  function plate(item) {
    const c = catOf(item);
    if (item.image) {
      return `<div class="plate plate--photo"><img src="${esc(item.image)}" alt="" loading="lazy" decoding="async" data-art="${esc(c.art)}"></div>`;
    }
    return `<div class="plate">${art(c.art)}</div>`;
  }

  const mark = (diet) => `<span class="mark mark--${diet}" role="img" aria-label="${DIET[diet]}"></span>`;

  function rollDigits(n) {
    const digits = "01234567890123456789".split("").map((x) => `<span>${x}</span>`).join("");
    return "₹" + String(n).split("").map((d) =>
      /\d/.test(d)
        ? `<span class="roll"><span class="roll__col" data-d="${d}" style="transform:translateY(-${d}em)">${digits}</span></span>`
        : d
    ).join("");
  }

  function addBtn(it, q) {
    return q
      ? `<button class="add is-in" type="button" data-add="${esc(it.id)}" aria-label="Add one more ${esc(it.name)}, ${q} in your list"><span class="add__n">${q}</span></button>`
      : `<button class="add" type="button" data-add="${esc(it.id)}" aria-label="Add ${esc(it.name)} to my list">${icon("plus")}</button>`;
  }

  // ── top dishes rail ───────────────────────────────────
  const TOP = "top";

  // Chef's picks and combos, interleaved so the row alternates dish / deal.
  function topItems() {
    const picks = state.dishes.filter((d) => d.chefPick && d.available && passesVeg(d));
    const combos = state.cats
      .map((c) => state.items.get(`combo-${c.id}`))
      .filter((it) => it && it.available && passesVeg(it));
    const out = [];
    for (let i = 0; i < Math.max(picks.length, combos.length); i++) {
      if (picks[i]) out.push(picks[i]);
      if (combos[i]) out.push(combos[i]);
    }
    return out;
  }

  function topCard(it) {
    const c = catOf(it);
    const combo = it.kind === "combo";
    return `
      <div class="card" role="listitem" data-id="${esc(it.id)}">
        <button class="card__hit" type="button" data-open="${esc(it.id)}" aria-label="${esc(it.name)}${combo ? " combo" : ""}, ${rupee(it.price)}. See details"></button>
        <p class="card__lead" aria-hidden="true">${combo ? `${esc(c.name)} combo` : esc(c.name)}</p>
        <p class="card__name" aria-hidden="true">${esc(it.name)}</p>
        <div class="card__art">${plate(it)}</div>
        <span class="stamp" aria-hidden="true">
          ${combo ? `<span class="stamp__label">combo</span>` : ""}
          <span class="stamp__ink">
            <svg viewBox="0 0 130 54"><use href="#brush"/></svg>
            <span class="stamp__price">${rollDigits(it.price)}</span>
          </span>
        </span>
        <div class="card__foot">
          <span class="card__tag">${mark(it.diet)}${combo ? esc(it.portion) : "chef’s pick"}</span>
          ${addBtn(it, state.list.get(it.id) || 0)}
        </div>
      </div>`;
  }

  // keepId re-renders in place: the rail stays on that item (or the same slot if it was
  // filtered out) and it is marked active directly, so the price doesn't repaint and roll.
  function renderRail(keepId) {
    const prevIdx = state.visIdx;
    const items = topItems();
    el.rail.removeAttribute("aria-busy");
    el.rail.innerHTML = items.length
      ? items.map(topCard).join("")
      : `<p class="rail__status">No veg picks today.<br><button type="button" data-veg-off>Show all dishes</button></p>`;
    state.cards = $$(".card", el.rail);
    state.visIdx = -1;
    let i = -1;
    if (keepId && !el.topView.hidden && state.cards.length) {
      i = state.cards.findIndex((c) => c.dataset.id === keepId);
      if (i < 0) i = Math.min(Math.max(prevIdx, 0), state.cards.length - 1);
    }
    if (i >= 0) {
      state.visIdx = i;
      state.cards[i].classList.add("is-active");
      el.rail.scrollLeft = state.cards[i].offsetLeft - railPad();
    } else {
      el.rail.scrollLeft = 0;
    }
    paintRail();
  }

  function renderTiles() {
    el.tiles.innerHTML = state.cats.map((c) => `
      <button class="tile" type="button" data-cat="${esc(c.id)}">
        ${art(c.art)}
        <span class="tile__name">${esc(c.name)}</span>
        <span class="tile__count">${plural(dishesIn(c.id).length, "dish", "dishes")}</span>
      </button>`).join("");
  }

  let railRaf = 0;
  function onRailScroll() {
    if (!railRaf) railRaf = requestAnimationFrame(paintRail);
  }

  // The focus point is the snap position: centre on phones, the left gutter on wide screens.
  const railPad = () => parseFloat(getComputedStyle(el.rail).paddingLeft) || 0;

  // Cards fan out from the focused one, which inks itself in.
  function paintRail() {
    railRaf = 0;
    if (!state.cards.length || el.topView.hidden) return;
    const w = state.cards[0].offsetWidth;
    const mid = el.rail.scrollLeft + railPad() + w / 2;
    let best = 0;
    let bestD = Infinity;
    state.cards.forEach((card, i) => {
      const d = (card.offsetLeft + card.offsetWidth / 2 - mid) / (card.offsetWidth + 14);
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
      if (!reduceMotion) {
        const c = Math.max(-1.6, Math.min(1.6, d));
        const a = Math.abs(c);
        card.style.transform = `translateY(${(a * 14).toFixed(1)}px) rotate(${(c * 3).toFixed(2)}deg) scale(${(1 - a * 0.05).toFixed(3)})`;
      }
    });
    if (best !== state.visIdx) {
      state.cards[state.visIdx]?.classList.remove("is-active");
      state.visIdx = best;
      state.cards[best].classList.add("is-active");
      inkStamp(state.cards[best]);
    }
  }

  function scrollRailToIndex(i, smooth) {
    const card = state.cards[i];
    if (!card) return;
    el.rail.scrollTo({ left: card.offsetLeft - railPad(), behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  }

  function stepRail(dir) {
    scrollRailToIndex(Math.max(0, Math.min(state.cards.length - 1, state.visIdx + dir)), true);
  }

  // The price paints on with a brush, then its digits roll.
  function inkStamp(card) {
    if (!G) return;
    const svg = $(".stamp__ink svg", card);
    if (!svg) return;
    G.fromTo(svg, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power2.out" });
    const cols = $$(".roll__col", card);
    const h = cols[0]?.firstElementChild.offsetHeight || 30;
    cols.forEach((col, i) => {
      const d = Number(col.dataset.d);
      G.fromTo(col, { y: -d * h }, { y: -(10 + d) * h, duration: 0.9 + i * 0.18, ease: "expo.out", delay: 0.12 });
    });
  }

  // ── band, tabs, grid ──────────────────────────────────
  function renderBand() {
    const entries = [{ id: TOP, name: "Top dishes", art: "top" }, ...state.cats];
    el.band.insertAdjacentHTML("beforeend", entries.map((c) => `
      <button class="band__btn" type="button" data-cat="${esc(c.id)}" aria-current="false">${art(c.art)}<span>${esc(c.name)}</span></button>`).join(""));
    state.bandBtns = $$(".band__btn", el.band);
  }

  function move(node, x, width, animate) {
    if (G) G[animate ? "to" : "set"](node, { x, width, duration: 0.55, ease: "expo.out" });
    else { node.style.transform = `translateX(${x}px)`; node.style.width = `${width}px`; }
  }

  function syncBand(animate) {
    const btn = state.bandBtns.find((b) => b.dataset.cat === state.cat);
    if (!btn) return;
    state.bandBtns.forEach((b) => b.setAttribute("aria-current", String(b === btn)));
    move(el.bandPill, btn.offsetLeft, btn.offsetWidth, animate);
    el.band.scrollTo({
      left: btn.offsetLeft - el.band.clientWidth / 2 + btn.offsetWidth / 2,
      behavior: animate && !reduceMotion ? "smooth" : "auto",
    });
  }

  function renderTabs(animate) {
    const all = dishesIn(state.cat);
    const veg = all.filter((d) => d.diet === "veg").length;
    const non = all.length - veg;
    const tabs = [["all", "All", all.length]];
    if (veg && non) tabs.push(["veg", "Veg", veg], ["nonveg", "Non-veg", non]);
    if (!tabs.some(([k]) => k === state.tab)) state.tab = "all";
    $$(".tab", el.tabs).forEach((b) => b.remove());
    el.tabs.insertAdjacentHTML("beforeend", tabs.map(([k, label, n]) => `
      <button class="tab" type="button" data-tab="${k}" aria-pressed="${k === state.tab}">${label}<small>${n}</small></button>`).join(""));
    // The row always keeps its height (even with only "All"), so the grid never jumps.
    moveTabLine(animate);
  }

  function moveTabLine(animate) {
    const b = $('.tab[aria-pressed="true"]', el.tabs);
    if (!b || el.tabs.hidden) return;
    move(el.tabsLine, b.offsetLeft + 12, b.offsetWidth - 24, animate);
  }

  function visibleDishes() {
    let list = dishesIn(state.cat);
    if (state.tab === "veg") list = list.filter((d) => d.diet === "veg");
    if (state.tab === "nonveg") list = list.filter((d) => d.diet !== "veg");
    return list.sort((a, b) => Number(b.available) - Number(a.available));
  }

  function dishCard(d) {
    const q = state.list.get(d.id) || 0;
    return `
      <article class="dish${d.available ? "" : " is-out"}" data-id="${esc(d.id)}">
        <div class="dish__panel">
          <span class="dish__status">${d.available ? "Available" : "Sold out"}</span>
          <span class="dish__price">${rupee(d.price)}</span>
          ${plate(d)}
          ${d.chefPick ? `<span class="pick">${icon("star")}chef’s pick</span>` : ""}
          ${d.available ? addBtn(d, q) : ""}
        </div>
        <h3 class="dish__name"><button class="dish__open" type="button" data-open="${esc(d.id)}">${mark(d.diet)}${esc(d.name)}</button></h3>
        <p class="dish__desc">${esc(d.description)}</p>
      </article>`;
  }

  function renderGrid(animate) {
    const list = visibleDishes();
    const c = state.catById.get(state.cat);
    if (list.length) {
      el.grid.innerHTML = list.map(dishCard).join("");
    } else if (state.veg) {
      el.grid.innerHTML = `
        <div class="empty">
          <div class="plate">${art(c.art)}</div>
          <p class="empty__title">No veg dishes here</p>
          <p>Everything in ${esc(c.name)} has meat, fish or egg.</p>
          <button type="button" data-veg-off>Show all dishes</button>
        </div>`;
    } else {
      el.grid.innerHTML = `
        <div class="empty">
          <div class="plate">${art(c.art)}</div>
          <p class="empty__title">Nothing here yet</p>
          <p>The kitchen is still writing this part of the menu.</p>
        </div>`;
    }
    if (G && animate) {
      G.fromTo(el.grid.children, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.045, clearProps: "transform,opacity" });
    }
  }

  function renderHead(c, animate) {
    el.title.textContent = c.name;
    let line = $(".combo-line", el.dishes);
    if (!line) {
      line = document.createElement("button");
      line.type = "button";
      line.className = "combo-line";
      el.title.after(line);
    }
    line.hidden = !c.combo;
    if (c.combo) {
      line.dataset.open = `combo-${c.id}`;
      line.innerHTML = `${esc(c.combo.name)} combo · ${rupee(c.combo.price)}${icon("chev")}`;
    }
    if (G && animate) G.fromTo([el.title, line], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "expo.out", stagger: 0.06 });
  }

  // TOP shows the swipe cards + category tiles; any other id shows that category's grid.
  function selectCategory(id, source) {
    const isTop = id === TOP;
    const c = state.catById.get(id);
    if (!isTop && !c) return;
    const changed = id !== state.cat;
    const animate = source !== "init";
    state.cat = id;
    if (changed) state.tab = "all";
    el.topView.hidden = !isTop;
    el.dishes.hidden = isTop;
    syncBand(animate);
    if (!changed) return;
    // Jump (not glide) to the top so the swapped-in view starts at its heading.
    if (animate) window.scrollTo({ top: 0, behavior: "instant" });
    if (isTop) {
      paintRail();
      if (G && animate) {
        G.fromTo([$(".view__head", el.topView), el.rail, $(".explore", el.topView)], { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.07, clearProps: "transform,opacity" });
      }
    } else {
      renderHead(c, animate);
      renderTabs(animate);
      renderGrid(animate);
    }
  }

  function setTab(tab) {
    if (tab === state.tab) return;
    state.tab = tab;
    $$(".tab", el.tabs).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
    moveTabLine(true);
    renderGrid(true);
  }

  function setVeg(on) {
    state.veg = on;
    store.set(VEG_KEY, on);
    el.veg.setAttribute("aria-pressed", String(on));
    // Filter in place: no entrance animations, no scroll jumps.
    renderRail(state.cards[state.visIdx]?.dataset.id);
    $$(".tile", el.tiles).forEach((t) => {
      $(".tile__count", t).textContent = plural(dishesIn(t.dataset.cat).length, "dish", "dishes");
    });
    if (state.cat !== TOP) {
      renderTabs(true);
      renderGrid(false);
      if (G) G.fromTo(el.grid, { opacity: 0.4 }, { opacity: 1, duration: 0.3, ease: "power2.out", clearProps: "opacity" });
    }
    if (!el.searchSheet.hidden) renderSearch();
    toast(on ? "Showing veg dishes only" : "Showing all dishes");
  }

  // ── my list ───────────────────────────────────────────
  const listCount = () => [...state.list.values()].reduce((a, b) => a + b, 0);

  function persist() {
    store.set(LIST_KEY, [...state.list]);
  }

  function updateBadge(bump) {
    const n = listCount();
    el.badge.hidden = n === 0;
    el.badge.textContent = n;
    el.listBtn.setAttribute("aria-label", n ? `My list, ${plural(n, "item", "items")}` : "My list, empty");
    if (bump && G && n) {
      G.fromTo(el.badge, { scale: 1.8 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.45)" });
      G.fromTo(el.listBtn, { rotate: -16 }, { rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.35)" });
    }
  }

  function refreshAdd(id) {
    const it = state.items.get(id);
    const q = state.list.get(id) || 0;
    $$(".add").filter((b) => b.dataset.add === id).forEach((b) => {
      const hadFocus = document.activeElement === b;
      b.insertAdjacentHTML("afterend", addBtn(it, q));
      const next = b.nextElementSibling;
      b.remove();
      if (hadFocus) next.focus({ preventScroll: true });
    });
  }

  function setQty(id, q, { badge = true } = {}) {
    if (q > 0) state.list.set(id, q);
    else state.list.delete(id);
    persist();
    refreshAdd(id);
    if (badge) updateBadge(false);
    if (!el.listSheet.hidden) renderList();
  }

  // A copy of the plate arcs into the list button; the badge ticks up when it lands.
  function fly(src, done) {
    if (!G || !src) return done();
    const r = src.getBoundingClientRect();
    const t = el.listBtn.getBoundingClientRect();
    const clone = src.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("flyer");
    Object.assign(clone.style, {
      left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: "50%",
    });
    document.body.appendChild(clone);
    const dx = t.left + t.width / 2 - (r.left + r.width / 2);
    const dy = t.top + t.height / 2 - (r.top + r.height / 2);
    G.timeline({ onComplete() { clone.remove(); done(); } })
      .to(clone, { x: dx, duration: 0.75, ease: "power1.in" }, 0)
      .to(clone, { y: dy, duration: 0.75, ease: "back.in(2.4)" }, 0)
      .to(clone, { scale: Math.min(1, 20 / r.width), rotate: 220, duration: 0.75, ease: "power2.in" }, 0);
  }

  function addOne(id, src) {
    const it = state.items.get(id);
    if (!it || !it.available) return;
    setQty(id, (state.list.get(id) || 0) + 1, { badge: false });
    fly(src, () => updateBadge(true));
  }

  function renderList(focusSel) {
    const rows = [...state.list].map(([id, q]) => [state.items.get(id), q]).filter(([it]) => it);
    const n = rows.reduce((a, [, q]) => a + q, 0);
    const sum = rows.reduce((a, [it, q]) => a + it.price * q, 0);
    el.listFoot.hidden = !rows.length;
    $(".sheet__sub", el.listSheet).hidden = !rows.length;
    el.listBody.innerHTML = rows.length
      ? `<ul class="lines">${rows.map(([it, q]) => `
          <li class="line">
            ${mark(it.diet)}
            <div>
              <p class="line__name">${esc(it.name)}</p>
              <p class="line__meta">${it.kind === "combo" ? "Combo · " : ""}${rupee(it.price)} each${q > 1 ? ` · ${rupee(it.price * q)}` : ""}</p>
            </div>
            <div class="stepper" role="group" aria-label="${esc(it.name)} quantity">
              <button type="button" data-line="${esc(it.id)}" data-step="-1" aria-label="${q === 1 ? "Remove" : "One less"} ${esc(it.name)}">${icon("minus")}</button>
              <output>${q}</output>
              <button type="button" data-line="${esc(it.id)}" data-step="1" aria-label="One more ${esc(it.name)}">${icon("plus")}</button>
            </div>
          </li>`).join("")}</ul>`
      : `<div class="empty">
          <div class="plate">${art("wok")}</div>
          <p class="empty__title">Nothing picked yet</p>
          <p>Tap + on any dish and it lands here, ready to show your waiter.</p>
          <button type="button" data-close>Browse the menu</button>
        </div>`;
    el.total.textContent = rupee(sum);
    el.totalCount.textContent = plural(n, "item", "items");
    if (focusSel) ($(focusSel, el.listBody) || $("[data-close].round", el.listSheet))?.focus({ preventScroll: true });
  }

  function clearList() {
    const snapshot = new Map(state.list);
    state.list.clear();
    persist();
    snapshot.forEach((_, id) => refreshAdd(id));
    updateBadge(false);
    renderList();
    toast("List cleared", "Undo", () => {
      state.list = snapshot;
      persist();
      snapshot.forEach((_, id) => refreshAdd(id));
      updateBadge(true);
      if (!el.listSheet.hidden) renderList();
    });
  }

  // ── search ────────────────────────────────────────────
  function renderSearch() {
    const raw = el.searchInput.value.trim();
    const terms = raw.toLowerCase().split(/\s+/).filter(Boolean);
    let list;
    let label;
    if (!terms.length) {
      list = state.dishes.filter((d) => d.chefPick && passesVeg(d));
      label = "Chef’s picks";
    } else {
      list = state.dishes.filter((d) => {
        if (!passesVeg(d)) return false;
        const hay = `${d.name} ${d.ingredients} ${catOf(d).lead} ${catOf(d).name}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
      label = plural(list.length, "match", "matches");
    }
    el.searchBody.innerHTML = list.length
      ? `<p class="results__label">${label}</p><ul class="lines">${list.map((d) => `
          <li class="result">
            <button class="result__open" type="button" data-open="${esc(d.id)}">
              <span class="result__name">${mark(d.diet)}${esc(d.name)}</span>
              <span class="result__meta">${esc(catOf(d).name)} · ${rupee(d.price)}${d.available ? "" : " · Sold out"}</span>
            </button>
            ${d.available ? addBtn(d, state.list.get(d.id) || 0) : ""}
          </li>`).join("")}</ul>`
      : `<div class="empty">
          <p class="empty__title">Nothing called “${esc(raw)}”</p>
          <p>Try a dish or an ingredient, like paneer, prawn or momos.</p>
        </div>`;
  }

  // ── layers: detail + sheets share one back-button aware stack ──
  const layers = [];

  function openLayer(node, panel) {
    const returnTo = document.activeElement;
    layers.push({ node, returnTo });
    node.hidden = false;
    el.app.inert = true;
    el.dock.inert = true;
    layers.slice(0, -1).forEach((l) => { l.node.inert = true; });
    document.documentElement.classList.add("locked");
    history.pushState({ wfLayer: layers.length }, "");
    if (G) {
      G.fromTo(node.firstElementChild, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      if (panel) G.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: "expo.out" });
    }
  }

  function closeTop() {
    const layer = layers.pop();
    if (!layer) return;
    const { node, returnTo } = layer;
    const finish = () => {
      node.hidden = true;
      if (G) G.set(node.querySelectorAll(".detail__panel, .sheet__panel, .detail__scrim, .sheet__scrim"), { clearProps: "all" });
      const top = layers[layers.length - 1];
      if (top) top.node.inert = false;
      else {
        el.app.inert = false;
        el.dock.inert = false;
        document.documentElement.classList.remove("locked");
      }
      if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
    };
    if (!G) return finish();
    const panel = node.querySelector(".detail__panel, .sheet__panel");
    const tl = G.timeline({ onComplete: finish });
    tl.to(node.firstElementChild, { opacity: 0, duration: 0.25 }, 0);
    if (node === el.detail) tl.to(panel, { opacity: 0, y: 30, duration: 0.25, ease: "power2.in" }, 0);
    else tl.to(panel, { yPercent: 100, duration: 0.35, ease: "power3.in" }, 0);
  }

  // UI closes act at once and swallow the popstate their history.back() causes,
  // so a quick close-then-open can't pop the wrong layer.
  let skipPop = 0;
  function requestClose() {
    if (!layers.length) return;
    closeTop();
    skipPop++;
    history.back();
  }
  window.addEventListener("popstate", () => {
    if (skipPop) { skipPop--; return; }
    if (layers.length) closeTop();
  });

  // ── detail ────────────────────────────────────────────
  let detailItem = null;
  let detailQty = 1;

  function spiceIcons(level) {
    return [1, 2, 3].map((i) => icon("chili", `ico ${i <= level ? "on" : "off"}`)).join("");
  }

  function detailHTML(it) {
    const c = catOf(it);
    const combo = it.kind === "combo";
    return `
      <div class="detail__bar">
        <button class="round" type="button" data-close aria-label="Back to the menu">${icon("back")}</button>
        <span class="detail__crumb">${combo ? `${esc(c.name)} combo` : `${esc(c.lead)} ${esc(c.name)}`}</span>
        <span class="round" aria-hidden="true" style="visibility:hidden"></span>
      </div>
      <div class="detail__hero">${plate(it)}</div>
      <div class="detail__head">
        <h2 class="detail__title" id="detailTitle">${esc(it.name)}</h2>
        ${mark(it.diet)}
      </div>
      ${it.chefPick ? `<p class="detail__pick">${icon("star")} chef’s pick</p>` : ""}
      <div class="detail__band">
        <ul class="facts">
          ${it.portion ? `<li>${esc(it.portion)}</li>` : ""}
          ${combo ? "" : `<li><span class="sr-spice" aria-hidden="true">${spiceIcons(it.spice)}</span>${SPICE[it.spice]}</li>`}
          <li>${DIET[it.diet]}</li>
        </ul>
        ${it.description ? `<p class="detail__desc">${esc(it.description)}</p>` : ""}
        <div class="detail__ing">
          ${combo
            ? `<b>In this combo</b><ul>${it.includes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
            : `<b>What’s in it</b>${esc(it.ingredients)}`}
        </div>
        <div class="buy">
          <p class="buy__price">${rupee(it.price)}</p>
          ${it.available ? `
          <div class="stepper" role="group" aria-label="Quantity">
            <button type="button" data-step="-1" aria-label="One less">${icon("minus")}</button>
            <output id="qty" aria-live="polite">1</output>
            <button type="button" data-step="1" aria-label="One more">${icon("plus")}</button>
          </div>` : ""}
        </div>
        ${it.available
          ? `<button class="cta" type="button" id="buyBtn"></button>`
          : `<button class="cta" type="button" disabled>Sold out today</button>`}
        <p class="detail__note">Your waiter takes the order. This list is just for you.</p>
      </div>`;
  }

  function updateBuy() {
    const it = detailItem;
    if (!it?.available) return;
    const inList = state.list.get(it.id) || 0;
    const q = detailQty;
    const btn = $("#buyBtn");
    $("#qty").textContent = q;
    $('.detail [data-step="-1"]').disabled = q <= (inList ? 0 : 1);
    btn.classList.toggle("cta--remove", inList > 0 && q === 0);
    if (!inList) btn.textContent = `Add to my list · ${rupee(it.price * q)}`;
    else if (q === 0) btn.textContent = "Remove from my list";
    else if (q === inList) btn.textContent = `In your list · ${q}`;
    else btn.textContent = `Update my list · ${rupee(it.price * q)}`;
  }

  function openDetail(id, origin) {
    const it = state.items.get(id);
    if (!it) return;
    detailItem = it;
    detailQty = state.list.get(id) || 1;
    el.detailPanel.innerHTML = detailHTML(it);
    el.detailPanel.scrollTop = 0;
    updateBuy();
    openLayer(el.detail);
    $("[data-close]", el.detailPanel).focus({ preventScroll: true });

    if (!G) return;
    const hero = $(".detail__hero .plate", el.detailPanel);
    const from = origin?.closest(".dish, .card")?.querySelector(".plate");
    const tl = G.timeline();
    tl.fromTo(el.detailPanel, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
    if (from) {
      const a = from.getBoundingClientRect();
      const b = hero.getBoundingClientRect();
      tl.from(hero, {
        x: a.left + a.width / 2 - (b.left + b.width / 2),
        y: a.top + a.height / 2 - (b.top + b.height / 2),
        scale: a.width / b.width,
        duration: 0.7,
        ease: "expo.out",
      }, 0);
    } else {
      tl.from(hero, { scale: 0.6, opacity: 0, duration: 0.6, ease: "expo.out" }, 0);
    }
    tl.from($(".detail__band", el.detailPanel), { y: 80, opacity: 0, duration: 0.7, ease: "expo.out" }, 0.08)
      .from($$(".detail__head > *, .detail__pick, .detail__crumb", el.detailPanel), { y: 14, opacity: 0, duration: 0.5, ease: "expo.out", stagger: 0.05 }, 0.12);
  }

  function commitDetail() {
    const it = detailItem;
    const inList = state.list.get(it.id) || 0;
    const q = detailQty;
    if (q === inList) return requestClose();
    if (q > inList) {
      setQty(it.id, q, { badge: false });
      fly($(".detail__hero .plate", el.detailPanel), () => { updateBadge(true); requestClose(); });
    } else {
      setQty(it.id, q);
      if (q === 0) toast(`${it.name} removed`);
      requestClose();
    }
  }

  // ── toast ─────────────────────────────────────────────
  let toastTimer = 0;
  function hideToast() {
    clearTimeout(toastTimer);
    if (el.toast.hidden) return;
    if (!G) { el.toast.hidden = true; return; }
    G.to(el.toast, { y: 16, opacity: 0, duration: 0.25, onComplete: () => { el.toast.hidden = true; } });
  }
  function toast(msg, action, fn) {
    el.toast.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ""}`;
    if (action) $("button", el.toast).addEventListener("click", () => { fn(); hideToast(); });
    el.toast.hidden = false;
    if (G) G.fromTo(el.toast, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "expo.out" });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 2600);
  }

  // ── events ────────────────────────────────────────────
  function bind() {
    el.rail.addEventListener("scroll", onRailScroll, { passive: true });

    el.rail.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = state.cards.indexOf(e.target.closest(".card")) + (e.key === "ArrowRight" ? 1 : -1);
      if (i < 0 || i >= state.cards.length) return;
      e.preventDefault();
      scrollRailToIndex(i, true);
      $(".card__hit", state.cards[i]).focus({ preventScroll: true });
    });
    $("#railPrev").addEventListener("click", () => stepRail(-1));
    $("#railNext").addEventListener("click", () => stepRail(1));

    el.veg.addEventListener("click", () => setVeg(!state.veg));
    $("#topBtn").addEventListener("click", () => {
      selectCategory(TOP, "nav");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
    $("#searchBtn").addEventListener("click", () => {
      renderSearch();
      openLayer(el.searchSheet, $(".sheet__panel", el.searchSheet));
      el.searchInput.focus({ preventScroll: true });
    });
    el.searchInput.addEventListener("input", renderSearch);
    $("#clearList").addEventListener("click", clearList);

    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, [data-close]");
      if (!t) return;

      if (t.matches("[data-close]")) return requestClose();
      if (t.matches("[data-add]")) {
        const src = t.closest(".dish, .card")?.querySelector(".plate") || t;
        return addOne(t.dataset.add, src);
      }
      if (t.matches("[data-open]")) return openDetail(t.dataset.open, t);
      if (t.matches(".band__btn, .tile")) return selectCategory(t.dataset.cat, "band");
      if (t.matches(".tab")) return setTab(t.dataset.tab);
      if (t.matches("[data-veg-off]")) return setVeg(false);
      if (t.matches("[data-open-list]")) {
        renderList();
        openLayer(el.listSheet, $(".sheet__panel", el.listSheet));
        return $("[data-close].round", el.listSheet).focus({ preventScroll: true });
      }
      if (t.matches("[data-line]")) {
        const id = t.dataset.line;
        const d = Number(t.dataset.step);
        setQty(id, (state.list.get(id) || 0) + d);
        return renderList(`[data-line="${CSS.escape(id)}"][data-step="${d}"]`);
      }
      if (t.matches(".detail [data-step]")) {
        const inList = state.list.get(detailItem.id) || 0;
        detailQty = Math.max(inList ? 0 : 1, Math.min(20, detailQty + Number(t.dataset.step)));
        if (G) G.fromTo("#qty", { y: Number(t.dataset.step) * -8, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.3, ease: "expo.out" });
        return updateBuy();
      }
      if (t.id === "buyBtn") return commitDetail();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && layers.length) requestClose();
    });

    // A missing photo falls back to the line-art plate.
    document.addEventListener("error", (e) => {
      const img = e.target;
      if (img.tagName !== "IMG" || !img.closest(".plate")) return;
      const p = img.parentElement;
      p.classList.remove("plate--photo");
      p.innerHTML = art(img.dataset.art);
    }, true);

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.visIdx >= 0) scrollRailToIndex(state.visIdx, false);
        paintRail();
        syncBand(false);
        moveTabLine(false);
      }, 120);
    });
  }

  // ── intro ─────────────────────────────────────────────
  function playCover() {
    const root = document.documentElement;
    if (!root.classList.contains("from-splash")) return false;
    history.replaceState(null, "", location.pathname);
    const done = () => root.classList.remove("from-splash");
    if (!G) { done(); return false; }
    const r = $("#topBtn").getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    G.timeline({ onComplete: done })
      .to(el.cover.firstElementChild, { y: -18, opacity: 0, duration: 0.35, ease: "power2.in" }, 0.2)
      .fromTo(el.cover, { clipPath: `circle(${R}px at ${x}px ${y}px)` },
        { clipPath: `circle(0px at ${x}px ${y}px)`, duration: 0.95, ease: "power3.inOut" }, 0.3);
    return true;
  }

  function intro(fromSplash) {
    if (!G) return;
    const tl = G.timeline({ defaults: { ease: "expo.out" }, delay: fromSplash ? 0.55 : 0 });
    tl.from(".band__btn", { y: -18, opacity: 0, duration: 0.6, stagger: 0.035 })
      .from(el.bandPill, { opacity: 0, scale: 0.6, duration: 0.5 }, 0.3)
      .from(".view__head > *", { x: 50, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.1)
      .from(el.rail, { x: () => innerWidth * 0.55, duration: 1.2 }, 0.2)
      .from(".tile", { y: 20, opacity: 0, duration: 0.6, stagger: 0.03 }, 0.55);
    if (!fromSplash) tl.from(el.dock, { y: 110, duration: 0.9 }, 0.5);
  }

  function showLoadError() {
    el.rail.removeAttribute("aria-busy");
    el.rail.innerHTML = `<p class="rail__status" role="alert">The menu didn’t load.<br><button type="button" id="retry">Try again</button></p>`;
    el.dishes.hidden = true;
    $(".explore", el.topView).hidden = true;
    $("#retry").addEventListener("click", () => location.reload());
  }

  // ── start ─────────────────────────────────────────────
  async function boot() {
    const fromSplash = playCover();
    el.veg.setAttribute("aria-pressed", String(state.veg));

    let data;
    try {
      data = await loadMenu();
    } catch (err) {
      console.error(err);
      showLoadError();
      return;
    }
    ingest(data);
    if (!state.cats.length) { showLoadError(); return; }

    renderRail();
    renderBand();
    bind();
    updateBadge(false);
    renderTiles();
    selectCategory(TOP, "init");
    paintRail();
    intro(fromSplash);
  }

  boot();
})();

````

## data/menu.json

````json
{
  "_note": "SAMPLE MENU drafted for design. Replace names, prices, combos and availability with the real menu. Dish photos: put files in assets/dishes/ and set \"image\": \"../assets/dishes/<file>.jpg\".",
  "restaurant": {
    "name": "Wok & Flame",
    "hours": "12 pm – 11 pm",
    "service": "Dine-in menu"
  },
  "categories": [
    {
      "id": "soups", "lead": "Steaming", "name": "Soups", "art": "soup",
      "combo": { "name": "Soup & Starter", "includes": ["Any veg soup", "Crispy corn (half)"], "price": 249, "diet": "veg" }
    },
    {
      "id": "starters", "lead": "Wok-tossed", "name": "Starters", "art": "wok",
      "combo": { "name": "Starter Trio", "includes": ["Chilli paneer", "Crispy corn", "Veg spring rolls"], "price": 449, "diet": "veg" }
    },
    {
      "id": "dimsum", "lead": "Bamboo", "name": "Dim Sum", "art": "dimsum",
      "combo": { "name": "Steamer Basket", "includes": ["Veg momos (4)", "Chicken momos (4)", "Two dips"], "price": 329, "diet": "nonveg" }
    },
    {
      "id": "noodles", "lead": "Hakka", "name": "Noodles", "art": "noodles",
      "combo": { "name": "Noodle Bowl Meal", "includes": ["Any noodles", "Manchurian (half)", "Lime soda"], "price": 349, "diet": "veg" }
    },
    {
      "id": "rice", "lead": "Wok-fried", "name": "Rice", "art": "rice",
      "combo": { "name": "Rice & Gravy", "includes": ["Fried rice", "Chilli chicken gravy"], "price": 379, "diet": "nonveg" }
    },
    {
      "id": "tandoor", "lead": "Smoky", "name": "Tandoor", "art": "skewer",
      "combo": { "name": "Tandoor Platter", "includes": ["Paneer tikka", "Malai broccoli", "Mint chutney"], "price": 499, "diet": "veg" }
    },
    {
      "id": "curries", "lead": "Slow-cooked", "name": "Curries", "art": "kadai",
      "combo": { "name": "Curry Thali", "includes": ["Dal makhani", "Paneer butter masala", "2 butter naan", "Jeera rice"], "price": 429, "diet": "veg" }
    },
    {
      "id": "biryani", "lead": "Sealed", "name": "Biryani", "art": "handi",
      "combo": { "name": "Biryani Feast", "includes": ["Chicken dum biryani", "Raita", "Gulab jamun"], "price": 399, "diet": "nonveg" }
    },
    {
      "id": "continental", "lead": "Continental", "name": "Mains", "art": "pasta",
      "combo": { "name": "Pasta & Bread", "includes": ["Any pasta", "Garlic bread", "Iced tea"], "price": 459, "diet": "veg" }
    },
    {
      "id": "desserts", "lead": "Sweet", "name": "Endings", "art": "sundae",
      "combo": { "name": "Sweet Share", "includes": ["Sizzling brownie", "Gulab jamun (2)"], "price": 279, "diet": "egg" }
    },
    {
      "id": "drinks", "lead": "Cool", "name": "Sips", "art": "glass",
      "combo": { "name": "Table Pitcher", "includes": ["1 L fresh lime soda", "Four glasses"], "price": 249, "diet": "veg" }
    }
  ],
  "dishes": [
    { "id": "hot-sour-veg", "category": "soups", "name": "Hot & Sour Veg", "description": "Peppery, tangy broth thick with shredded vegetables and tofu.", "ingredients": "cabbage, carrot, tofu, mushroom, vinegar, white pepper, soy", "price": 169, "diet": "veg", "spice": 2, "portion": "Serves 1", "available": true, "image": null },
    { "id": "manchow-chicken", "category": "soups", "name": "Chicken Manchow", "description": "Dark, garlicky soup topped with a fistful of crisp fried noodles.", "ingredients": "chicken, garlic, ginger, coriander, soy, fried noodles", "price": 199, "diet": "nonveg", "spice": 2, "portion": "Serves 1", "available": true, "image": null },
    { "id": "sweet-corn", "category": "soups", "name": "Sweet Corn", "description": "Silky, mild corn soup. The one the kids always order.", "ingredients": "sweet corn, egg-free stock, spring onion, white pepper", "price": 159, "diet": "veg", "spice": 0, "portion": "Serves 1", "available": true, "image": null },
    { "id": "tom-yum", "category": "soups", "name": "Tom Yum Prawn", "description": "Thai lemongrass broth, sour and bright, with plump prawns.", "ingredients": "prawn, lemongrass, galangal, kaffir lime, chilli, mushroom", "price": 239, "diet": "nonveg", "spice": 3, "portion": "Serves 1", "available": false, "image": null },

    { "id": "chilli-paneer", "category": "starters", "name": "Chilli Paneer", "description": "Crisp paneer cubes tossed hot with peppers, onion and green chilli.", "ingredients": "paneer, capsicum, onion, green chilli, soy, garlic", "price": 279, "diet": "veg", "spice": 2, "portion": "8 pieces", "available": true, "image": null, "chefPick": true },
    { "id": "dragon-chicken", "category": "starters", "name": "Dragon Chicken", "description": "Fiery strips of chicken in a sticky red chilli glaze, sesame on top.", "ingredients": "chicken, red chilli, cashew, honey, sesame, spring onion", "price": 329, "diet": "nonveg", "spice": 3, "portion": "Serves 2", "available": true, "image": null },
    { "id": "crispy-corn", "category": "starters", "name": "Crispy Corn", "description": "Golden corn kernels fried crunchy with salt, pepper and curry leaf.", "ingredients": "sweet corn, curry leaf, pepper, onion, chilli flakes", "price": 229, "diet": "veg", "spice": 1, "portion": "Serves 2", "available": true, "image": null },
    { "id": "spring-rolls", "category": "starters", "name": "Veg Spring Rolls", "description": "Shatter-crisp rolls of glass noodles and cabbage, sweet chilli dip.", "ingredients": "cabbage, carrot, glass noodles, sweet chilli sauce", "price": 219, "diet": "veg", "spice": 0, "portion": "6 pieces", "available": true, "image": null },
    { "id": "chilli-fish", "category": "starters", "name": "Chilli Garlic Fish", "description": "Basa fillet bites, wok-seared with burnt garlic and bird's-eye chilli.", "ingredients": "basa, garlic, bird's-eye chilli, soy, spring onion", "price": 349, "diet": "nonveg", "spice": 2, "portion": "Serves 2", "available": true, "image": null },

    { "id": "veg-momos", "category": "dimsum", "name": "Veg Momos", "description": "Thin-skinned dumplings of cabbage, carrot and ginger. Red chutney on the side.", "ingredients": "cabbage, carrot, onion, ginger, momo chutney", "price": 179, "diet": "veg", "spice": 1, "portion": "6 pieces", "available": true, "image": null },
    { "id": "chicken-momos", "category": "dimsum", "name": "Chicken Momos", "description": "Juicy minced chicken, steamed until the pleats turn glossy.", "ingredients": "chicken, onion, coriander, ginger, momo chutney", "price": 219, "diet": "nonveg", "spice": 1, "portion": "6 pieces", "available": true, "image": null, "chefPick": true },
    { "id": "pan-fried-momos", "category": "dimsum", "name": "Pan-fried Momos", "description": "Steamed, then crisped on one side in the pan. Best of both.", "ingredients": "veg or chicken filling, sesame oil, spring onion", "price": 239, "diet": "veg", "spice": 1, "portion": "6 pieces", "available": true, "image": null },
    { "id": "tandoori-momos", "category": "dimsum", "name": "Tandoori Momos", "description": "Momos marinated in tikka spice and charred in the tandoor.", "ingredients": "chicken momos, hung curd, kashmiri chilli, mint chutney", "price": 259, "diet": "nonveg", "spice": 2, "portion": "6 pieces", "available": true, "image": null },

    { "id": "veg-hakka", "category": "noodles", "name": "Veg Hakka Noodles", "description": "Street-style noodles, smoky from a screaming-hot wok.", "ingredients": "noodles, cabbage, capsicum, carrot, spring onion, soy", "price": 219, "diet": "veg", "spice": 1, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "chicken-hakka", "category": "noodles", "name": "Chicken Hakka Noodles", "description": "Our house noodles with shredded chicken and plenty of wok char.", "ingredients": "noodles, chicken, cabbage, capsicum, soy, white pepper", "price": 259, "diet": "nonveg", "spice": 1, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "schezwan-noodles", "category": "noodles", "name": "Schezwan Noodles", "description": "Tossed in our house Schezwan paste. Hot, garlicky, a little numbing.", "ingredients": "noodles, schezwan sauce, garlic, vegetables", "price": 239, "diet": "veg", "spice": 3, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "pad-thai", "category": "noodles", "name": "Pad Thai", "description": "Flat rice noodles, tamarind, crushed peanuts and a squeeze of lime.", "ingredients": "rice noodles, tamarind, peanuts, bean sprouts, tofu, lime", "price": 299, "diet": "veg", "spice": 1, "portion": "Serves 1", "available": true, "image": null, "chefPick": true },
    { "id": "singapore-noodles", "category": "noodles", "name": "Singapore Noodles", "description": "Thin rice vermicelli with egg, curry powder and prawn.", "ingredients": "rice vermicelli, egg, prawn, curry powder, peppers", "price": 289, "diet": "nonveg", "spice": 1, "portion": "Serves 1", "available": false, "image": null },

    { "id": "veg-fried-rice", "category": "rice", "name": "Veg Fried Rice", "description": "Day-old rice, fired fast with vegetables and a splash of soy.", "ingredients": "rice, beans, carrot, spring onion, soy", "price": 199, "diet": "veg", "spice": 0, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "egg-fried-rice", "category": "rice", "name": "Egg Fried Rice", "description": "Fluffy scrambled egg folded through smoky rice.", "ingredients": "rice, egg, spring onion, white pepper, soy", "price": 219, "diet": "egg", "spice": 0, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "burnt-garlic-rice", "category": "rice", "name": "Burnt Garlic Rice", "description": "Garlic toasted dark and nutty, then tossed with rice and greens.", "ingredients": "rice, garlic, spring onion, bok choy, chilli oil", "price": 229, "diet": "veg", "spice": 1, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "thai-basil-rice", "category": "rice", "name": "Thai Basil Chicken Rice", "description": "Minced chicken with holy basil and chilli over jasmine rice.", "ingredients": "jasmine rice, chicken, thai basil, bird's-eye chilli, fish sauce", "price": 289, "diet": "nonveg", "spice": 2, "portion": "Serves 1", "available": true, "image": null },

    { "id": "paneer-tikka", "category": "tandoor", "name": "Paneer Tikka", "description": "Thick paneer in a mustard-chilli marinade, charred at the edges.", "ingredients": "paneer, hung curd, mustard oil, kashmiri chilli, onion, capsicum", "price": 299, "diet": "veg", "spice": 2, "portion": "8 pieces", "available": true, "image": null, "chefPick": true },
    { "id": "chicken-tikka", "category": "tandoor", "name": "Chicken Tikka", "description": "Boneless chicken, overnight marinade, smoked over charcoal.", "ingredients": "chicken, hung curd, ginger-garlic, garam masala, lemon", "price": 349, "diet": "nonveg", "spice": 2, "portion": "8 pieces", "available": true, "image": null },
    { "id": "malai-broccoli", "category": "tandoor", "name": "Malai Broccoli", "description": "Broccoli florets in a creamy cheese and cardamom coat.", "ingredients": "broccoli, cream, cheese, cardamom, white pepper", "price": 279, "diet": "veg", "spice": 0, "portion": "Serves 2", "available": true, "image": null },
    { "id": "tandoori-chicken", "category": "tandoor", "name": "Tandoori Chicken", "description": "Bone-in, fiery red and smoky. Half or full bird.", "ingredients": "chicken, kashmiri chilli, curd, lemon, chaat masala", "price": 399, "diet": "nonveg", "spice": 2, "portion": "Half", "available": true, "image": null },

    { "id": "dal-makhani", "category": "curries", "name": "Dal Makhani", "description": "Black lentils simmered overnight with butter and cream.", "ingredients": "black urad, rajma, butter, cream, tomato", "price": 249, "diet": "veg", "spice": 1, "portion": "Serves 2", "available": true, "image": null },
    { "id": "paneer-butter-masala", "category": "curries", "name": "Paneer Butter Masala", "description": "Soft paneer in a sweet-tangy tomato and cashew gravy.", "ingredients": "paneer, tomato, cashew, butter, kasuri methi", "price": 289, "diet": "veg", "spice": 1, "portion": "Serves 2", "available": true, "image": null },
    { "id": "butter-chicken", "category": "curries", "name": "Butter Chicken", "description": "Tandoor-charred chicken folded into velvety makhani gravy.", "ingredients": "chicken tikka, tomato, butter, cream, fenugreek", "price": 349, "diet": "nonveg", "spice": 1, "portion": "Serves 2", "available": true, "image": null, "chefPick": true },
    { "id": "thai-green-curry", "category": "curries", "name": "Thai Green Curry", "description": "Coconut curry with green chilli paste, served with jasmine rice.", "ingredients": "coconut milk, green curry paste, vegetables, thai basil, jasmine rice", "price": 329, "diet": "veg", "spice": 2, "portion": "Serves 1", "available": true, "image": null },
    { "id": "rogan-josh", "category": "curries", "name": "Mutton Rogan Josh", "description": "Kashmiri-style mutton, deep red and fragrant with fennel.", "ingredients": "mutton, kashmiri chilli, fennel, dry ginger, curd", "price": 429, "diet": "nonveg", "spice": 2, "portion": "Serves 2", "available": true, "image": null },
    { "id": "butter-naan", "category": "curries", "name": "Butter Naan", "description": "Pillowy naan from the tandoor, brushed with butter.", "ingredients": "refined flour, curd, butter", "price": 59, "diet": "veg", "spice": 0, "portion": "1 piece", "available": true, "image": null },
    { "id": "garlic-naan", "category": "curries", "name": "Garlic Naan", "description": "Naan studded with chopped garlic and coriander.", "ingredients": "refined flour, garlic, coriander, butter", "price": 79, "diet": "veg", "spice": 0, "portion": "1 piece", "available": true, "image": null },

    { "id": "veg-biryani", "category": "biryani", "name": "Veg Dum Biryani", "description": "Layered basmati and spiced vegetables, sealed and slow-cooked.", "ingredients": "basmati, vegetables, saffron, fried onion, mint", "price": 279, "diet": "veg", "spice": 2, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "chicken-biryani", "category": "biryani", "name": "Chicken Dum Biryani", "description": "Our bestseller. Saffron rice over marinated chicken, opened at your table.", "ingredients": "basmati, chicken, saffron, fried onion, mint, ghee", "price": 329, "diet": "nonveg", "spice": 2, "portion": "Serves 1–2", "available": true, "image": null, "chefPick": true },
    { "id": "mutton-biryani", "category": "biryani", "name": "Mutton Biryani", "description": "Tender mutton on the bone, cooked dum-style for hours.", "ingredients": "basmati, mutton, saffron, whole spices, ghee", "price": 399, "diet": "nonveg", "spice": 2, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "egg-biryani", "category": "biryani", "name": "Egg Biryani", "description": "Masala-roasted eggs buried in fragrant rice.", "ingredients": "basmati, egg, onion, biryani masala, mint", "price": 249, "diet": "egg", "spice": 2, "portion": "Serves 1", "available": true, "image": null },

    { "id": "penne-arrabbiata", "category": "continental", "name": "Penne Arrabbiata", "description": "Penne in a garlicky tomato sauce with a chilli kick.", "ingredients": "penne, tomato, garlic, chilli flakes, basil, parmesan", "price": 299, "diet": "veg", "spice": 1, "portion": "Serves 1", "available": true, "image": null },
    { "id": "alfredo-chicken", "category": "continental", "name": "Chicken Alfredo", "description": "Fettuccine in a rich parmesan cream sauce with grilled chicken.", "ingredients": "fettuccine, chicken, cream, parmesan, black pepper", "price": 369, "diet": "nonveg", "spice": 0, "portion": "Serves 1", "available": true, "image": null },
    { "id": "grilled-chicken", "category": "continental", "name": "Herb Grilled Chicken", "description": "Chicken breast with mash, sautéed veg and pepper jus.", "ingredients": "chicken, potato, butter, seasonal vegetables, pepper sauce", "price": 429, "diet": "nonveg", "spice": 0, "portion": "Serves 1", "available": true, "image": null },
    { "id": "garlic-bread", "category": "continental", "name": "Cheesy Garlic Bread", "description": "Baguette with garlic butter and melted mozzarella.", "ingredients": "baguette, garlic, butter, mozzarella, oregano", "price": 179, "diet": "veg", "spice": 0, "portion": "4 pieces", "available": true, "image": null },

    { "id": "sizzling-brownie", "category": "desserts", "name": "Sizzling Brownie", "description": "Hot brownie on a sizzler plate, vanilla ice cream, chocolate sauce poured at the table.", "ingredients": "brownie, vanilla ice cream, chocolate sauce, walnuts", "price": 229, "diet": "egg", "spice": 0, "portion": "Serves 1–2", "available": true, "image": null, "chefPick": true },
    { "id": "gulab-jamun", "category": "desserts", "name": "Gulab Jamun", "description": "Warm, syrup-soaked milk dumplings. Two to a bowl.", "ingredients": "khoya, sugar syrup, cardamom, rose water", "price": 119, "diet": "veg", "spice": 0, "portion": "2 pieces", "available": true, "image": null },
    { "id": "date-pancake", "category": "desserts", "name": "Date Pancake", "description": "Crisp Chinese-style pancake rolled around date paste, with ice cream.", "ingredients": "flour, dates, sesame, vanilla ice cream", "price": 199, "diet": "veg", "spice": 0, "portion": "Serves 1–2", "available": true, "image": null },
    { "id": "mango-sticky-rice", "category": "desserts", "name": "Mango Sticky Rice", "description": "Coconut sticky rice with ripe mango, when mangoes are in season.", "ingredients": "glutinous rice, coconut milk, mango, sesame", "price": 249, "diet": "veg", "spice": 0, "portion": "Serves 1", "available": false, "image": null },

    { "id": "lime-soda", "category": "drinks", "name": "Fresh Lime Soda", "description": "Sweet, salted or both. Ask for it your way.", "ingredients": "lime, soda, sugar or salt", "price": 89, "diet": "veg", "spice": 0, "portion": "300 ml", "available": true, "image": null },
    { "id": "masala-chaas", "category": "drinks", "name": "Masala Chaas", "description": "Spiced buttermilk with roasted cumin and mint.", "ingredients": "curd, cumin, mint, ginger, black salt", "price": 79, "diet": "veg", "spice": 0, "portion": "300 ml", "available": true, "image": null },
    { "id": "lemon-iced-tea", "category": "drinks", "name": "Lemon Iced Tea", "description": "Brewed in house, not from a powder.", "ingredients": "black tea, lemon, sugar, mint", "price": 119, "diet": "veg", "spice": 0, "portion": "350 ml", "available": true, "image": null },
    { "id": "virgin-mojito", "category": "drinks", "name": "Virgin Mojito", "description": "Muddled mint and lime, topped with soda and crushed ice.", "ingredients": "mint, lime, sugar, soda", "price": 149, "diet": "veg", "spice": 0, "portion": "350 ml", "available": true, "image": null }
  ]
}

````

## DESIGN.md

````md
# Design

Wok & Flame's visual world, as built in `splash/` and `menu/`. Reference: humbleteam coffee app (`assets/reference/`), re-inked in our colours.

## Colour
| Token | Value | Role |
|---|---|---|
| `--cream` | `#F5EEDF` | page ground |
| `--paper` | `#FBF6EB` | outlined card stock |
| `--ink` | `#006A4E` | every line, all text, filled panels |
| `--chili` | `#B23E27` | non-veg mark, sold-out pill, tab underline, list badge. Use sparingly. |
| `--egg` | `#B07514` | egg mark only |

One ink colour carries the whole UI. Selection is shown by **inverting**: outlined card → solid ink card with cream lines.

## Type
- **Familjen Grotesk** 400/500/600: headlines, UI, prices in the grid.
- **Gochi Hand**: one handwritten word per moment (headline end, category names, dish names, combo prices, sheet titles).

## Shapes
- Cards 14–16px radius, 1.5px ink border, no shadow. Pills only for small controls (nav, stepper, CTA, toggle).
- Plates: circle with an inner ring at 50% opacity. Photo plates drop the rings.
- Painted brush stamp (`#brush`) behind combo prices, tilted −7°.

## Line art
- Food drawings live as `<symbol id="art-*">` in `menu/index.html` (120×120 grid) and are cloned inline by JS.
- `class="o"` shapes are filled with `--art-bg` to hide the lines behind them; set `--art-bg` to the surface colour wherever art sits.
- Strokes use `vector-effect: non-scaling-stroke`: 2.1px on cards, 1.4px in the category band.
- `.steam` / `.flame` groups animate when their card is selected.

## Motion (GSAP 3.13)
- Expo-out for arrivals, power-in for exits. Elements are visible by default; motion is layered on.
- Signature: the Top dishes rail fans its cards, the centred card inks in, and its price paints on and rolls.
- Feedback: the dish plate arcs into the list button, then the badge springs.
- `prefers-reduced-motion`: no GSAP, no CSS loops.

````
