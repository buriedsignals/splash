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
 * Pure decision function, and the second half of the lane's contract: which panel may be PAINTED.
 * Same inputs as `pickActiveStep`, and deliberately a different answer.
 *
 * THE LANE IS A PROMISE IN BOTH DIRECTIONS. Every frame keeps what it annotates above the lane
 * (`safeBand`/`CONTENT_TOP`); this is what keeps the prose inside it. A panel is paintable only
 * while it occupies the lane as fully as its own height allows — so a panel on its way OUT, riding
 * up over the graphic as its step scrolls past, stops being painted the moment it leaves rather
 * than when the next step wins the frame. Those two moments are not the same: a `bottom`-sticky
 * panel un-pins one panel-height before the next one has parked, and that gap is where every
 * remaining prose-over-annotation collision lived. Measured on the shipped Danube beat at
 * 1600x900, 41% of the way down: the numbered badge "6" under a panel that had already climbed
 * 16px above the lane's own top edge.
 *
 * A PANEL THAT DOES NOT FIT ITS LANE IS STILL PAINTED, and that fallback is deliberate rather than
 * a softening. Measured across the five beats on disk: a panel needs its own height PLUS its bottom
 * offset to sit inside the lane, and at 1280x800 that is 215px against a 202px lane, at 375x812
 * 241px against 177px — the reserved 28% is simply too small for three paragraphs at a phone's
 * measure. Refusing to paint such a panel would leave the reader with a graphic and no words at
 * all, which is worse than an overlap and is not what the lane was reserved to buy. So when nothing
 * fits, the panel closest to its parked position — the largest lane overlap — is painted anyway,
 * and `scripts/verify-scrolly.mjs` REPORTS the beat and the width where that happened. The lane is
 * either wide enough or the beat's prose is too long for it; both are facts about the beat, and the
 * vehicle's job is to make them visible rather than to hide them behind a blank frame.
 *
 * Returns `null` only when no panel touches the lane at all — a real state, between two steps, and
 * the caller paints no panel rather than keeping a stale one on screen.
 */
export function pickLanePanel(panels, lane) {
  let winner = null;
  for (const panel of panels) {
    // Two ways to be eligible, and a panel on its way out satisfies neither.
    //   - its top is not above the lane: it fits, and it is in. This is the promise.
    //   - it is still at its parking line: it has not started to rise yet. This is what keeps a
    //     panel TALLER than the lane paintable — such a panel's top is above the lane wherever it
    //     stands, so the first clause can never hold for it, and only the second can.
    const eligible =
      panel.top >= lane.top - 1 || panel.bottom >= lane.bottom - 1;
    if (!eligible) continue;
    const overlap = laneOverlap(panel, lane);
    if (overlap <= 0) continue;
    if (!winner || overlap > winner.overlap)
      winner = { stepId: panel.stepId, overlap: overlap };
  }
  return winner ? winner.stepId : null;
}

/**
 * Wires one `.scrolly` root's steps to its frames by measuring THE PROSE LANE — the band at the
 * bottom of the track where `scripts/render-scrolly.mjs`'s own CSS pins each step's panel
 * (`--prose-lane`, mirrored onto the root as `data-prose-lane` so this script never has to parse a
 * CSS length).
 *
 * **What is measured is the PANEL, not the section.** An earlier build watched the `.step` sections
 * through a thin band at the middle of the screen, which asked "whose 115%-tall section crosses the
 * centre right now" — a different question from the one that matters, "whose words are in the lane
 * right now", with a different answer for a large fraction of every step. Measuring the pinned
 * panel makes the active step and the visible prose the same fact by construction, which is what
 * lets the CSS fade every panel that is not the active one without ever fading the one the reader
 * is actually reading.
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
  let currentPanel = null;
  /** Which frame the graphic shows. Held across the gap between two steps — the graphic is fixed,
   *  so it holds the last thing the reader was told about until the next prose arrives. */
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
  /** Which panel is painted — a DIFFERENT fact from which frame is shown, and `null` between two
   *  steps. See `pickLanePanel` for why the two decisions were split. */
  function paint(stepId) {
    if (stepId === currentPanel) return;
    currentPanel = stepId;
    steps.forEach((s) =>
      s.classList.toggle("in-lane", s.getAttribute("data-step") === stepId),
    );
  }

  // The lane, as a percentage of the track's own height. The fallback matches `renderScrolly`'s
  // own default rather than a number invented here.
  const lane = Number(root.getAttribute("data-prose-lane")) || 28;

  // `.scrolly--live` is what turns on the CSS that paints only the active step's panel. It is added
  // HERE, by the script, so that a page whose script never runs never hides a word: see
  // `scripts/render-scrolly.mjs`'s own `buildCss` note on `.scrolly--live`.
  root.classList.add("scrolly--live");

  function update() {
    const port = scroller.getBoundingClientRect();
    // The lane's bottom edge for these two decisions is the PANEL'S OWN PARKING LINE, not the
    // track's bottom edge — read off the CSS rather than restated here, because the offset is a
    // `clamp()` that changes with the viewport. A panel parked in the lane has its bottom exactly
    // on this line, which is what lets `pickLanePanel` tell "parked" from "already rising" without
    // being told what the offset is.
    const offset = parseFloat(getComputedStyle(panels[0]).bottom) || 0;
    const laneBand = {
      top: port.bottom - (lane / 100) * port.height,
      bottom: port.bottom - offset,
    };
    const measured = panels.map(function (p) {
      const r = p.getBoundingClientRect();
      return {
        stepId: p.getAttribute("data-step"),
        top: r.top,
        bottom: r.bottom,
      };
    });
    const next = pickActiveStep(measured, laneBand);
    if (next) activate(next);
    paint(pickLanePanel(measured, laneBand));
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
