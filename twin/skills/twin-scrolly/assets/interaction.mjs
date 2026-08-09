// twin/skills/twin-scrolly/assets/interaction.mjs
//
// The one script this genre ships, inlined verbatim into the self-contained HTML by
// `scripts/render-scrolly.mjs` (which strips the `export` keyword from each top-level declaration,
// the same trick `twin-chart-web/scripts/render-web.mjs` already uses, so this file can also sit as
// a plain classic `<script>` — no `type="module"`, so it keeps working in a CMS iframe or a
// sandboxed embed that restricts module scripts).
//
// `pickActiveStep`, `frameWeight` and `computeFrameWeights` are exported and pure — no DOM — so they
// are unit-tested directly (`test/render-scrolly.test.ts`). `initScrolly`/`initProgressiveCrossfade`/
// `initAll` are DOM wiring and are NOT unit-tested here: per `twin-doctrine`'s own verification rule,
// an interactive genre is verified by driving a real browser, not by asserting against a DOM/
// IntersectionObserver emulation nobody looked at (`references/scrolly-discipline.md`,
// "Verification").
//
// TWO independent mechanisms toggle the active frame, and both run every time, unconditionally:
//   - `initScrolly` — the ORIGINAL discrete mechanism, unchanged since this genre's second build: an
//     IntersectionObserver picks a winning step and toggles the `.active` class on it. This is the
//     ENTIRE mechanism under `prefers-reduced-motion: reduce` (the CSS transition that would animate
//     a class-driven opacity change is itself gated off by that same media query in
//     `scripts/render-scrolly.mjs`'s own `buildCss` — see references/scrolly-discipline.md, "Reduced
//     motion" — so this class toggle alone already yields an instant cut there), and it is what
//     governs the page before `initProgressiveCrossfade` (below) has painted its own first frame.
//   - `initProgressiveCrossfade` — layered ON TOP, only when motion is allowed: sets each frame's
//     OWN inline `opacity`, every animation frame, to a value computed continuously from the
//     reader's actual scroll position — so the graphic crossfades gradually as the reader scrolls,
//     never in one instant class-driven jump. An inline style always wins over a class-driven CSS
//     rule at equal or lower specificity, so once this mechanism starts painting, its continuous
//     values are what the reader actually sees; `initScrolly`'s own class toggle keeps running
//     underneath, unaware, harmlessly overridden, which is what lets this mechanism CEDE control
//     back to the class-driven default instantly (clearing `style.opacity`) the moment
//     `prefers-reduced-motion` is (or becomes) `reduce` — see that function's own comment.
//
// What this file does NOT do: decide which step is narratively "first", or know what kind of
// content a `.step-frame` holds — an `<img>`, an `<svg>`, or anything else a future beat hands the
// scaffold. The first step's own frame is already marked `active` in the SSR'd markup by
// `scripts/render-scrolly.mjs`'s own loop over `steps` — neither mechanism here assigns that class
// or that opacity for the first time; each only ever MOVES/recomputes it as the reader scrolls. With
// this script entirely absent, the page still shows that one step's own frame and every step's own
// prose, unchanged — see references/scrolly-discipline.md, "What survives with JavaScript disabled."

/**
 * Pure decision function: given the current IntersectionObserver entries — each reduced to just
 * `{ stepId, isIntersecting, intersectionRatio }`, never the real `IntersectionObserverEntry`
 * objects, so this function has nothing DOM-shaped to accept — returns the `stepId` that should
 * become active, or `null` when nothing currently intersects (a real observer never reports zero
 * entries for a step already being watched unless the reader has scrolled the whole track out of
 * view, in which case the caller simply keeps whichever step was active last, rather than clearing
 * it — see `initScrolly` below).
 *
 * Several steps can intersect the centre band at once during a fast scroll — a short step and the
 * one after it both partially inside the thin band `initScrolly` observes with — so this picks the
 * entry with the LARGEST `intersectionRatio`, the one actually closest to centred, rather than
 * whichever entry IntersectionObserver happens to report last (its own callback order is
 * unspecified across browsers).
 */
