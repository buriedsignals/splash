// THE ONE IMPLEMENTATION OF THIS BEAT'S CAMERA AND ITS REVEAL, USED TWICE.
//
// `MapFrame.tsx` imports it in node to SSR the frame at its opening state; `render.mjs` reads this
// same file as text, strips the `export` keywords and inlines it into the delivered HTML, where
// `initRouteScrolly` drives the reveal. One implementation, so the picture a reader meets before
// any script runs and the picture the scroll drives cannot drift apart.
//
// ── WHAT MOVES HERE, AND WHAT DOES NOT ────────────────────────────────────────────────────────
//
// THE CAMERA DOES NOT MOVE. That is this beat's own argument and it is unchanged: one bake, one
// fixed camera over the Danube corridor, and the steps add territories and extend the line inside
// it (geo-discipline rule 2, "move within the plate"). It is the opposite half of the sibling
// `mapscrolly-one-map-europe-carbon`, which flies one camera around a fixed set of shapes.
//
// THE CAMERA IS NOW EXPLICIT, though, and that is the change the live basemap forced. This frame
// used to be one `<svg preserveAspectRatio="xMidYMid meet">` filling its box: a letterboxed CONTAIN
// fit performed by the browser, with no numbers anywhere. A fit nobody computes cannot be handed to
// a map — live tiles under a plate whose scale and offset are implicit land wherever they land, and
// "the coastline is 40px from the river" is the kind of defect that still looks like a map. So the
// same contain fit is COMPUTED here (`containCamera`), applied as a CSS transform to the plate box
// and to the marks box, and handed to `live-scroll-map.mjs`'s `viewForCamera` — one derivation,
// three consumers, which is the shape the sibling arrived at after paying for two.
//
// WHAT FILLS WHAT, stated because the owner asked for one of these and the other is a consequence:
//   - the LIVE TILES fill the frame edge to edge, always — the container is `inset: 0` and a
//     MapLibre canvas fills its container. *"la map doit prendre toute la largeur"*, and its height
//     too.
//   - the PLATE and the MARKS are drawn at the contain-fit scale, which for a 900×420 plate is
//     width-bound in every frame this beat is verified at, so they also span the full width — and
//     they letterbox vertically rather than crop. That is deliberate and it is a defect this beat
//     has already had once: a `slice` (cover) fit cropped the plate's right edge away and the last
//     badge — 9, Ukraine, the delta — never rendered at all, in a step whose own sentence is about
//     the delta. Cropping is not available to this frame. Where the plate ends, live tiles keep
//     painting; there is no bare ground band any more unless the live layer fails.
//
// THE REVEAL IS CONTINUOUS, and that is the second change. The scaffold SSR'd four pictures and
// swapped which one was painted, so between two steps nothing at all happened — the sibling beat's
// own measurement of exactly that state is what named it: *"faut que ce soit fluide et que
// l'élément évolue au fur et à mesure du temps."* The line now grows and the territories arrive as
// functions of the vehicle's published `data-progress`, and the four authored pictures are still
// exactly what a reader sees at progress 0, 1, 2 and 3 — the step table in `BRIEF.md` is unchanged,
// because each territory's arrival threshold is its OWN first route index and each step's cutoff is
// the next territory's, so the interpolation passes through the authored states rather than
// replacing them.

// ── Placement, shared with the scaffold ────────────────────────────────────────────────────────

/** The band at the bottom of the graphic this frame keeps clear: NONE. The vehicle's ninth
 *  correction sends the prose card down the middle of the frame, travelling its whole height at the
 *  reader's own rate, and states in its own discipline file why no band can be reserved against a
 *  travelling occluder. Declared so `renderScrolly` can emit it and a reader of the delivered file
 *  can check the number. */
export const PROSE_LANE = 0;

/**
 * The hard ceiling on the camera: how many raster pixels of the baked plate exist per plate unit.
 * `bake.mjs` captures at `deviceScaleFactor: 2`, so the 900×420 plate is an 1800×840 raster and
 * this is 2. Past it the FALLBACK is being magnified beyond its own resolution and goes soft. The
 * live tiles have no such ceiling — they are re-fetched at whatever zoom the camera asks for — so
 * this clamp only ever protects the picture a reader sees when MapTiler is unreachable.
 */
export const MAX_SCALE = 2;

// ── The camera ─────────────────────────────────────────────────────────────────────────────────

