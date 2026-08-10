// twin/skills/chart-web/assets/entrance-trigger.mjs
//
// THE ENTRANCE'S OWN SCRIPT, AND THE REASON IT IS NOT IN `interaction.mjs` ANY MORE.
//
// It used to be one function inside that file, called from its `initAll()`. Two things were wrong
// with that, and both were MEASURED on a real beat rather than reasoned about:
//
//   1. **A beat may replace the interaction script wholesale, and seven of them do.** Every
//      non-line beat in this repository (lollipop, dumbbell, boxplot, pyramid, scatter, diverging,
//      small multiples) writes its own hover mechanic — a lollipop's fifteen band rows have no
//      "nearest by x" to resolve — and its runner PATCHES the delivered file, swapping the genre's
//      inlined `<script>` for its own. The entrance CSS still shipped, the markup still declared its
//      layers, this guard's markup half still passed, and the `entered` class was never added by
//      anything: `verify-entrance.mjs` timed out waiting 5s for it on the first such beat migrated.
//      A page whose entrance silently does not exist, with every check green.
//   2. **`initAll()` returns early when there is no `#tooltip`**, so a beat with no hover at all
//      would lose its entrance to a guard clause about something else entirely.
//
// The entrance's CSS is emitted by `render-web.mjs` for a beat that DECLARED an entrance, and
// nothing else. Its trigger is now emitted by the same gate, in its own `<script>`, AFTER the
// beat's own — so a runner that swaps the first block leaves this one standing. One cost, one
// condition, one place. There is no second copy of this logic to walk.
//
// It is a classic script, not a module (`render-web.mjs`'s `inlineable` strips `export`), so it
// runs in a CMS iframe or a sandboxed embed that restricts module scripts.

/**
 * THE ENTRANCE TRIGGER — the whole of this genre's entrance that is script, and it is one class.
 *
 * WHAT IT DOES NOT DO, which is the point. It writes no opacity, no transform and no length. Every
 * number the entrance uses was computed server-side from the beat's own geometry and the entrance
 * contract (`assets/entrance.ts`) and written on the elements as custom properties; the keyframes
 * and the delays live in the stylesheet, inside `@media (prefers-reduced-motion: no-preference)`.
 * This function's entire job is to say WHEN, once, per figure.
 *
 * WHY AN OBSERVER AND NOT `DOMContentLoaded`. This genre's delivery model is an embed: a CMS drops
 * the file into an article and the figure may sit two screens below the fold. An entrance that
 * plays on load plays to nobody, and a reader who scrolls to it finds a finished chart with a
 * two-second build they never saw — strictly worse than never having animated it. So the trigger is
 * the figure ENTERING THE READER'S VIEW.
 *
 * THE MARGIN IS A FRACTION OF THE WINDOW, NOT OF THE FIGURE, and that is deliberate: a
 * `threshold: 0.35` never fires for a figure taller than the viewport, which on a phone is most of
 * them. `rootMargin: "0px 0px -15% 0px"` shrinks the observed region by 15 % of the window's own
 * height instead, so the entrance starts once the figure's top has come a sixth of the way up the
 * screen — reachable at every figure height there is.
 *
 * ONCE, AND THEN NEVER AGAIN: `unobserve` on the first intersection. A graphic that rebuilt itself
 * every time it scrolled past would be decoration, and the contract has no loop in it.
 *
 * NO OBSERVER AT ALL (an engine without `IntersectionObserver`): the class goes on immediately. The
 * entrance plays on load, which is the behaviour this function exists to improve on but is still
 * strictly better than a figure that never gets its class and — with `animation-fill-mode:
 * backwards` scoped to `.entered` — is complete either way. It is never the settled page that is at
 * risk here; only when the build runs.
 *
 * A figure whose beat declared no layers gets no observer: the query below finds nothing to watch.
 * Inert in a page that did not ask for it, exactly as `initLines` above is inert in a page with no
 * `.line-hit` — the shape this file already had.
 */
function initEntrance(root) {
  const figures = Array.prototype.slice
    .call(root.querySelectorAll(".chart-figure"))
    .filter(function (figure) {
      return figure.querySelector("[data-entrance-motion]") !== null;
    });
  if (figures.length === 0) return;

  if (typeof IntersectionObserver === "undefined") {
    figures.forEach(function (figure) {
      figure.classList.add("entered");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("entered");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -15% 0px" },
  );
  figures.forEach(function (figure) {
    observer.observe(figure);
  });
}

// Guarded rather than a bare call, for the same reason `interaction.mjs` guards its own: this file
// is read as text and inlined, and a `document`-less context must not throw on it.
if (typeof document !== "undefined") initEntrance(document);
