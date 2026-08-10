// twin/skills/twin-scrolly/assets/interaction.mjs
//
// The one script this genre ships, inlined verbatim into the self-contained HTML by
// `scripts/render-scrolly.mjs` (which strips the `export` keyword from each top-level declaration,
// the same trick `twin-chart-web/scripts/render-web.mjs` already uses, so this file can also sit as
// a plain classic `<script>` — no `type="module"`, so it keeps working in a CMS iframe or a
// sandboxed embed that restricts module scripts).
//
// `pickActiveStep` is exported and pure — no DOM — so it is unit-tested directly
// (`test/render-scrolly.test.ts`). `initScrolly`/`initAll` are DOM wiring and are NOT unit-tested
// here: per `twin-doctrine`'s own verification rule, an interactive genre is verified by driving a
// real browser, not by asserting against a DOM emulation nobody looked at
// (`references/scrolly-discipline.md`, "Verification").
//
// ONE mechanism decides which step is active: on every scroll of the prose column, MEASURE where
// each panel currently is and give the step to whichever panel occupies the most of the prose lane.
// That is the whole of it. There is no observer, no threshold list and no rootMargin.
//
// AND SINCE THE EIGHTH CORRECTION THERE IS ONLY ONE DECISION LEFT. This file used to make two —
// which FRAME the graphic shows, and which PANEL may be painted (`pickLanePanel`, the `in-lane`
// class, `.scrolly--live`). The second existed because a `bottom`-sticky panel un-pinned one
// panel-height before the next one parked and spent that gap opaque and climbing over the graphic's
// own labels. The prose now travels in its own cell of the track's grid, clipped at that cell's own
// edge, so it cannot reach the graphic at any offset and there is nothing left to withhold paint
// from. The lane is no longer a band inside a shared box either: it is the scrollport itself, so
// nothing here reads `data-prose-lane` or a panel's own `bottom` offset any more.
//
// WHY THERE IS NO INTERSECTIONOBSERVER ANY MORE, and this is the correction this file exists to
// carry. Every build up to the sixth used one, and picked the winner out of the entries of the
// CURRENT CALLBACK — the delta set, the panels whose ratio had just crossed one of
// `[0, 0.25, 0.5, 0.75, 1]`. A callback that heard about exactly one panel therefore activated that
// panel unconditionally, whatever every other panel was doing. On a teleport (scroll straight to an
// offset, wait, read) that is harmless: the browser recomputes every panel at once, so the delta
// set IS the full state and the winner is right. On a CONTINUOUS scroll — a wheel, a finger, the
// only way a reader has ever actually read one of these — the outgoing and incoming panels cross
// thresholds on alternating frames, so the active class OSCILLATED between them, each flip
// restarting the 0.3s opacity transition from wherever the last one had got to.
//
// Measured, in a driven Chrome, scrolling continuously through the whole track of all five beats on
// disk at three widths — fifteen runs: in FOURTEEN of them at least one step's frame was never
// painted at all, the graphic lagged the prose by up to 1,800px, and roughly 45% of every animation
// frame drawn was a BLEND of two frames rather than one settled image. The same pages, probed at 25
// discrete offsets with 450ms of stillness after each, measured 25/25 clean — one frame at exactly
// opacity 1, every other at exactly 0. Both measurements were honest. The instrument was blind by
// construction, and the vehicle was broken.
//
// The rule below cannot oscillate, and that is a property of the rule rather than a tuning of it:
// it reads the CURRENT position of EVERY panel on every scroll, and lane occupancy changes
// monotonically as a panel enters and leaves, so the winner changes exactly once per boundary,
// whatever speed the reader scrolls at and however many frames the browser skipped.
//
// What this file does NOT do: decide which step is narratively "first", or know what kind of
// content a `.step-frame` holds — an `<img>`, an `<svg>`, or anything else a future beat hands the
// scaffold. The first step's own frame is already marked `active` in the SSR'd markup by
// `scripts/render-scrolly.mjs`'s own loop over `steps` — this file never assigns that class for the
// first time, only moves it as the reader scrolls. With this script entirely absent, the page still
// shows that one step's own frame and every step's own prose, unchanged — see
// references/scrolly-discipline.md, "What survives with JavaScript disabled."

