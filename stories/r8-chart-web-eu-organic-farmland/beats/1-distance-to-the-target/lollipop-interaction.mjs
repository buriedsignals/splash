// THIS BEAT'S OWN INTERACTION SCRIPT. The format's generic `renderWeb` inlines
// `chart-web/assets/interaction.mjs`, which resolves a pointer to the nearest reading by its
// x-coordinate ALONE — exactly right for a line, where x is the period and is unique per reading.
// A horizontal lollipop is the opposite arrangement: twenty-seven rows share the same value axis
// and are separated by y ALONE, and several of them sit within a pixel of each other in x. Resolving
// by x would answer with whichever country happened to have a similar share, which is silently
// wrong and is precisely the class of defect a rendered PNG can never show. `nearestRow` below
// measures the row's own vertical band, so a pointer anywhere along a row answers with that row —
// which is what a reader dragging down a ranking expects.
//
// The runner beside this file substitutes this script for the skill's own after `renderWeb` has
// written the page, and fails loudly if the shape it expects to find has changed rather than
// leaving the wrong script in place.

/** Index of the row in `rows` (each `{y}` in the same client-pixel space as the pointer) whose
 *  centre is closest to `y`. One dimension, deliberately: a lollipop row IS its y, and a pointer
 *  out in the empty space to the right of a short stem is still unambiguously on that row. */
export function nearestRow(rows, y) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const d = Math.abs(rows[i].y - y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Wires one plot: its `.pt` dots, the `.hit-area` rectangle inside its `<svg>` and the shared
 *  tooltip. Every dot already carries its own `data-detail` and its own `aria-label`, baked
 *  server-side; nothing here invents or recomputes either. */
export function initLollipop(figure, tooltip) {
  const plot = figure.querySelector(".chart-plot");
  if (!plot) return;
  const dots = Array.prototype.slice.call(plot.querySelectorAll(".pt"));
  if (dots.length === 0) return;
  const hitArea = plot.querySelector(".hit-area");

  // Measured in SCREEN pixels, once and again on resize, never per pointer move: the frame stretches
  // with `preserveAspectRatio="none"`, so the geometry's own canonical units and the reader's
  // screen do not share a scale, and "nearest" has to be asked in the space the pointer lives in.
  let coords = [];
  function measure() {
    coords = dots.map((d) => {
      const r = d.getBoundingClientRect();
      return { y: r.top + r.height / 2 };
    });
  }
  measure();
  window.addEventListener("resize", measure);

  let hovered = null;

  function paint() {
    dots.forEach((d) => d.classList.toggle("pt-active", d === hovered));
    // The row's own name and value light with its dot: a ranking read across a wide screen is a
    // long way from the mark to the label, and highlighting only the dot leaves the reader to find
    // their own place in the gutter. `data-code` is the join, baked server-side.
    const code = hovered ? hovered.getAttribute("data-code") : null;
    plot.querySelectorAll("[data-row]").forEach((el) => {
      el.classList.toggle("row-active", code !== null && el.getAttribute("data-row") === code);
    });
  }

  function clear() {
    hovered = null;
    paint();
    tooltip.hidden = true;
  }

  function show(dot, clientX, clientY) {
    hovered = dot;
    paint();
    tooltip.textContent = dot.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path — pointer events fire for mouse, pen and touch alike — and resolve
  // over the whole plot rectangle, so a touch reader never has to land a tap on a 9px dot.
  function fromPointer(evt) {
    const i = nearestRow(coords, evt.clientY);
    show(dots[i], evt.clientX, evt.clientY);
  }

  if (hitArea) {
    hitArea.addEventListener("pointermove", fromPointer);
    hitArea.addEventListener("pointerdown", fromPointer);
    hitArea.addEventListener("pointerleave", clear);
  }

  // Keyboard. Every dot is already `tabIndex=0` at build time and stays reachable with this script
  // absent entirely; this layer adds the same detail box a hover shows, and arrow keys that walk the
  // ranking in the order it is drawn — down the page is down the ranking, because the rows were
  // sorted that way before they were placed.
  dots.forEach((dot, i) => {
    dot.addEventListener("focus", function () {
      const r = dot.getBoundingClientRect();
      show(dot, r.left + r.width / 2, r.top);
    });
    dot.addEventListener("blur", clear);
    dot.addEventListener("keydown", function (evt) {
      let next = null;
      if (evt.key === "ArrowDown" || evt.key === "ArrowRight") next = Math.min(i + 1, dots.length - 1);
      else if (evt.key === "ArrowUp" || evt.key === "ArrowLeft") next = Math.max(i - 1, 0);
      else if (evt.key === "Home") next = 0;
      else if (evt.key === "End") next = dots.length - 1;
      else if (evt.key === "Escape") {
        clear();
        dot.blur();
        return;
      }
      if (next !== null && next !== i) {
        evt.preventDefault();
        dots[next].focus();
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
  document.querySelectorAll(".chart-figure").forEach(function (figure) {
    initLollipop(figure, tooltip);
  });
}

// Guarded rather than a bare top-level call, so this file can also be read in a context with no
// `document` (inspecting `nearestRow` directly). In a browser the guard is always true and the
// inlined script self-starts the moment it is parsed.
if (typeof document !== "undefined") initAll();
