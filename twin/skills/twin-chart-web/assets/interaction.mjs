// twin/skills/twin-chart-web/assets/interaction.mjs
//
// The one script the web genre ships, inlined verbatim into the self-contained HTML by
// `scripts/render-web.mjs` (which strips the `export` keyword from each top-level declaration so
// this file can also sit as a plain classic `<script>` — no `type="module"`, no bundler, so it
// keeps working in a CMS iframe or a sandboxed embed that restricts module scripts).
//
// `nearestIndex` is exported and pure — no DOM — so it is unit-tested directly
// (`test/interaction.test.ts`). `initChart`/`initAll` are DOM wiring and are NOT unit-tested here:
// per `twin-doctrine`'s own verification rule, an interactive genre is verified by driving a real
// browser, not by asserting against a DOM emulation nobody looked at
// (`references/web-discipline.md`, "Verification").
//
// What this file does NOT do: recompute any geometry. Every point's `cx`/`cy` and its exact
// `data-detail` string were already computed server-side, from the same `crossingGeometry`/`fr`
// the static and video genres use, and baked into the SVG at build time. This script only reads
// those attributes back off the DOM and positions a tooltip — it never re-derives a coordinate or
// re-formats a number, so there is exactly one implementation of "what year is this" for all three
// genres to disagree about, and it lives in `proof/crossing-geometry.ts`.

/** Index of the entry in `cxs` closest to `x`. Pure, so it is testable without a DOM — the same
 *  boundary `crossingGeometry`'s own geometry/drawing split draws. */
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

/** Wires one `<svg class="chart">` — its `.pt` points, its `.hit-area` overlay, and the shared
 *  tooltip element — to hover, tap and keyboard. Every point already carries its own `data-detail`
 *  string and its own `aria-label`; this function never invents either. */
export function initChart(svg, tooltip) {
  const points = Array.prototype.slice.call(svg.querySelectorAll(".pt"));
  if (points.length === 0) return;
  const hitArea = svg.querySelector(".hit-area");
  const cxs = points.map((p) => parseFloat(p.getAttribute("cx")));

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

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike, and the
  // nearest-point-by-x overlay means a touch reader does not have to land a tap on a 5px circle —
  // any tap inside the plot resolves to the reading closest to it.
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
    hitArea.addEventListener("pointerleave", clear);
  }

  // Keyboard: every point is already `tabIndex={0}` at build time (works with this script absent
  // entirely — see the component's own doc-comment). This layer adds the same detail box that
  // hover shows, plus Left/Right/Home/End to move between readings without leaving focus.
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
    if (svg.contains(evt.target) || tooltip.contains(evt.target)) return;
    clear();
  });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  document.querySelectorAll("svg.chart").forEach(function (svg) {
    initChart(svg, tooltip);
  });
}

// Guarded rather than a bare top-level call: this file is also imported directly by
// `test/render-web.test.ts` (for the pure `nearestIndex` helper), in a context with no `document`.
// In the browser the guard is always true, so the inlined `<script>` still self-starts the moment
// it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
