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

/** A stop the route has not reached is present but held back — the map only ever gains ground. */
const DIM = 0.28;

/** Whether the line has got to a stop. Its COLOUR says so — the first driver moved each stop's
 *  opacity and nothing else, so every stop kept the fill it was SSR'd with, muted, whatever the
 *  reader did: "les points steps ne se colorisent pas de la couleur au passage, il reste gris
 *  foncé". A stop is reached or it is not. */
export function stopReached(fraction, reachedAt) {
  return fraction >= reachedAt;
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
      for (const el of routes) el.style.strokeDashoffset = String(1 - fraction);
      stops.forEach((el, i) => {
        el.style.opacity = String(
          stopOpacity(fraction, config.stops[i], i === 0 ? null : config.stops[i - 1]),
        );
        // The COLOUR, not only the strength: a stop the line has reached is drawn in the accent.
        const fill = stopReached(fraction, config.stops[i]) ? config.accent : config.muted;
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
