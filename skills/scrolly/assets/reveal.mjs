// twin/skills/scrolly/assets/reveal.mjs
//
// ONE VISUAL, REVEALED BY THE SCROLL — the vehicle's second form, written once.
//
// The scaffold's first form assembles N pictures and swaps which one is painted. A TYPE beat is the
// other form: one chart, and the steps are successive readings of it — a surface filling, a rule
// arriving, a half named. A swap cannot express that; the reader has to watch the same picture stay
// put while what they are asked to see in it changes. So the visual is one persistent element and
// the scaffold's own continuous `data-progress` drives its state.
//
// This was first written inside one beat (`proof/scrolly-one-chart-swiss-life-expectancy/
// chart-drive.mjs`), and every type beat needs exactly the same wiring. A copy per beat is the
// defect the design base spent its whole pass removing, so the wiring lives here and a beat hands
// `renderScrolly` three things only: its states, its driver source, and the name of the function in
// that source that paints one state.
//
// Authored as an ES module for its unit tests; `renderScrolly` strips `export` and inlines it, with
// the beat's driver and the boot, inside one IIFE.

export function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** easeInOutQuad — a reading leaves and arrives calmly, and holds still in between. */
export function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Every field of a state is a number, so a state interpolates field by field. */
export function lerpState(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = lerp(a[key], b[key], t);
  return out;
}

/** The state at a continuous position along the steps. `reduced` snaps to the nearer step: a reader
 *  who asked for no motion still gets every reading, it just does not travel. */
export function stateAt(states, position, reduced) {
  const last = states.length - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) return states[Math.round(p)];
  const i = Math.min(Math.floor(p), last - 1);
  return lerpState(states[i], states[i + 1], ease(p - i));
}

/** HOW FAST THE PAINTED POSITION CATCHES THE SCROLL: a time constant, in ms. */
export const FOLLOW_MS = 90;

/**
 * THE PAINTED POSITION FOLLOWS THE SCROLL, IT DOES NOT JUMP TO IT. The scaffold publishes `data-progress` from the
 * scroll offset, and a scroll offset arrives in steps: measured on the proportional symbol scrolly (2026-09-15), a
 * 100 px mouse-wheel notch moved it by 0.108 in one frame, so the map's camera jumped 0.39 zoom levels and a band of
 * stations popped in — the owner's « passages de steps en steps saccadés ». Each frame the painted position covers
 * the share `1 − e^(−dt/τ)` of what is left, whatever the frame rate, and lands on the scroll once it is within half
 * a thousandth. A long frame (a background tab) is counted as 100 ms, so it never teleports either.
 */
export function followProgress(shown, target, dtMs, tauMs = FOLLOW_MS) {
  const dt = Math.max(0, Math.min(100, dtMs));
  const next = shown + (target - shown) * (1 - Math.exp(-dt / tauMs));
  return Math.abs(target - next) < 0.0005 ? target : next;
}

/** Refuses a state list that cannot be interpolated. A state carrying a string would silently stop
 *  moving, which looks exactly like a page whose script never ran. */
export function assertStates(states, steps) {
  if (!Array.isArray(states) || states.length !== steps)
    throw new Error(
      `a revealed visual needs one state per step: ${steps} steps, ${Array.isArray(states) ? states.length : 0} states`,
    );
  const keys = Object.keys(states[0]).join(",");
  states.forEach((state, i) => {
    if (Object.keys(state).join(",") !== keys)
      throw new Error(`state ${i} has different fields from state 0 — they cannot be interpolated`);
    for (const [k, v] of Object.entries(state))
      if (typeof v !== "number" || !Number.isFinite(v))
        throw new Error(`state ${i}.${k} is ${JSON.stringify(v)}; every field of a state must be a finite number`);
    // EVERY CARD CHANGES THE PICTURE. A scrolly is not a static plate with cards laid over it: a card
    // whose state equals the one before it is a card the reader scrolls through while nothing moves.
    if (i > 0 && Object.keys(state).every((k) => state[k] === states[i - 1][k]))
      throw new Error(
        `card ${i + 1} changes nothing: its state is card ${i}'s. Give it a reading of its own — reveal, ` +
          `filter, zoom, reorder, count, compare — or fold its words into the card before (references/directed-type-choreography.md)`,
      );
  });
  return states;
}

