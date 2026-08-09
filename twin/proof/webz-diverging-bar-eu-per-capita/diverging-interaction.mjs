// twin/proof/webz-diverging-bar-eu-per-capita/diverging-interaction.mjs
//
// This beat's OWN interaction script — not `twin-chart-web/assets/interaction.mjs`, which resolves
// a reading by NEAREST-x over one shared `.hit-area` because a line chart's readings are points on
// a curve. Nothing to resolve here: this beat's 27 rows tile the plot's full height exactly (no
// band padding, see `diverging-geometry.ts`), so the pointer is always inside exactly one row's own
// rect. `render-web.mjs` inlines THIS file instead of the skill's own copy, the same swap
// `weby-lollipop-co2-per-capita/render-web.mjs`'s `patchForThisBeat` performs for its own beat.
//
// Every `.row-hit` rect already carries its own `data-detail` string and its own `aria-label`,
// baked in server-side by `DivergingBarWeb.tsx` — this script never invents or recomputes either,
// and never formats a number. It only ever toggles a rect's own `row-active` class and the shared
// `#tooltip`'s content and position; it has no code path that can reach the title, the caveat, the
// source, a bar, the zero line, the average rule and its label, a country name, a printed value
// label or the subject's annotation. That is `web-discipline.md`'s "What must not become
// interactive", enforced by there being no such code rather than by a rule nobody re-reads.

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
    const tw = tooltip.offsetWidth || 200;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(
      Math.max(clientX - tw / 2, 8),
      window.innerWidth - tw - 8,
    );
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each row's
  // own rect spans the row's FULL band height and the plot's full width, so a touch reader never
  // has to land a tap on a bar that may be 1.3px long — anywhere in the row resolves to that row.
  rows.forEach((row, i) => {
    function fromPointer(evt) {
      show(row, evt.clientX, evt.clientY);
    }
    row.addEventListener("pointerenter", fromPointer);
    row.addEventListener("pointermove", fromPointer);
    row.addEventListener("pointerdown", fromPointer);
    // MOUSE AND PEN ONLY. A touch pointer is destroyed the instant the finger lifts and the browser
    // fires `pointerleave` immediately after `pointerup` for it, so an unguarded handler wipes the
    // tooltip a tap has just opened and the reading this beat's own alt text promises a tap reveals
    // is never actually visible on a phone. A touch reader's tooltip is cleared by the
    // document-level `pointerdown` below instead: it stays up until they tap somewhere else.
    row.addEventListener("pointerleave", function (evt) {
      if (evt.pointerType === "touch") return;
      clear();
    });

    // Keyboard: every row's rect is already `tabIndex={0}` at build time and works with this script
    // absent entirely — the invariant `web-discipline.md`, "Keyboard and touch", states. This layer
    // adds the same detail box hover shows, plus ArrowUp/ArrowDown/Home/End to move between rows in
    // their own printed (sorted) order without leaving focus.
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