export function pickActiveStep(entries) {
  let winner = null;
  for (const entry of entries) {
    if (
      entry.isIntersecting &&
      (!winner || entry.intersectionRatio > winner.intersectionRatio)
    ) {
      winner = entry;
    }
  }
  return winner ? winner.stepId : null;
}

/** Wires one `.scrolly` root's `.step` sections to its `.step-frame` SVGs via one
 *  IntersectionObserver watching a thin band centred in the viewport (`rootMargin: "-45% 0px
 *  -45% 0px"` — a step is "active" once it crosses the middle 10% of the screen, not merely once
 *  it appears at the bottom or leaves at the top). Every `.step`/`.step-frame` pair is matched by
 *  its shared `data-step` id, baked into the markup at build time by
 *  `assets/ScrollySeed.tsx`/`scripts/render-scrolly.mjs` — this function never invents an id. */
export function initScrolly(root) {
  const steps = Array.prototype.slice.call(root.querySelectorAll(".step"));
  const frames = Array.prototype.slice.call(
    root.querySelectorAll(".step-frame"),
  );
  if (steps.length === 0 || frames.length === 0) return;

  function activate(stepId) {
    steps.forEach((s) =>
      s.classList.toggle("active", s.getAttribute("data-step") === stepId),
    );
    frames.forEach((f) =>
      f.classList.toggle("active", f.getAttribute("data-step") === stepId),
    );
  }

  const observer = new IntersectionObserver(
    (rawEntries) => {
      const entries = rawEntries.map((e) => ({
        stepId: e.target.getAttribute("data-step"),
        isIntersecting: e.isIntersecting,
        intersectionRatio: e.intersectionRatio,
      }));
      const next = pickActiveStep(entries);
      // `next === null` means none of the steps this callback just heard about are currently in
      // the centre band — NOT that the reader has scrolled away from the whole track (a step
      // scrolled fully off-screen simply never fires again until it re-enters). Leaving the
      // previous `active` class untouched in that case is deliberate: it is what keeps the very
      // first scroll tick, before any step has crossed the centre band yet, from clearing the
      // server-rendered default (`STEPS[0]`) prematurely.
      if (next) activate(next);
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  steps.forEach((s) => observer.observe(s));
}

/**
 * Pure: the crossfade weight (0..1) of ONE step's own frame, given how far its own centre sits
 * from the viewport's centre (`distance`, in px — always >= 0, the caller's job to compute) and how
 * far the CLOSER of its two neighbours' own centres sits from that same step's centre (`spacing`, in
 * px — the natural "one step of scroll" unit, so the crossfade completes by the time the neighbour
 * would itself be centred, rather than plateauing at 1 for a long stretch of untouched scrolling).
 * Linear, clamped to [0, 1] — 1.0 exactly centred, 0.0 a full `spacing` away or further.
 *
 * `spacing <= 0` (a single step, or two steps whose centres coincide — degenerate, should not occur
 * given `renderScrolly`'s own >= 2-steps / unique-id checks) falls back to an all-or-nothing weight
 * rather than dividing by zero.
 */
export function frameWeight(distance, spacing) {
  if (!(spacing > 0)) return distance === 0 ? 1 : 0;
  return Math.max(0, Math.min(1, 1 - Math.abs(distance) / spacing));
}

/**
 * Pure: one weight per step, given every step's own centre Y in VIEWPORT coordinates (i.e.
 * `getBoundingClientRect().top + rect.height / 2` — the caller's job, this function takes plain
 * numbers, never a rect) and the viewport's own height. The viewport centre is `viewportHeight / 2`;
 * each step's own `spacing` is the distance to whichever neighbour (previous or next in the array)
 * is CLOSER, so unevenly spaced steps still crossfade smoothly on both sides. This is the continuous
 * generalisation of `pickActiveStep`'s own discrete "closest wins" idea — a continuum instead of a
 * single binary switch at the IntersectionObserver's centre band.
 */
export function computeFrameWeights(stepCentersViewportY, viewportHeight) {
  const viewportCenter = viewportHeight / 2;
  return stepCentersViewportY.map((center, i) => {
    const neighbourCenters = [
      stepCentersViewportY[i - 1],
      stepCentersViewportY[i + 1],
    ].filter((c) => typeof c === "number");
    const spacing = neighbourCenters.length
      ? Math.min(...neighbourCenters.map((c) => Math.abs(c - center)))
      : viewportHeight;
    return frameWeight(Math.abs(center - viewportCenter), spacing);
  });
}

/** Wires one `.scrolly` root's continuous, scroll-linked crossfade — the ENHANCEMENT over
 *  `initScrolly`'s own discrete class toggle, and the mechanism entirely responsible for "the
 *  graphic advances as the reader scrolls" rather than snapping between finished states (see this
 *  file's own header comment for how the two mechanisms coexist).
 *
 *  Gated ENTIRELY behind `prefers-reduced-motion` — the hard constraint
 *  references/scrolly-discipline.md, "Reduced motion," states without exception: a reader who asks
 *  for no animation gets `initScrolly`'s own instant, discrete cut and NOTHING from this function,
 *  not a slower or smaller version of the same crossfade. Checked once via `matchMedia` at start,
 *  and again on every `change` event the media query itself fires, so a reader who toggles the OS
 *  preference while the page is already open is honoured immediately, without a reload.
 *
 *  Performance: this file's one avoidable failure mode is "work on every scroll event" — a fast
 *  trackpad fling can fire dozens of `scroll` events inside a single 16ms frame. `schedule` below
 *  answers that with the standard rAF-gate: a `scroll`/`resize` listener does nothing but ask for
 *  ONE `requestAnimationFrame` callback (`ticking`, a boolean, guards against asking twice before the
 *  first answer lands) — so however many raw events fire, `paint` itself runs at most once per
 *  animation frame, and every read (`getBoundingClientRect`) happens before every write
 *  (`style.opacity`) inside that one call, never interleaved, so painting never forces an extra
 *  layout pass. Measured proof, not intent, lives in `references/scrolly-discipline.md`, "The graphic
 *  advances continuously."
 */
export function initProgressiveCrossfade(root) {
  const steps = Array.prototype.slice.call(root.querySelectorAll(".step"));
  const frames = Array.prototype.slice.call(
    root.querySelectorAll(".step-frame"),
  );
  if (steps.length < 2 || frames.length !== steps.length) return;

  const reduceMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let ticking = false;
  let running = false;

  function paint() {
    ticking = false;
    const viewportHeight = window.innerHeight;
    // All reads first...
    const centers = steps.map((step) => {
      const rect = step.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    const weights = computeFrameWeights(centers, viewportHeight);
    // ...then all writes — never interleaved, so this never forces a synchronous extra layout.
    frames.forEach((frame, i) => {
      frame.style.opacity = String(weights[i]);
    });
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  function start() {
    if (running) return;
    running = true;
    // The CSS-side half of this mechanism: `.scrolly--progressive .step-frame` turns the
    // reduced-motion-gated CSS transition OFF, so the inline `opacity` this function writes every
    // frame tracks the reader's own scroll directly instead of chasing it through a 0.3s ease that
    // would restart on every single value change. See scripts/render-scrolly.mjs's own `buildCss`.
    root.classList.add("scrolly--progressive");
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    paint();
  }

  function stop() {
    if (!running) return;
    running = false;
    root.classList.remove("scrolly--progressive");
    window.removeEventListener("scroll", schedule, { passive: true });
    window.removeEventListener("resize", schedule, { passive: true });
    // Clear the inline override so `initScrolly`'s own class-driven default (already running,
    // unaware this function ever painted anything) is what the reader sees again — an instant cut,
    // never a fade back to it.
    frames.forEach((frame) => {
      frame.style.opacity = "";
    });
  }

  function sync() {
    if (reduceMotionQuery.matches) stop();
    else start();
  }

  if (typeof reduceMotionQuery.addEventListener === "function") {
    reduceMotionQuery.addEventListener("change", sync);
  }
  sync();
}

export function initAll() {
  document.querySelectorAll(".scrolly").forEach((root) => {
    initScrolly(root);
    initProgressiveCrossfade(root);
  });
}

// Guarded rather than a bare top-level call: this file is also imported directly by
// `test/render-scrolly.test.ts` (for the pure `pickActiveStep` helper), in a context with no
// `document`. In the browser the guard is always true, so the inlined `<script>` still self-starts
// the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
