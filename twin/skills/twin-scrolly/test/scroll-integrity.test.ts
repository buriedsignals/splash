/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * It exists because every other check on this vehicle measured a page nobody had scrolled.
 *
 * The genre's own verification rule has always been "drive a real browser", and every round obeyed
 * it — by jumping to 25 discrete scroll offsets, waiting for the page to settle, and reading the
 * state. Measured that way on all five scrollies on disk, at 1600x900, 1280x800 and 375x812: 25
 * samples out of 25 with exactly one frame at opacity 1 and every other at exactly 0, one panel at
 * a time, every step in order. All of it true.
 *
 * The same five pages under a CONTINUOUS scroll: in FOURTEEN of those fifteen runs at least one
 * step's frame was never painted at all; the graphic lagged the prose by up to 1,800px of a 3,300px
 * track; ~45% of every animation frame drawn was a blend of two frames rather than one image. The
 * owner reported it in three words — "le scrolly est buggé pour tous" — against a skill whose own
 * doctrine file said it had been measured. A teleport hands an IntersectionObserver every panel in
 * one callback, so the old delta-set rule was accidentally right exactly under the instrument that
 * checked it, and wrong under a reader's wheel. A sampled probe is not a weaker version of this
 * file; it is blind to a whole class of defect by construction.
 *
 * So `scripts/verify-scrolly.mjs` installs a `requestAnimationFrame` recorder BEFORE touching the
 * scroll position and reads back every frame the browser actually drew. This file walks it over
 * every scrolly on disk. What it asserts is listed in that script's own header (A-F); what it
 * reports without asserting is listed there too, with the reason.
 *
 * MUTATION-PROVED, because a test that stays green when the code is broken is worthless. All three
 * were run on a COPY of the skill and the beats under `/tmp`, never in this tree — several agents
 * share this working tree and one agent's mutation must not turn it red for everyone.
 *
 *   1. THE DECISION LAYER. `assets/interaction.mjs` put back to the IntersectionObserver that
 *      picked its winner out of the current callback's entries. Red on all five beats at all three
 *      widths: "the active step OSCILLATED — level became active 5 times, direction 4 times", and
 *      "1 of 4 step frames were NEVER painted during a continuous scroll".
 *
 *   2. THE MODEL. `body { overflow: hidden }` removed and `.scrolly-graphic` put back to
 *      `position: sticky; top: 0; height: 100vh` with the steps column's negative margin and
 *      `115vh` steps. Red at all three widths with "the DOCUMENT has 3320px of scroll; the
 *      component must own its own scroll", "3 of 4 step frames were NEVER painted", "@ reduce:
 *      only 1 of 4 frames were painted" and "@ no-JS: the prose column has no scroll distance, so
 *      the reader cannot reach step 2".
 *      WORTH KNOWING, because the first draft of this note claimed otherwise: assertions B and C
 *      (the graphic and the header never move) did NOT fire under this mutation, and it is not
 *      because they are weak. Putting the scroll back on the document leaves `.scrolly-steps` with
 *      no scroll distance at all, so the driver — which scrolls the prose column, because that is
 *      what a reader scrolls in the shipped model — moves nothing, and a graphic nobody scrolled
 *      past does not climb. B and C are proved by the third mutation below only in the sense that
 *      they hold; a mutation that reddens them specifically would have to keep the component
 *      scrolling its own prose while making the graphic move inside it. That is stated here rather
 *      than left as an implied claim.
 *
 *   3. THE LANE. The panel's paint rule put back from `.step:not(.in-lane)` to
 *      `.step:not(.active)`, with its fade restored. Red: "a panel was painted 71px ABOVE the
 *      lane's own top, at 11 animation frames (first at scroll 208)" — the gap between a
 *      `bottom`-sticky panel un-pinning and the next one parking, which is where every surviving
 *      prose-over-annotation collision lived.
 *
 * WHAT IT PROVABLY DOES NOT CATCH — read this before trusting it for anything wider.
 *
 *   1. WHETHER THE BEAT IS ANY GOOD. Four steps that arrive in order, over a graphic that never
 *      moves, can still be four charts nobody needed. Every assertion here is mechanical.
 *
 *   2. A FRAME THAT PLACES A MARK INSIDE THE LANE. The vehicle reserves the lane and keeps prose
 *      out of it; it cannot move a beat's own labels into the band above it. Three such residues
 *      are live as this lands and are REPORTED by every run rather than asserted: the Danube beat's
 *      numbered badge "6", the Grinnell beat's photo-credit line at 1280x800, and every beat's
 *      x-axis labels at 375x812 where the prose is simply taller than the lane it was given. Each
 *      one belongs to the beat, not to `renderScrolly`.
 *
 *   3. ONE SPEED. The scroll is one step per ~60 animation frames, derived from each beat's own
 *      step height so a phone and a desktop get the same dwell. A defect that needs a slower read,
 *      a flick, or a reversal is not sampled. Reversing direction in particular is untested here.
 *
 *   4. TOUCH AND MOMENTUM. The scroll is written to `scrollTop`, not dispatched as a wheel or a
 *      touch drag, so nothing about momentum, rubber-banding or `overscroll-behavior` is proved.
 *
 *   5. A BEAT WHOSE RENDERED HTML ON DISK IS STALE. This walks the artifacts as they stand. A beat
 *      rendered against an older scaffold and not re-rendered will fail here — that is the guard
 *      working, and the fix is to re-run the beat's own `render.mjs`, never to add it to a list.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { verifyAll } from "../scripts/verify-scrolly.mjs";
import { render } from "../scripts/render-scrolly.mjs";

const SKILL = join(import.meta.dirname, "..");
const PROOF = join(SKILL, "..", "..", "proof");

/** Every rendered scrolly on disk, found by the vehicle's own markup rather than by a name pattern
 *  or a list — a new beat is guarded the moment its render lands, and a beat that stops being a
 *  scrolly drops out on its own. */
function scrolliesOnDisk(): string[] {
  const out: string[] = [];
  for (const beat of readdirSync(PROOF).sort()) {
    const dir = join(PROOF, beat, "render");
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith(".html")) continue;
      const path = join(dir, file);
      const html = readFileSync(path, "utf8");
      if (html.includes('class="scrolly"') && html.includes("scrolly-track"))
        out.push(path);
    }
  }
  return out;
}

describe("every scrolly on disk survives a continuous scroll", () => {
  it("should hold the whole vehicle's contract on a real, driven, uninterrupted scroll", async () => {
    const seedDir = await mkdtemp(join(tmpdir(), "twin-scrolly-integrity-"));
    const { outPath } = await render({ outDir: seedDir });
    const files = [outPath, ...scrolliesOnDisk()];
    expect(files.length).toBeGreaterThanOrEqual(2);

    const { failures, notes } = await verifyAll(files);
    // Printed whether or not anything failed: the residues this guard deliberately does not assert
    // are only useful if a person reads them, and a note nobody prints is a note nobody has.
    for (const note of notes) console.log(`  note  ${note}`);
    expect(
      failures,
      `driven across ${files.length} scrollies at three widths:\n  ${failures.join("\n  ")}`,
    ).toEqual([]);
  }, 600_000);
});
