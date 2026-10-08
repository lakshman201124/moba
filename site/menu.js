/* MOBA menu. Behaviour ported from the menu export (menu/menu.js) onto MOBA's data
   (menu-data.js): sections with sub-groups, sized dishes, per-section notes, and ordering.
   A dish is built in its detail view (size, required picks, add-ons, a kitchen note),
   lands in the cart as one line, and the cart is placed as an order for a table. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // GSAP drives every authored motion; without it (or with reduced motion) the page is static but complete.
  const G = window.gsap && !reduceMotion ? window.gsap : null;

  const CART_KEY = "moba:cart";
  const ORDERS_KEY = "moba:orders";
  const TABLE_KEY = "moba:table";
  const VEG_KEY = "moba:veg";
  const ORDER_TTL = 12 * 60 * 60 * 1000; // placed orders shown for one visit
  const DIET = { veg: "Veg", nonveg: "Non-veg", egg: "Contains egg", both: "Veg or non-veg" };
  const SPICE = ["Not spicy", "Mild", "Hot", "Very hot"];
  const NONVEG_PICK = /chicken|fish|meat|prawn/i;
  const TOP = "top";

  const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "ico") => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: the cart just won't persist */ }
    },
  };

  const el = {
    app: $("#app"),
    dock: $("#dock"),
    rail: $("#rail"),
    band: $("#bandTrack"),
    bandPill: $("#bandPill"),
    title: $("#catTitle"),
    ko: $("#catKo"),
    blurb: $("#catBlurb"),
    tabs: $("#tabs"),
    tabsLine: $("#tabsLine"),
    grid: $("#grid"),
    extras: $("#extras"),
    notes: $("#notes"),
    dishes: $("#catView"),
    topView: $("#topView"),
    tiles: $("#tiles"),
    badge: $("#badge"),
    listBtn: $("#listBtn"),
    veg: $("#vegToggle"),
    detail: $("#detail"),
    detailPanel: $("#detailPanel"),
    listSheet: $("#listSheet"),
    listTitle: $("#listTitle"),
    listSub: $("#listSub"),
    listBody: $("#listBody"),
    listFoot: $("#listFoot"),
    total: $("#total"),
    totalCount: $("#totalCount"),
    table: $("#tableInput"),
    tableError: $("#tableError"),
    placeBtn: $("#placeBtn"),
    searchSheet: $("#searchSheet"),
    searchInput: $("#searchInput"),
    searchBody: $("#searchBody"),
    toast: $("#toast"),
  };

  const state = {
    cats: [],
    catById: new Map(),
    dishes: [],
    items: new Map(), // dishes + add-ons, by id
    cat: null,
    tab: "all",
    veg: store.get(VEG_KEY, false) === true,
    cart: [], // lines: { key, id, size, picks: { [label]: [option] }, addons: [id], note, qty }
    orders: [], // placed orders from this visit, newest first
    cards: [],
    bandBtns: [],
    visIdx: -1,
  };

  // ── data ──────────────────────────────────────────────
  function ingest(data) {
    state.cats = (data.categories || []).map((c) => ({
      ...c,
      art: c.art || "wok",
      short: c.short || c.name,
      groups: (c.groups || []).map(([id, name, ko, lede]) => ({ id, name, ko, lede })),
      notes: c.notes || [],
      extras: c.extras || [],
    }));
    state.catById = new Map(state.cats.map((c) => [c.id, c]));
    state.dishes = (data.dishes || [])
      .filter((d) => state.catById.has(d.category))
      .map((d) => ({
        ...d,
        kind: "dish",
        available: d.available !== false,
        diet: DIET[d.diet] ? d.diet : null,
        spice: Math.max(0, Math.min(3, d.spice | 0)),
        sizes: d.sizes && d.sizes.length ? d.sizes : null,
        choose: (d.choose || []).map((o) => ({ ...o, max: Math.max(1, o.max | 0) })),
      }));
    state.items = new Map(state.dishes.map((d) => [d.id, d]));
    for (const x of data.extras || []) {
      state.items.set(x.id, { ...x, kind: "extra", available: true, diet: DIET[x.diet] ? x.diet : null });
    }
    const saved = store.get(CART_KEY, []);
    state.cart = (Array.isArray(saved) ? saved : []).map(cleanLine).filter(Boolean);
    const orders = store.get(ORDERS_KEY, []);
    state.orders = (Array.isArray(orders) ? orders : []).filter((o) => o && Date.now() - o.placedAt < ORDER_TTL);
  }

  const catOf = (it) => state.catById.get(it.category);
  const groupOf = (d) => catOf(d)?.groups.find((g) => g.id === d.group);
  // Veg-only keeps dishes that can be made veg. Unmarked dishes stay hidden until the kitchen confirms them.
  const passesVeg = (it) => !state.veg || it.diet === "veg" || it.diet === "both";
  const dishesIn = (catId) => state.dishes.filter((d) => d.category === catId && passesVeg(d));
  const canBeVeg = (d) => d.diet === "veg" || d.diet === "both";
  const canBeNon = (d) => d.diet === "nonveg" || d.diet === "both";
  const addonsFor = (d) => (catOf(d)?.extras || []).map((id) => state.items.get(id)).filter(Boolean);
  // Dishes with something to decide open the builder instead of going straight into the cart.
  const needsBuilder = (d) => !!(d.sizes || d.choose.length);

  // ── cart lines ────────────────────────────────────────
  // Identical builds share a line; anything different (size, pick, add-on, note) is its own line.
  const lineKey = (l) => JSON.stringify([l.id, l.size, l.picks, [...l.addons].sort(), l.note.trim()]);

  // Drops anything the menu no longer has, so an old saved cart can't break the page.
  function cleanLine(l) {
    const d = l && state.items.get(l.id);
    if (!d || d.kind !== "dish" || !(l.qty > 0)) return null;
    const size = d.sizes ? Math.min(Math.max(l.size | 0, 0), d.sizes.length - 1) : null;
    const picks = {};
    for (const o of d.choose) {
      const got = (l.picks?.[o.label] || []).filter((x) => o.options.includes(x)).slice(0, o.max);
      if (!got.length) return null;
      picks[o.label] = got;
    }
    const allowed = new Set(addonsFor(d).map((x) => x.id));
    const addons = (l.addons || []).filter((x) => allowed.has(x));
    const line = { id: d.id, size, picks, addons, note: String(l.note || "").slice(0, 140), qty: Math.min(20, l.qty | 0) };
    return { ...line, key: lineKey(line) };
  }

  const basePrice = (d, size) => (d.sizes ? d.sizes[size | 0].price : d.price);
  const unitPrice = (l) => basePrice(state.items.get(l.id), l.size) + l.addons.reduce((a, x) => a + (state.items.get(x)?.price || 0), 0);
  const qtyOf = (id) => state.cart.reduce((a, l) => a + (l.id === id ? l.qty : 0), 0);
  const cartCount = () => state.cart.reduce((a, l) => a + l.qty, 0);
  const cartTotal = () => state.cart.reduce((a, l) => a + unitPrice(l) * l.qty, 0);

  // A "veg or non-veg" dish takes the diet of the filling the diner picked.
  function lineDiet(l) {
    const d = state.items.get(l.id);
    if (d.diet !== "both") return d.diet;
    const picked = Object.values(l.picks).flat();
    if (!picked.length) return "both";
    return picked.some((x) => NONVEG_PICK.test(x)) ? "nonveg" : "veg";
  }

  function persist() {
    store.set(CART_KEY, state.cart.map(({ key, ...l }) => l));
  }

  // ── markup helpers ────────────────────────────────────
  // Clone a food drawing inline (not <use>) so steam and flames can be styled per card.
  function art(name, cls = "art") {
    const sym = document.getElementById(`art-${name}`) || document.getElementById("art-pot");
    return `<svg class="${cls}" viewBox="${sym.getAttribute("viewBox")}" aria-hidden="true" focusable="false">${sym.innerHTML}</svg>`;
  }

  function plate(it) {
    const a = catOf(it)?.art || "top";
    if (it.image) {
      return `<div class="plate plate--photo"><img src="${esc(it.image)}" alt="" loading="lazy" decoding="async" data-art="${esc(a)}"></div>`;
    }
    return `<div class="plate">${art(a)}</div>`;
  }

  const one = (diet) => `<span class="mark mark--${diet}" aria-hidden="true"></span>`;
  function marks(diet) {
    if (!diet) return `<span class="marks"></span>`;
    const inner = diet === "both" ? one("veg") + one("nonveg") : one(diet);
    return `<span class="marks" role="img" aria-label="${DIET[diet]}">${inner}</span>`;
  }

  const fromPrice = (it) => (it.sizes ? Math.min(...it.sizes.map((s) => s.price)) : it.price);

  function rollDigits(n) {
    const digits = "01234567890123456789".split("").map((x) => `<span>${x}</span>`).join("");
    return "₹" + String(n).split("").map((d) =>
      /\d/.test(d)
        ? `<span class="roll"><span class="roll__col" data-d="${d}" style="transform:translateY(-${d}em)">${digits}</span></span>`
        : d
    ).join("");
  }

  function addBtn(it, q) {
    const what = needsBuilder(it) ? `Choose options for ${esc(it.name)}` : `Add ${esc(it.name)} to your order`;
    return q
      ? `<button class="add is-in" type="button" data-add="${esc(it.id)}" aria-label="${what}, ${q} in your order"><span class="add__n">${q}</span></button>`
      : `<button class="add" type="button" data-add="${esc(it.id)}" aria-label="${what}">${icon("plus")}</button>`;
  }

  const chilis = (level) => (level ? [1, 2, 3].map((i) => icon("chili", `ico ${i <= level ? "on" : "off"}`)).join("") : "");

  // ── most-loved rail ───────────────────────────────────
  const topItems = () => state.dishes.filter((d) => d.badge && d.available && passesVeg(d));

  function topCard(it) {
    const c = catOf(it);
    const price = fromPrice(it);
    return `
      <div class="card" role="listitem" data-id="${esc(it.id)}">
        <button class="card__hit" type="button" data-open="${esc(it.id)}" aria-label="${esc(it.name)}, ${it.sizes ? "from " : ""}${rupee(price)}. See details"></button>
        <p class="card__lead" aria-hidden="true">${esc(c.short)}<span lang="ko">${esc(c.ko)}</span></p>
        <p class="card__name" aria-hidden="true">${esc(it.name)}</p>
        <div class="card__art">${plate(it)}</div>
        <span class="stamp" aria-hidden="true">
          <span class="stamp__label">${esc(it.badge)}</span>
          <span class="stamp__ink">
            <svg viewBox="0 0 130 54"><use href="#brush"/></svg>
            <span class="stamp__price">${rollDigits(price)}</span>
          </span>
        </span>
        <div class="card__foot">
          <span class="card__tag">${marks(it.diet)}${it.spice ? SPICE[it.spice] : esc(DIET[it.diet] || "")}</span>
          ${addBtn(it, qtyOf(it.id))}
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
      : `<p class="rail__status">No veg favourites to show.<br><button type="button" data-veg-off>Show all dishes</button></p>`;
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

  const tileCount = (id) => plural(dishesIn(id).length, "dish", "dishes");

  function renderTiles() {
    el.tiles.innerHTML = state.cats.map((c) => `
      <button class="tile" type="button" data-cat="${esc(c.id)}">
        ${art(c.art)}
        <span class="tile__name">${esc(c.short)}</span>
        <span class="tile__ko" lang="ko">${esc(c.ko)}</span>
        <span class="tile__count">${tileCount(c.id)}</span>
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
    const h = cols[0]?.firstElementChild.offsetHeight || 28;
    cols.forEach((col, i) => {
      const d = Number(col.dataset.d);
      G.fromTo(col, { y: -d * h }, { y: -(10 + d) * h, duration: 0.9 + i * 0.18, ease: "expo.out", delay: 0.12 });
    });
  }

  // ── band, tabs, grid ──────────────────────────────────
  function renderBand() {
    const entries = [{ id: TOP, short: "Most loved", art: "top" }, ...state.cats];
    el.band.insertAdjacentHTML("beforeend", entries.map((c) => `
      <button class="band__btn" type="button" data-cat="${esc(c.id)}" aria-current="false">${art(c.art)}<span>${esc(c.short)}</span></button>`).join(""));
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

  // Sections with sub-groups (Boba Bar, Desserts…) get a tab per group;
  // flat sections get Veg / Non-veg tabs when they mix both.
  function tabList() {
    const c = state.catById.get(state.cat);
    const all = dishesIn(state.cat);
    const tabs = [["all", "All", all.length]];
    if (c.groups.length) {
      for (const g of c.groups) {
        const n = all.filter((d) => d.group === g.id).length;
        if (n) tabs.push([`g:${g.id}`, g.name, n]);
      }
      if (tabs.length === 2) tabs.pop(); // one group left: "All" says it already
    } else {
      const veg = all.filter(canBeVeg).length;
      const non = all.filter(canBeNon).length;
      if (veg && non && (veg < all.length || non < all.length)) tabs.push(["veg", "Veg", veg], ["nonveg", "Non-veg", non]);
    }
    return tabs;
  }

  function renderTabs(animate) {
    const tabs = tabList();
    if (!tabs.some(([k]) => k === state.tab)) state.tab = "all";
    $$(".tab", el.tabs).forEach((b) => b.remove());
    el.tabs.insertAdjacentHTML("beforeend", tabs.map(([k, label, n]) => `
      <button class="tab" type="button" data-tab="${esc(k)}" aria-pressed="${k === state.tab}">${esc(label)}<small>${n}</small></button>`).join(""));
    // The row always keeps its height (even with only "All"), so the grid never jumps.
    el.tabs.scrollLeft = 0;
    moveTabLine(animate);
  }

  function moveTabLine(animate) {
    const b = $('.tab[aria-pressed="true"]', el.tabs);
    if (!b || el.dishes.hidden) return;
    move(el.tabsLine, b.offsetLeft + 12, b.offsetWidth - 24, animate);
    const left = b.offsetLeft - el.tabs.clientWidth / 2 + b.offsetWidth / 2;
    el.tabs.scrollTo({ left, behavior: animate && !reduceMotion ? "smooth" : "auto" });
  }

  function visibleDishes() {
    let list = dishesIn(state.cat);
    if (state.tab === "veg") list = list.filter(canBeVeg);
    if (state.tab === "nonveg") list = list.filter(canBeNon);
    if (state.tab.startsWith("g:")) list = list.filter((d) => d.group === state.tab.slice(2));
    return list.sort((a, b) => Number(b.available) - Number(a.available));
  }

  function dishCard(d) {
    const status = d.available ? chilis(d.spice) : "Sold out";
    return `
      <article class="dish${d.available ? "" : " is-out"}" data-id="${esc(d.id)}">
        <div class="dish__panel">
          <span class="dish__status"${d.available && d.spice ? ` role="img" aria-label="${SPICE[d.spice]}"` : ""}>${status}</span>
          <span class="dish__price">${d.sizes ? "<small>from</small>" : ""}${rupee(fromPrice(d))}</span>
          ${plate(d)}
          ${d.badge ? `<span class="pick">${esc(d.badge)}</span>` : ""}
          ${d.available ? addBtn(d, qtyOf(d.id)) : ""}
        </div>
        <h3 class="dish__name"><button class="dish__open" type="button" data-open="${esc(d.id)}">${marks(d.diet)}${esc(d.name)}</button></h3>
        ${d.description ? `<p class="dish__desc">${esc(d.description)}</p>` : ""}
      </article>`;
  }

  // In "All", a grouped section is split under its group headings.
  function gridHTML(list, c) {
    if (!c.groups.length || state.tab !== "all") return list.map(dishCard).join("");
    return c.groups.map((g) => {
      const ds = list.filter((d) => d.group === g.id);
      if (!ds.length) return "";
      return `<h3 class="grid__group">${esc(g.name)}<span lang="ko">${esc(g.ko)}</span></h3>
        ${g.lede ? `<p class="grid__lede">${esc(g.lede)}</p>` : ""}
        ${ds.map(dishCard).join("")}`;
    }).join("");
  }

  function renderGrid(animate) {
    const list = visibleDishes();
    const c = state.catById.get(state.cat);
    if (list.length) {
      el.grid.innerHTML = gridHTML(list, c);
    } else if (state.veg) {
      const unmarked = state.dishes.some((d) => d.category === c.id && !d.diet);
      el.grid.innerHTML = `
        <div class="empty">
          <div class="plate">${art(c.art)}</div>
          <p class="empty__title">${unmarked ? "Not marked veg yet" : "No veg dishes here"}</p>
          <p>${unmarked
            ? `We haven’t marked ${esc(c.name)} veg or non-veg yet. Your waiter can tell you which ones are eggless.`
            : `Everything in ${esc(c.name)} has meat, fish or egg.`}</p>
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
      G.fromTo(el.grid.children, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.035, clearProps: "transform,opacity" });
    }
  }

  // The section's add-ons as a price list; they are picked per dish, inside the dish builder.
  function renderExtras() {
    const c = state.catById.get(state.cat);
    const xs = c.extras.map((id) => state.items.get(id)).filter((x) => x && passesVeg(x));
    el.extras.hidden = !xs.length;
    el.extras.innerHTML = xs.length
      ? `<h3 class="extras__title">Add-ons<span lang="ko">추가</span></h3>
        <p class="extras__sub">Tap any dish to add these to it.</p>
        <ul class="extras__list">${xs.map((x) => `
          <li class="extra">
            <span class="extra__name">${esc(x.name)}${x.badge ? `<em>${esc(x.badge)}</em>` : ""}</span>
            <span class="extra__price">+${rupee(x.price)}</span>
          </li>`).join("")}</ul>`
      : "";
  }

  function renderNotes() {
    const c = state.catById.get(state.cat);
    el.notes.hidden = !c.notes.length;
    el.notes.innerHTML = c.notes.map((n) => `
      <section class="note">
        <h3 class="note__title">${esc(n.title)}${n.ko ? `<span lang="ko">${esc(n.ko)}</span>` : ""}</h3>
        ${n.text ? `<p>${esc(n.text)}</p>` : ""}
        ${n.items ? `<dl>${n.items.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>` : ""}
      </section>`).join("");
  }

  function renderHead(c, animate) {
    el.title.textContent = c.name;
    el.ko.textContent = c.ko || "";
    el.ko.hidden = !c.ko;
    el.blurb.textContent = c.blurb || "";
    el.blurb.hidden = !c.blurb;
    if (G && animate) G.fromTo([el.title, el.ko, el.blurb], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "expo.out", stagger: 0.06, clearProps: "opacity" });
  }

  // TOP shows the swipe cards + section tiles; any other id shows that section's grid.
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
    if (source !== "hash") history.replaceState(history.state, "", (isTop ? "" : `#${id}`) || location.pathname + location.search);
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
      renderExtras();
      renderNotes();
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
    $$(".tile", el.tiles).forEach((t) => { $(".tile__count", t).textContent = tileCount(t.dataset.cat); });
    if (state.cat !== TOP) {
      renderTabs(true);
      renderGrid(false);
      renderExtras();
      if (G) G.fromTo(el.grid, { opacity: 0.4 }, { opacity: 1, duration: 0.3, ease: "power2.out", clearProps: "opacity" });
    }
    if (!el.searchSheet.hidden) renderSearch();
    toast(on ? "Showing veg dishes only" : "Showing all dishes");
  }

  // ── cart ──────────────────────────────────────────────
  function updateBadge(bump) {
    const n = cartCount();
    el.badge.hidden = n === 0;
    el.badge.textContent = n;
    el.listBtn.setAttribute("aria-label", n ? `Your order, ${plural(n, "item", "items")}` : "Your order, empty");
    if (bump && G && n) {
      G.fromTo(el.badge, { scale: 1.8 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.45)" });
      G.fromTo(el.listBtn, { rotate: -16 }, { rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.35)" });
    }
  }

  function refreshAdd(id) {
    const it = state.items.get(id);
    if (!it) return;
    const q = qtyOf(id);
    $$(".add").filter((b) => b.dataset.add === id).forEach((b) => {
      const hadFocus = document.activeElement === b;
      b.insertAdjacentHTML("afterend", addBtn(it, q));
      const next = b.nextElementSibling;
      b.remove();
      if (hadFocus) next.focus({ preventScroll: true });
    });
  }

  function afterCartChange(ids, { badge = true } = {}) {
    persist();
    new Set(ids).forEach(refreshAdd);
    if (badge) updateBadge(false);
    if (!el.listSheet.hidden && el.listSheet.dataset.mode !== "done") renderList();
  }

  // Adds a built line, merging it into an identical line already in the cart.
  function addLine(line) {
    const l = cleanLine(line);
    if (!l) return;
    const same = state.cart.find((x) => x.key === l.key);
    if (same) same.qty = Math.min(20, same.qty + l.qty);
    else state.cart.push(l);
    afterCartChange([l.id], { badge: false });
  }

  function replaceLine(oldKey, line) {
    const i = state.cart.findIndex((x) => x.key === oldKey);
    if (i < 0) return addLine(line);
    const [old] = state.cart.splice(i, 1);
    if (line.qty > 0) {
      const l = cleanLine(line);
      const same = l && state.cart.find((x) => x.key === l.key);
      if (same) same.qty = Math.min(20, same.qty + l.qty);
      else if (l) state.cart.splice(i, 0, l);
    }
    afterCartChange([old.id]);
  }

  function stepLine(key, d) {
    const l = state.cart.find((x) => x.key === key);
    if (!l) return;
    l.qty = Math.min(20, l.qty + d);
    if (l.qty <= 0) state.cart = state.cart.filter((x) => x !== l);
    afterCartChange([l.id]);
  }

  // A copy of the plate arcs into the order button; the badge ticks up when it lands.
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

  // "+" adds plain dishes straight away; anything with a size or a pick opens the builder.
  function quickAdd(id, btn) {
    const d = state.items.get(id);
    if (!d || !d.available) return;
    if (needsBuilder(d)) return openDetail(id, btn);
    addLine({ id, size: null, picks: {}, addons: [], note: "", qty: 1 });
    const src = btn.closest(".dish, .card")?.querySelector(".plate") || btn;
    fly(src, () => updateBadge(true));
  }

  // Size, picks, add-ons and note, as short lines for the cart and the confirmation.
  function lineDetails(l) {
    const d = state.items.get(l.id);
    const out = [];
    if (d.sizes) out.push(d.sizes[l.size].label);
    for (const [label, got] of Object.entries(l.picks)) out.push(`${label}: ${got.join(" + ")}`);
    if (l.addons.length) out.push(`With ${l.addons.map((x) => state.items.get(x)?.name.replace(/^Meal: /, "")).join(", ")}`);
    return out;
  }

  function lineHTML(l, { editable }) {
    const d = state.items.get(l.id);
    const unit = unitPrice(l);
    return `
      <li class="line${editable ? "" : " line--placed"}">
        ${marks(lineDiet(l))}
        <div class="line__main">
          <p class="line__name">${editable ? "" : `<span class="line__qty">${l.qty}×</span>`}${esc(d.name)}</p>
          ${lineDetails(l).map((t) => `<p class="line__opt">${esc(t)}</p>`).join("")}
          ${l.note ? `<p class="line__note">“${esc(l.note)}”</p>` : ""}
          <p class="line__meta">${rupee(unit)}${l.qty > 1 ? ` each · ${rupee(unit * l.qty)}` : ""}</p>
          ${editable ? `<button class="line__edit" type="button" data-edit="${esc(l.key)}">Edit<span class="sr-only"> ${esc(d.name)}</span></button>` : ""}
        </div>
        ${editable ? `
        <div class="stepper" role="group" aria-label="${esc(d.name)} quantity">
          <button type="button" data-line="${esc(l.key)}" data-step="-1" aria-label="${l.qty === 1 ? "Remove" : "One less"} ${esc(d.name)}">${icon("minus")}</button>
          <output>${l.qty}</output>
          <button type="button" data-line="${esc(l.key)}" data-step="1" aria-label="One more ${esc(d.name)}"${l.qty >= 20 ? " disabled" : ""}>${icon("plus")}</button>
        </div>` : ""}
      </li>`;
  }

  function placedHTML() {
    if (!state.orders.length) return "";
    return `
      <section class="placed" aria-labelledby="placedTitle">
        <h3 class="placed__title" id="placedTitle">Already ordered</h3>
        ${state.orders.map((o) => `
          <details class="placed__order">
            <summary><span>Order ${esc(o.id)} · Table ${esc(o.table)}</span><b>${rupee(o.total)}</b></summary>
            <ul class="lines">${o.items.map((l) => lineHTML(l, { editable: false })).join("")}</ul>
          </details>`).join("")}
      </section>`;
  }

  function renderList(focusSel) {
    el.listSheet.dataset.mode = "cart";
    el.listTitle.textContent = "Your order";
    const lines = state.cart;
    el.listFoot.hidden = !lines.length;
    el.listSub.hidden = !lines.length;
    el.listBody.innerHTML = (lines.length
      ? `<ul class="lines">${lines.map((l) => lineHTML(l, { editable: true })).join("")}</ul>`
      : `<div class="empty">
          <div class="plate">${art("pot")}</div>
          <p class="empty__title">${state.orders.length ? "Hungry for more?" : "Nothing picked yet"}</p>
          <p>Tap + on any dish, pick your options and add-ons, and it lands here.</p>
          <button type="button" data-close>Browse the menu</button>
        </div>`) + placedHTML();
    el.total.textContent = rupee(cartTotal());
    el.totalCount.textContent = plural(cartCount(), "item", "items");
    el.table.value = el.table.value || store.get(TABLE_KEY, "");
    if (focusSel) ($(focusSel, el.listBody) || $("[data-close].round", el.listSheet))?.focus({ preventScroll: true });
  }

  function openList() {
    renderList();
    openLayer(el.listSheet, $(".sheet__panel", el.listSheet));
    $("[data-close].round", el.listSheet).focus({ preventScroll: true });
  }

  function clearList() {
    const snapshot = state.cart.map((l) => ({ ...l }));
    const ids = snapshot.map((l) => l.id);
    state.cart = [];
    afterCartChange(ids);
    toast("Order cleared", "Undo", () => {
      state.cart = snapshot;
      afterCartChange(ids, { badge: false });
      updateBadge(true);
    });
  }

  // ── placing an order ──────────────────────────────────
  const tableOk = (t) => /^\d{1,3}$/.test(t) && Number(t) > 0;

  function orderId() {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `MB-${n}`;
  }

  // The order as the kitchen will receive it. With window.MOBA_ORDER_URL set this is POSTed
  // as JSON and the server may answer { id } to replace the local order number.
  function buildOrder(table) {
    return {
      id: orderId(),
      table,
      placedAt: Date.now(),
      currency: "INR",
      total: cartTotal(),
      items: state.cart.map(({ key, ...l }) => {
        const d = state.items.get(l.id);
        return {
          ...l,
          name: d.name,
          sizeLabel: d.sizes ? d.sizes[l.size].label : null,
          addonDetails: l.addons.map((x) => ({ id: x, name: state.items.get(x).name, price: state.items.get(x).price })),
          diet: lineDiet(l),
          unitPrice: unitPrice(l),
          lineTotal: unitPrice(l) * l.qty,
        };
      }),
    };
  }

  async function sendOrder(order) {
    const url = window.MOBA_ORDER_URL;
    if (!url) return { ...order, status: "local" };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
    if (!res.ok) throw new Error(`order ${res.status}`);
    const data = await res.json().catch(() => ({}));
    return { ...order, id: data.id || order.id, status: "sent" };
  }

  function showTableError(msg) {
    el.tableError.textContent = msg;
    el.tableError.hidden = !msg;
    el.table.setAttribute("aria-invalid", String(!!msg));
    if (msg) {
      el.table.focus();
      if (G) G.fromTo(el.table.parentElement, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    }
  }

  let placing = false;
  async function placeOrder() {
    if (placing || !state.cart.length) return;
    const table = el.table.value.trim();
    if (!tableOk(table)) return showTableError(table ? "That doesn’t look like a table number. Use the number on your table’s stand." : "Add your table number so we know where to bring it.");
    showTableError("");
    store.set(TABLE_KEY, table);
    placing = true;
    el.placeBtn.disabled = true;
    el.placeBtn.textContent = "Placing your order…";
    try {
      const placed = await sendOrder(buildOrder(table));
      state.orders.unshift(placed);
      store.set(ORDERS_KEY, state.orders);
      const ids = state.cart.map((l) => l.id);
      state.cart = [];
      persist();
      new Set(ids).forEach(refreshAdd);
      updateBadge(false);
      renderDone(placed);
    } catch (err) {
      console.error(err);
      toast("Your order didn’t go through. Check your connection and place it again.");
    } finally {
      placing = false;
      el.placeBtn.disabled = false;
      el.placeBtn.textContent = "Place order";
    }
  }

  function renderDone(o) {
    el.listSheet.dataset.mode = "done";
    el.listTitle.textContent = "Order placed";
    el.listSub.hidden = true;
    el.listFoot.hidden = true;
    const sent = o.status === "sent";
    el.listBody.innerHTML = `
      <div class="done">
        <p class="done__stamp" lang="ko" aria-hidden="true">주문 완료!</p>
        <p class="done__id">Order ${esc(o.id)} · Table ${esc(o.table)}</p>
        <p class="done__msg">${sent
          ? "It’s with the kitchen. We’ll bring it to your table as soon as it’s ready."
          : "Show this screen to your waiter and they’ll send it to the kitchen."}</p>
        <ul class="lines">${o.items.map((l) => lineHTML(l, { editable: false })).join("")}</ul>
        <div class="done__total"><span>${plural(o.items.reduce((a, l) => a + l.qty, 0), "item", "items")} · taxes extra</span><strong>${rupee(o.total)}</strong></div>
        <button class="cta cta--ink" type="button" data-close>Order something else</button>
      </div>`;
    el.listBody.scrollTop = 0;
    $(".done .cta", el.listBody).focus({ preventScroll: true });
    if (G) {
      G.timeline({ defaults: { ease: "expo.out" } })
        .fromTo(".done__stamp", { scale: 2.2, rotate: -14, opacity: 0 }, { scale: 1, rotate: -4, opacity: 1, duration: 0.7, ease: "back.out(2)" })
        .from(".done > :not(.done__stamp)", { y: 16, opacity: 0, duration: 0.5, stagger: 0.05 }, 0.2);
    }
  }

  // ── search ────────────────────────────────────────────
  function haystack(d) {
    const c = catOf(d);
    const g = groupOf(d);
    return [d.name, d.description, c.name, c.short, c.ko, g?.name, g?.ko, ...d.choose.flatMap((o) => o.options)].join(" ").toLowerCase();
  }

  function renderSearch() {
    const raw = el.searchInput.value.trim();
    const terms = raw.toLowerCase().split(/\s+/).filter(Boolean);
    let list;
    let label;
    if (!terms.length) {
      list = topItems();
      label = "Most loved";
    } else {
      list = state.dishes.filter((d) => passesVeg(d) && terms.every((t) => haystack(d).includes(t)));
      label = plural(list.length, "match", "matches");
    }
    el.searchBody.innerHTML = list.length
      ? `<p class="results__label">${label}</p><ul class="lines">${list.map((d) => `
          <li class="result">
            <button class="result__open" type="button" data-open="${esc(d.id)}">
              <span class="result__name">${marks(d.diet)}${esc(d.name)}</span>
              <span class="result__meta">${esc(groupOf(d)?.name || catOf(d).short)} · ${d.sizes ? "from " : ""}${rupee(fromPrice(d))}${d.available ? "" : " · Sold out"}</span>
            </button>
            ${d.available ? addBtn(d, qtyOf(d.id)) : ""}
          </li>`).join("")}</ul>`
      : `<div class="empty">
          <p class="empty__title">Nothing called “${esc(raw)}”</p>
          <p>Try a dish, a flavour or a filling, like gochujang, paneer or matcha.${state.veg ? " Veg only is on, so non-veg dishes are hidden." : ""}</p>
          ${state.veg ? `<button type="button" data-veg-off>Show all dishes</button>` : ""}
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
    history.pushState({ mobaLayer: layers.length }, "");
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
      if (top) {
        top.node.inert = false;
        // Back on the cart after editing a line: show the edit.
        if (top.node === el.listSheet && el.listSheet.dataset.mode !== "done") renderList();
      } else {
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

  // ── detail: the dish builder ──────────────────────────
  // b: { d, size, picks, addons, note, qty, editKey }
  let b = null;

  const builtLine = () => ({ id: b.d.id, size: b.size, picks: b.picks, addons: b.addons, note: b.note, qty: b.qty });
  const builtUnit = () => basePrice(b.d, b.size) + b.addons.reduce((a, x) => a + (state.items.get(x)?.price || 0), 0);
  const missingPicks = () => b.d.choose.filter((o) => !(b.picks[o.label] || []).length);

  function optionsHTML(d) {
    return d.choose.map((o, oi) => {
      const multi = o.max > 1;
      const chosen = b.picks[o.label] || [];
      return `
        <fieldset class="opt" data-opt="${oi}">
          <legend class="opt__label">${esc(o.label)}<small>${multi ? `Pick up to ${o.max}` : "Pick one"}</small></legend>
          <div class="chips">${o.options.map((x) => `
            <label class="chip">
              <input type="${multi ? "checkbox" : "radio"}" name="opt-${oi}" value="${esc(x)}" data-pick="${oi}"${chosen.includes(x) ? " checked" : ""}>
              <span>${esc(x)}</span>
            </label>`).join("")}
          </div>
          <p class="opt__error" hidden>Pick ${multi ? "at least one" : "one"} to add this dish.</p>
        </fieldset>`;
    }).join("");
  }

  function addonsHTML(d) {
    const xs = addonsFor(d).filter((x) => passesVeg(x) || b.addons.includes(x.id));
    if (!xs.length) return "";
    return `
      <fieldset class="opt">
        <legend class="opt__label">Add-ons<small>Optional</small></legend>
        <div class="addons">${xs.map((x) => `
          <label class="addon">
            <input type="checkbox" value="${esc(x.id)}" data-addon${b.addons.includes(x.id) ? " checked" : ""}>
            <span class="addon__box" aria-hidden="true"></span>
            <span class="addon__name">${esc(x.name)}${x.badge ? `<em>${esc(x.badge)}</em>` : ""}</span>
            <span class="addon__price">+${rupee(x.price)}</span>
          </label>`).join("")}
        </div>
      </fieldset>`;
  }

  function detailHTML(d) {
    const c = catOf(d);
    const g = groupOf(d);
    const desc = d.description || g?.lede || "";
    return `
      <div class="detail__bar">
        <button class="round" type="button" data-close aria-label="${b.editKey ? "Back to your order" : "Back to the menu"}">${icon("back")}</button>
        <span class="detail__crumb">${esc(g?.name || c.short)}<span lang="ko">${esc(g?.ko || c.ko)}</span></span>
        <span class="round" aria-hidden="true" style="visibility:hidden"></span>
      </div>
      <div class="detail__hero">${plate(d)}</div>
      <div class="detail__head">
        <h2 class="detail__title" id="detailTitle">${esc(d.name)}</h2>
        ${marks(d.diet)}
      </div>
      ${d.badge ? `<p class="detail__pick">${esc(d.badge)}</p>` : ""}
      <div class="detail__band">
        <ul class="facts">
          ${d.spice ? `<li><span aria-hidden="true">${chilis(d.spice)}</span>${SPICE[d.spice]}</li>` : ""}
          <li>${d.diet ? DIET[d.diet] : "Ask us if it’s veg"}</li>
          ${c.id === "boba" ? "<li>Pearls included</li>" : ""}
        </ul>
        ${desc ? `<p class="detail__desc">${esc(desc)}</p>` : ""}
        ${d.note ? `<p class="detail__note">${esc(d.note)}</p>` : ""}
        ${d.available ? `
        ${d.sizes ? `
        <div class="opt" role="group" aria-labelledby="sizeLabel">
          <p class="opt__label" id="sizeLabel">Size</p>
          <div class="sizes">${d.sizes.map((s, i) => `
            <button class="size" type="button" data-size="${i}" aria-pressed="${i === b.size}"><b>${esc(s.label)}</b><span>${rupee(s.price)}</span></button>`).join("")}
          </div>
        </div>` : ""}
        ${optionsHTML(d)}
        ${addonsHTML(d)}
        <label class="opt kitchen-note">
          <span class="opt__label">Notes for the kitchen<small>Optional</small></span>
          <textarea id="lineNote" rows="2" maxlength="140" placeholder="Less spicy, no onion, extra sauce…">${esc(b.note)}</textarea>
        </label>
        <div class="buy">
          <p class="buy__price" id="buyPrice">${rupee(builtUnit())}</p>
          <div class="stepper" role="group" aria-label="Quantity">
            <button type="button" data-step="-1" aria-label="One less">${icon("minus")}</button>
            <output id="qty" aria-live="polite">${b.qty}</output>
            <button type="button" data-step="1" aria-label="One more">${icon("plus")}</button>
          </div>
        </div>
        <button class="cta" type="button" id="buyBtn"></button>
        <p class="detail__fine">${qtyOf(d.id) && !b.editKey ? `${qtyOf(d.id)} already in your order. This adds another.` : "You can change it in your order before you place it."}</p>`
        : `<button class="cta" type="button" disabled>Sold out today</button>`}
      </div>`;
  }

  function updateBuy() {
    if (!b?.d.available) return;
    const btn = $("#buyBtn");
    const unit = builtUnit();
    $("#qty").textContent = b.qty;
    $("#buyPrice").textContent = rupee(unit);
    $('.detail [data-step="-1"]').disabled = b.qty <= (b.editKey ? 0 : 1);
    $('.detail [data-step="1"]').disabled = b.qty >= 20;
    btn.classList.toggle("cta--remove", b.qty === 0);
    if (b.qty === 0) btn.textContent = "Remove from order";
    else if (b.editKey) btn.textContent = `Update order · ${rupee(unit * b.qty)}`;
    else btn.textContent = `Add ${b.qty > 1 ? `${b.qty} ` : ""}to order · ${rupee(unit * b.qty)}`;
  }

  function bumpPrice() {
    if (G) G.fromTo("#buyPrice", { y: -10, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.35, ease: "expo.out" });
  }

  function setSize(i) {
    b.size = i;
    $$(".size", el.detailPanel).forEach((s) => s.setAttribute("aria-pressed", String(Number(s.dataset.size) === i)));
    updateBuy();
    bumpPrice();
  }

  function onPick(input) {
    const o = b.d.choose[Number(input.dataset.pick)];
    const set = $(`fieldset[data-opt="${input.dataset.pick}"]`, el.detailPanel);
    const boxes = $$("input", set);
    if (o.max > 1) {
      const on = boxes.filter((x) => x.checked);
      if (on.length > o.max) input.checked = false; // already at the limit
      const got = boxes.filter((x) => x.checked);
      boxes.forEach((x) => { x.disabled = !x.checked && got.length >= o.max; });
      b.picks[o.label] = got.map((x) => x.value);
    } else {
      b.picks[o.label] = [input.value];
    }
    if (b.picks[o.label].length) {
      set.classList.remove("is-missing");
      $(".opt__error", set).hidden = true;
    }
  }

  function onAddon(input) {
    b.addons = $$("[data-addon]", el.detailPanel).filter((x) => x.checked).map((x) => x.value);
    updateBuy();
    bumpPrice();
  }

  // editKey opens an existing cart line to change it; otherwise a fresh build starts.
  function openDetail(id, origin, editKey) {
    const d = state.items.get(id);
    if (!d || d.kind !== "dish") return;
    const line = editKey && state.cart.find((l) => l.key === editKey);
    b = line
      ? { d, size: line.size, picks: JSON.parse(JSON.stringify(line.picks)), addons: [...line.addons], note: line.note, qty: line.qty, editKey }
      : { d, size: d.sizes ? 0 : null, picks: {}, addons: [], note: "", qty: 1, editKey: null };
    el.detailPanel.innerHTML = detailHTML(d);
    el.detailPanel.scrollTop = 0;
    // Pick-two groups start with their limit applied.
    $$("fieldset[data-opt]", el.detailPanel).forEach((set) => {
      const o = d.choose[Number(set.dataset.opt)];
      if (o.max > 1 && (b.picks[o.label] || []).length >= o.max) $$("input", set).forEach((x) => { x.disabled = !x.checked; });
    });
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
      const r = hero.getBoundingClientRect();
      tl.from(hero, {
        x: a.left + a.width / 2 - (r.left + r.width / 2),
        y: a.top + a.height / 2 - (r.top + r.height / 2),
        scale: a.width / r.width,
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
    b.note = $("#lineNote")?.value || "";
    const missing = b.qty > 0 ? missingPicks() : [];
    if (missing.length) {
      // Point at the first unanswered choice instead of failing silently.
      missing.forEach((o) => {
        const set = $(`fieldset[data-opt="${b.d.choose.indexOf(o)}"]`, el.detailPanel);
        set.classList.add("is-missing");
        $(".opt__error", set).hidden = false;
      });
      const first = $(".opt.is-missing", el.detailPanel);
      first.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      $("input", first).focus({ preventScroll: true });
      if (G) G.fromTo(first, { x: -10 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
      return;
    }
    if (b.editKey) {
      replaceLine(b.editKey, builtLine());
      if (b.qty === 0) toast(`${b.d.name} removed`);
      return requestClose();
    }
    addLine(builtLine());
    fly($(".detail__hero .plate", el.detailPanel), () => { updateBadge(true); requestClose(); });
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
    toastTimer = setTimeout(hideToast, action ? 6000 : 3200);
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
    el.placeBtn.addEventListener("click", placeOrder);
    el.table.addEventListener("input", () => {
      el.table.value = el.table.value.replace(/\D/g, "").slice(0, 3);
      if (!el.tableError.hidden && tableOk(el.table.value)) showTableError("");
    });
    el.table.addEventListener("keydown", (e) => { if (e.key === "Enter") placeOrder(); });

    el.detailPanel.addEventListener("change", (e) => {
      if (e.target.matches("[data-pick]")) onPick(e.target);
      else if (e.target.matches("[data-addon]")) onAddon(e.target);
    });
    el.detailPanel.addEventListener("input", (e) => {
      if (e.target.id === "lineNote" && b) b.note = e.target.value;
    });

    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, [data-close]");
      if (!t) return;

      if (t.matches("[data-close]")) return requestClose();
      if (t.matches("[data-add]")) return quickAdd(t.dataset.add, t);
      if (t.matches("[data-open]")) return openDetail(t.dataset.open, t);
      if (t.matches(".band__btn, .tile")) return selectCategory(t.dataset.cat, "band");
      if (t.matches(".tab")) return setTab(t.dataset.tab);
      if (t.matches("[data-veg-off]")) return setVeg(false);
      if (t.matches("[data-open-list]")) return openList();
      if (t.matches("[data-line]")) {
        const key = t.dataset.line;
        const d = Number(t.dataset.step);
        const idx = state.cart.findIndex((l) => l.key === key);
        stepLine(key, d);
        // Keep focus on the same stepper button, or the next line's when this one went.
        return renderList(state.cart.some((l) => l.key === key)
          ? `[data-line="${CSS.escape(key)}"][data-step="${d}"]`
          : state.cart[idx] ? `[data-line="${CSS.escape(state.cart[idx].key)}"][data-step="-1"]` : null);
      }
      if (t.matches("[data-edit]")) {
        const l = state.cart.find((x) => x.key === t.dataset.edit);
        return l && openDetail(l.id, null, l.key);
      }
      if (t.matches(".detail [data-size]")) return setSize(Number(t.dataset.size));
      if (t.matches(".detail [data-step]")) {
        b.qty = Math.max(b.editKey ? 0 : 1, Math.min(20, b.qty + Number(t.dataset.step)));
        if (G) G.fromTo("#qty", { y: Number(t.dataset.step) * -8, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.3, ease: "expo.out" });
        return updateBuy();
      }
      if (t.id === "buyBtn") return commitDetail();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && layers.length) requestClose();
    });

    // Links like home.html → menu.html#rameyon open that section.
    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1);
      if (state.catById.has(id)) selectCategory(id, "hash");
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
  // Arriving through the bubble transition, wait for the holes to open before the band drops in.
  function intro(fromBubble, isTop) {
    if (!G) return;
    const tl = G.timeline({ defaults: { ease: "expo.out" }, delay: fromBubble ? 0.7 : 0 });
    tl.from(".band__home, .band__btn", { y: -18, opacity: 0, duration: 0.6, stagger: 0.03 })
      .from(el.bandPill, { opacity: 0, scale: 0.6, duration: 0.5 }, 0.3)
      .from(el.dock, { y: 110, duration: 0.9 }, 0.4);
    if (isTop) {
      tl.from(".view__head > *", { x: 50, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.1)
        .from(el.rail, { x: () => innerWidth * 0.55, duration: 1.2 }, 0.2)
        .from(".tile", { y: 20, opacity: 0, duration: 0.6, stagger: 0.03 }, 0.55);
    }
  }

  function showLoadError() {
    el.rail.removeAttribute("aria-busy");
    el.rail.innerHTML = `<p class="rail__status" role="alert">The menu didn’t load.<br><button type="button" id="retry">Try again</button></p>`;
    el.dishes.hidden = true;
    $(".explore", el.topView).hidden = true;
    $("#retry").addEventListener("click", () => location.reload());
  }

  // The table's QR code can carry its number: menu.html?table=12
  function readTable() {
    const t = new URLSearchParams(location.search).get("table");
    if (t && tableOk(t.trim())) store.set(TABLE_KEY, t.trim());
  }

  // ── start ─────────────────────────────────────────────
  function boot() {
    const fromBubble = document.documentElement.classList.contains("bubble-cover");
    el.veg.setAttribute("aria-pressed", String(state.veg));
    readTable();

    const data = window.MOBA_MENU;
    if (!data) { showLoadError(); return; }
    ingest(data);
    if (!state.cats.length) { showLoadError(); return; }

    renderRail();
    renderBand();
    bind();
    updateBadge(false);
    renderTiles();
    const start = location.hash.slice(1);
    const first = state.catById.has(start) ? start : TOP;
    selectCategory(first, "init");
    paintRail();
    intro(fromBubble, first === TOP);
  }

  boot();
})();
