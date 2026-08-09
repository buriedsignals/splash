// twin/proof/mapgen-choropleth-web/interaction.mjs
//
// The one script this beat ships, inlined verbatim into the self-contained HTML by
// `render-web.mjs` (which strips the `export` keyword from each top-level declaration so this file
// can also sit as a plain classic `<script>` — no `type="module"`, no bundler). This is THIS beat's
// own copy of `twin-map-web/assets/interaction.mjs`'s mechanics, adjusted for a polygon's own hit
// target instead of a point's fixed-position circle: a region is its own filled `<path>`, so there
// is no `hitR` concept the way a proportional symbol needs one — the one addition here is resolving
// a `.hit-proxy` (an invisible, larger circle over a region too small to land a pointer on
// reliably) back to the `.pt` path it stands in for, so hovering the proxy shows and highlights the
// SAME region rather than a second, competing target.
//
// `initMap`/`initAll` are DOM wiring and are NOT unit-tested here: per `twin-doctrine`'s own
// verification rule, an interactive genre is verified by driving a real browser, not asserting
// against a DOM emulation nobody looked at.

/** Wires one `<svg class="map">` — its `.pt` region paths, any `.hit-proxy` stand-ins, and the
 *  shared tooltip element — to hover, tap and keyboard. Every region already carries its own
 *  `data-detail` string and its own `aria-label`; this function never invents either. */
export function initMap(svg, tooltip) {
  const regions = Array.prototype.slice.call(svg.querySelectorAll(".pt"));
  if (regions.length === 0) return;
  const byKey = {};
  regions.forEach(function (r) {
    byKey[r.getAttribute("data-key")] = r;
  });

  function clear() {
    regions.forEach((r) => r.classList.remove("pt-active"));
    tooltip.hidden = true;
  }

  function show(region, clientX, clientY) {
    regions.forEach((r) => r.classList.toggle("pt-active", r === region));
    tooltip.textContent = region.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  regions.forEach(function (region, i) {
    region.addEventListener("pointerenter", function (evt) {
      show(region, evt.clientX, evt.clientY);
    });
    region.addEventListener("pointermove", function (evt) {
      show(region, evt.clientX, evt.clientY);
    });
    region.addEventListener("pointerleave", clear);

    // Keyboard: every region is already `tabIndex={0}` at build time (works with this script
    // absent entirely). This layer adds the same detail box hover shows, plus Left/Right/Home/End
    // to move between regions without leaving focus, in the SAME highest-value-first order the
    // accessible table below the map also reads in (`ChoroplethWeb.tsx`'s own DOM order).
    region.addEventListener("focus", function () {
      const rect = region.getBoundingClientRect();
      show(region, rect.left + rect.width / 2, rect.top);
    });
    region.addEventListener("blur", clear);
    region.addEventListener("keydown", function (evt) {
      let nextIndex = null;
      if (evt.key === "ArrowRight" || evt.key === "ArrowDown")
        nextIndex = Math.min(i + 1, regions.length - 1);
      else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp")
        nextIndex = Math.max(i - 1, 0);
      else if (evt.key === "Home") nextIndex = 0;
      else if (evt.key === "End") nextIndex = regions.length - 1;
      else if (evt.key === "Escape") {
        clear();
        region.blur();
        return;
      }
      if (nextIndex !== null && nextIndex !== i) {
        evt.preventDefault();
        regions[nextIndex].focus();
      }
    });
  });

  // Hit proxies: an invisible, larger circle standing in for a region too small to land a pointer
  // on reliably (`ChoroplethWeb.tsx`'s own `needsHitProxy`). It forwards to the SAME `.pt` path's
  // own show/clear — never its own tab stop, never a second target competing with the region it
  // stands in for.
  const proxies = Array.prototype.slice.call(svg.querySelectorAll(".hit-proxy"));
  proxies.forEach(function (proxy) {
    const target = byKey[proxy.getAttribute("data-target")];
    if (!target) return;
    proxy.addEventListener("pointerenter", function (evt) {
      show(target, evt.clientX, evt.clientY);
    });
    proxy.addEventListener("pointermove", function (evt) {
      show(target, evt.clientX, evt.clientY);
    });
    proxy.addEventListener("pointerleave", clear);
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

// Guarded rather than a bare top-level call: this file is also importable in a context with no
// `document` (a test). In the browser the guard is always true, so the inlined `<script>` still
// self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
