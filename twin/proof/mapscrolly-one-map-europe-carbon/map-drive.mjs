// THE ONE IMPLEMENTATION OF THIS BEAT'S CAMERA, USED TWICE.
//
// `MapFrame.tsx` imports it in node to SSR the map at its FIRST camera; `render.mjs` reads this same
// file as text, strips the `export` keywords and inlines it into the delivered HTML, where
// `initMapScrolly` drives the camera through the other three. One implementation, so the picture a
// reader meets before any script runs and the picture the scroll drives cannot drift apart.
//
// THE SCROLL DRIVES THE CAMERA. This is not four map pictures swapped behind a frame: it is ONE
// baked plate, and the reader's scroll flies, zooms and settles a camera inside it. Between two
// steps the camera is interpolated continuously — the centre linearly, the SPAN geometrically (the
// states carry `logSpanX`/`logSpanY`, so a lerp in state space is a constant-rate zoom in what the
// eye sees, rather than a flight that races at the start and crawls at the end).
//
// WHY A BAKED PLATE AND NOT LIVE TILES — the decision, argued rather than inherited.
// `twin-doctrine/references/geo-discipline.md` rule 2 is written for a moving camera: render ONE
// fixed plate wide enough to hold every camera position and move WITHIN it, because re-rendering
// tiles per camera position resamples the basemap slightly differently each time and the picture
// shimmers. That rule was written about a video's camera. A scroll-driven camera is the same camera
// with the reader's thumb on the timeline, so it inherits the rule unchanged — and it inherits it
// for one more reason a video does not have: the reader can stop anywhere, scrub back and forth,
// and go as fast as a trackpad allows, so a tile fetch would be firing continuously through a
// gesture the reader is making, and reading 3 would arrive as grey squares at exactly the moment
// its own sentence names what to look at.
//
// Ruling R1 put map x WEB on live MapTiler tiles, and that ruling does not reach here, because the
// two are not the same problem. A free-pan map's set of camera positions is INFINITE — the reader
// chooses it — and no bake can hold an infinite set. A scrolly's camera is AUTHORED: four positions,
// known at build time, on one continuous path between them. A finite, known set is exactly what a
// plate can hold. So this file keeps the plate, and pays for it in one measured currency:
// `MAX_SCALE` below, the point past which the camera would be magnifying the plate beyond its own
// resolution. The story was written to that budget rather than the budget being stretched to the
// story — see `BRIEF.md`, "What the plate costs."

// ── Placement, shared with the scaffold ────────────────────────────────────────────────────────

/** The band at the BOTTOM of the graphic reserved for the pinned prose panel. `render.mjs` hands
 *  this same number to `renderScrolly` as `proseLane`. 0.36 rather than the vehicle's 0.28: at
 *  375x812 the tallest panel measures 0.28 of the scrollport and parks 0.06 above its floor. */
export const PROSE_LANE = 0.36;

/** How much of the frame's own height the map's SUBJECT is centred in. The plate keeps painting
 *  below it — a map is scenery, and cropping sea is not a loss — but nothing this beat ANNOTATES is
 *  allowed down there. */
export const CONTENT_TOP = 1 - PROSE_LANE;

/**
 * The hard ceiling on the camera: how many raster pixels of the baked plate exist per plate unit.
 * The bake writes at `deviceScaleFactor: 2`, so a 2000-unit camera frame is a 4000px raster and this
 * is 2. Past it the plate is being magnified beyond its own resolution and the basemap goes soft —
 * the one real cost of moving inside a fixed plate instead of asking a tile server for a new one.
 * The camera is CLAMPED here rather than allowed to exceed it, so a beat can ask for a deeper zoom
 * than it paid for and get a shallower one, never a blurred one.
 */
export const MAX_SCALE = 2;

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

/**
 * The state at a continuous position along the steps.
 *
 * `reduced` is `prefers-reduced-motion`. A camera that flies is precisely what that setting exists
 * for, so under it the state SNAPS to the nearer step: the reader is still taken to every place the
 * beat visits — the step arrives, the highlight arrives, the words match the picture — but there is
 * no flight between two of them, only a cut. Nothing is unreachable under reduced motion; the
 * `stateAt` below returns one of the authored states exactly, never a blend.
 */
export function stateAt(states, position, reduced) {
  const last = states.length - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) return states[Math.round(p)];
  const i = Math.min(Math.floor(p), last - 1);
  return lerpState(states[i], states[i + 1], ease(p - i));
}

// ── Where the reader is: the SAME fact the scaffold uses to decide which words are on screen ────

/**
 * The scaffold (`twin-scrolly/assets/interaction.mjs`) gives the step to whichever panel occupies
 * the most of the prose lane, measured over every panel on every scroll. This driver takes the
 * identical measurement and adds the continuous part:
 *
 *   index = argmax overlap                (identical, ties to the earlier panel)
 *   t     = 2 * next / (active + next)    (clamped to 0..1)
 *
 * `t` reaches exactly 1 when the two overlaps are equal, which is exactly when the argmax flips and
 * the scaffold swaps the words — so the camera finishes arriving on the same frame the sentence
 * changes, by construction rather than by tuning, and the expression runs backwards unchanged when
 * the reader scrolls up.
 */
