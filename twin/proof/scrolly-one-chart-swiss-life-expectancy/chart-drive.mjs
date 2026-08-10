// THE ONE IMPLEMENTATION OF THIS BEAT'S GEOMETRY, USED TWICE.
//
// `ChartFrame.tsx` imports it in node to SSR the chart in its FIRST state; `render.mjs` reads this
// same file as text, strips the `export` keywords and inlines it into the delivered HTML, where
// `initChartScrolly` drives every state after the first. There is exactly one `chartGeometry`, so
// the picture a reader meets before any script runs and the picture the scroll drives cannot drift
// apart — which is the failure a second, browser-only copy of the layout maths would invite.
//
// WHY A DRIVER AT ALL, AND NOT FOUR STACKED FRAMES. `twin-scrolly`'s scaffold assembles N pictures
// and swaps which one is painted. This beat is the other form: ONE picture, and the steps are
// successive READINGS of it — a segment lifted, a band called out, the axes narrowed to a decade.
// A swap cannot express that: the reader has to see the SAME line stay put while the thing they are
// asked to notice about it changes, and at the last step they have to watch the axis itself travel,
// or the rescale reads as a different chart rather than the same one seen closer. So the visual is
// a single persistent element and the scroll drives its state continuously.
//
// NOTHING HERE MEASURES THE PAGE, OR THE PROSE, OR ANYTHING ELSE. Since the vehicle's eighth
// correction the scaffold PUBLISHES a continuous `data-progress` on its own root and this driver
// reads it (`readProgress` below). It is true whether the document scrolls, an inner container
// scrolls, or the panels are moved by something else entirely, and — the part that matters — the
// beat can no longer hold a second, stale opinion about where the reader is. It held one; it froze
// the picture; the measurement is in `readProgress`'s own comment.

// ── Placement, shared with the scaffold ────────────────────────────────────────────────────────

/** The band at the BOTTOM of the graphic this frame keeps clear. `render.mjs` hands the same number
 *  to `renderScrolly` as `proseLane`, so the lane the vehicle declares and the lane the frame keeps
 *  clear are one value, never two that can disagree.
 *
 *  0.36, not the vehicle's own 0.28 default: the lane had to be at least as tall as the TALLEST
 *  panel, and a panel's height is set by its words at the NARROWEST width. Measured at 375x812 with
 *  the 0.28 lane, the panel overhung it and sat on the x-axis labels and the credit at 47 scroll
 *  positions.
 *
 *  AND SINCE THE VEHICLE'S EIGHTH CORRECTION NOTHING GOES THERE. The prose moved into its own cell
 *  of the track's grid, so the panel is no longer inside the graphic's box at any offset and this
 *  band is empty ground — measured on the delivered file at 1600x900, 295px of an 820px graphic
 *  under the credit. It is kept, for now, because reclaiming it is a change every beat's own copy of
 *  this constant carries and the vehicle's `proseLane` parameter — validated `0 < x < 0.6` and
 *  emitted as `--prose-lane` — cannot express "none" without editing the settled scaffold. Named as
 *  residue in `BRIEF.md`, "The dead lane". */
export const PROSE_LANE = 0.36;

/** How much of the frame's own height the drawing may use, measured from the top. */
export const CONTENT_TOP = 1 - PROSE_LANE;

/** The plot box, in fractions of the frame. The floor leaves room for the x-axis label strip AND
 *  for the credit line, which sits at the BOTTOM of the visual — above the prose lane, never under
 *  the header (owner feedback B1.1). */
export const PLOT = {
  left: 0.115,
  right: 0.955,
  top: 0.11,
  bottom: CONTENT_TOP - 0.1,
};

/** The geometry-only viewBox the plot's SVG stretches across. Type is never inside it. */
export const VIEWBOX = { width: 1000, height: 500 };

/** Fixed tick slots, so the driver only ever rewrites text and position and never adds or removes
 *  a node. A slot outside the current domain is hidden, not deleted. */
export const Y_SLOTS = 8;
export const X_SLOTS = 10;

// ── Interpolation ──────────────────────────────────────────────────────────────────────────────

export function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** easeInOutQuad — the camera leaves and arrives calmly, and holds still in between. */
export function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Every field of a state is a number, so a state interpolates field by field. A state that
 *  carried a string would silently stop moving; `assertNumericStates` refuses one. */
export function lerpState(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = lerp(a[key], b[key], t);
  return out;
}

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

/** The state at a continuous position along the steps. `position` 1.5 is halfway between step 1
 *  and step 2; `reduced` snaps to the nearer step, which is what a reader who asked for no motion
 *  gets — the step still ARRIVES, it just does not fly. */
