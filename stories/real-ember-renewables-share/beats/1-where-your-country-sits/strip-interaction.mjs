// THIS BEAT'S OWN INTERACTION SCRIPT. The format's generic `renderWeb` inlines
// `chart-web/assets/interaction.mjs`, which resolves a pointer to the nearest reading by its
// x-coordinate ALONE — exactly right for a line, where x is the period and is unique per reading.
// A dot strip has 211 marks sharing one value axis with a deterministic vertical jitter, so several
// marks routinely sit within a pixel of each other in x and are metres apart on screen. Resolving
// by x would answer with whichever of them happened to be marginally closer horizontally, which is
// silently wrong and is precisely the class of defect a rendered PNG can never show. `nearestDot`
// below measures real two-dimensional screen distance.
//
// The runner beside this file substitutes this script for the skill's own after `renderWeb` has
// written the page, and fails loudly if the shape it expects to find has changed rather than
// leaving the wrong script in place.
//
// Second difference from the skill's copy: this beat also wires a SEARCH box. The box is delivered
// `hidden` and revealed here, so a reader with scripting off never meets a dead control. It hides
// nothing and narrows nothing — the frame states everything the title claims with the box
// untouched — it only moves focus to one named country and holds it lit, which is the reading 211
// unlabelled marks cannot give any other way.

/** Index of the dot in `pts` (each `{x, y}` in the same client-pixel space as the pointer) closest
 *  to `(x, y)`. Squared distance is compared directly: the ordering a `sqrt` would produce is
 *  identical, and this runs once per pointer move over 211 candidates. */
export function nearestDot(pts, x, y) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - x;
    const dy = pts[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Case- and accent-insensitive, so a reader typing "cote d'ivoire" reaches "Cote d'Ivoire" and one
 *  typing "COSTA RICA" reaches "Costa Rica". Nothing here rewrites a country's own name; this only
 *  decides what counts as the same string when matching what was typed.
 *
 *  An apostrophe is REMOVED rather than treated as a separator, and that is not a detail: driving
 *  the real page, "Cote dIvoire" typed without one folded to "cote divoire" while the country
 *  itself folded to "cote d ivoire", and the search answered "no country in this chart is called
 *  that" about a country that is in it. Every other punctuation mark stays a separator. */
export function foldName(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019\u02bc]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The dot a typed string names: an exact folded match first, then the single dot whose folded name
 *  STARTS with what was typed. Several candidates is not a match — "guinea" is the start of three
 *  countries in this file, and silently picking one of them would be the same defect the pointer
 *  resolution above exists to avoid. Returns `{ index }`, `{ ambiguous }` or `{ none: true }`. */
export function resolveTyped(names, typed) {
  const q = foldName(typed);
  if (q === "") return { none: true };
  const folded = names.map(foldName);
  const exact = folded.indexOf(q);
  if (exact >= 0) return { index: exact };
  const starts = [];
  for (let i = 0; i < folded.length; i++) if (folded[i].startsWith(q)) starts.push(i);
  if (starts.length === 1) return { index: starts[0] };
  if (starts.length > 1) return { ambiguous: starts.map((i) => names[i]) };
  return { none: true };
}

/** Wires one plot: its `.pt` dots, the `.hit-area` rectangle inside its `<svg>`, the shared tooltip,
 *  and this beat's own search box. Every dot already carries its own `data-detail` and its own
 *  `aria-label`, baked server-side; nothing here invents or recomputes either. */
export function initStrip(figure, tooltip) {
  const plot = figure.querySelector(".chart-plot");
  if (!plot) return;
  const dots = Array.prototype.slice.call(plot.querySelectorAll(".pt"));
  if (dots.length === 0) return;
  const names = dots.map((d) => d.getAttribute("data-country") || "");
  const hitArea = plot.querySelector(".hit-area");

  // Measured in SCREEN pixels, once and again on resize, never per pointer move: the frame stretches
  // with `preserveAspectRatio="none"`, so the geometry's own canonical units and the reader's
  // screen do not share a scale, and "nearest" has to be asked in the space the pointer lives in.
  let coords = [];
  function measure() {
    coords = dots.map((d) => {
      const r = d.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }
  measure();
  window.addEventListener("resize", measure);

  let held = null;
  let hovered = null;

  function paint() {
    dots.forEach((d) => {
      d.classList.toggle("pt-held", d === held);
      d.classList.toggle("pt-active", d === hovered);
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
  // over the whole plot rectangle, so a touch reader never has to land a tap on a 9px mark.
  function fromPointer(evt) {
    const i = nearestDot(coords, evt.clientX, evt.clientY);
    show(dots[i], evt.clientX, evt.clientY);
  }

  if (hitArea) {
    hitArea.addEventListener("pointermove", fromPointer);
    hitArea.addEventListener("pointerdown", fromPointer);
    hitArea.addEventListener("pointerleave", clear);
  }

  // Keyboard. Every dot is already `tabIndex=0` at build time and stays reachable with this script
  // absent entirely; this layer adds the same detail box a hover shows, and arrow keys that walk the
  // strip in the order it is drawn — which is by value, left to right, because the marks were sorted
  // that way before they were placed.
  dots.forEach((dot, i) => {
    dot.addEventListener("focus", function () {
      const r = dot.getBoundingClientRect();
      show(dot, r.left + r.width / 2, r.top);
    });
    dot.addEventListener("blur", clear);
    dot.addEventListener("keydown", function (evt) {
      let next = null;
      if (evt.key === "ArrowRight" || evt.key === "ArrowUp") next = Math.min(i + 1, dots.length - 1);
      else if (evt.key === "ArrowLeft" || evt.key === "ArrowDown") next = Math.max(i - 1, 0);
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

  // THE SEARCH. Revealed only now, because only now does it do anything.
  const find = figure.querySelector(".chart-find");
  if (!find) return;
  const input = find.querySelector("input");
  const answer = find.querySelector(".find-answer");
  if (!input || !answer) return;
  find.hidden = false;

  function hold(index) {
    held = dots[index];
    paint();
    const r = held.getBoundingClientRect();
    show(held, r.left + r.width / 2, r.top);
    answer.textContent = held.getAttribute("data-detail");
  }

  function release(text) {
    held = null;
    paint();
    tooltip.hidden = true;
    answer.textContent = text;
  }

  input.addEventListener("input", function () {
    const typed = input.value;
    if (typed.trim() === "") return release("");
    const found = resolveTyped(names, typed);
    if (found.index !== undefined) return hold(found.index);
    if (found.ambiguous)
      return release(
        found.ambiguous.length + " countries start with that: " + found.ambiguous.join(", "),
      );
    return release("No country in this chart is called that.");
  });

  input.addEventListener("keydown", function (evt) {
    if (evt.key !== "Enter" || !held) return;
    evt.preventDefault();
    held.focus();
  });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  document.querySelectorAll(".chart-figure").forEach(function (figure) {
    initStrip(figure, tooltip);
  });
}

// Guarded rather than a bare top-level call, so this file can also be read in a context with no
// `document` (inspecting `nearestDot` or `resolveTyped` directly). In a browser the guard is always
// true and the inlined script self-starts the moment it is parsed.
if (typeof document !== "undefined") initAll();