export function measureProgress(overlaps) {
  let index = 0;
  for (let k = 1; k < overlaps.length; k++) if (overlaps[k] > overlaps[index]) index = k;
  const active = overlaps[index];
  const next = index + 1 < overlaps.length ? overlaps[index + 1] : 0;
  const sum = active + next;
  const t = sum > 0 ? clamp01((2 * next) / sum) : 0;
  return index + t;
}

export function scrollportOf(el, view) {
  let node = el.parentElement;
  while (node) {
    const overflow = view.getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight + 1)
      return node;
    node = node.parentElement;
  }
  return null;
}

export function laneBandOf(port, panels, view, fallbackPercent) {
  let node = panels[0];
  let percent = null;
  while (node && percent === null) {
    const value = node.getAttribute && node.getAttribute("data-prose-lane");
    if (value) percent = Number(value);
    node = node.parentElement;
  }
  if (!percent) percent = fallbackPercent;
  const box = port.getBoundingClientRect();
  const offset = Number.parseFloat(view.getComputedStyle(panels[0]).bottom) || 0;
  return {
    top: box.bottom - (percent / 100) * box.height,
    bottom: box.bottom - offset,
  };
}

export function laneOverlap(panelBox, lane) {
  return Math.max(0, Math.min(panelBox.bottom, lane.bottom) - Math.max(panelBox.top, lane.top));
}

export function findPanels(doc, root) {
  return Array.from(doc.querySelectorAll("[data-step]")).filter(
    (el) => !root.contains(el) && el.querySelector("p") && !el.querySelector("[data-step]"),
  );
}

// ── The camera ─────────────────────────────────────────────────────────────────────────────────

/**
 * The camera, resolved against the box it is actually being drawn in.
 *
 * COVER, not contain: the target box FILLS the frame's width and its content band, and the plate
 * keeps painting past it in every direction. A contain fit would letterbox a near-square European
 * plate inside a wide frame and leave a third of the picture as bare ground — geo-discipline rule
 * 12's own trade, taken the other way round because here the frame is fixed by the vehicle and the
 * camera is the thing that can move.
 *
 * The subject is centred on the CONTENT band's middle, not the frame's, so what a step is about
 * sits above the prose lane while the sea below it does not care.
 */
export function resolveCamera(state, frame, contentTop, maxScale) {
  const spanX = Math.exp(state.logSpanX);
  const spanY = Math.exp(state.logSpanY);
  const contentH = frame.height * contentTop;
  // CONTAIN and COVER are both wrong on their own, and the state says which one it wants.
  //
  // Europe is near-square once projected; the band above the prose lane is roughly 3:1. COVER a
  // whole-continent camera into that band and half the continent is cropped — measured on the first
  // build, where the opening frame cut Iceland, the Faroes, Spain and Italy while the sentence over
  // it named the Faroes as the map's highest figure. CONTAIN a close camera into it and a TALL
  // subject zooms OUT instead of in: the Low Countries box is 502 units tall against a 525px band,
  // so contain resolved to a SHALLOWER scale than the step before it.
  //
  // So `fit` is a field of the state, interpolated like any other: 0 for an overview that must show
  // everything, 1 for a close reading that must fill the frame. The scale is interpolated in LOG
  // space so a change of fit is a constant-rate zoom, and the vertical centre travels with it —
  // an overview is centred in the whole frame (its lower third simply sits under the prose lane,
  // which is what a map's sea is for), a close reading is centred in the content band so what it is
  // about is above the panel.
  const contain = Math.min(frame.width / spanX, frame.height / spanY);
  const cover = Math.max(frame.width / spanX, contentH / spanY);
  const wanted = Math.exp(lerp(Math.log(contain), Math.log(cover), state.fit));
  const scale = Math.min(wanted, maxScale);
  const centreY = lerp(frame.height / 2, contentH / 2, state.fit);
  return {
    scale,
    tx: frame.width / 2 - state.cx * scale,
    ty: centreY - state.cy * scale,
    clamped: wanted > maxScale,
    spanX,
    spanY,
  };
}

/** A plate point in the frame's own pixels. */
export function project(point, camera) {
  return [point[0] * camera.scale + camera.tx, point[1] * camera.scale + camera.ty];
}

/**
 * Where a label sits: over its own country, pushed above the country's own box, and CLAMPED into
 * the content band so it can never be the thing that ends up under the prose panel or off the
 * frame. `above` is false when the clamp bit, which is what the caller draws a leader line for.
 */
export function labelPlacement(box, camera, frame, contentTop, lift) {
  const [cx] = project([(box.minX + box.maxX) / 2, 0], camera);
  const [, top] = project([0, box.minY], camera);
  const contentH = frame.height * contentTop;
  const wanted = top - lift;
  const y = Math.max(18, Math.min(contentH - 12, wanted));
  const x = Math.max(60, Math.min(frame.width - 60, cx));
  return { x, y, clamped: Math.abs(y - wanted) > 1 || Math.abs(x - cx) > 1 };
}

