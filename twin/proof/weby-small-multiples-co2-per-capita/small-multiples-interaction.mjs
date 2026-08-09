// twin/proof/weby-small-multiples-co2-per-capita/small-multiples-interaction.mjs
//
// This beat's OWN interaction script — not `twin-chart-web/assets/interaction.mjs`, the single-
// panel line genre's own copy. `render-web.mjs` inlines this one instead (same substitution
// pattern `web-income-life-expectancy/render-web.mjs`'s `patchForThisBeat` uses).
//
// WHY A SECOND IMPLEMENTATION WAS NEEDED, NOT A REUSE: the skill's own `nearestIndex` resolves a
// pointer position against ONE flat array of `cx` values, drawn from `svg.querySelector(".pt")`
// across the WHOLE svg — correct when there is exactly one panel. This beat's SVG holds FOUR
// panels, each its own independent line with its own 75 points sharing the SAME x-domain (all
// four run 1950-2024) — a flat, svg-wide `nearestIndex` would silently resolve a pointer hovering
// Poland's 1973 reading against whichever OTHER panel's 1973 point happens to sit at a marginally
// closer x, the exact cross-panel bleed class of bug this beat's own build instructions warn
// about by name. The fix is not a smarter distance metric (unlike the scatter beat's own
// `nearestPointIndex`, which needed real 2D distance) — it is SCOPE: never build one array of
// points spanning more than one panel in the first place.
//
// `initChart` below wires each `<g class="panel">` independently, inside its own iteration of the
// `panels.forEach` loop: `points`, `hitArea` and `cxs` are all declared INSIDE that loop body, so
// each panel's own closure captures only ITS OWN 75 points. `fromPointer` for panel N's hit-area
// can structurally only ever call `nearestIndex` against panel N's own `cxs` — there is no shared,
// svg-wide points array anywhere in this file for a bug to reach across into. That is what makes
// cross-panel bleed impossible by construction, not merely avoided by convention.
//
// `nearestIndex` itself is unchanged from the skill's own pure helper (x-only distance is still
// correct here — within one panel, x is unique per year, and y carries the value, same as a
// single-panel line beat). It is redeclared, not imported, for the same reason every beat in this
// project duplicates rather than links: nothing under `proof/` may import out of a skill's own
// `assets/`, and there is no shared vendoring path a beat could reach it through.
//
// Keyboard: every point already carries `tabIndex={0}` at build time (works with this script
// absent entirely, same invariant `web-discipline.md` states for the line genre). Tab moves
// through the DOM in document order — panel 1's 75 points, then panel 2's, then panel 3's, then
// panel 4's, because that is the order the four `<g class="panel">` elements were written in the
// SVG — so Tab naturally moves BETWEEN panels once a panel's own 75 points are exhausted, with no
// extra code needed for that transition. ArrowRight/ArrowLeft/Home/End, by contrast, are wired
// PER PANEL below (`nextIndex` is clamped against that panel's own `points.length`), so stepping
// with the arrow keys can never walk off the end of one country's line into another's.

/** Index of the entry in `cxs` closest to `x`. Pure — no DOM. Unchanged from the skill's own
 *  `interaction.mjs`; what changed is that every CALLER of this function below only ever passes
 *  it one panel's own `cxs` array, never an svg-wide one. */
export function nearestIndex(cxs, x) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < cxs.length; i++) {
    const d = Math.abs(cxs[i] - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Wires one `<svg class="chart">` holding FOUR independent `<g class="panel">` elements — each
 *  panel's own `.hit-area` rect and its own 75 `.pt` circles, plus the one shared tooltip element.
 *  Every point already carries its own `data-detail` string (`"Poland, 1973: 12.4 t"`-shaped) and
 *  its own `aria-label`, baked in server-side; this function never invents or recomputes either. */
export function initChart(svg, tooltip) {
  const panelEls = Array.prototype.slice.call(svg.querySelectorAll(".panel"));
  // Collected across every panel ONLY so `show`/`clearAll` can toggle the single active dot and
  // hide the one shared tooltip regardless of which panel it currently belongs to — this array is
  // never consulted to RESOLVE a hover or a keyboard step, only to clear one once it is known.
  const allPoints = [];

  function clearAll() {
    allPoints.forEach(function (p) {
      p.classList.remove("pt-active");
    });
    tooltip.hidden = true;
  }

  function show(point, clientX, clientY) {
    allPoints.forEach(function (p) {
      p.classList.toggle("pt-active", p === point);
    });
    tooltip.textContent = point.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  panelEls.forEach(function (panelEl) {
    // Scoped to THIS panel only — `querySelectorAll` called on `panelEl`, not `svg`, is what
    // keeps `points`/`cxs` from ever containing another country's readings.
    const points = Array.prototype.slice.call(panelEl.querySelectorAll(".pt"));
    if (points.length === 0) return;
    allPoints.push.apply(allPoints, points);
    const hitArea = panelEl.querySelector(".hit-area");
    const cxs = points.map(function (p) {
      return parseFloat(p.getAttribute("cx"));
    });

    // Hover and tap share one path: pointer events fire for mouse, pen and touch alike, and
    // resolution is nearest-reading-by-x over THIS panel's own plot rectangle only — a touch
    // reader tapping anywhere inside Poland's panel is never resolved against Germany's points,
    // because `cxs` here structurally cannot hold them.
    function fromPointer(evt) {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPoint = svg.createSVGPoint();
      svgPoint.x = evt.clientX;
      svgPoint.y = evt.clientY;
      const local = svgPoint.matrixTransform(ctm.inverse());
      show(points[nearestIndex(cxs, local.x)], evt.clientX, evt.clientY);
    }

    if (hitArea) {
      hitArea.addEventListener("pointermove", fromPointer);
      hitArea.addEventListener("pointerdown", fromPointer);
      hitArea.addEventListener("pointerleave", clearAll);
    }

    // Keyboard, scoped the same way: `i` and `points.length` below are THIS panel's own index and
    // count, so ArrowRight/ArrowLeft/Home/End can only ever move within this one country's own 75
    // years — Tab, which this code never intercepts, is what naturally carries focus on to the
    // next panel once this one's points are exhausted (see this file's own header comment).
    points.forEach(function (point, i) {
      point.addEventListener("focus", function () {
        const rect = point.getBoundingClientRect();
        show(point, rect.left + rect.width / 2, rect.top);
      });
      point.addEventListener("blur", clearAll);
      point.addEventListener("keydown", function (evt) {
        let nextIndex = null;
        if (evt.key === "ArrowRight") nextIndex = Math.min(i + 1, points.length - 1);
        else if (evt.key === "ArrowLeft") nextIndex = Math.max(i - 1, 0);
        else if (evt.key === "Home") nextIndex = 0;
        else if (evt.key === "End") nextIndex = points.length - 1;
        else if (evt.key === "Escape") {
          clearAll();
          point.blur();
          return;
        }
        if (nextIndex !== null && nextIndex !== i) {
          evt.preventDefault();
          points[nextIndex].focus();
        }
      });
    });
  });

  document.addEventListener("pointerdown", function (evt) {
    if (svg.contains(evt.target) || tooltip.contains(evt.target)) return;
    clearAll();
  });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  document.querySelectorAll("svg.chart").forEach(function (svg) {
    initChart(svg, tooltip);
  });
}

// Guarded rather than a bare top-level call, same reason the skill's own copy is: this file is
// also readable/importable in a context with no `document` (the pure `nearestIndex` helper). In
// the browser the guard is always true, so the inlined `<script>` self-starts unchanged.
if (typeof document !== "undefined") initAll();
