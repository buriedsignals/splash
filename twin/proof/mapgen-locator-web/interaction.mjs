// twin/proof/mapgen-locator-web/interaction.mjs
//
// The one script this beat ships, inlined verbatim into the self-contained HTML by
// `render-web.mjs` (which strips the `export` keyword from each top-level declaration so this
// file can also sit as a plain classic `<script>` — no `type="module"`, no bundler, so it keeps
// working in a CMS iframe or a sandboxed embed that restricts module scripts). This is this
// beat's OWN copy of `twin-map-web/assets/interaction.mjs` — nothing under `proof/` imports out
// of a skill or across beats.
//
// A locator's markers are already discrete circles at fixed screen positions, so this file does
// NOT need a nearest-by-x resolver: each `.pt` circle wires its own hover, tap and keyboard
// handlers directly, reading a `data-detail` string that was computed server-side (name plus
// category — this type's only two facts, `LocatorWeb.tsx`'s own `pointDetail`) and never
// reformatted here. Every marker in this beat shares the SAME fixed hit-target radius
// (`LocatorWeb.tsx`'s `hitR`, baked into the markup at build time) — there is no per-point value
// to derive one from, unlike the proportional-symbol genre this file was copied from, where a
// small-value circle needs a hit target larger than itself. That difference lives entirely in
// how `LocatorWeb.tsx` draws the `.pt` circles; this script's own wiring is unchanged.
//
// `initMap`/`initAll` are DOM wiring and are NOT unit-tested here: an interactive genre is
// verified by driving a real browser, not by asserting against a DOM emulation nobody looked at.

/** Wires one `<svg class="map">` — its `.pt` circles and the shared tooltip element — to hover,
 *  tap and keyboard. Every point already carries its own `data-detail` string and its own
 *  `aria-label`; this function never invents either. */
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

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each point
  // already carries its own larger, invisible hit circle (`LocatorWeb.tsx`'s own `hitR`), so no
  // proximity resolution is needed.
  points.forEach((point, i) => {
    point.addEventListener("pointerenter", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointermove", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointerleave", clear);

    // Keyboard: every point is already `tabIndex={0}` at build time (works with this script
    // absent entirely). This layer adds the same detail box hover shows, plus Left/Right/Home/End
    // to move between points without leaving focus, in the same priority order the accessible
    // table below the map also reads in.
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

// Guarded rather than a bare top-level call: this file is also read directly by
// `render-web.mjs`'s own inliner in a context with no `document`. In the browser the guard is
// always true, so the inlined `<script>` still self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
