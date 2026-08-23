// twin/proof/mapgen-hexgrid-web/interaction.mjs
//
// The one script this beat ships, inlined verbatim into the self-contained HTML by
// `render-web.mjs` (which strips the `export` keyword from each top-level declaration so this file
// can also sit as a plain classic `<script>` — no `type="module"`, no bundler, so it keeps working
// in a CMS iframe or a sandboxed embed that restricts module scripts). This beat's OWN physical copy
// of `map-web/assets/interaction.mjs` — nothing under a beat may import out of a skill or
// another beat.
//
// EVERYTHING BELOW THIS HEADER IS THE SEED'S FILE, BYTE FOR BYTE, and it converged back to it when
// ruling R1 was retrofitted into this beat (2026-08-10). It had forked: while the hit target was the
// hex `<path>` itself, `initAll` walked `svg.map` and `initMap` took an `<svg>` argument. The live
// swap ends that — a plate-pixel path is in the wrong place the moment the camera differs from the
// bake's — so this beat's hit targets are now HTML `<button class="pt">`s in the overlay, exactly
// the seed's own markup, and the seed's own wiring is exactly the wiring they need. The fork bought
// nothing: `show()` always read `data-detail` off whichever element fired, and
// `getBoundingClientRect()` works the same on a `<path>` as on a `<button>`.
//
// `initPoints`/`initAll` are DOM wiring and are NOT unit-tested here: per `doctrine`'s own
// verification rule, an interactive format is verified by driving a real browser, not by asserting
// against a DOM emulation nobody looked at (`references/map-web-discipline.md`, "Verification").

/** THE FACT A MARK CARRIES, wherever the wrap put it. A repeated world's marks carry
 *  `data-copy-detail` rather than `data-detail` — the same string under a different name, because
 *  `data-detail` is what this format's censuses count a mark BY (`tableCarriesTheMarks`,
 *  `keyboardReachesEveryMark`), and a copy is the same mark seen twice, not a second mark. */
function detailOf(node) {
  return node.getAttribute("data-detail") || node.getAttribute("data-copy-detail");
}

/** Is this element on the world the reader navigates, rather than on one of its repeats?
 *  A page that does not wrap has no `[data-world]` at all and every mark is primary. */
function onThePrimaryWorld(node) {
  const world = node.closest ? node.closest("[data-world]") : null;
  return !world || world.getAttribute("data-world") === "primary";
}

/** Wires every `.pt` button on the page to hover, tap and keyboard, sharing the one tooltip
 *  element. Every point already carries its own `data-detail` string and its own `aria-label`;
 *  this function never invents either — and never needs to know which points a filter has hidden:
 *  a hidden point (`display: none`, the CSS filter's own doing) is unreachable by Tab automatically,
 *  the same native behaviour that makes this file need no filter-awareness of its own. */
export function initPoints(points, tooltip) {
  if (points.length === 0) return;
  // THE KEYBOARD DOES NOT MULTIPLY WITH THE MAP. Every copy of a wrapped world carries its own
  // pointer targets — that is what the copies are for — but a Tab order three times too long is a
  // worse reader experience than a narrow map, so the arrow ring, like Tab itself, only ever visits
  // the primary world. A repeat's marks are `tabindex="-1"` inside an `aria-hidden` subtree and
  // never reach this at all.
  const ring = points.filter(onThePrimaryWorld);

  function clear() {
    points.forEach((p) => p.classList.remove("pt-active"));
    tooltip.hidden = true;
  }

  function show(point, clientX, clientY) {
    // BY KEY, never by identity: a wrapped world draws the same mark once per copy, and the
    // reading a pointer just gave is true of all of them.
    const key = point.getAttribute("data-key");
    points.forEach((p) => p.classList.toggle("pt-active", p.getAttribute("data-key") === key));
    tooltip.textContent = detailOf(point);
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each point
  // is already its own fixed-size hit target (MapWebSeed.tsx's own `HIT_TARGET_PX`), so no
  // proximity resolution is needed the way the chart format's shared `.hit-area` overlay needs one.
  points.forEach((point, i) => {
    point.addEventListener("pointerenter", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointermove", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointerleave", clear);

    // Keyboard: a <button> is already natively focusable and reachable with the script absent
    // entirely (works with JS off, exactly like the `title` attribute's own native tooltip — see
    // MapWebSeed.tsx's own doc-comment). This layer adds the same detail box hover shows, plus
    // Left/Right/Home/End to move between points without leaving focus, in the same largest-first
    // order the accessible table below the map also reads in.
    point.addEventListener("focus", function () {
      const rect = point.getBoundingClientRect();
      show(point, rect.left + rect.width / 2, rect.top);
    });
    point.addEventListener("blur", clear);
    point.addEventListener("keydown", function (evt) {
      const at = ring.indexOf(point);
      if (at < 0) return;
      let nextIndex = null;
      if (evt.key === "ArrowRight" || evt.key === "ArrowDown")
        nextIndex = Math.min(at + 1, ring.length - 1);
      else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp")
        nextIndex = Math.max(at - 1, 0);
      else if (evt.key === "Home") nextIndex = 0;
      else if (evt.key === "End") nextIndex = ring.length - 1;
      else if (evt.key === "Escape") {
        clear();
        point.blur();
        return;
      }
      if (nextIndex !== null && nextIndex !== at) {
        evt.preventDefault();
        ring[nextIndex].focus();
      }
    });
  });

  document.addEventListener("pointerdown", function (evt) {
    if (points.some((p) => p.contains(evt.target)) || tooltip.contains(evt.target)) return;
    clear();
  });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const points = Array.prototype.slice.call(document.querySelectorAll(".pt"));
  initPoints(points, tooltip);
}

// Guarded rather than a bare top-level call: this file is also imported directly by
// `test/render-web.test.ts` in a context with no `document`. In the browser the guard is always
// true, so the inlined `<script>` still self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
