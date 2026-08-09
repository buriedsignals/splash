// twin/proof/weby-dumbbell-life-expectancy-gains/dumbbell-interaction.mjs
//
// This beat's OWN interaction script — not `twin-chart-web/assets/interaction.mjs` (the line
// genre's `nearestIndex`-by-x mechanic, wrong here) and not
// `web-income-life-expectancy/scatter-interaction.mjs` (nearest-by-2D-distance over a shared
// `.hit-area`, also wrong here). `render-web.mjs` inlines THIS file instead, the same way both of
// those other beats swap the skill's generic script for their own.
//
// Why a THIRD implementation was needed, not a reuse of either: both existing scripts solve a
// "which of these scattered points is the pointer nearest to" problem. This beat has no such
// problem. Ten countries, each with its own non-overlapping horizontal band
// (`dumbbell-geometry.ts`'s `scaleBand`-derived `bandTop`/`bandBottom`), already partition the
// entire plot rectangle — a pointer at any (x, y) inside the plot is inside exactly one row's own
// band, never ambiguous between two. So `DumbbellLifeExpectancyGainsWeb.tsx` draws one `.hit-row`
// rectangle PER ROW, each already sized to its own band and positioned at its own y — this script
// wires each rectangle directly to its own pointer/focus events. There is no shared `.hit-area`
// overlay here and no distance calculation: the DOM element the pointer is over/the element that
// has focus already tells this script which row to show, in a single step.
//
// `data-detail`/`aria-label` on each `.hit-row` were baked in server-side by
// `DumbbellLifeExpectancyGainsWeb.tsx`'s own `describeRow` — this script never formats a number or
// invents a string, it only reads an attribute back, the same discipline every web beat in this
// skill keeps.

/** Wires one `<svg class="chart">` — its `.hit-row` rectangles and the shared tooltip element —
 *  to hover, tap and keyboard. `rows` is in top-to-bottom DOM order, which is also this beat's
 *  own gap-size-descending sort order (`render-web.mjs`), so `ArrowDown`/`ArrowUp` moving through
 *  DOM order also moves visually down/up the stacked rows — an intuitive keyboard mapping that
 *  needed no separate "next visually below" calculation. */
export function initChart(svg, tooltip) {
  const rows = Array.prototype.slice.call(svg.querySelectorAll(".hit-row"));
  if (rows.length === 0) return;

  function clear() {
    rows.forEach((r) => r.classList.remove("hit-row-active"));
    tooltip.hidden = true;
  }

  function show(row, clientX, clientY) {
    rows.forEach((r) => r.classList.toggle("hit-row-active", r === row));
    tooltip.textContent = row.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each row's
  // own rectangle already spans the full plot width and that row's own band height
  // (`DumbbellLifeExpectancyGainsWeb.tsx`), so a touch reader never has to land a tap on a 6px
  // dot — any tap anywhere in a row's own horizontal band resolves to that row.
  rows.forEach((row, i) => {
    row.addEventListener("pointermove", function (evt) {
      show(row, evt.clientX, evt.clientY);
    });
    row.addEventListener("pointerdown", function (evt) {
      show(row, evt.clientX, evt.clientY);
    });
    // MOUSE AND PEN ONLY. A touch pointer is destroyed the instant the finger lifts, and the
    // browser fires `pointerleave` immediately after `pointerup` for it — so an unguarded
    // `pointerleave` handler wipes the tooltip a tap has just opened, and the reading this beat's
    // own alt text promises "on hover, tap or keyboard focus" is never actually visible on a
    // phone. Measured by dispatching a real touch sequence, not read off the source. A touch
    // reader's tooltip is cleared by the document-level `pointerdown` below instead: it stays up
    // until they tap somewhere else.
    row.addEventListener("pointerleave", function (evt) {
      if (evt.pointerType === "touch") return;
      clear();
    });

    // Keyboard: every row is already `tabIndex={0}` at build time (works with this script absent
    // entirely — the same invariant `web-discipline.md`, "Keyboard and touch", states for the
    // line genre). This layer adds the same detail box hover shows, plus
    // ArrowUp/ArrowDown/Home/End to move between rows without leaving focus — rows stack
    // vertically here, unlike the line/scatter beats' horizontal ArrowLeft/ArrowRight.
    row.addEventListener("focus", function () {
      const rect = row.getBoundingClientRect();
      show(row, rect.left + rect.width / 2, rect.top);
    });
    row.addEventListener("blur", clear);
    row.addEventListener("keydown", function (evt) {
      let nextIndex = null;
      if (evt.key === "ArrowDown") nextIndex = Math.min(i + 1, rows.length - 1);
      else if (evt.key === "ArrowUp") nextIndex = Math.max(i - 1, 0);
      else if (evt.key === "Home") nextIndex = 0;
      else if (evt.key === "End") nextIndex = rows.length - 1;
      else if (evt.key === "Escape") {
        clear();
        row.blur();
        return;
      }
      if (nextIndex !== null && nextIndex !== i) {
        evt.preventDefault();
        rows[nextIndex].focus();
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

// Guarded rather than a bare top-level call: this file can also be read/imported in a context
// with no `document`. In the browser the guard is always true, so the inlined `<script>`
// self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
