// twin/proof/web-co2-decline-slope/slope-interaction.mjs
//
// This beat's OWN interaction script — not the `twin-chart-web` skill's shared
// `assets/interaction.mjs`. That file's `initChart` resolves a pointer to the nearest reading by X
// alone, over one shared `.hit-area` rectangle: correct for a dense series where every point sits
// at its own distinct X along one curve (the co2-suisse beat's 75 years), and wrong here — a slope
// chart's twenty endpoints sit in exactly TWO columns, so the ten points sharing one column's fixed
// X could never be told apart by X-distance alone; hovering the 1990 column would always resolve to
// whichever point happens first in DOM order, regardless of where the pointer actually is
// vertically. `render-web.mjs` still calls the skill's generic `renderWeb` for the SSR/CSS
// scaffold (title, `#tooltip`, the `.pt`/`.pt-active` styling, the two-layout media query) — it
// inlines the shared script for that scaffold's own sake, unchanged, and then this file is
// appended as a second inlined `<script>` alongside it. The shared script still does one thing this
// file relies on rather than re-implementing: `initChart` wires `focus`/`blur`/`keydown`
// (Left/Right/Home/End) directly onto every `.pt` element regardless of whether a `.hit-area` is
// present, so keyboard navigation and screen-reader `aria-label` reachability work unmodified.
// This file adds only what a nearest-by-X hit area cannot give a discrete-target chart: direct
// mouse/touch hover and tap on each of the twenty points themselves, since every point already
// carries its own generous `pointerEvents="all"` overlay (`SlopeWeb.tsx`'s `hitRadius`) and needs
// no shared resolver to find it.
//
// Reads back the same `data-detail` string the shared script's own `show()` would read — never a
// second implementation of "what does this point say" — and writes to the same `#tooltip` element
// and the same `.pt-active` class the shared stylesheet already styles, so the two scripts never
// disagree about what a reading looked like once shown.

export function initSlopeInteraction() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;

  function show(point, clientX, clientY) {
    document
      .querySelectorAll(".pt")
      .forEach((p) => p.classList.toggle("pt-active", p === point));
    tooltip.textContent = point.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  function clear() {
    document.querySelectorAll(".pt").forEach((p) => p.classList.remove("pt-active"));
    tooltip.hidden = true;
  }

  document.querySelectorAll(".pt").forEach(function (point) {
    // Pointer events fire for mouse, pen and touch alike — each point is its own hit target
    // (`hitRadius` in `SlopeWeb.tsx`), so there is no nearest-point resolution to do: the point
    // that fired the event IS the reading to show.
    point.addEventListener("pointerenter", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointerdown", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointerleave", clear);
    // `focus`/`blur`/arrow-key navigation are already wired by the shared script's own `initChart`
    // (it runs unconditionally on every `.pt` regardless of `.hit-area`, see this file's own header
    // note) — not duplicated here.
  });

  document.addEventListener("pointerdown", function (evt) {
    if (evt.target && evt.target.closest && evt.target.closest(".pt")) return;
    if (evt.target && evt.target.closest && evt.target.closest("#tooltip")) return;
    clear();
  });
}

// Guarded the same way the shared script's own `initAll()` call is guarded: this file is inlined
// into the rendered HTML as a plain classic `<script>` (no `type="module"`, so it keeps working in
// a CMS iframe or a sandboxed embed that restricts module scripts) but stays a valid ES module for
// anything that wants to import `initSlopeInteraction` directly outside a browser `document`.
if (typeof document !== "undefined") initSlopeInteraction();