export function stateAt(states, position, reduced) {
  const last = states.length - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) return states[Math.round(p)];
  const i = Math.min(Math.floor(p), last - 1);
  return lerpState(states[i], states[i + 1], ease(p - i));
}

// ── Where the reader is: READ off the scaffold, never re-derived ───────────────────────────────

/**
 * WHERE THE READER IS — the scaffold's own published number, taken as given.
 *
 * THIS DRIVER USED TO DERIVE IT ITSELF, and the derivation is what froze the picture. It measured
 * each panel's overlap with a band at the bottom `data-prose-lane`% of the scrollport, and took the
 * argmax plus `2·next/(active+next)`. That was correct arithmetic for a vehicle where the panel
 * PARKED in that band for the whole of its step. The vehicle's eighth correction moved the prose
 * into its own cell of the track's grid, travelling the full height of it, so the band at the bottom
 * of the scrollport stopped being where the words are: for most of every step NO panel is inside it,
 * every overlap is 0, the argmax falls to index 0 and the expression returns 0.
 *
 * Measured on the delivered file at 1600x900, scrolling the real column in Chrome, before this
 * change: the scaffold's own `data-progress` ran 0.0000 → 0.2527 → 0.5707 → 0.8886 → 1.2066 → …
 * → 3.0000 while this beat's `data-position` read 0.000 at seven of eleven probes and 1.000, 2.000
 * or 3.000 at the other four. A slideshow with a fade, which is exactly what the owner reported:
 * *"faut que ce soit fluide et que l'élément évolue au fur et à mesure du temps."*
 *
 * The repair is not better arithmetic — it is to stop having a second opinion. Since the eighth
 * correction the vehicle publishes the continuous signal itself, on the `.scrolly` root, every
 * scroll: `data-progress`, the fractional index of the panel on the lane's own centre line,
 * interpolated between the two card centres that bracket it. The scaffold's own `pickActiveStep`
 * and that number are in lock-step by construction, so consuming it makes "the picture reaches the
 * moment this sentence names" and "this sentence reaches the middle of its column" one event
 * WITHOUT this file restating a measurement the vehicle already owns.
 *
 * `data-prose-lane` is deliberately NOT read any more. It still says what it always said — the band
 * a beat's own FRAME keeps clear — and bending it to make a consumer's arithmetic work would be
 * corrupting a number to fit its reader.
 */
export function progressSourceOf(el) {
  let node = el;
  while (node) {
    if (node.getAttribute && node.getAttribute("data-progress") !== null) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * The published position, or a throw naming what it looked for. A default here would be the whole
 * defect back again in a quieter form: a beat that silently renders state 0 forever looks exactly
 * like a beat whose script never ran, which is how this one shipped frozen with every guard green.
 */
export function readProgress(source) {
  const raw = source == null ? null : source.getAttribute("data-progress");
  const value = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(value))
    throw new Error(
      `this beat is driven by the scrolly scaffold's continuous signal and read ${JSON.stringify(raw)} ` +
        `for data-progress on the nearest ancestor carrying it (twin-scrolly/assets/interaction.mjs ` +
        `writes it on the .scrolly root on every scroll)`,
    );
  return value;
}

// ── Ticks ──────────────────────────────────────────────────────────────────────────────────────

/** A 1/2/5 x 10^n step that puts about `slots` ticks across the span. */
export function niceStep(span, slots) {
  const raw = span / Math.max(1, slots - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / magnitude;
  const step = scaled >= 5 ? 10 : scaled >= 2 ? 5 : scaled >= 1 ? 2 : 1;
  return step * magnitude;
}

export function fmt(value, decimals) {
  return value.toFixed(decimals);
}

/**
 * Exactly `slots` tick descriptors for a domain — `at` is the fraction of the domain, 0 at `lo`.
 * Slots past the end of the domain come back `visible: 0` rather than absent, so the driver never
 * adds or removes a node and the SSR'd markup and the driven markup are the same shape.
 */
export function ticksFor(lo, hi, slots) {
  const step = niceStep(hi - lo, slots);
  // The precision comes from the STEP, never from the span. Taken from the span, the label format
  // flips somewhere in the MIDDLE of the last step's axis flight — "84" becoming "84.0" while
  // nothing else on the frame changes — which reads as a glitch. Taken from the step, it can only
  // change at the same moment the ticks themselves jump, which a reader is already watching.
  const decimals = step >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(step)));
  const first = Math.ceil(lo / step) * step;
  const out = [];
  for (let i = 0; i < slots; i++) {
    const value = first + i * step;
    const inside = value <= hi + step * 1e-9;
    out.push({
      value,
      label: fmt(value, decimals),
      at: (value - lo) / (hi - lo),
      visible: inside ? 1 : 0,
    });
  }
  return out;
}