/**
 * Pure decision function: given where every panel currently sits and where the prose lane is —
 * both in the scrollport's own coordinates, both measured by the caller, so this function has
 * nothing DOM-shaped to accept — returns the `stepId` whose panel occupies the most of the lane,
 * or `null` when no panel is in the lane at all.
 *
 * `panels` is `{ stepId, top, bottom }[]`. `lane` is `{ top, bottom }`.
 *
 * THE FULL STATE, NEVER A DELTA. Every panel is passed in, every time, and the winner is decided
 * against all of them — the property that makes the outcome a function of the reader's position
 * rather than of which panels happened to change since the last frame. See this file's own header
 * for the measurement that condemned the delta-set rule this replaced.
 *
 * `null` means no panel is in the lane, NOT that the reader has left the track — the caller keeps
 * whichever step was active last, which is what stops the gap between two panels from clearing the
 * server-rendered default.
 *
 * Nothing here reads how many panels were passed or assumes any particular count — the same loop
 * resolves a winner whether the page carries two steps or eight.
 */
export function pickActiveStep(panels, lane) {
  let winner = null;
  for (const panel of panels) {
    const overlap = laneOverlap(panel, lane);
    if (overlap <= 0) continue;
    if (!winner || overlap > winner.overlap)
      winner = { stepId: panel.stepId, overlap: overlap };
  }
  return winner ? winner.stepId : null;
}

function laneOverlap(panel, lane) {
  return Math.min(panel.bottom, lane.bottom) - Math.max(panel.top, lane.top);
}

/**
 * THE CONTINUOUS SIGNAL — the second thing this file publishes, and the one whose absence made a
 * scroll-driven visual read as a slideshow with a fade.
 *
 * The owner, after driving the two single-visual beats: *"Pour le scrolly navigation, on y est pas
 * du tout. Pourquoi tu ne suis pas un peu le principe d'une animation au scrolly, faut que ce soit
 * fluide et que l'élément évolue au fur et à mesure du temps."* He is right, and it was a MISSING
 * SIGNAL rather than a tuning problem: the vehicle published a step state and a boundary transition
 * that finishes exactly when the step flips, so nothing a consumer could read CHANGED while the
 * reader scrolled through the middle of a step. The visual caught up at the handover.
 *
 * Returns the FRACTIONAL INDEX of the prose panel sitting on the lane's own centre line: exactly
 * `i` when panel `i`'s centre is on that line, exactly `i + 1` when panel `i + 1`'s is, and a
 * smooth interpolation in between. Range `0 … panels.length - 1`, clamped at both ends (before the
 * first panel reaches the line and after the last one passes it there is nowhere further to go).
 *
 * WHY IT IS MEASURED OVER THE PANELS AND NOT OVER THE SCROLLER'S OWN `scrollTop`. A raw
 * `scrollTop / scrollHeight` fraction is cheaper and is the wrong number: it says how far the
 * CONTAINER has moved, and the reader is looking at the CARDS. Interpolating between the two card
 * centres that bracket the line makes "the visual reaches the moment this sentence names" and "this
 * sentence reaches the middle of its column" the same event, at any panel height and any step
 * height, on a phone and on a desktop alike. The scrub and the caption cannot drift apart, because
 * they are the same measurement.
 *
 * It is also, deliberately, in LOCK-STEP with `pickActiveStep` rather than a second opinion about
 * the same thing: for panels of equal height the max-overlap winner changes at exactly the moment
 * this function passes `i + 0.5` — the two rules meet, and `scripts/verify-scrolly.mjs` asserts
 * that they stay met on every recorded animation frame rather than leaving it as an argument.
 *
 * `panels` is `{ stepId, top, bottom }[]` in document order; `lane` is `{ top, bottom }`. Same
 * inputs as `pickActiveStep`, measured once by the caller and handed to both.
 */
export function measureProgress(panels, lane) {
  if (panels.length === 0) return 0;
  const line = (lane.top + lane.bottom) / 2;
  const centres = panels.map(function (p) {
    return (p.top + p.bottom) / 2;
  });
  // Panels are in document order, so their centres increase with index and the LAST one at or
  // above the line is the one the reader is on.
  let i = -1;
  for (let k = 0; k < centres.length; k++) if (centres[k] <= line) i = k;
  if (i < 0) return 0;
  if (i >= centres.length - 1) return centres.length - 1;
  const span = centres[i + 1] - centres[i];
  if (!(span > 0)) return i;
  const u = (line - centres[i]) / span;
  return i + Math.max(0, Math.min(1, u));
}

