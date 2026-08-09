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
// real browser, not by asserting against a DOM/IntersectionObserver emulation nobody looked at
// (`references/scrolly-discipline.md`, "Verification").
//
// ONE mechanism toggles the active frame: an IntersectionObserver picks a winning step and toggles
// the `.active` class on it and its matching frame. This is deliberately the ONLY mechanism this
// file ships — a fourth correction removed a second one (`initProgressiveCrossfade`, which wrote
// each frame's own inline `opacity` every animation frame from the reader's scroll position) after
// driving a real browser and finding it never actually settled: sampled at eleven scroll positions
// spanning the FULL track, both frames were still a blend at every single one, including the last —
// never once a clean, single, still image. The project owner's own correction: "le scrolly doit être
// fixe et seul le texte doit bouger" — the graphic stays fixed, only the text moves. A graphic whose
// own content is visibly blending for the whole of a step's own scroll distance does not read as
// fixed, however correctly its BOX is pinned by `position: sticky`. See
// references/scrolly-discipline.md, "The graphic is fixed; only the text moves," for the measured
// proof and the full account of what this file's third build shipped instead.
//
// What replaced it is simpler, not more mechanism: `initScrolly` (unchanged since this genre's
// second build) is now the WHOLE of what advances the graphic, under every motion preference alike.
// The CSS-side `.step-frame` transition (`scripts/render-scrolly.mjs`'s own `buildCss`) still plays
// at a class change, gated behind `prefers-reduced-motion: no-preference` — a short cross-dissolve
// AT THE STEP BOUNDARY ONLY, never a value written from scroll position — so a reader with motion
// allowed sees a brief, bounded swap between two settled states, and a reader who asked for no
// motion sees an instant cut between the exact same two states. Neither reader ever sees an
// in-between blend outside that one brief transition window.
//
// What this file does NOT do: decide which step is narratively "first", or know what kind of
// content a `.step-frame` holds — an `<img>`, an `<svg>`, or anything else a future beat hands the
// scaffold. The first step's own frame is already marked `active` in the SSR'd markup by
// `scripts/render-scrolly.mjs`'s own loop over `steps` — this file never assigns that class for the
// first time, only moves it as the reader scrolls. With this script entirely absent, the page still
// shows that one step's own frame and every step's own prose, unchanged — see
// references/scrolly-discipline.md, "What survives with JavaScript disabled."

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
 * unspecified across browsers). Nothing here reads how many entries were passed or assumes any
 * particular count — the same loop resolves a winner whether the page carries two steps or eight.
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
 *  `assets/ScrollySeed.tsx`/`scripts/render-scrolly.mjs` — this function never invents an id, and
 *  never reads `steps.length` to decide how to behave, so it wires N steps exactly as it wires two. */
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