// ── The picture ────────────────────────────────────────────────────────────────────────────────

function round(n) {
  return Math.round(n * 100) / 100;
}

/** The band's fill alpha when it is fully present — the denominator its label's own opacity is
 *  taken against, so one number governs both and they cannot drift. */
export const BAND_FILL = 0.16;

/** The reading at a fractional year, linearly between the two years that bracket it — so a
 *  highlighted RUN can start and end anywhere, and grow continuously as the reader scrolls. */
export function valueAt(readings, year) {
  if (year <= readings[0].year) return readings[0].value;
  const last = readings[readings.length - 1];
  if (year >= last.year) return last.value;
  for (let i = 1; i < readings.length; i++) {
    const b = readings[i];
    if (b.year >= year) {
      const a = readings[i - 1];
      return lerp(a.value, b.value, (year - a.year) / (b.year - a.year));
    }
  }
  return last.value;
}

/**
 * Everything the picture needs, for one state. Pure: no DOM, no React, no colours — the caller
 * (SSR or driver) turns this into nodes.
 *
 * `state` fields:
 *   x0 x1 y0 y1     the two domains, both interpolated, which is what makes the axis TRAVEL rather
 *                   than cut when the last step narrows the chart to one decade;
 *   hiFrom hiTo     the run of the line drawn in the accent, in (fractional) years;
 *   hiOpacity       how present that run is;
 *   bandFrom bandTo bandOpacity   the called-out band behind the plot;
 *   markA markB     the two annotated points' own opacity (each has a FIXED year: a mark that
 *                   interpolated its year would slide through six decades of meaningless positions
 *                   on the way from one annotation to the other).
 */
export function chartGeometry(readings, state, marks) {
  const { x0, x1, y0, y1 } = state;
  const sx = (year) => ((year - x0) / (x1 - x0)) * VIEWBOX.width;
  const sy = (value) => (1 - (value - y0) / (y1 - y0)) * VIEWBOX.height;

  const base = readings.map((r) => `${round(sx(r.year))},${round(sy(r.value))}`).join(" ");

  const from = Math.min(state.hiFrom, state.hiTo);
  const to = Math.max(state.hiFrom, state.hiTo);
  const inner = readings.filter((r) => r.year > from && r.year < to);
  const highlight = [
    [from, valueAt(readings, from)],
    ...inner.map((r) => [r.year, r.value]),
    [to, valueAt(readings, to)],
  ]
    .map(([year, value]) => `${round(sx(year))},${round(sy(value))}`)
    .join(" ");

  const bandLeft = sx(state.bandFrom);
  const bandRight = sx(state.bandTo);

  const point = (year) => {
    const value = valueAt(readings, year);
    const x = sx(year);
    const y = sy(value);
    // A mark whose year OR VALUE is outside the CURRENT domain is off the plot, and its annotation
    // is off the plot with it. Measured on the first build: while the last step's axes fly in to
    // the last twelve years, 1918 leaves the frame long before its own opacity has finished fading,
    // and its label was found outside the viewport at 27 consecutive scroll positions. Faded out
    // over the last `EDGE` of each axis, so it leaves with the plot rather than after it.
    //
    // THE VERTICAL HALF IS THE ONE THIS ROUND ADDS, and it took making the scrub continuous to see
    // it: the fade was written against the X domain alone, and the last flight narrows BOTH. The
    // y domain closes from 36.5–87.5 onto 82.4–84.2 several tenths of a step before x0 passes 1918,
    // so the 1918 mark sinks straight out of the bottom of the plot while its own x is still
    // comfortably inside and its opacity still above a half. Measured on this beat's own geometry:
    // at position 2.40 the mark sits at y=568.6 in a 0..500 plot — 69 viewBox units below the floor,
    // on the x-tick strip and level with the credit — at opacity 0.537. Frozen at state 0, as this
    // beat shipped, nobody could see it; scrubbed, it is a dot and a label loose under the chart.
    //
    // `EDGE` is the same 7% of each axis rather than the same number on both, because the viewBox
    // is 1000x500 and one constant would fade twice as fast vertically as horizontally.
    //
    // AND THE TWO AXES FADE ON DIFFERENT SIDES OF THEIR OWN EDGE, which is not an inconsistency but
    // the difference between the two domains. The X domain ENDS ON A DATA YEAR — `x1` is
    // `lastYear` — so a mark on the last reading sits exactly at `VIEWBOX.width` and has to be at
    // full strength there; its fade therefore runs OUTSIDE the edge. Every Y domain this beat
    // builds is PADDED away from its own extremes (8% on the full range, 22% on the decade), so no
    // mark can legitimately sit on the floor or the ceiling, and the vertical fade runs INSIDE,
    // reaching zero exactly at the edge. Below that floor is the x-tick strip and the credit, and a
    // dot fading out over them is the defect this whole comment is about.
    const EDGE_X = VIEWBOX.width * 0.07;
    const EDGE_Y = VIEWBOX.height * 0.07;
    const inside = Math.min(
      clamp01((x + EDGE_X) / EDGE_X),
      clamp01((VIEWBOX.width + EDGE_X - x) / EDGE_X),
      clamp01(y / EDGE_Y),
      clamp01((VIEWBOX.height - y) / EDGE_Y),
    );
    return { x: round(x), y: round(y), value, inside };
  };

  return {
    base,
    highlight,
    hiOpacity: state.hiOpacity,
    band: {
      x: round(Math.min(bandLeft, bandRight)),
      width: round(Math.abs(bandRight - bandLeft)),
      opacity: state.bandOpacity,
      // The band's FILL is deliberately faint — it sits behind the line and must not compete with
      // it. Its LABEL is a word and has to be read, so it rides the band's arrival rather than its
      // alpha: shipped once at the fill's own 0.16 and the label was invisible in the render.
      labelOpacity: clamp01(state.bandOpacity / BAND_FILL),
    },
    marks: marks.map((mark, i) => {
      const at = point(mark.year);
      return { ...at, opacity: (i === 0 ? state.markA : state.markB) * at.inside, label: mark.label };
    }),
    yTicks: ticksFor(y0, y1, Y_SLOTS),
    xTicks: ticksFor(x0, x1, X_SLOTS),
  };
}