/**
 * The contain fit, computed rather than left to `preserveAspectRatio`.
 *
 * CONTAIN, not cover: see the header. The plate is 2.14:1 and every frame this beat is verified at
 * is narrower than that per unit of height, so the WIDTH binds and the fit spans the frame edge to
 * edge horizontally — "contain" and "fill the width" are the same number here, and the difference
 * only appears on a frame wider than 2.14:1, where contain is what keeps badge 9 on screen.
 */
export function containCamera(frame, plate, maxScale) {
  const scale = Math.min(frame.width / plate.width, frame.height / plate.height, maxScale);
  return {
    scale,
    tx: (frame.width - plate.width * scale) / 2,
    ty: (frame.height - plate.height * scale) / 2,
    clamped: Math.min(frame.width / plate.width, frame.height / plate.height) > maxScale,
  };
}

/** A plate point in the frame's own pixels. */
export function project(point, camera) {
  return [point[0] * camera.scale + camera.tx, point[1] * camera.scale + camera.ty];
}

// ── The reveal ─────────────────────────────────────────────────────────────────────────────────

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** easeInOutQuad — the reveal leaves and arrives calmly and holds still in between, so a step's own
 *  sentence lands while the line is at rest rather than mid-stride. */
export function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * How far along the route the line has been drawn, at a continuous position along the steps.
 *
 * `stops[i]` is step i's own cutoff — the route index the line reaches when that step's sentence is
 * on screen — so `revealAt(stops, i)` is exactly the picture the four SSR'd frames used to be, and
 * the values between are the growth the reader now sees.
 *
 * `reduced` is `prefers-reduced-motion`. A line that grows is precisely what that setting exists
 * for, so under it the reveal SNAPS to the nearer step: every territory still arrives, every
 * sentence still lands on the picture it names, and there is no motion between two of them.
 */
export function revealAt(stops, position, reduced) {
  const last = stops.length - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) return stops[Math.round(p)];
  const i = Math.min(Math.floor(p), last - 1);
  return lerp(stops[i], stops[i + 1], ease(p - i));
}

/**
 * A territory's own opacity at a given reveal: absent before the river reaches it, arriving over
 * the stretch it is being reached along, and full afterwards — never subtracted (the beat's own
 * "the map only ever gains ground").
 *
 * `from` is the territory's own first route index and `to` is where it finishes arriving, both
 * computed in node from the route. At every authored stop this returns exactly 0 or exactly 1 for
 * every territory, which is what makes the continuous reveal pass THROUGH the four authored
 * pictures instead of near them.
 */
export function arrivalOpacity(reveal, from, to) {
  if (!(to > from)) return reveal >= from ? 1 : 0;
  const t = (reveal - from) / (to - from);
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}

/**
 * The fraction of the route's own drawn LENGTH that a reveal index stands for.
 *
 * Not `index / count`: the 911 samples are not evenly spaced on the plate, so a line dashed by
 * index would crawl through the dense stretches and race through the sparse ones. `cum` is the
 * cumulative length of the same rounded polyline the `d` attribute is built from, normalised to 1 —
 * computed in node, in `render.mjs`, from the same coordinates, so the dash and the path can only
 * agree.
 */
export function lengthFractionAt(cum, reveal) {
  const last = cum.length - 1;
  if (reveal <= 0) return 0;
  if (reveal >= last) return 1;
  const i = Math.floor(reveal);
  return lerp(cum[i], cum[i + 1], reveal - i);
}

// ── Where the reader is: READ off the scaffold, never re-derived ───────────────────────────────

