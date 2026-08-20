// The scroll driver for the rebuilt route beat: ONE picture, driven continuously.
//
// The first rebuild shipped five SSR'd pictures instead. It passed every guard — each step redrew,
// one plate, one projection, a dash in the path's own units — and the owner read it in one scroll:
// *"le dessin de la ligne n'est pas progressif au scroll, il est un peu abrupt au step là."* He was
// right. Five finished pictures is a slideshow with a crossfade; what the format promises is a line
// that draws under the reader's own gesture. Passing the cargo guards is not the same as carrying
// the cargo.
//
// So the visual is built ONCE, on step 1's frame — the one the scaffold marks `active` at build
// time, so a reader with no JavaScript still meets the opening state — and this file lifts it out
// of the frame stack on boot, where the step swap can never fade it, then scrubs it off
// `data-progress`. That is the second of the two models `skills/scrolly/SKILL.md` names, and the
// only one that gives a continuous reveal.
//
// `revealFraction` and `shapeForReading` are pure and unit-tested (`route.test.ts`); the DOM wiring
// is verified by driving a real browser, as this format's doctrine requires.

/** How much of a step's stretch is spent BEFORE that step's card enters the frame. Not zero: a line
 *  held perfectly still while the reader scrolls is what the Danube beat's own driver calls a
 *  slideshow, and it refused exactly that. The line always moves; 85% of a stretch lands under the
 *  sentence that names it. */
const PRE_WINDOW_SHARE = 0.15;

/** The share of one step's travel during which that step's own card is on screen: a step is taller
 *  than the frame and the card is centred in it, so the card is visible for half a frame either side
 *  of the centre line, plus its own height. */
export function readingShare(stepHeight, frameHeight, cardHeight) {
  if (!(stepHeight > 0)) return 1;
  const share = (frameHeight / 2 + cardHeight / 2) / stepHeight;
  return Math.min(1, Math.max(1e-6, share));
}

/** A step's own fraction, remapped onto the window in which its card is readable. */
export function shapeForReading(t, share, floor = PRE_WINDOW_SHARE) {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  if (share >= 1) return clamped;
  const entry = 1 - share;
  if (clamped <= entry) return (floor * clamped) / entry;
  return floor + ((1 - floor) * (clamped - entry)) / share;
}

/**
 * How far along the route the line has been drawn, at a continuous position along the steps.
 *
 * `stops[i]` is the fraction of the route that step i's own stop sits at, so `revealFraction(stops,
 * i)` is exactly the picture that step's sentence describes, and the values between are the growth
 * the reader sees. `reduced` is `prefers-reduced-motion`: a line that grows is precisely what that
 * setting exists for, so under it the reveal snaps to the nearer stop.
 */
export function revealFraction(stops, position, reduced = false, shape = (t) => t) {
  const last = stops.length - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) return stops[Math.round(p)];
  const i = Math.min(Math.floor(p), last - 1);
  const t = shape(p - i);
  return stops[i] + (stops[i + 1] - stops[i]) * t;
}

/** One sample, at the 1-decimal precision a route beat writes its `d` attribute at.
 *
 *  The cumulative lengths a reveal is measured against are computed from these ROUNDED coordinates,
 *  so rounding here is not a size optimisation: it is what makes the drawn path and the measurement
 *  that selects its points one polyline rather than two opinions of one. */
const at1 = (value) => Number(value.toFixed(1));

/** The `d` attribute for a list of samples. Fewer than two points is nothing drawn, not a dot. */
export function routePath(route) {
  if (!Array.isArray(route) || route.length < 2) return "";
  return "M" + route.map(([x, y]) => `${at1(x)} ${at1(y)}`).join("L");
}

/**
 * The route as far as it has been drawn, with the last segment cut mid-way so the head moves
 * smoothly instead of jumping from sample to sample.
 *
 * THE POINTS REACHED, NOT A WHOLE LINE HIDDEN BY A DASH — `chart-video`'s mechanism, carried here.
 * A dash reveal draws the finished line and hides the part not yet reached with a pattern one path
 * long; it works, and it cost six hours and five wrong diagnoses to make safe, because the pattern
 * is measured in whatever space the stroke is computed in and a camera scale moves that space. The
 * discipline that keeps it safe — `pathLength={1}`, and `vector-effect` kept off the dashed paths —
 * has to be remembered by every future author. Re-generating the path cannot have the defect at all:
 * there is no pattern to compute in the wrong space.
 *
 * BY LENGTH, and that is the difference from the video's own `drawnSoFar`, which walks by INDEX.
 * Index is right for a chart whose x IS time. A route's samples are not evenly spaced — on the
 * Danube, the beat this was ported for, the longest segment is 23.6x the median — so an index walk
 * would race the head through the sparse stretches and crawl it through the dense ones. `cum` is the
 * same normalised cumulative length the dash was measured against, computed from the same rounded
 * coordinates the `d` attribute carries, so the head lands exactly where the dash put it.
 *
 * ONE IMPLEMENTATION, COPIED, and held byte-identical by
 * `splash/test/route-reveal-parity.test.ts`. A scrolly's driver is inlined into the delivered page
 * as source text — that is what makes the page self-contained — so it cannot import, and a copy is
 * the only shape available. Nothing in here is beat-specific, so a copy that differs differs by
 * accident.
 */
