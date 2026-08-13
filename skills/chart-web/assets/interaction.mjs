// twin/skills/chart-web/assets/interaction.mjs
//
// The one script the web format ships, inlined verbatim into the self-contained HTML by
// `scripts/render-web.mjs` (which strips the `export` keyword from each top-level declaration so
// this file can also sit as a plain classic `<script>` — no `type="module"`, no bundler, so it
// keeps working in a CMS iframe or a sandboxed embed that restricts module scripts).
//
// `nearestIndex` is exported and pure — no DOM — so it is unit-tested directly
// (`test/interaction.test.ts`). `initChart`/`initAll` are DOM wiring and are NOT unit-tested here:
// per `doctrine`'s own verification rule, an interactive format is verified by driving a real
// browser, not by asserting against a DOM emulation nobody looked at
// (`references/web-discipline.md`, "Verification").
//
// What this file does NOT do: recompute any geometry. Every point's `cx`/`cy` and its exact
// `data-detail` string were already computed server-side, from the same `crossingGeometry`/`fr`
// the static and video formats use, and baked into the SVG at build time. This script only reads
// those attributes back off the DOM and positions a tooltip — it never re-derives a coordinate or
// re-formats a number, so there is exactly one implementation of "what year is this" for all three
// formats to disagree about, and it lives in the story's own `crossing-geometry.ts` (for the CO₂
// beat, `proof/co2-suisse/crossing-geometry.ts`).

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

/**
 * THE HOVERABLE LINE. Wires every `.line-hit` in the page — the transparent stroked twin a
 * component draws immediately after a visible path — to hover, tap and keyboard focus.
 *
 * WHY A LINE NEEDS ITS OWN WIRING AT ALL. Every other target in this format is a point or a box, and
 * `initChart` above resolves a pointer to the nearest of them by x. A line has no x: a slope's
 * connector is a diagonal whose bounding box is mostly empty space, and a route's segment doubles
 * back on itself. The reading a line carries is also different in kind — it is what LINKS its two
 * ends (both values, the change between them, the category), which is exactly the thing a
 * per-endpoint tooltip cannot say however many endpoints it answers.
 *
 * `pointer-events: stroke` is the load-bearing property, and it is set in the format's stylesheet
 * rather than here: it makes the STROKE the hit region instead of the bounding box. The twin is
 * transparent and generously wide (`LINE_HIT_WIDTH` in the component that draws it), so the reader
 * aims at the line they can see and hits a target twice the touch-target floor.
 *
 * This function never invents a reading: it reads back the `data-detail` string the component baked
 * server-side from the beat's own frozen data, into the same `#tooltip` every other mode uses.
 */
export function initLines(root, tooltip) {
  const lines = Array.prototype.slice.call(root.querySelectorAll(".line-hit"));
  if (lines.length === 0) return;

  // WHY A LINE IS RESOLVED BY NEAREST AND NOT BY WHICHEVER TWIN CAUGHT THE EVENT. The twin is
  // deliberately wide, so on a chart whose lines converge it covers its neighbours, and the one the
  // browser hands the event to is simply the last in document order. Measured on the slope beat at
  // 375 x 812 before this existed: 21 of 60 probes taken ON a line's own stroke were answered by a
  // DIFFERENT line — "pointing 50% along Switzerland answered with Spain". Same shape as the
  // nearest-by-x rule `initChart` already applies to points, in the coordinate a line actually has:
  // distance to the stroke. Sampled rather than solved, because a `<path>` may be any shape and
  // `getPointAtLength` is the only thing that knows.
  const SAMPLES = 48;
  let cache = null;
  function samples() {
    const key = window.innerWidth + "x" + window.innerHeight;
    if (cache && cache.key === key) return cache.points;
    const points = lines.map(function (line) {
      const total = line.getTotalLength ? line.getTotalLength() : 0;
      const m = line.getScreenCTM();
      const out = [];
      if (!total || !m) return out;
      for (let i = 0; i <= SAMPLES; i++) {
        const p = line.getPointAtLength((total * i) / SAMPLES);
        out.push({
          x: p.x * m.a + p.y * m.c + m.e,
          y: p.x * m.b + p.y * m.d + m.f,
        });
      }
      return out;
    });
    cache = { key: key, points: points };
    return points;
  }

  function nearest(clientX, clientY) {
    const points = samples();
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < lines.length; i++)
      for (const p of points[i]) {
        const d = (p.x - clientX) * (p.x - clientX) + (p.y - clientY) * (p.y - clientY);
        if (d < bestDist) {
          bestDist = d;
          best = lines[i];
        }
      }
    return best;
  }

  function clear() {
    lines.forEach(function (l) {
      l.classList.remove("line-active");
    });
    tooltip.hidden = true;
  }

  function show(line, clientX, clientY) {
    lines.forEach(function (l) {
      l.classList.toggle("line-active", l === line);
    });
    tooltip.textContent = line.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(
      Math.max(clientX - tw / 2, 8),
      window.innerWidth - tw - 8,
    );
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  function fromPointer(evt) {
    const line = nearest(evt.clientX, evt.clientY);
    if (line) show(line, evt.clientX, evt.clientY);
  }

  lines.forEach(function (line) {
    line.addEventListener("pointerenter", fromPointer);
    line.addEventListener("pointermove", fromPointer);
    line.addEventListener("pointerdown", fromPointer);
    line.addEventListener("pointerleave", clear);
    // Keyboard parity: the twin is focusable at build time, so Tab reaches every line and its
    // `aria-label` is read with this script absent. Focus is unambiguous about which line was
    // addressed, so it never goes through `nearest`.
    line.addEventListener("focus", function () {
      const r = line.getBoundingClientRect();
      show(
        line,
        Math.round(r.left + r.width / 2),
        Math.round(r.top + r.height / 2),
      );
    });
    line.addEventListener("blur", clear);
  });

  document.addEventListener("pointerdown", function (evt) {
    if (evt.target && evt.target.closest && evt.target.closest(".line-hit"))
      return;
    if (tooltip.contains(evt.target)) return;
    clear();
  });
}

