// twin/skills/map-web/assets/interaction.mjs
//
// The one script the map-web genre ships, inlined verbatim into the self-contained HTML by
// `scripts/render-web.mjs` (which strips the `export` keyword from each top-level declaration so
// this file can also sit as a plain classic `<script>` — no `type="module"`, no bundler, so it
// keeps working in a CMS iframe or a sandboxed embed that restricts module scripts).
//
// Each point's hit target is now a real HTML `<button class="pt">` (`MapWebSeed.tsx`'s own header
// note explains why: a fixed-CSS-pixel touch target, not an SVG shape sized in frame units that
// would shrink to a few physical pixels at 375px wide). That is a genuine DOM element with its own
// native focus/click/keyboard handling already — what this file adds on top is the ONE thing HTML
// does not give a `<button>` for free: a shared, positioned tooltip reading the point's own
// `data-detail`, plus Arrow/Home/End cycling between points without leaving keyboard focus.
//
// `initPoints`/`initAll` are DOM wiring and are NOT unit-tested here: per `doctrine`'s own
// verification rule, an interactive genre is verified by driving a real browser, not by asserting
// against a DOM emulation nobody looked at (`references/map-web-discipline.md`, "Verification").

/** Wires every `.pt` button on the page to hover, tap and keyboard, sharing the one tooltip
 *  element. Every point already carries its own `data-detail` string and its own `aria-label`;
 *  this function never invents either — and never needs to know which points a filter has hidden:
 *  a hidden point (`display: none`, the CSS filter's own doing) is unreachable by Tab automatically,
 *  the same native behaviour that makes this file need no filter-awareness of its own. */
export function initPoints(points, tooltip) {
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
  // is already its own fixed-size hit target (MapWebSeed.tsx's own `HIT_TARGET_PX`), so no
  // proximity resolution is needed the way the chart genre's shared `.hit-area` overlay needs one.
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