// ── The driver (browser only) ──────────────────────────────────────────────────────────────────

/* eslint-env browser */

/**
 * Move the persistent visual OUT of the per-step frame stack.
 *
 * The scaffold's contract is N pictures of which exactly one is painted. This beat has ONE picture
 * whose CAMERA moves; left inside step 1's wrapper it would be faded out the moment step 2 became
 * active. Moved one level up into the stack it is a permanent sibling the swap never touches — and
 * with JavaScript off it stays where it was SSR'd, inside the wrapper the scaffold marks active by
 * default, so a no-JS reader still gets the whole opening camera.
 *
 * Reported, not patched around: the vehicle has no way for a beat to declare "my visual is one
 * persistent element". This function is what that missing declaration costs today.
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

export function initMapScrolly(root, states, labels, config) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  detachVisual(root);

  const panels = findPanels(doc, root);
  if (panels.length < 2) return;

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const camera = root.querySelector("[data-part=camera]");
  const veil = root.querySelector("[data-part=veil]");
  const groups = { A: root.querySelector("[data-hi=A]"), B: root.querySelector("[data-hi=B]"), C: root.querySelector("[data-hi=C]") };
  const labelNodes = Array.from(root.querySelectorAll("[data-label]"));
  const leaders = root.querySelector("[data-part=leaders]");

  let queued = false;
  let last = -1;

  function paint() {
    queued = false;
    const port = scrollportOf(panels[0], view);
    if (!port) return;
    const lane = laneBandOf(port, panels, view, PROSE_LANE * 100);
    const overlaps = panels.map((p) => laneOverlap(p.getBoundingClientRect(), lane));
    const position = measureProgress(overlaps);
    if (Math.abs(position - last) < 0.0005) return;
    last = position;

    const state = stateAt(states, position, reduced.matches);
    const box = root.getBoundingClientRect();
    const frame = { width: box.width, height: box.height };
    const view3 = resolveCamera(state, frame, CONTENT_TOP, MAX_SCALE);

    root.dataset.position = position.toFixed(3);
    // Published so a verification run can read the CAMERA, not just look at a picture. A screenshot
    // proves a frame was painted; it never proves where the camera was pointing or how far past the
    // plate's own resolution it had gone.
    root.dataset.state = JSON.stringify({
      cx: state.cx,
      cy: state.cy,
      spanX: view3.spanX,
      scale: view3.scale,
      clamped: view3.clamped ? 1 : 0,
      hiA: state.hiA,
      hiB: state.hiB,
      hiC: state.hiC,
      dim: state.dim,
      rasterPerPixel: config.rasterPerUnit / view3.scale,
    });

    camera.style.transform = `translate(${view3.tx}px, ${view3.ty}px) scale(${view3.scale})`;
    veil.style.opacity = String(state.dim);
    groups.A.style.opacity = String(state.hiA);
    groups.B.style.opacity = String(state.hiB);
    groups.C.style.opacity = String(state.hiC);

    let leaderPath = "";
    labelNodes.forEach((node, i) => {
      const label = labels[i];
      const opacity = state[label.gate];
      node.style.opacity = String(opacity);
      if (opacity < 0.02) return;
      const place = labelPlacement(label.box, view3, frame, CONTENT_TOP, config.lift);
      // The pure placement clamps against the frame; this clamps against the LABEL'S OWN measured
      // box, which the pure function cannot know. Without it a label near an edge is centred on a
      // legal point and still hangs off the screen by half its width — measured at 375x812, where
      // "Luxembourg 10.3" and "Netherlands 6.5" each left the viewport once per sweep, and where a
      // label pinned at the top guard had its own top edge at -6px.
      const halfWidth = node.offsetWidth / 2 + 6;
      const height = node.offsetHeight + 6;
      const contentH = frame.height * CONTENT_TOP;
      const x = Math.max(halfWidth, Math.min(frame.width - halfWidth, place.x));
      const y = Math.max(height, Math.min(contentH - 6, place.y));
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      const [ax, ay] = project(label.anchor, view3);
      // A leader only when the label had to be pulled away from its own country — otherwise the
      // label sits on the shape and a line to it is noise.
      if (place.clamped || Math.abs(x - place.x) > 1 || ay - y > config.lift * 1.6)
        leaderPath += `M${x} ${y + 6}L${ax} ${ay}`;
    });
    if (leaders) leaders.setAttribute("d", leaderPath);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    view.requestAnimationFrame(paint);
  }

  view.addEventListener("scroll", schedule, { capture: true, passive: true });
  view.addEventListener("resize", schedule, { passive: true });
  view.addEventListener("orientationchange", schedule, { passive: true });
  if (reduced.addEventListener) reduced.addEventListener("change", () => { last = -1; schedule(); });
  doc.addEventListener("visibilitychange", schedule);
  schedule();
  return { paint, panels };
}