/**
 * THE ENTRANCE TRIGGER — the whole of this format's entrance that is script, and it is one class.
 *
 * WHAT IT DOES NOT DO, which is the point. It writes no opacity, no transform and no length. Every
 * number the entrance uses was computed server-side from the beat's own geometry and the entrance
 * contract (`assets/entrance.ts`) and written on the elements as custom properties; the keyframes
 * and the delays live in the stylesheet, inside `@media (prefers-reduced-motion: no-preference)`.
 * This function's entire job is to say WHEN, once, per figure.
 *
 * WHY AN OBSERVER AND NOT `DOMContentLoaded`. This format's delivery model is an embed: a CMS drops
 * the file into an article and the figure may sit two screens below the fold. An entrance that
 * plays on load plays to nobody, and a reader who scrolls to it finds a finished chart with a
 * two-second build they never saw — strictly worse than never having animated it. So the trigger is
 * the figure ENTERING THE READER'S VIEW.
 *
 * THE MARGIN IS A FRACTION OF THE WINDOW, NOT OF THE FIGURE, and that is deliberate: a
 * `threshold: 0.35` never fires for a figure taller than the viewport, which on a phone is most of
 * them. `rootMargin: "0px 0px -15% 0px"` shrinks the observed region by 15 % of the window's own
 * height instead, so the entrance starts once the figure's top has come a sixth of the way up the
 * screen — reachable at every figure height there is.
 *
 * ONCE, AND THEN NEVER AGAIN: `unobserve` on the first intersection. A graphic that rebuilt itself
 * every time it scrolled past would be decoration, and the contract has no loop in it.
 *
 * NO OBSERVER AT ALL (an engine without `IntersectionObserver`): the class goes on immediately. The
 * entrance plays on load, which is the behaviour this function exists to improve on but is still
 * strictly better than a figure that never gets its class and — with `animation-fill-mode:
 * backwards` scoped to `.entered` — is complete either way. It is never the settled page that is at
 * risk here; only when the build runs.
 *
 * A figure whose beat declared no layers gets no observer: the query below finds nothing to watch.
 * Inert in a page that did not ask for it, exactly as `initLines` above is inert in a page with no
 * `.line-hit` — the shape this file already had.
 */
export function initEntrance(root) {
  const figures = Array.prototype.slice
    .call(root.querySelectorAll(".chart-figure"))
    .filter(function (figure) {
      return figure.querySelector("[data-entrance-motion]") !== null;
    });
  if (figures.length === 0) return;

  if (typeof IntersectionObserver === "undefined") {
    figures.forEach(function (figure) {
      figure.classList.add("entered");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("entered");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -15% 0px" },
  );
  figures.forEach(function (figure) {
    observer.observe(figure);
  });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  document.querySelectorAll("svg.chart").forEach(function (svg) {
    initChart(svg, tooltip);
    initLines(svg, tooltip);
  });
  initEntrance(document);
}

// Guarded rather than a bare top-level call: this file is also imported directly by
// `test/render-web.test.ts` (for the pure `nearestIndex` helper), in a context with no `document`.
// In the browser the guard is always true, so the inlined `<script>` still self-starts the moment
// it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