/**
 * Wires one `.scrolly` root's steps to its frames by measuring THE PROSE COLUMN — the cell of the
 * track's own grid that the prose travels in, beside the graphic on a wide viewport and below it on
 * a phone (`scripts/render-scrolly.mjs`'s own `buildCss`). The column IS the lane: since the eighth
 * correction the prose has its own space, so "in the lane" and "inside the element that scrolls"
 * are the same rect, and there is no fraction to read off the markup and no offset to subtract.
 *
 * **What is measured is the PANEL, not the section.** An earlier build watched the `.step` sections
 * through a thin band at the middle of the screen, which asked "whose 115%-tall section crosses the
 * centre right now" — a different question from the one that matters, "whose words is the reader
 * actually beside", with a different answer for a large fraction of every step. Measuring the panel
 * makes the active step and the visible prose the same fact by construction.
 *
 * **The scroller is the prose column, never the document.** The page itself does not scroll (see
 * `references/scrolly-discipline.md`, "The graphic is fixed and the page does not scroll"), so the
 * event this listens to is `.scrolly-steps`'s own.
 *
 * Every `.step`/`.step-panel`/`.step-frame` triple is matched by its shared `data-step` id, baked
 * into the markup at build time — this function never invents an id, and never reads how many steps
 * there are to decide how to behave, so it wires N steps exactly as it wires two.
 */
export function initScrolly(root) {
  const steps = Array.prototype.slice.call(root.querySelectorAll(".step"));
  const panels = Array.prototype.slice.call(
    root.querySelectorAll(".step-panel"),
  );
  const frames = Array.prototype.slice.call(
    root.querySelectorAll(".step-frame"),
  );
  const scroller = root.querySelector(".scrolly-steps");
  if (
    steps.length === 0 ||
    frames.length === 0 ||
    panels.length === 0 ||
    !scroller
  )
    return;

  let currentFrame = null;
  /** Which frame the graphic shows. Held across the gap between two steps — the graphic is fixed,
   *  so it holds the last thing the reader was told about until the next prose arrives. Two
   *  panels are on screen through a boundary and neither is hidden; only ONE decision is left. */
  function activate(stepId) {
    if (stepId === currentFrame) return;
    currentFrame = stepId;
    steps.forEach((s) =>
      s.classList.toggle("active", s.getAttribute("data-step") === stepId),
    );
    frames.forEach((f) =>
      f.classList.toggle("active", f.getAttribute("data-step") === stepId),
    );
  }

  function update() {
    const port = scroller.getBoundingClientRect();
    // The lane is the scrollport itself — read live rather than cached, because a resize changes
    // it and because on a phone it is a band whose height comes from a `clamp()` nobody here
    // should be re-deriving.
    const lane = { top: port.top, bottom: port.bottom };
    const measured = panels.map(function (p) {
      const r = p.getBoundingClientRect();
      return {
        stepId: p.getAttribute("data-step"),
        top: r.top,
        bottom: r.bottom,
      };
    });
    const next = pickActiveStep(measured, lane);
    if (next) activate(next);
    // PUBLISHED, not consumed here. This scaffold draws nothing itself — it hands the number to
    // whatever visual a beat re-parented into the frame stack, on the element a consumer can
    // already find (the same root that carries `data-prose-lane`). Written every frame the reader
    // scrolls, so a consumer's own rAF paint reads a value that is at most one frame old.
    root.setAttribute("data-progress", measureProgress(measured, lane).toFixed(4));
  }

  // `scroll` fires at most once per animation frame in every engine, and it fires BEFORE the frame
  // is painted, so the class is already right for the frame the reader actually sees. No rAF
  // trampoline: adding one would deliberately paint one frame of the wrong step.
  scroller.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

export function initAll() {
  document.querySelectorAll(".scrolly").forEach((root) => {
    initScrolly(root);
  });
}

// Guarded rather than a bare top-level call: this file is also imported directly by
// `test/render-scrolly.test.ts` (for the pure `pickActiveStep` helper), in a context with no
// `document`. In the browser the guard is always true, so the inlined `<script>` still self-starts
// the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
