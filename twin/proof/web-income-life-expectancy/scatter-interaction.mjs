// twin/proof/web-income-life-expectancy/scatter-interaction.mjs
//
// This beat's OWN interaction script — not `twin-chart-web/assets/interaction.mjs`, the line-genre
// skill's own copy. `render-web.mjs` inlines this one instead, the same way the skill's own
// `renderWeb` inlines its own (see that file's doc-comment for exactly how and why).
//
// Why a second implementation was needed, not a reuse: the skill's `nearestIndex(cxs, x)` resolves
// a pointer position to the reading whose `cx` (x-coordinate ONLY) is closest — correct for a line
// beat, where every reading has a distinct x (one per year) and y carries the value being read off.
// A scatter has ~164 points scattered freely in BOTH x and y; two countries can sit at nearly the
// same GDP (x) with very different life expectancies (y) — Switzerland and the United States in
// this very dataset are ~6px apart in x and ~50px apart in y. Resolving by x alone would report
// whichever of the two has the marginally closer x, regardless of which one the pointer is actually
// near vertically — silently wrong, the exact kind of defect a static render's PNG can never reveal
// (`web-discipline.md`, "Verification": this class of bug only shows up driving a live pointer).
// `nearestPointIndex` below measures real 2D distance instead.
//
// Second difference: the skill's own CSS toggles `.pt`'s FILL between transparent (rest) and muted
// (hover/focus/active), because that genre's points are invisible until interacted with. This
// beat's points are visibly drawn from the start (the cloud IS the argument) and, since the fluid
// frame stretches its `viewBox`, they are HTML elements rather than SVG circles that would render
// as ellipses — see `IncomeLifeExpectancyWeb.tsx`'s own doc-comment. So hover/focus here draws a
// RING around the dot via the same `.pt-active` class name (CSS override lives in
// `render-web.mjs`'s own `EXTRA_CSS`, appended after the skill's generic stylesheet). The class name
// and the DOM wiring shape below otherwise follow `interaction.mjs` closely on purpose — same
// tooltip element, same hover/tap/keyboard parity, same `data-detail`/`aria-label` discipline — so a
// reader who has used the CO₂ beat meets the same interaction language here.
//
// `nearestPointIndex` is exported and pure — no DOM — so it can be sanity-checked directly.
// `initChart`/`initAll` are DOM wiring and are proven, per `twin-doctrine`'s own rule, by driving a
// real browser, never by asserting against an unwatched DOM emulation.

/** Index of the point in `pts` (each `{x, y}` in the same pixel space the pointer position is
 *  given in) closest to `(x, y)` by ordinary Euclidean distance. Squared distance is compared
 *  directly — the ordering a `sqrt` would produce is identical, and skipping it is one call fewer
 *  per of the ~164 points, on every pointer move. */
export function nearestPointIndex(pts, x, y) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - x;
    const dy = pts[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Wires one plot — its `.pt` dots, the `.hit-area` rectangle inside its `<svg>`, and the shared
 *  tooltip element — to hover, tap and keyboard. Every dot already carries its own `data-detail`
 *  string and its own `aria-label`, baked in server-side; this function never invents or recomputes
 *  either.
 *
 *  The dots are HTML elements now, not SVG circles, and they are measured in SCREEN pixels rather
 *  than read back as baked coordinates. Both follow from the fluid frame: the `<svg>` stretches with
 *  `preserveAspectRatio="none"`, so a `<circle>` would render as an ellipse (see
 *  `IncomeLifeExpectancyWeb.tsx`'s own doc-comment) — and once the frame's own x and y scales differ,
 *  "nearest" measured in the geometry's canonical units is no longer "nearest" on the reader's
 *  screen. The old copy inverse-transformed the pointer through `getScreenCTM()` and compared baked
 *  `data-x`/`data-y`, which was exact only while the two scales matched. Measuring each dot's real
 *  rect makes it exact at every width, at the cost of one measuring pass — taken once, and again on
 *  resize, never per pointer move. */
export function initChart(plot, tooltip) {
  const points = Array.prototype.slice.call(plot.querySelectorAll(".pt"));
  if (points.length === 0) return;
  const hitArea = plot.querySelector(".hit-area");
  let coords = [];
  function measure() {
    coords = points.map((p) => {
      const r = p.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }
  measure();
  window.addEventListener("resize", measure);

  function clear() {
    points.forEach((p) => p.classList.remove("pt-active"));
    tooltip.hidden = true;
  }

  function show(point, clientX, clientY) {
    points.forEach((p) => p.classList.toggle("pt-active", p === point));
    tooltip.textContent = point.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Resolution is
  // nearest-point-in-2D over the whole plot rectangle, so a touch reader never has to land a tap
  // exactly on a 2-3px circle — any tap inside the plot resolves to whichever of the ~164 dots is
  // actually closest to it.
  function fromPointer(evt) {
    const i = nearestPointIndex(coords, evt.clientX, evt.clientY);
    show(points[i], evt.clientX, evt.clientY);
  }

  if (hitArea) {
    hitArea.addEventListener("pointermove", fromPointer);
    hitArea.addEventListener("pointerdown", fromPointer);
    hitArea.addEventListener("pointerleave", clear);
  }

  // Keyboard: every point is already `tabIndex={0}` at build time (works with this script absent
  // entirely — the same invariant `web-discipline.md`, "Keyboard and touch", states for the line
  // genre). This layer adds the same detail box hover shows, plus Left/Right/Home/End to move
  // between points in DOM order (this beat's own DOM order is the CSV's own row order, i.e.
  // alphabetical by country — an intuitive-enough sequence for a reader stepping through by
  // keyboard, and simpler than trying to derive a 2D "next nearest" ordering no reader would expect
  // to be stable anyway).
  points.forEach((point, i) => {
    point.addEventListener("focus", function () {
      const rect = point.getBoundingClientRect();
      show(point, rect.left + rect.width / 2, rect.top);
    });
    point.addEventListener("blur", clear);
    point.addEventListener("keydown", function (evt) {
      let nextIndex = null;
      if (evt.key === "ArrowRight") nextIndex = Math.min(i + 1, points.length - 1);
      else if (evt.key === "ArrowLeft") nextIndex = Math.max(i - 1, 0);
      else if (evt.key === "Home") nextIndex = 0;
      else if (evt.key === "End") nextIndex = points.length - 1;
      else if (evt.key === "Escape") {
        clear();
        point.blur();
        return;
      }
      if (nextIndex !== null && nextIndex !== i) {
        evt.preventDefault();
        points[nextIndex].focus();
      }
    });
  });

  document.addEventListener("pointerdown", function (evt) {
    if (plot.contains(evt.target) || tooltip.contains(evt.target)) return;
    clear();
  });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  document.querySelectorAll(".chart-plot").forEach(function (plot) {
    initChart(plot, tooltip);
  });
}

// Guarded rather than a bare top-level call: this file can also be read/imported in a context with
// no `document` (e.g. inspecting `nearestPointIndex` directly). In the browser the guard is always
// true, so the inlined `<script>` self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