export function drawnSoFar(route, cum, fraction) {
  if (!Array.isArray(route) || route.length < 2) return [];
  if (!(fraction > 0)) return [];
  const last = route.length - 1;
  if (fraction >= 1) return route.map(([x, y]) => [x, y]);
  let i = 0;
  while (i < last && cum[i + 1] <= fraction) i++;
  const head = route.slice(0, i + 1).map(([x, y]) => [x, y]);
  if (i >= last) return head;
  const span = cum[i + 1] - cum[i];
  // A zero-length segment has no fraction to be part-way along: the head sits on its own sample.
  const t = span > 0 ? (fraction - cum[i]) / span : 0;
  // Landing exactly on a sample emits the head and nothing else: a point interpolated at t = 0 is a
  // duplicate of the sample before it, and a zero-length segment in the `d` attribute is noise the
  // renderer has to carry for no picture.
  if (t === 0) return head;
  const [ax, ay] = route[i];
  const [bx, by] = route[i + 1];
  return [...head, [ax + (bx - ax) * t, ay + (by - ay) * t]];
}

/** A stop the route has not reached is present but held back — the map only ever gains ground. */
const DIM = 0.28;

/** Whether the line has got to a stop. Its COLOUR says so — the first driver moved each stop's
 *  opacity and nothing else, so every stop kept the fill it was SSR'd with, muted, whatever the
 *  reader did: "les points steps ne se colorisent pas de la couleur au passage, il reste gris
 *  foncé". A stop is reached or it is not. */
export function stopReached(fraction, reachedAt) {
  // A hair of tolerance, because float arithmetic does not get to decide whether the reader
  // arrived: the closing stop sits at exactly 1 and the scroll ends at a reveal of 0.9999999.
  return fraction >= reachedAt - 1e-6;
}

/** Each stop fades in over the stretch that reaches it, so nothing pops. */
export function stopOpacity(fraction, reachedAt, previousReachedAt) {
  const from = previousReachedAt ?? 0;
  if (fraction >= reachedAt) return 1;
  if (fraction <= from) return DIM;
  const t = (fraction - from) / (reachedAt - from || 1);
  return DIM + (1 - DIM) * t;
}

/**
 * Lift the visual out of the per-step frame stack.
 *
 * `scrolly`'s contract is N pictures, exactly one painted; a beat whose visual is ONE persistent
 * element has no way to say so, so it says it here. Reported rather than patched around: the
 * vehicle should offer a persistent-visual mode.
 */
export function detachVisual(root) {
  const wrapper = root.parentElement;
  const stack = wrapper && wrapper.parentElement;
  if (!stack) return;
  stack.appendChild(root);
  root.style.position = "absolute";
  root.style.inset = "0";
  for (const sibling of Array.from(stack.children))
    if (sibling !== root) sibling.style.pointerEvents = "none";
}

/** Read the scaffold's own published signal. Never re-derived: the vehicle owns where the reader is. */
export function readProgress(source) {
  const raw = source && source.getAttribute("data-progress");
  const value = Number(raw);
  return raw === null || Number.isNaN(value) ? 0 : value;
}

export function initRouteAccess(root, config) {
  const progressSource = root.closest(".scrolly");
  if (!progressSource) return;
  detachVisual(root);

  const routes = Array.from(root.querySelectorAll("[data-part^='route-']"));
  const stops = Array.from(root.querySelectorAll("[data-stop]"));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let last = null;

  function paint() {
    const position = readProgress(progressSource);
    if (last === null || Math.abs(position - last) >= 0.0005) {
      last = position;
      // The card's own reading window, measured every frame: its height is its prose's and the
      // step's is the vehicle's, so neither is a constant this file gets to assume.
      const step = document.querySelector(".step");
      const card = document.querySelector(".step-panel");
      const frame = root.getBoundingClientRect();
      const share = readingShare(
        step ? step.getBoundingClientRect().height : 0,
        frame.height,
        card ? card.getBoundingClientRect().height : 0,
      );
      const fraction = revealFraction(config.stops, position, reduced.matches, (t) =>
        shapeForReading(t, share),
      );
      // The line grows by being REDRAWN from the points it has reached — halo and line take the
      // same `d`, so one can never lag the other. It used to be a dash whose offset ran to zero,
      // which draws head, hole and tail the moment the pattern is computed in a space the path's
      // length does not live in. This beat's five stops ARE the polyline's vertices and their
      // `reachedAt` IS its cumulative length, so nothing new had to be measured.
      const drawn = routePath(drawnSoFar(config.route, config.cum, fraction));
      for (const el of routes) el.setAttribute("d", drawn);
      stops.forEach((el, i) => {
        el.style.opacity = String(
          stopOpacity(fraction, config.stops[i], i === 0 ? null : config.stops[i - 1]),
        );
        // The COLOUR, not only the strength: a stop the line has reached is drawn in the accent.
        // And the STATE is declared beside it, so a guard — and a screen reader — can read what the
        // picture is saying rather than infer it from a fill.
        const reached = stopReached(fraction, config.stops[i]);
        el.setAttribute("data-state", reached ? "reached" : "pending");
        const fill = reached ? config.accent : config.muted;
        for (const mark of el.querySelectorAll("[data-fill='stop']"))
          mark.setAttribute("fill", fill);
      });
      // Published so a verification run can read the REVEAL, not just look at a picture.
      root.dataset.reveal = fraction.toFixed(4);
      root.dataset.position = position.toFixed(3);
    }
    requestAnimationFrame(paint);
  }
  paint();
}
