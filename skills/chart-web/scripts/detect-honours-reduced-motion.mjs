/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts` — the same
 *  `GUARDS` convention this format's other two capability detectors use. */
export const GUARDS = ["motionUnderReduce"];

/** How many `requestAnimationFrame` callbacks this samples over. Not a guess: `assets/entrance.ts`'s
 *  own `CONTRACT` runs its last layer to `1760 + 270 = 2030`ms; at one sample per frame this window
 *  (`SAMPLE_FRAMES` frames of ~16.7ms each) covers roughly 2.5s, past the slowest entrance this
 *  format ships plus a margin, so a normal-conditions pass that sampled too early and missed the
 *  build entirely cannot be mistaken for a reduce pass that correctly saw none of it. */
const SAMPLE_FRAMES = 150;

/** MID-FLIGHT, NOT MERELY DIFFERENT AND NOT MERELY FRACTIONAL — the measurement
 *  `prefers-reduced-motion: reduce` makes true.
 *
 *  The `page` handed in is the CALLER's own responsibility to have already put in the condition
 *  being measured — `await page.emulateMediaFeatures([{name: "prefers-reduced-motion", value:
 *  "reduce"}])` before this runs, or left at the default `no-preference` — exactly the two-page
 *  pattern `verify-scrolly.mjs`'s own `verifyStates` already drives (`reduced`/`nojs` as separate
 *  pages). This samples ONE of the two, and the walking test that calls it twice is what compares
 *  them.
 *
 *  A frame counts as MOVED when SOME element's own `opacity` or uniform `transform: scale()` both
 *  (a) differs from that SAME element's value one frame earlier, AND (b) either value is STRICTLY
 *  between 0 and 1. Two conditions, on purpose, because either alone is the wrong measurement:
 *  "differs from the frame before" alone would flag an instant class-swap that correctly has no
 *  transition under `reduce` — there is no intermediate computed value for an instant change to
 *  produce, but sampling either side of the swap still reads two different ENDPOINT values, 0 and 1,
 *  as a difference; "fractional" alone would flag a halo or a watermark drawn at a fixed
 *  `opacity: 0.5` FOREVER, which never moves and is not this capability's business. Both together
 *  is exactly "caught mid-transition, twice in a row" — the one measurement neither false positive
 *  survives. Values are read off the PAINTED page (`getComputedStyle`), never off a class name or
 *  an attribute, so a beat that renamed its own entrance classes stays measured. `transform`'s
 *  computed value is always a `matrix(...)`, never a literal `scale(...)`, even when the source
 *  only ever wrote `transform: scale(x)`; for a uniform scale the matrix's own first component IS
 *  that scale factor, which is the only shape this format's `land`/`wipe` motions ever produce — a
 *  rotation or a skew is not read, because nothing this format ships animates one. Elements are
 *  read in DOM order and compared POSITIONALLY frame to frame, never by identity: none of this
 *  format's own motion reorders, inserts or removes an element mid-build.
 *
 *  THE PAGE IS ALSO GENTLY SCROLLED WHILE SAMPLING, its own scrollable height divided evenly across
 *  the sampled frames. Some formats build on load (this one's own entrance); others build on the
 *  reader's OWN scroll gesture (`scrolly`'s `.step-frame` transition). A detector that only ever sat
 *  still would see the second kind's motion never at all — under EITHER condition — which is not
 *  the same claim as seeing it correctly suppressed. A page with no scroll distance (`scrollHeight
 *  <= clientHeight`, true of every `chart-web`/`map-web` beat this format ships) is unaffected: the
 *  step is zero and scrolling it is a no-op. */
export async function motionUnderReduce(page) {
  const samples = await page.evaluate(async (totalFrames) => {
    const fractional = (n) => n > 0.001 && n < 0.999;
    const snapshot = () =>
      Array.from(document.querySelectorAll("body *")).map((el) => {
        const style = getComputedStyle(el);
        const matrix = /matrix\(([-\d.,\s]+)\)/.exec(style.transform);
        return {
          opacity: Number(style.opacity),
          scale: matrix ? Number(matrix[1].split(",")[0]) : 1,
        };
      });
    const scrollable = document.scrollingElement;
    const distance = scrollable ? scrollable.scrollHeight - scrollable.clientHeight : 0;
    const step = distance > 0 ? distance / totalFrames : 0;
    const out = [];
    let prev = snapshot();
    for (let i = 0; i < totalFrames; i++) {
      if (step) scrollable.scrollTop = step * (i + 1);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const now = snapshot();
      let moved = false;
      for (let j = 0; j < now.length && j < prev.length; j++) {
        const a = prev[j];
        const b = now[j];
        const opacityMoved = a.opacity !== b.opacity && (fractional(a.opacity) || fractional(b.opacity));
        const scaleMoved = a.scale !== b.scale && (fractional(a.scale) || fractional(b.scale));
        if (opacityMoved || scaleMoved) {
          moved = true;
          break;
        }
      }
      out.push(moved);
      prev = now;
    }
    return out;
  }, SAMPLE_FRAMES);
  return { movedFrames: samples.filter(Boolean).length, totalFrames: SAMPLE_FRAMES };
}
