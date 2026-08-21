// THE ONE IMPLEMENTATION OF THIS BEAT'S GEOMETRY, USED TWICE.
//
// `GlacierFrame.tsx` imports it in node to SSR the picture in its FIRST state; `render.mjs` reads
// this same file as text, strips the `export` keywords and inlines it into the delivered HTML,
// where `initGlacierScrolly` drives every state after the first. There is exactly one
// `glacierGeometry`, so the picture a reader meets before any script runs and the picture the
// scroll drives cannot drift apart.
//
// WHY A SCRUB AND NOT EIGHT STACKED FRAMES. This beat is ONE picture — the Rhone glacier's area,
// eight readings, 1990 to 2025 — and its steps are successive readings of it, not eight different
// media. `scrolly`'s scaffold assembles N pictures and swaps which one is painted; a swap cannot
// express a line DRAWING ITSELF between two measurements, and the journalist asked for the reader
// to "move through the decades one step at a time", which is a gesture, not a cut. So the visual is
// a single persistent element and the scroll drives its state continuously, off the `data-progress`
// the scaffold publishes.
//
// NOTHING HERE MEASURES THE PAGE. The scaffold owns where the reader is; this file reads that
// number and never forms a second opinion about it.

/** This beat's frames keep no band clear at their own bottom: the card travels the whole frame and
 *  rests nowhere, so a reserved lane would be empty ground at every offset. The credit is anchored
 *  to the frame's own floor instead. */
export const PROSE_LANE = 0;

/** The plot box, in fractions of the frame. The floor leaves the x-axis label strip and the credit
 *  line; the ceiling leaves the head readout. */
export const PLOT = {
  left: 0.1,
  right: 0.965,
  top: 0.17,
  bottom: 0.86,
};

/** The geometry-only viewBox the plot's SVG stretches across. Type is never inside it. */
export const VIEWBOX = { width: 1000, height: 500 };

export function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** easeInOutQuad — the reveal leaves and arrives calmly and holds still in between. */
export function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function lerpState(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = lerp(a[key], b[key], t);
  return out;
}

/** Every field of a state is a finite number, because the driver interpolates it field by field. A
 *  state carrying a string would silently stop moving. */
export function assertNumericStates(states) {
  const keys = Object.keys(states[0]).join(",");
  states.forEach((state, i) => {
    if (Object.keys(state).join(",") !== keys)
      throw new Error(`state ${i} has different fields from state 0 — they cannot be interpolated`);
    for (const [k, v] of Object.entries(state))
      if (typeof v !== "number" || !Number.isFinite(v))
        throw new Error(`state ${i}.${k} is ${JSON.stringify(v)}; every field of a state must be a finite number`);
  });
  return states;
}

/** The state at a continuous position along the steps. `reduced` snaps to the nearer step — the
 *  step still ARRIVES for a reader who asked for no motion, it just does not travel. */
export function stateAt(states, position, reduced) {
  const last = states.length - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) return states[Math.round(p)];
  const i = Math.min(Math.floor(p), last - 1);
  return lerpState(states[i], states[i + 1], ease(p - i));
}

/** The nearest ancestor publishing the scaffold's continuous signal. */
export function progressSourceOf(el) {
  let node = el;
  while (node) {
    if (node.getAttribute && node.getAttribute("data-progress") !== null) return node;
    node = node.parentElement;
  }
  return null;
}

/** The published position, or a throw naming what it looked for. A default here would be the defect
 *  in a quieter costume: a beat that silently renders state 0 forever looks exactly like a beat
 *  whose script never ran. */
export function readProgress(source) {
  const raw = source == null ? null : source.getAttribute("data-progress");
  const value = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(value))
    throw new Error(
      `this beat is driven by the scrolly scaffold's continuous signal and read ${JSON.stringify(raw)} ` +
        `for data-progress on the nearest ancestor carrying it (scrolly/assets/interaction.mjs ` +
        `writes it on the .scrolly root on every scroll)`,
    );
  return value;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/** The reading at a fractional year, linearly between the two readings that bracket it — so the
 *  revealed head can sit anywhere between two measurements and the line grows continuously rather
 *  than jumping one segment per step. */