/**
 * THE VIEW OF A MAP THAT FILLS ITS STAGE. A map drawn with `preserveAspectRatio="meet"` stops at its own
 * frame and leaves the stage's sides bare; a map is geography and runs to the edges. So the viewBox is
 * chosen here: the box that must be seen (the camera's frame, or a close-up) is fitted inside the stage
 * minus the insets its overlays take — a counter, a key — and the viewBox is then widened or heightened
 * to the stage's own aspect, so the geography drawn past the box fills the rest. The beat has to draw
 * that geography; this only decides what the reader sees of it.
 *
 * @returns {{x: number, y: number, w: number, h: number}} a viewBox with the stage's aspect
 */
export function fitViewBox(box, stage, insets) {
  const innerW = Math.max(1, stage.width - insets.left - insets.right);
  const innerH = Math.max(1, stage.height - insets.top - insets.bottom);
  const scale = Math.min(innerW / box.w, innerH / box.h);
  const w = stage.width / scale;
  const h = stage.height / scale;
  const x = box.x - (insets.left + (innerW - box.w * scale) / 2) / scale;
  const y = box.y - (insets.top + (innerH - box.h * scale) / 2) / scale;
  return { x, y, w, h };
}

/** The nearest ancestor publishing `data-progress` — the `.scrolly` root. */
export function progressSourceOf(el) {
  let node = el;
  while (node) {
    if (node.getAttribute && node.getAttribute("data-progress") !== null) return node;
    node = node.parentElement;
  }
  return null;
}

/** The published position, or a throw naming what it looked for. A default would render state 0
 *  forever and look like a page whose script never ran. */
export function readProgress(source) {
  const raw = source == null ? null : source.getAttribute("data-progress");
  const value = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(value))
    throw new Error(
      `a revealed visual is driven by the scaffold's data-progress and read ${JSON.stringify(raw)} ` +
        `(scrolly/assets/interaction.mjs writes it on the .scrolly root on every scroll)`,
    );
  return value;
}

/**
 * Moves the visual out of step 1's frame wrapper into the stack itself, where the scaffold's swap
 * never touches it. With JavaScript off it stays where it was rendered — inside the wrapper the
 * scaffold marks active — so a reader without a script still sees the whole picture.
 */
export function detachVisual(root) {
  const wrapper = root.parentElement;
  const stack = wrapper && wrapper.parentElement;
  if (!stack) return;
  stack.appendChild(root);
  root.style.position = "absolute";
  root.style.inset = "0";
  for (const sibling of Array.from(stack.children)) if (sibling !== root) sibling.style.pointerEvents = "none";
}

/**
 * Wires one visual to the scroll. `apply(root, state, context)` paints a state; `context.resized`
 * is true on the first paint and after every size change, which is when a beat re-measures anything
 * it seats in pixels.
 */
export function initReveal(root, states, apply) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  detachVisual(root);
  const source = progressSourceOf(root);
  if (!source)
    throw new Error("no ancestor of this visual carries data-progress — the scaffold publishes it on the .scrolly root");

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  let queued = false;
  let last = -1;
  let resized = true;
  let shown = null;
  let shownAt = 0;

  function paint(now) {
    queued = false;
    const target = readProgress(source);
    const time = typeof now === "number" ? now : view.performance.now();
    // The first paint, and a reader who asked for no motion, take the scroll as it is; every other paint follows it.
    shown = shown === null || reduced.matches ? target : followProgress(shown, target, time - shownAt);
    shownAt = time;
    if (shown !== target) schedule();
    const position = shown;
    if (!resized && Math.abs(position - last) < 0.0005) return;
    last = position;
    const state = stateAt(states, position, reduced.matches);
    // Published on the element, because a screenshot proves a frame was painted and never WHICH
    // state it was painted in.
    root.dataset.position = position.toFixed(3);
    root.dataset.state = JSON.stringify(state);
    apply(root, state, { resized });
    resized = false;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    view.requestAnimationFrame(paint);
  }

  const invalidate = () => {
    resized = true;
    schedule();
  };
  view.addEventListener("scroll", schedule, { capture: true, passive: true });
  view.addEventListener("resize", invalidate, { passive: true });
  if (reduced.addEventListener) reduced.addEventListener("change", invalidate);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(invalidate);
  paint();
  return { paint };
}
