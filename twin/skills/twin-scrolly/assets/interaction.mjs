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
// What this file does NOT do: decide which step is narratively "first". `STEPS[0]` is already
// marked `active` in the SSR'd markup by `assets/ScrollySeed.tsx` (see that file's own
// doc-comment, item 3) — this script only ever MOVES that class as the reader scrolls a new step
// into the centre band of the viewport. With this script entirely absent, the page still shows
// that one step's own frame and every step's own prose, unchanged.

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

export function initAll() {
  document
    .querySelectorAll(".scrolly")
    .forEach((root) => initScrolly(root));
}

// Guarded rather than a bare top-level call: this file is also imported directly by
// `test/render-scrolly.test.ts` (for the pure `pickActiveStep` helper), in a context with no
// `document`. In the browser the guard is always true, so the inlined `<script>` still self-starts
// the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