export function areaAt(readings, year) {
  if (year <= readings[0].year) return readings[0].area;
  const last = readings[readings.length - 1];
  if (year >= last.year) return last.area;
  for (let i = 1; i < readings.length; i += 1) {
    const b = readings[i];
    if (b.year >= year) {
      const a = readings[i - 1];
      return lerp(a.area, b.area, (year - a.year) / (b.year - a.year));
    }
  }
  return last.area;
}

/** The fixed domains. Y starts at a true zero because the takeaway is PROPORTIONAL — "two thirds
 *  gone" is only readable off a plot whose baseline is nothing. */
export function domainFor(readings) {
  const first = readings[0];
  const last = readings[readings.length - 1];
  const top = Math.max(...readings.map((r) => r.area));
  return { x0: first.year, x1: last.year, y0: 0, y1: top * 1.14 };
}

/**
 * Everything the picture needs, for one state. Pure: no DOM, no React, no colours.
 *
 * `state` fields:
 *   head          the year the reveal has reached, fractional between two measurements;
 *   gapOpacity    how present the shaded gap between the 1990 level and the line is;
 *   pauseOpacity  the 2000-2005 plateau callout's own opacity;
 *   finalOpacity  the closing callout's own opacity.
 */
export function glacierGeometry(readings, state) {
  const { x0, x1, y0, y1 } = domainFor(readings);
  const sx = (year) => ((year - x0) / (x1 - x0)) * VIEWBOX.width;
  const sy = (value) => (1 - (value - y0) / (y1 - y0)) * VIEWBOX.height;
  const head = Math.min(Math.max(state.head, x0), x1);
  const baseline = readings[0].area;

  // The whole record, drawn once, faintly: the header already states the claim in full, so nothing
  // is being withheld — what the reveal adds is WHERE the reader is in it.
  const ghost = readings.map((r) => `${round(sx(r.year))},${round(sy(r.area))}`).join(" ");

  const revealedPoints = [
    ...readings.filter((r) => r.year <= head).map((r) => [r.year, r.area]),
    [head, areaAt(readings, head)],
  ];
  const revealed = revealedPoints.map(([year, area]) => `${round(sx(year))},${round(sy(area))}`).join(" ");

  // The gap between the 1990 level and the line, closed along the baseline. Its VERTICAL extent at
  // any year is the area lost since 1990, in the y axis's own unit — never an area-under-the-curve,
  // which would be square kilometres multiplied by years and would mean nothing.
  const gap = [
    ...revealedPoints.map(([year, area]) => `${round(sx(year))},${round(sy(area))}`),
    `${round(sx(head))},${round(sy(baseline))}`,
    `${round(sx(x0))},${round(sy(baseline))}`,
  ].join(" ");

  const headArea = areaAt(readings, head);

  return {
    ghost,
    revealed,
    gap,
    gapOpacity: state.gapOpacity,
    baselineY: round(sy(baseline)),
    head: {
      year: head,
      area: headArea,
      x: round(sx(head)),
      y: round(sy(headArea)),
    },
    marks: readings.map((r) => ({
      year: r.year,
      area: r.area,
      x: round(sx(r.year)),
      y: round(sy(r.area)),
      reached: r.year <= head + 1e-9,
    })),
    xTicks: readings.map((r) => ({ label: String(r.year), at: (r.year - x0) / (x1 - x0) })),
    yTicks: yTicksFor(y0, y1),
    callouts: {
      pause: state.pauseOpacity,
      final: state.finalOpacity,
    },
  };
}

/** Four gridlines at a round step, never more: this axis is read for a level, not for a value. */
export function yTicksFor(y0, y1) {
  const step = 0.5;
  const out = [];
  for (let value = y0; value <= y1 + 1e-9; value += step)
    out.push({ value, label: value.toFixed(1), at: (value - y0) / (y1 - y0) });
  return out;
}

/** viewBox units → a fraction of the whole FRAME. Type is HTML at a fixed pixel size over a plot
 *  that stretches. */
export function toFrame(x, y) {
  return [
    PLOT.left + (PLOT.right - PLOT.left) * (x / VIEWBOX.width),
    PLOT.top + (PLOT.bottom - PLOT.top) * (y / VIEWBOX.height),
  ];
}

