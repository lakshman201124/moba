/* MOBA bubble page transition (orange + yellow only).
   Modelled on manayerbamate.com: their Lottie pops 7 big circles at scattered
   points on a 2000x2000 canvas (stagger 0-15 frames @60fps), then a second set
   rotated -90deg; the next page is revealed by circles growing as HOLES.

   OUT of a page (tap a link with [data-bubble]):
     orange circle grows from the tap -> orange bubbles cover -> yellow bubbles
     cover on top (+ small splash droplets) -> navigate.
   INTO a page (sessionStorage flag set): page starts flat yellow (pre-paint,
     see the inline <head> snippet) -> yellow holes open onto orange -> orange
     holes open onto the page.
   No dependencies. Reduced motion: plain navigation, no overlay.            */
(function () {
  var ORANGE = '#FF531B', LEMON = '#F6F396', NS = 'http://www.w3.org/2000/svg';
  var KEY = 'mobaBubble', R = 790;               // bubble radius in canvas units (Mana: 475 * 156%)
  // [x, y, delay in frames]  (Mana's layout, coverage checked for portrait + landscape)
  var A = [[555, 1223, 0], [260, 371, 2], [1409, 904, 3], [647, 1671, 6], [1763, -169, 7], [1003, 695, 9], [1759, 1647, 15]];
  var B = A.map(function (p) { return [p[1], 2000 - p[0], p[2]]; });   // same set rotated -90deg
  var DROPS = [[300, 760, 70], [1700, 420, 54], [1180, 1880, 62], [820, 160, 46], [1560, 1260, 40], [420, 1520, 58]];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busy = false;

  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeBack = function (t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var popAway = function (t) { return Math.sin(Math.PI * Math.min(1, t * 1.15)); };   // droplet: pop up, then shrink away

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function makeOverlay() {
    var wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.className = 'moba-bubble';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:auto;';
    var svg = el('svg', { viewBox: '0 0 2000 2000', preserveAspectRatio: 'xMidYMid slice', width: '100%', height: '100%' });
    svg.style.cssText = 'display:block;width:100%;height:100%';
    wrap.appendChild(svg);
    document.body.appendChild(wrap);
    return { wrap: wrap, svg: svg, defs: el('defs', {}, svg) };
  }
  // tiny timeline: items {start, dur, ease, set(p)} all driven by one rAF loop
  function play(items) {
    return new Promise(function (done) {
      var t0 = performance.now(), end = 0;
      items.forEach(function (it) { end = Math.max(end, it.start + it.dur); it.set(0); });
      (function tick(now) {
        var t = now - t0;
        items.forEach(function (it) {
          var p = Math.min(1, Math.max(0, (t - it.start) / it.dur));
          it.set(it.ease(p));
        });
        t < end ? requestAnimationFrame(tick) : done();
      })(t0);
    });
  }
  function grow(circle, r, start, dur, ease) {
    return { start: start, dur: dur, ease: ease, set: function (p) { circle.setAttribute('r', Math.max(0, r * p)); } };
  }
  function toCanvas(svg, x, y) {
    var pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // ---------- leaving: cover the screen, then go ----------
  function cover(href, x, y) {
    busy = true;
    var o = makeOverlay(), items = [];
    var gO = el('g', {}, o.svg), gL = el('g', {}, o.svg);
    var tap = toCanvas(o.svg, x, y);
    var first = el('circle', { cx: tap.x, cy: tap.y, r: 0, fill: ORANGE }, gO);
    items.push(grow(first, 760, 0, 460, easeOut));
    A.forEach(function (p) {
      items.push(grow(el('circle', { cx: p[0], cy: p[1], r: 0, fill: ORANGE }, gO), R, 60 + p[2] * 16, 620, easeBack));
    });
    DROPS.forEach(function (d, i) {     // yellow droplets splash out over the orange
      items.push(grow(el('circle', { cx: d[0], cy: d[1], r: 0, fill: LEMON }, gO), d[2], 140 + i * 40, 520, popAway));
    });
    B.forEach(function (p) {
      items.push(grow(el('circle', { cx: p[0], cy: p[1], r: 0, fill: LEMON }, gL), R, 330 + p[2] * 16, 620, easeBack));
    });
    DROPS.forEach(function (d, i) {     // orange droplets ride on the yellow wave
      items.push(grow(el('circle', { cx: 2000 - d[0], cy: d[1], r: 0, fill: ORANGE }, gL), d[2] * .8, 420 + i * 40, 520, popAway));
    });
    play(items).then(function () {
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
      location.href = href;
    });
  }

  // ---------- arriving: open holes in yellow, then in orange ----------
  function reveal() {
    var o = makeOverlay(), items = [];
    document.documentElement.classList.remove('bubble-cover');
    function layer(color, set, start, id) {
      var m = el('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -1000, y: -1000, width: 4000, height: 4000 }, o.defs);
      el('rect', { x: -1000, y: -1000, width: 4000, height: 4000, fill: '#fff' }, m);
      el('rect', { x: -1000, y: -1000, width: 4000, height: 4000, fill: color, mask: 'url(#' + id + ')' }, o.svg);
      set.forEach(function (p) {
        items.push(grow(el('circle', { cx: p[0], cy: p[1], r: 0, fill: '#000' }, m), R, start + p[2] * 16, 600, easeInOut));
      });
    }
    layer(ORANGE, B, 280, 'mobaHoleO');   // underneath
    layer(LEMON, A, 60, 'mobaHoleL');     // on top, opens first
    play(items).then(function () { o.wrap.remove(); });
  }

  // ---------- wiring ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-bubble]');
    if (!a || busy || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (reduce) return;                                   // plain navigation
    e.preventDefault();
    var r = a.getBoundingClientRect();
    var x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    cover(a.href, x, y);
  });

  var arriving = false;
  try { arriving = sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (e) {}
  if (arriving && !reduce) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal); else reveal();
  } else {
    document.documentElement.classList.remove('bubble-cover');
  }
  window.__mobaBubble = { cover: cover, reveal: reveal };   // debug: replay from the console
  // back/forward cache: never come back to a covered page
  addEventListener('pageshow', function (e) {
    if (e.persisted) { busy = false; document.querySelectorAll('.moba-bubble').forEach(function (n) { n.remove(); }); }
  });
})();
