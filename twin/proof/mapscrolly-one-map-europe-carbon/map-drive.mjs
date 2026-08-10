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

/** The band at the BOTTOM of the graphic this frame keeps clear. `render.mjs` hands the same number
 *  to `renderScrolly` as `proseLane`. 0.36 rather than the vehicle's 0.28: at 375x812 the tallest
 *  panel measured 0.28 of the scrollport and parked 0.06 above its floor.
 *
 *  AND SINCE THE VEHICLE'S EIGHTH CORRECTION NOTHING GOES THERE. The prose moved into its own cell
 *  of the track's grid, so the panel is no longer inside the graphic's box at any offset. This band
 *  is now the bottom third of the PLATE — sea and land the camera still paints, which is why it
 *  reads as less wasteful here than on the chart — but `CONTENT_TOP` still refuses to centre a
 *  subject or place a label in it. Kept, for now, because reclaiming it is a change every beat's own
 *  copy of this constant carries and the vehicle's `proseLane` parameter — validated `0 < x < 0.6`
 *  and emitted as `--prose-lane` — cannot express "none" without editing the settled scaffold. Named
 *  as residue in `BRIEF.md`, "The dead lane". */
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

// ── Where the reader is: READ off the scaffold, never re-derived ───────────────────────────────

/**
 * WHERE THE READER IS — the scaffold's own published number, taken as given.
 *
 * THIS DRIVER USED TO DERIVE IT ITSELF, and the derivation is what froze the camera. It measured
 * each panel's overlap with a band at the bottom `data-prose-lane`% of the scrollport and took the
 * argmax plus `2·next/(active+next)`. Correct arithmetic for a vehicle where the panel PARKED in
 * that band for the whole of its step. The vehicle's eighth correction moved the prose into its own
 * cell of the track's grid, travelling the full height of it, so for most of every step NO panel is
 * in that band, every overlap is 0, the argmax falls to index 0 and the expression returns 0.
 *
 * Measured on the delivered file at 1600x900 in Chrome before this change: the scaffold's own
 * `data-progress` ran a clean 0 → 3 across the piece while this beat's `data-position` read 0.000
 * at most probes and jumped to a whole integer at the rest. Four stills and a fade, which is what
 * the owner reported: *"faut que ce soit fluide et que l'élément évolue au fur et à mesure du
 * temps."*
 *
 * The repair is to stop having a second opinion. The vehicle publishes `data-progress` on the
 * `.scrolly` root on every scroll — the fractional index of the panel on the lane's own centre
 * line, interpolated between the two card centres that bracket it — and it is in lock-step with the
 * scaffold's own `pickActiveStep` by construction. Consuming it makes the camera reaching a place
 * and the sentence naming it one event without this file restating a measurement the vehicle owns.
 *
 * `data-prose-lane` is deliberately NOT read any more. It means what it means; bending it to make a
 * consumer's arithmetic work would be corrupting a number to fit its reader.
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
 * The published position, or a throw naming what it looked for. A default here would be the defect
 * back in a quieter costume: a camera that silently sits on state 0 forever looks exactly like a
 * camera whose script never ran, which is how this beat shipped frozen with every guard green.
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

  // Resolved once, AFTER the re-parent, and loudly: the whole of this camera's motion is one number
  // the vehicle publishes, so an ancestor that does not carry it is not a degraded mode to paper
  // over — it is this beat having no way to know where the reader is.
  const progressSource = progressSourceOf(root);
  if (!progressSource)
    throw new Error(
      "no ancestor of this beat's visual carries data-progress — twin-scrolly's scaffold publishes it " +
        "on the .scrolly root, and this beat is driven by nothing else",
    );

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
    const position = readProgress(progressSource);
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

  // `capture: true` on the window catches a scroll from ANY scroller, including the inner column
  // the fixed-page model actually scrolls. The scaffold listens on that column in the TARGET phase,
  // so `data-progress` is already written for this frame by the time the rAF below runs.
  view.addEventListener("scroll", schedule, { capture: true, passive: true });
  // `last` is INVALIDATED rather than merely re-scheduled on a size change, and for this beat it is
  // load-bearing rather than tidy: `resolveCamera` resolves against the frame's own width and
  // height, and a published progress can be bit-identical across a resize while the box it is drawn
  // in is a different shape. Without this the camera would keep a scale computed for the old frame.
  const invalidate = () => {
    last = -1;
    schedule();
  };
  view.addEventListener("resize", invalidate, { passive: true });
  view.addEventListener("orientationchange", invalidate, { passive: true });
  if (reduced.addEventListener) reduced.addEventListener("change", invalidate);
  doc.addEventListener("visibilitychange", schedule);
  schedule();
  return { paint };
}