export function pct(v) {
  return `${(v * 100).toFixed(3)}%`;
}

/* eslint-env browser */

/**
 * Re-parent the persistent visual OUT of the per-step frame stack.
 *
 * The scaffold's contract is N pictures of which exactly one is painted; this beat has ONE picture
 * that must never be un-painted. Left inside step 1's wrapper it would be faded out the moment
 * step 2 became active. Moved up one level it is a permanent sibling the swap never touches — and
 * with JavaScript off it stays where it was SSR'd, inside the frame the scaffold marks active by
 * default, so a no-JS reader still gets the whole first state.
 *
 * Reported rather than patched around: the vehicle has no way for a beat to DECLARE "my visual is
 * one persistent element". This function is what that missing declaration costs today.
 */
export function detachVisual(root) {
  const wrapper = root.parentElement;
  const stack = wrapper && wrapper.parentElement;
  if (!stack) return;
  stack.appendChild(root);
  root.style.position = "absolute";
  root.style.inset = "0";
  root.setAttribute("aria-hidden", "true");
  for (const sibling of Array.from(stack.children))
    if (sibling !== root) sibling.style.pointerEvents = "none";
}

export function initGlacierScrolly(root, readings, states, labels) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  detachVisual(root);

  const progressSource = progressSourceOf(root);
  if (!progressSource)
    throw new Error(
      "no ancestor of this beat's visual carries data-progress — scrolly's scaffold publishes it " +
        "on the .scrolly root, and this beat is driven by nothing else",
    );

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = {
    ghost: root.querySelector("[data-part=ghost]"),
    revealed: root.querySelector("[data-part=revealed]"),
    gap: root.querySelector("[data-part=gap]"),
    marks: Array.from(root.querySelectorAll("[data-mark]")),
    headDot: root.querySelector("[data-part=head-dot]"),
    headYear: root.querySelector("[data-part=head-year]"),
    headValue: root.querySelector("[data-part=head-value]"),
    pause: root.querySelector("[data-part=callout-pause]"),
    final: root.querySelector("[data-part=callout-final]"),
  };

  let queued = false;
  let lastPosition = -1;

  function paint() {
    queued = false;
    const position = readProgress(progressSource);
    if (Math.abs(position - lastPosition) < 0.0005) return;
    lastPosition = position;
    root.dataset.position = position.toFixed(3);
    const state = stateAt(states, position, reduced.matches);
    const geometry = glacierGeometry(readings, state);

    nodes.revealed.setAttribute("points", geometry.revealed);
    nodes.gap.setAttribute("points", geometry.gap);
    nodes.gap.style.opacity = String(geometry.gapOpacity);

    geometry.marks.forEach((mark, i) => {
      const node = nodes.marks[i];
      if (!node) return;
      // The DECLARATION, not the pixels: strength says how close the narrative is, colour says
      // whether it got there, and a screen reader can be told the same thing from this attribute.
      node.setAttribute("data-state", mark.reached ? "reached" : "pending");
      node.style.opacity = mark.reached ? "1" : "0.3";
      node.style.background = mark.reached ? labels.accent : labels.muted;
    });

    if (nodes.headDot) {
      const [hx, hy] = toFrame(geometry.head.x, geometry.head.y);
      nodes.headDot.style.left = pct(hx);
      nodes.headDot.style.top = pct(hy);
    }
    if (nodes.headYear) nodes.headYear.textContent = String(Math.round(geometry.head.year));
    if (nodes.headValue)
      nodes.headValue.textContent = `${geometry.head.area.toFixed(2)} ${labels.unit}`;

    if (nodes.pause) nodes.pause.style.opacity = String(geometry.callouts.pause);
    if (nodes.final) nodes.final.style.opacity = String(geometry.callouts.final);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    view.requestAnimationFrame(paint);
  }

  view.addEventListener("scroll", schedule, { capture: true, passive: true });
  const invalidate = () => {
    lastPosition = -1;
    schedule();
  };
  view.addEventListener("resize", invalidate, { passive: true });
  view.addEventListener("orientationchange", invalidate, { passive: true });
  if (reduced.addEventListener) reduced.addEventListener("change", invalidate);
  doc.addEventListener("visibilitychange", schedule);
  schedule();
  return { paint };
}
