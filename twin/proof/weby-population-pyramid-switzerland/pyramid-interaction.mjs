// twin/proof/weby-population-pyramid-switzerland/pyramid-interaction.mjs
//
// This beat's OWN interaction script — not `twin-chart-web/assets/interaction.mjs` (the line
// genre's own copy, which resolves hover/tap by NEAREST-X over one shared `.hit-area` overlay) and
// not `web-income-life-expectancy/scatter-interaction.mjs` (nearest-2D-point over one shared
// overlay, for a cloud with no natural tiling). Neither mechanic fits here: `render-web.mjs`
// bakes one `.row-hit` rect PER AGE BAND, sized to that band's own full row slot
// (`pyramid-geometry.ts`'s `hitY`/`hitHeight`), edge-to-edge with its neighbours — the 21 rows
// already TILE the entire plot rectangle exactly, with no gaps and no overlaps. That means each
// row's own native pointer events (`pointerenter`/`pointerleave`) already resolve correctly on
// their own; no shared overlay and no nearest-neighbour distance math is needed, unlike either
// prior beat.
//
// `data-detail` on every `.row-hit` already carries BOTH sexes' EXACT figures for that band, baked
// in server-side (`SwissAgePyramidWeb.tsx`) — this script never formats a number, it only reads the
// attribute back, the same discipline every other beat's own interaction script keeps.
//
// Keyboard: rows are rendered in visual top-to-bottom order (oldest band at the top —
// `SwissAgePyramidWeb.tsx`'s own `rowsTopToBottom`), so DOM order already matches the vertical axis
// a sighted reader would expect `ArrowUp`/`ArrowDown` to follow. `Home`/`End` jump to the oldest/
// youngest band.
//
// `initChart`/`initAll` are DOM wiring and are proven, per `twin-doctrine`'s own rule, by driving a
// real browser, never by asserting against an unwatched DOM emulation.

/** Wires one `.chart-plot` — its `.row-hit` elements and the shared tooltip — to hover, tap and
 *  keyboard. Every row already carries its own `data-detail` string and its own `aria-label`, baked
 *  in server-side; this function never invents or recomputes either.
 *
 *  IT TAKES THE PLOT, NOT AN `<svg>` — changed when this beat moved to the fluid frame. A band's
 *  hit target spans BOTH halves of the mirror AND the age-label gutter between them, and the two
 *  halves are now two independent `<svg>` elements with a CSS track in the middle, so no SVG rect
 *  can cover a whole band. The rows are `<div class="row-hit">` in a layer over all three tracks
 *  instead. Nothing else about this file's mechanic changed: 21 rows still tile the plot exactly,
 *  so each row's own native pointer events still resolve on their own. */
export function initChart(plot, tooltip) {
  const rows = Array.prototype.slice.call(plot.querySelectorAll(".row-hit"));
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
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each row is
  // its own hit target (see this file's own header comment) — `pointerenter`/`pointerdown` on that
  // ONE row is enough, no coordinate math and no shared overlay required.
  rows.forEach((row) => {
    row.addEventListener("pointerenter", function (evt) {
      show(row, evt.clientX, evt.clientY);
    });
    row.addEventListener("pointerdown", function (evt) {
      show(row, evt.clientX, evt.clientY);
    });
    // MOUSE AND PEN ONLY. A touch pointer is destroyed the instant the finger lifts, and the
    // browser fires `pointerleave` immediately after `pointerup` for it — so an unguarded
    // `pointerleave` handler wipes the tooltip a tap has just opened. This beat's own caveat line
    // says "Hover, tap or focus any band for its exact figures", and the tap half of that was
    // false: the figures appeared and vanished inside one gesture. Measured by dispatching a real
    // touch sequence, not read off the source. A touch reader's tooltip is cleared by the
    // document-level `pointerdown` below instead: it stays up until they tap somewhere else.
    row.addEventListener("pointerleave", function (evt) {
      if (evt.pointerType === "touch") return;
      clear();
    });
  });

  // Keyboard: every row is already `tabIndex={0}` at build time (works with this script absent
  // entirely — the same invariant `web-discipline.md`, "Keyboard and touch", states for every web
  // beat). This layer adds the same detail box hover shows, plus ArrowUp/ArrowDown/Home/End to move
  // between rows without one Tab press per band — rows stack vertically, so Up/Down is this type's
  // own natural axis (`web-discipline.md`'s per-genre convention: whichever key matches the chart's
  // own layout direction), top = oldest, per this beat's own DOM order.
  rows.forEach((row, i) => {
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
// no `document`. In the browser the guard is always true, so the inlined `<script>` self-starts the
// moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