/** viewBox units → a fraction of the whole FRAME, which is how every word on this frame is
 *  positioned: type is HTML at a fixed pixel size over a plot that stretches. */
export function toFrame(x, y) {
  return [
    PLOT.left + (PLOT.right - PLOT.left) * (x / VIEWBOX.width),
    PLOT.top + (PLOT.bottom - PLOT.top) * (y / VIEWBOX.height),
  ];
}

export function pct(v) {
  return `${(v * 100).toFixed(3)}%`;
}

/** An annotation hangs above its point, and flips to the inside when the point is near an edge, so
 *  it can never be the thing that leaves the frame. */
export function annotationPlacement(x, y) {
  const [fx, fy] = toFrame(x, y);
  const nearRight = fx > 0.62;
  const nearLeft = fx < 0.2;
  return {
    left: pct(fx),
    top: pct(fy),
    transform: nearRight
      ? "translate(-100%, -145%)"
      : nearLeft
        ? "translate(0, -145%)"
        : "translate(-50%, -145%)",
  };
}

// ── The driver (browser only) ──────────────────────────────────────────────────────────────────

/* eslint-env browser */

/**
 * Re-parent the persistent visual OUT of the per-step frame stack.
 *
 * The scaffold's contract is N pictures of which exactly one is painted; this beat has ONE picture
 * that must never be un-painted. Left inside step 1's frame wrapper, it would be faded out the
 * moment step 2 became active. Moved up one level into the stack itself, it is a permanent sibling
 * the swap never touches — and with JavaScript off it stays where it was SSR'd, inside the frame
 * the scaffold marks active by default, so the no-JS reader still gets the whole first state.
 *
 * Reported rather than patched around: the vehicle has no way for a beat to declare "my visual is
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
  // Every wrapper the scaffold swaps is now empty; keep them from painting anything over the
  // visual, whatever the scaffold decides to do with their opacity.
  for (const sibling of Array.from(stack.children))
    if (sibling !== root) sibling.style.pointerEvents = "none";
}

export function initChartScrolly(root, readings, states, marks) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  detachVisual(root);

  // Resolved once, AFTER the re-parent, and loudly: the whole of this beat's motion is one number
  // the vehicle publishes, so an ancestor that does not carry it is not a degraded mode to paper
  // over — it is this beat having no way to know where the reader is.
  const progressSource = progressSourceOf(root);
  if (!progressSource)
    throw new Error(
      "no ancestor of this beat's visual carries data-progress — twin-scrolly's scaffold publishes it " +
        "on the .scrolly root, and this beat is driven by nothing else",
    );

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = {
    base: root.querySelector("[data-part=base]"),
    hi: root.querySelector("[data-part=highlight]"),
    band: root.querySelector("[data-part=band]"),
    bandLabel: root.querySelector("[data-part=band-label]"),
    marks: Array.from(root.querySelectorAll("[data-mark]")),
    annotations: Array.from(root.querySelectorAll("[data-annotation]")),
    yTicks: Array.from(root.querySelectorAll("[data-ytick]")),
    yGrid: Array.from(root.querySelectorAll("[data-ygrid]")),
    xTicks: Array.from(root.querySelectorAll("[data-xtick]")),
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
    // The driven state, published on the element itself. This is what a verification run reads:
    // a screenshot proves a frame was painted, it never proves WHICH state the geometry is in, and
    // "the visual arrives at the wrong moment" is a claim about exactly that.
    root.dataset.state = JSON.stringify(state);
    const geometry = chartGeometry(readings, state, marks);

    nodes.base.setAttribute("points", geometry.base);
    nodes.hi.setAttribute("points", geometry.highlight);
    nodes.hi.style.opacity = String(geometry.hiOpacity);
    nodes.band.setAttribute("x", String(geometry.band.x));
    nodes.band.setAttribute("width", String(geometry.band.width));
    nodes.band.style.opacity = String(geometry.band.opacity);
    if (nodes.bandLabel) {
      const [fx] = toFrame(geometry.band.x + geometry.band.width / 2, 0);
      nodes.bandLabel.style.left = pct(fx);
      nodes.bandLabel.style.opacity = String(geometry.band.labelOpacity);
    }
    geometry.marks.forEach((mark, i) => {
      const node = nodes.marks[i];
      if (node) {
        // The dot is HTML, not an SVG circle. Inside a `preserveAspectRatio="none"` plot a circle
        // is an ellipse at every viewport but one: at 1600x900 the first build's r=5 mark drew as a
        // 14px-wide, 2px-tall dash, which read as a stray tick rather than as the point the
        // sentence beside it names. Same rule as every word on this frame — geometry stretches,
        // everything else is placed in fractions and drawn at a fixed pixel size.
        const [dx, dy] = toFrame(mark.x, mark.y);
        node.style.left = pct(dx);
        node.style.top = pct(dy);
        node.style.opacity = String(mark.opacity);
      }
      const annotation = nodes.annotations[i];
      if (annotation) {
        const place = annotationPlacement(mark.x, mark.y);
        annotation.style.left = place.left;
        annotation.style.top = place.top;
        annotation.style.transform = place.transform;
        annotation.style.opacity = String(mark.opacity);
      }
    });
    geometry.yTicks.forEach((tick, i) => {
      const node = nodes.yTicks[i];
      if (!node) return;
      const [, fy] = toFrame(0, (1 - tick.at) * VIEWBOX.height);
      node.style.top = pct(fy);
      node.style.opacity = String(tick.visible);
      if (node.textContent !== tick.label) node.textContent = tick.label;
      const rule = nodes.yGrid[i];
      if (rule) {
        const y = String((1 - tick.at) * VIEWBOX.height);
        rule.setAttribute("y1", y);
        rule.setAttribute("y2", y);
        rule.style.opacity = String(tick.visible * 0.28);
      }
    });
    geometry.xTicks.forEach((tick, i) => {
      const node = nodes.xTicks[i];
      if (!node) return;
      const [fx] = toFrame(tick.at * VIEWBOX.width, 0);
      node.style.left = pct(fx);
      node.style.opacity = String(tick.visible);
      if (node.textContent !== tick.label) node.textContent = tick.label;
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    view.requestAnimationFrame(paint);
  }

  // `capture: true` on the window catches a scroll from ANY scroller, including an inner container
  // — which is what the fixed-page model this scaffold actually scrolls. The scaffold listens on
  // that container in the TARGET phase, so it has already written the frame's `data-progress` by
  // the time the `requestAnimationFrame` this schedules runs.
  view.addEventListener("scroll", schedule, { capture: true, passive: true });
  // `lastPosition` is INVALIDATED rather than merely re-scheduled on a size change, and that is a
  // consequence of reading progress instead of deriving it. The old measurement moved whenever the
  // scrollport did, so a resize always produced a different number and always repainted. A
  // published progress can be bit-identical across a resize while the frame it is drawn in is a
  // different shape, and `paint`'s own no-op guard would skip the repaint.
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