/**
 * WHERE THE READER IS — the scaffold's own published number, taken as given.
 *
 * The vehicle publishes `data-progress` on the `.scrolly` root on every scroll: the fractional
 * index of the panel on the lane's own centre line, in lock-step with its own `pickActiveStep` by
 * construction. Consuming it makes the line reaching a place and the sentence naming it one event.
 * The sibling beat derived its own opinion of this number instead and shipped frozen with every
 * guard around it green; that is the defect this refuses to repeat.
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
 * back in a quieter costume: a reveal that silently sits on stop 0 forever looks exactly like a
 * reveal whose script never ran.
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

/**
 * A BADGE IS NEVER CUT DOWN ITS SIDE BY THE PROSE CARD.
 *
 * The vehicle's ninth correction sends an opaque card down the middle of this frame and states, in
 * its own discipline file, the only guarantee it can offer instead of the eighth's "the two never
 * meet": *"A label sitting under the card reads as absent, which is what a card over a picture
 * means. A label the card's own VERTICAL edge cuts down the middle reads as broken text, and stays
 * broken for every frame the card spends at that row."*
 *
 * This beat's badges are the labels in question — a numbered disc per territory, in the reading
 * order the river reaches them — and they are worse placed than a chart's than a map's usually are,
 * because the camera is FIXED: a badge that straddles a card edge straddles it at every scroll
 * position, so it is sliced on every frame the card spends at its row rather than on a few.
 *
 * So this takes a wanted centre and returns the nearest centre that is either wholly inside the
 * stripe or wholly outside it — whichever moves the badge less. `stripe` is null on a phone, where
 * the card is edge to edge and has no interior edge to cut anything against. A badge that is moved
 * gets a leader line back to its own anchor, so the displacement is legible rather than a lie about
 * where the country is.
 */
export function avoidStripe(x, halfWidth, stripe, frame) {
  if (!stripe) return x;
  const left = x - halfWidth;
  const right = x + halfWidth;
  const straddles =
    (stripe.left > left && stripe.left < right) || (stripe.right > left && stripe.right < right);
  if (!straddles) return x;
  const options = [];
  if (halfWidth * 2 <= stripe.right - stripe.left)
    options.push(Math.min(Math.max(x, stripe.left + halfWidth), stripe.right - halfWidth));
  if (stripe.left - halfWidth >= halfWidth) options.push(stripe.left - halfWidth);
  if (stripe.right + halfWidth <= frame.width - halfWidth) options.push(stripe.right + halfWidth);
  if (options.length === 0) return x;
  return options.reduce((best, o) => (Math.abs(o - x) < Math.abs(best - x) ? o : best));
}

// ── The driver (browser only) ──────────────────────────────────────────────────────────────────

/* eslint-env browser */

/**
 * Where the prose card's own vertical edges are, in this frame's coordinates, or null when it has
 * none inside the frame. MEASURED off the rendered card rather than re-derived from the vehicle's
 * `min(46ch, 100%)` and its 600px breakpoint: a second copy of two numbers the scaffold owns is a
 * second opinion, and this project has already paid for one of those.
 */
export function stripeOf(root, frame) {
  const doc = root.ownerDocument;
  const card = doc.querySelector(".step-panel");
  if (!card) return null;
  const box = card.getBoundingClientRect();
  const own = root.getBoundingClientRect();
  const left = box.left - own.left;
  const right = box.right - own.left;
  if (left <= 1 && right >= frame.width - 1) return null;
  return { left, right };
}

/**
 * Move the persistent visual OUT of the per-step frame stack.
 *
 * The scaffold's contract is N pictures of which exactly one is painted. This beat now has ONE
 * picture whose REVEAL moves; left inside step 1's wrapper it would be faded out the moment step 2
 * became active — and, worse for this round, the live map inside it would be faded out with it.
 * Moved one level up into the stack it is a permanent sibling the swap never touches, and with
 * JavaScript off it stays where it was SSR'd, inside the wrapper the scaffold marks active by
 * default, so a no-JS reader still gets the opening picture.
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

/**
 * `onCamera` is the LIVE MAP's subscription to this camera: `(camera, frame)` on every painted
 * frame, or null for a page with no live layer (which is also what the page is while it still holds
 * the delivery placeholder). It is a parameter rather than a call into `live-scroll-map.mjs`
 * because this file is the one thing that decides where the camera is, and the live layer has to
 * stay something that can fail without taking the beat with it.
 */
