// twin/proof/mapgen-hexgrid-web/interaction.mjs
//
// The one script this beat ships, inlined verbatim into the self-contained HTML by
// `render-web.mjs` (which strips the `export` keyword from each top-level declaration so this file
// can also sit as a plain classic `<script>` — no `type="module"`, no bundler, so it keeps working
// in a CMS iframe or a sandboxed embed that restricts module scripts). This beat's OWN physical copy
// of `twin-map-web/assets/interaction.mjs` — nothing under a beat may import out of a skill or
// another beat.
//
// ADAPTATION FOR A HEX-GRID (polygon hit targets, not point circles): a hex cell's own visible fill
// IS its hit target — cells tile the frame edge-to-edge with no gaps between them, unlike a symbol
// map's small circles floating in open water, so there is no separate, larger invisible hit shape
// to wire here (`HexGridWeb.tsx`'s own header comment: "cells tile edge-to-edge with no gaps to
// miss"). That turns out to need ZERO code changes to the mechanics below: every `.pt` element,
// whatever shape it is, already gets hover, tap and keyboard wired identically — `show()` reads
// `data-detail` off whichever element fired the event, and `getBoundingClientRect()` works the same
// on an SVG `<path>` as it does on a `<circle>`. The only thing that changed in adapting this file
// is this header comment.
//
// `initMap`/`initAll` are DOM wiring and are NOT unit-tested here: per `twin-doctrine`'s own
// verification rule, an interactive genre is verified by driving a real browser, not by asserting
// against a DOM emulation nobody looked at.

/** Wires one `<svg class="map">` — its `.pt` cells and the shared tooltip element — to hover, tap
 *  and keyboard. Every cell already carries its own `data-detail` string and its own `aria-label`;
 *  this function never invents either. */
export function initMap(svg, tooltip) {
  const points = Array.prototype.slice.call(svg.querySelectorAll(".pt"));
  if (points.length === 0) return;

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

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each hex
  // cell IS its own hit target (no proximity resolver or separate hit shape needed — see this
  // file's own header note).
  points.forEach((point, i) => {
    point.addEventListener("pointerenter", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointermove", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointerleave", clear);

    // Keyboard: every cell is already `tabIndex={0}` at build time (works with this script absent
    // entirely — see the seed's own doc-comment). This layer adds the same detail box hover shows,
    // plus Left/Right/Home/End to move between cells without leaving focus, in the same
    // densest-first order the accessible table below the map also reads in.
    point.addEventListener("focus", function () {
      const rect = point.getBoundingClientRect();
      show(point, rect.left + rect.width / 2, rect.top);
    });
    point.addEventListener("blur", clear);
    point.addEventListener("keydown", function (evt) {
      let nextIndex = null;
      if (evt.key === "ArrowRight" || evt.key === "ArrowDown")
        nextIndex = Math.min(i + 1, points.length - 1);
      else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp")
        nextIndex = Math.max(i - 1, 0);
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
  document.querySelectorAll("svg.map").forEach(function (svg) {
    initMap(svg, tooltip);
  });
}

// Guarded rather than a bare top-level call: this file is also imported directly by a future test
// in a context with no `document`. In the browser the guard is always true, so the inlined
// `<script>` still self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
