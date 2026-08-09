// twin/proof/weby-boxplot-france-co2-decades/boxplot-interaction.mjs
//
// This beat's OWN interaction script — not `twin-chart-web/assets/interaction.mjs` (the line
// genre's nearest-by-x mechanic) and not `web-income-life-expectancy/scatter-interaction.mjs` (the
// scatter's nearest-by-2D-distance mechanic). `render-web.mjs` inlines this one instead, the same
// way both of those runners inline their own.
//
// Why a third implementation was needed: this beat's x-axis is CATEGORICAL, not continuous — eight
// decades, each already owning a whole `scaleBand` column of the plot. "Nearest reading" is not a
// meaningful question here (there is no reading to be nearest TO between two boxes); the right
// question is "which decade's own column is the pointer inside," which `DecadeBoxplotWeb.tsx`
// already answers at build time by giving each decade its own full-height hit rectangle (`.cat`).
// This script's job shrinks to plain per-element event wiring — no distance math at all, unlike
// `nearestIndex`/`nearestPointIndex` in the other two genres' own scripts.
//
// Tooltip/`show()`/keyboard shape follows `scatter-interaction.mjs` closely on purpose (same
// tooltip element, same hover/tap/keyboard parity, same `data-detail`/`aria-label` discipline) so a
// reader who has used either of the other two web beats meets the same interaction language here.
// `initChart`/`initAll` are DOM wiring and are proven, per `twin-doctrine`'s own rule, by driving a
// real browser, never by asserting against an unwatched DOM emulation.

/** Wires one `<svg class="chart">` — its `.cat` hit rectangles and the shared tooltip element — to
 *  hover, tap and keyboard. Every rectangle already carries its own `data-detail` string and its
 *  own `aria-label`, baked in server-side; this function never invents or recomputes either. */
export function initChart(svg, tooltip) {
  const rects = Array.prototype.slice.call(svg.querySelectorAll(".cat"));
  if (rects.length === 0) return;

  function clear() {
    rects.forEach((r) => r.classList.remove("cat-active"));
    tooltip.hidden = true;
  }

  function show(rect, clientX, clientY) {
    rects.forEach((r) => r.classList.toggle("cat-active", r === rect));
    tooltip.textContent = rect.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 220;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each
  // rectangle already spans its own decade's full column, so a touch reader never has to land a tap
  // on a thin box or whisker line — any tap inside a decade's own band resolves to that decade.
  rects.forEach((rect, i) => {
    rect.addEventListener("pointerenter", function (evt) {
      show(rect, evt.clientX, evt.clientY);
    });
    rect.addEventListener("pointerdown", function (evt) {
      show(rect, evt.clientX, evt.clientY);
    });
    rect.addEventListener("pointermove", function (evt) {
      show(rect, evt.clientX, evt.clientY);
    });
    rect.addEventListener("pointerleave", clear);

    // Keyboard: every rectangle is already `tabIndex={0}` at build time (works with this script
    // absent entirely — `web-discipline.md`, "Keyboard and touch"). This layer adds the same detail
    // box hover shows, plus Left/Right/Home/End to move between decades in DOM order, which is
    // already chronological order (`DecadeBoxplotWeb.tsx` renders the hit rects in the same order
    // `data.csv`'s own decades appear in).
    rect.addEventListener("focus", function () {
      const box = rect.getBoundingClientRect();
      show(rect, box.left + box.width / 2, box.top);
    });
    rect.addEventListener("blur", clear);
    rect.addEventListener("keydown", function (evt) {
      let nextIndex = null;
      if (evt.key === "ArrowRight") nextIndex = Math.min(i + 1, rects.length - 1);
      else if (evt.key === "ArrowLeft") nextIndex = Math.max(i - 1, 0);
      else if (evt.key === "Home") nextIndex = 0;
      else if (evt.key === "End") nextIndex = rects.length - 1;
      else if (evt.key === "Escape") {
        clear();
        rect.blur();
        return;
      }
      if (nextIndex !== null && nextIndex !== i) {
        evt.preventDefault();
        rects[nextIndex].focus();
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

// Guarded rather than a bare top-level call: this file can also be read/imported in a context with
// no `document`. In the browser the guard is always true, so the inlined `<script>` self-starts the
// moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