export function initRouteScrolly(root, config, onCamera) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  detachVisual(root);

  // Resolved once, AFTER the re-parent, and loudly: the whole of this reveal's motion is one number
  // the vehicle publishes, so an ancestor that does not carry it is not a degraded mode to paper
  // over — it is this beat having no way to know where the reader is.
  const progressSource = progressSourceOf(root);
  if (!progressSource)
    throw new Error(
      "no ancestor of this beat's visual carries data-progress — twin-scrolly's scaffold publishes it " +
        "on the .scrolly root, and this beat is driven by nothing else",
    );

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  // TWO boxes carry the camera — the baked plate underneath and this beat's own vector drawing
  // above the live map — and they are written from ONE resolved camera in one place. Two transforms
  // computed twice is the same defect class as two scroll positions.
  const cameraBoxes = Array.from(root.querySelectorAll("[data-part=camera]"));
  if (cameraBoxes.length === 0)
    throw new Error("this beat's visual carries no [data-part=camera] box for the camera to move");
  const routes = Array.from(root.querySelectorAll("[data-part=route]"));
  const shapes = config.territories.map((t) => root.querySelector(`[data-territory="${t.key}"]`));
  const badges = config.territories.map((t) => root.querySelector(`[data-badge="${t.key}"]`));
  const leaders = root.querySelector("[data-part=leaders]");

  let queued = false;
  let last = -1;

  function paint() {
    queued = false;
    const position = readProgress(progressSource);
    if (Math.abs(position - last) < 0.0005) return;
    last = position;

    const box = root.getBoundingClientRect();
    const frame = { width: box.width, height: box.height };
    const camera = containCamera(frame, config.plate, MAX_SCALE);
    // Read every frame, not cached: the card's own width regime changes with the viewport and it is
    // the same read either way.
    const stripe = stripeOf(root, frame);

    const reveal = revealAt(config.stops, position, reduced.matches);
    const fraction = lengthFractionAt(config.cum, reveal);

    root.dataset.position = position.toFixed(3);
    // Published so a verification run can read the REVEAL and the CAMERA, not just look at a
    // picture. A screenshot proves a frame was painted; it never proves how far the line had been
    // drawn or how far past the plate's own resolution the fallback had gone.
    root.dataset.state = JSON.stringify({
      reveal: Number(reveal.toFixed(2)),
      fraction: Number(fraction.toFixed(5)),
      scale: Number(camera.scale.toFixed(4)),
      clamped: camera.clamped ? 1 : 0,
      rasterPerPixel: Number((MAX_SCALE / camera.scale).toFixed(3)),
    });

    const transform = `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.scale})`;
    for (const el of cameraBoxes) el.style.transform = transform;
    // The LIVE MapTiler camera, driven from the same resolved camera on the same frame. A hook
    // rather than a call into the live module, so this driver stays the one thing that decides
    // where the camera is and the live layer stays deletable without editing it.
    if (onCamera) onCamera(camera, frame);

    // The line grows. `strokeDasharray` is the whole length and the offset is what is still to
    // come, both in the path's own user units — the ONE length `render.mjs` computed from the same
    // rounded coordinates the `d` attribute carries, never a second measurement of it.
    const hidden = (config.routeLength * (1 - fraction)).toFixed(2);
    for (const el of routes) el.style.strokeDashoffset = hidden;

    let leaderPath = "";
    config.territories.forEach((t, i) => {
      const opacity = arrivalOpacity(reveal, t.from, t.to);
      const shape = shapes[i];
      if (shape) shape.style.opacity = String(opacity);
      const badge = badges[i];
      if (!badge) return;
      badge.style.opacity = String(opacity);
      if (opacity < 0.02) return;
      const [ax, ay] = project(t.anchor, camera);
      // Clamped against the badge's OWN measured box, which no pure function can know: a badge
      // centred on a legal point still hangs off the frame by half its width.
      const halfWidth = badge.offsetWidth / 2 + 2;
      const halfHeight = badge.offsetHeight / 2 + 2;
      const wanted = Math.max(halfWidth, Math.min(frame.width - halfWidth, ax));
      const x = avoidStripe(wanted, halfWidth, stripe, frame);
      const y = Math.max(halfHeight, Math.min(frame.height - halfHeight, ay));
      badge.style.left = `${x.toFixed(1)}px`;
      badge.style.top = `${y.toFixed(1)}px`;
      // A leader only when the badge had to be pulled off its own anchor — otherwise it sits on the
      // country and a line to it is noise.
      if (Math.abs(x - ax) > 1 || Math.abs(y - ay) > 1)
        leaderPath += `M${x.toFixed(1)} ${y.toFixed(1)}L${ax.toFixed(1)} ${ay.toFixed(1)}`;
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
  // `last` is INVALIDATED rather than merely re-scheduled on a size change: `containCamera`
  // resolves against the frame's own width and height, and a published progress can be
  // bit-identical across a resize while the box it is drawn in is a different shape. Without this
  // the camera would keep a scale computed for the old frame — and so would the live map.
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
