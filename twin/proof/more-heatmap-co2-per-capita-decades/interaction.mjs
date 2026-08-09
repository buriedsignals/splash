// twin/proof/more-heatmap-co2-per-capita-decades/interaction.mjs
//
// This beat's OWN interaction script — not the web genre skill's `assets/interaction.mjs`, which
// wires a `.pt`/`.hit-area` nearest-by-x model built for points strung along one line. A heatmap's
// cells are already discrete, non-overlapping regions, so each one can be its own hover/focus
// target directly: no "nearest point" resolution is needed, the pointer is either over a cell or
// it is not. Same shared tooltip element, same escalated derived-furniture styling, same keyboard
// contract (every cell already `tabIndex={0}` at build time, reachable and named — via
// `aria-label` — with the script entirely absent).
//
// Inlined verbatim (export stripped) into the self-contained HTML by `render-web.mjs`, the same
// way the line beat's own script is inlined by the skill's generic `renderWeb`.

export function initHeatmap(svg, tooltip) {
  const cells = Array.prototype.slice.call(svg.querySelectorAll(".cell"));
  if (cells.length === 0) return;

  function clear() {
    cells.forEach((c) => c.classList.remove("cell-active"));
    tooltip.hidden = true;
  }

  function show(cell, clientX, clientY) {
    cells.forEach((c) => c.classList.toggle("cell-active", c === cell));
    tooltip.textContent = cell.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  cells.forEach((cell) => {
    // Pointer (mouse, pen, touch) — a direct target, not a nearest-point resolution.
    cell.addEventListener("pointerenter", function (evt) {
      show(cell, evt.clientX, evt.clientY);
    });
    cell.addEventListener("pointermove", function (evt) {
      show(cell, evt.clientX, evt.clientY);
    });
    cell.addEventListener("pointerleave", clear);
    cell.addEventListener("pointerdown", function (evt) {
      show(cell, evt.clientX, evt.clientY);
    });

    // Keyboard: identical detail box, from focus alone — native Tab order visits cells row by
    // row, left to right, because that is DOM order (`heatmapGeometry` emits countries-then-
    // decades, i.e. row by row).
    cell.addEventListener("focus", function () {
      const rect = cell.getBoundingClientRect();
      show(cell, rect.left + rect.width / 2, rect.top);
    });
    cell.addEventListener("blur", clear);
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
    initHeatmap(svg, tooltip);
  });
}

// Guarded the same way the line beat's own script is guarded — this file is safe to import in a
// non-browser test context, and self-starts the instant the inlined `<script>` is parsed.
if (typeof document !== "undefined") initAll();
