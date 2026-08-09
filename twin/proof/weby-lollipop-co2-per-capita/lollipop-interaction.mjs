// twin/proof/weby-lollipop-co2-per-capita/lollipop-interaction.mjs
//
// This beat's OWN interaction script — not `twin-chart-web/assets/interaction.mjs` (the line
// genre's nearest-by-x mechanic over one shared `.hit-area`) and not
// `web-income-life-expectancy/scatter-interaction.mjs` (nearest-by-2D-distance over one shared
// `.hit-area`). Neither generalises here: a lollipop's rows already tile the plot's full height as
// disjoint, non-overlapping bands (`d3-scale`'s `scaleBand`), so there is nothing to resolve by
// "nearest" — the pointer is always inside exactly one row's own rect, or none. `render-web.mjs`
// inlines THIS file instead of the skill's own copy, the same swap
// `web-income-life-expectancy/render-web.mjs`'s `patchForThisBeat` performs for its own beat.
//
// Every `.row-hit` rect already carries its own `data-detail` string and its own `aria-label`,
// baked in server-side by `LollipopCo2Web.tsx` — this script never invents or recomputes either. It
// only ever toggles a rect's own `row-active` class and the shared `#tooltip`'s content/position; it
// has no code path that can touch the title, a stem, a dot, or a printed value label.

/** Wires one `<svg class="chart">` — its per-row `.row-hit` rects and the shared tooltip element —
 *  to hover, tap and keyboard. */
export function initChart(svg, tooltip) {
  const rows = Array.prototype.slice.call(svg.querySelectorAll(".row-hit"));
  if (rows.length === 0) return;

  function clear() {
    rows.forEach((r) => r.classList.remove("row-active"));
    tooltip.hidden = true;
  }

  function show(row, clientX, clientY) {
    rows.forEach((r) => r.classList.toggle("row-active", r === row));
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
  // own rect already spans the row's FULL band height and the plot's full width, so a touch reader
  // never has to land a tap on a thin stem or a 5px dot — anywhere in the row resolves to that row.
  rows.forEach((row, i) => {
    function fromPointer(evt) {
      show(row, evt.clientX, evt.clientY);
    }
    row.addEventListener("pointerenter", fromPointer);
    row.addEventListener("pointermove", fromPointer);
    row.addEventListener("pointerdown", fromPointer);
    // MOUSE AND PEN ONLY. A touch pointer is destroyed the instant the finger lifts, and the
    // browser fires `pointerleave` immediately after `pointerup` for it — so an unguarded
    // `pointerleave` handler wipes the tooltip a tap has just opened, and the reading this beat's
    // own alt text promises a tap reveals is never actually visible on a phone. Measured by
    // dispatching a real `Input.dispatchTouchEvent` sequence, not read off the source. A touch
    // reader's tooltip is cleared by the document-level `pointerdown` below instead: it stays up
    // until they tap somewhere else, which is the behaviour a tap-to-inspect control should have.
    row.addEventListener("pointerleave", function (evt) {
      if (evt.pointerType === "touch") return;
      clear();
    });

    // Keyboard: every row's rect is already `tabIndex={0}` at build time (works with this script
    // absent entirely — the same invariant `web-discipline.md`, "Keyboard and touch", states for
    // the line genre). This layer adds the same detail box hover shows, plus ArrowUp/ArrowDown/
    // Home/End to move between rows in their own printed (ranked) order without leaving focus.
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

// Guarded rather than a bare top-level call: this file can also be imported in a context with no
// `document`. In the browser the guard is always true, so the inlined `<script>` self-starts the
// moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
