/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * It exists because every other check on this vehicle measured a page nobody had scrolled — and it
 * grew an assertion because every check INCLUDING this one, for one round, measured which step was
 * painted and never whether the words MOVE.
 *
 * ROUND ONE OF THIS FILE: THE INSTRUMENT. The genre's own verification rule has always been "drive
 * a real browser", and every round obeyed it — by jumping to 25 discrete scroll offsets, waiting for
 * the page to settle, and reading the state. Measured that way on all five scrollies on disk, at
 * 1600x900, 1280x800 and 375x812: 25 samples out of 25 with exactly one frame at opacity 1 and every
 * other at exactly 0, one panel at a time, every step in order. All of it true. The same five pages
 * under a CONTINUOUS scroll: in FOURTEEN of those fifteen runs at least one step's frame was never
 * painted at all; the graphic lagged the prose by up to 1,800px of a 3,300px track. A teleport hands
 * an IntersectionObserver every panel in one callback, so the old delta-set rule was accidentally
 * right exactly under the instrument that checked it, and wrong under a reader's wheel. A sampled
 * probe is not a weaker version of this file; it is blind to a whole class of defect by
 * construction.
 *
 * ROUND THREE: THE FORM. The eighth correction's own answer to the collision — give the prose its
 * own cell of a two-cell grid, so it can travel without ever meeting the graphic — was sound
 * engineering and the wrong shape. The owner: *"Le panel avec le texte ne doit pas être sur le côté
 * mais centré et par dessus le contenu visuel."* Assertion F is now pointed the other way (the card
 * IS over the visual, centred, opaque, and one of two widths), the step is 140% rather than 115% so
 * the visual stands entirely clear between two cards, and the band every frame reserved at its
 * bottom is reclaimed in the seed. G and H are untouched and stayed green throughout, which is the
 * point of having split them.
 *
 * ROUND TWO: THE QUESTION. The fix for that round PINNED each prose panel with a `bottom` sticky
 * offset, so it parked in a reserved band for the whole of its step and could not cross the
 * graphic's own labels. Every assertion here went green and stayed green, because not one of them
 * was about motion. The owner drove it: *"le panel avec le texte ne bouge plus alors que l'effet
 * c'est vraiment de les faire défiler au scroll vers le haut."* Running THIS file's own recorder
 * over those shipped artifacts, with assertion G added, measured what nobody had asked for: the
 * middle panels held ONE screen offset for 42-45% of every scroll-advancing animation frame, and
 * the last panel for 78%, sweeping 187px of an 821px track. A guard that only ever asks "which"
 * cannot see a page that never moves.
 *
 * So `scripts/verify-scrolly.mjs` installs a `requestAnimationFrame` recorder BEFORE touching the
 * scroll position and reads back every frame the browser actually drew. This file walks it over
 * every scrolly on disk. What it asserts is listed in that script's own header (A-G); what it
 * reports without asserting is listed there too, with the reason.
 *
 * MUTATION-PROVED, because a test that stays green when the code is broken is worthless. Every one
 * was run on a COPY of the skill under `/tmp` (with `node_modules` symlinked in), never in this
 * tree — several agents share this working tree and one agent's mutation must not turn it red for
 * everyone.
 *
 * THE NINTH CORRECTION'S OWN FIVE, run first because they are the ones this round earned:
 *
 *   A. THE CARD PUT BACK IN A SIDE COLUMN. `.scrolly-track` returned to the eighth correction's
 *      two-cell grid, the graphic in column 1 and `.scrolly-steps` in a 440px column 2. Six
 *      failures, two at each width:
 *
 *        FAIL @ 1600x900: card site sat at x 1216..1544 (centre 1380.0) against a graphic centred
 *          on 580 at scroll 0 — the card is centred over the visual, never off to a side
 *        FAIL @ 1600x900: card site was painted at [1216,575,1544,733], outside the graphic's own
 *          [0,80,1160,821] at scroll 0 — the card travels over the visual, not beside it
 *
 *      Everything else stayed green, including G and H — which is exactly the finding of the round
 *      the side column shipped: a column travels and scrubs perfectly well, and no assertion about
 *      travel or progress can tell you it is the wrong form.
 *
 *   B. THE CARD MADE TRANSLUCENT. `background: rgba(255, 255, 255, 0.72)` in place of
 *      `var(--ground)`. Red at all three widths on the sub-assertion the whole opaque-card answer
 *      rests on:
 *
 *        FAIL @ 1600x900: the card was painted rgba(255, 255, 255, 0.72) — a translucent card's
 *          effective colour is a blend with whatever the graphic shows behind it, which is not a
 *          value anyone can measure; the card is opaque or the contrast claim is empty
 *
 *   C. THE IN-BETWEEN WIDTH. `.step`'s own `padding: 0 var(--prose-gutter)` restored at every
 *      viewport, which is the shape that shipped before this round: a card 88% as wide as a phone's
 *      frame, its vertical edges landing exactly where a chart keeps its y-axis labels.
 *
 *        FAIL @ 375x812: the card rendered 330px against a 375px graphic — 88%, the in-between
 *          shape: its own vertical edges land in the outer band where a frame keeps its axis
 *          furniture, and a label cut down the middle reads as broken text for every frame the card
 *          spends at that row. At most 70% of the frame, or the whole of it
 *        note @ 375x812: … longest SLICED run record:60,000 48f, record:80,000 41f, record:20,000
 *          12f, record:40,000 12f
 *
 *      The note is what the assertion is for, in the same run: forty-eight consecutive animation
 *      frames of a y-axis label cut down the middle. Edge to edge, the same beat measures none.
 *
 *   D. THE RECLAIMED BAND RE-RESERVED. `CHART_LAYOUT.plot.bottom` back to `0.63`, the value three
 *      rounds of this seed carried while a panel parked in the bottom 28% of every frame. Red in
 *      `test/seed-tracks.test.ts`, which is where the reclaim is locked:
 *
 *        Expected: > 0.85   Received: 0.63
 *        (fail) CHART_LAYOUT — the reclaimed band … > should give the plot the frame's own height
 *          rather than a band of it
 *
 *   E. THE STEP BACK TO 115%. Red in `test/render-scrolly.test.ts` (`Expected to contain:
 *      "min-height: 140%"`), and HONESTLY NOT RED HERE — which is the note this mutation exists to
 *      leave. Driven, it measures `the visual stood entirely clear on 0/227 frames` at every width,
 *      against 26-35 at 140%, and every assertion in this file stays green. "A reader never once
 *      sees the visual unobstructed" is a fact this guard REPORTS and does not assert, because the
 *      right number depends on how tall a beat's own cards are; the stylesheet lock is what stops
 *      it drifting back, and the note is what a person reads.
 *
 *   1. THE PANEL, PUT BACK ON A PIN. `.step` returned to `align-items: flex-end` and `.step-panel`
 *      given back `position: sticky; bottom: clamp(16px, 4vh, 40px)` — the pair the seventh
 *      correction shipped, reverted together because a `bottom` offset only ever shifts a box UP
 *      and does nothing at all to a panel centred in its step. 14 failures across three widths:
 *
 *        FAIL @ 1600x900: panel record swept only 162px of a 821px lane — the prose is meant to
 *          travel the full height of its own column, not to be revealed in place
 *        FAIL @ 1600x900: panel record HELD one offset for 48 of 60 scroll-advancing frames (80%)
 *          — a parked panel is a slideshow; the reader must see the words move past the graphic
 *        FAIL @ 1600x900: panel where HELD one offset for 49 of 110 scroll-advancing frames (45%)
 *        FAIL @ 375x812: panel instrument HELD one offset for 29 of 114 scroll-advancing frames (25%)
 *
 *      WORTH KNOWING, because the honest form of a mutation note is which sub-assertions did NOT
 *      fire: G's enter/leave halves stayed green under this mutation. A pinned panel still arrives
 *      from below the column and still leaves past its top — it simply stops for most of the way.
 *      The HELD share is what discriminates, and the swept distance catches only the LAST panel,
 *      whose step ends before it un-pins. Assertions A-F also stayed green, which is the point of
 *      splitting them: the model, the fixed graphic and the step decisions were all still correct.
 *
 *   2. THE SPLIT, PUT BACK INTO ONE BOX. `.scrolly-graphic` and `.scrolly-steps` returned to
 *      `position: absolute; inset: 0`, the shared-box model the eighth correction replaced. Red at
 *      1600x900 on the assertion that is the whole claim of that correction:
 *
 *        FAIL: prose was painted OVER the graphic at 227/227 animation frames (first at scroll 0,
 *          panel site at [1192,485,1568,617] against a graphic at [0,80,1600,821]) — the prose has
 *          its own space; the two may never meet
 *        note: prose covered a frame's own label at 9/227 frames — ["record:Oct"]
 *
 *      The note is the collision itself, back within nine animation frames of a four-step seed: a
 *      travelling opaque panel over a chart's own x-axis label.
 *
 *   3. THE DECISION LAYER. `assets/interaction.mjs` put back to an IntersectionObserver that picks
 *      its winner out of the current callback's entries — re-run under the new layout, because the
 *      lane `pickActiveStep` is measured against changed with it. Still red:
 *
 *        FAIL @ 1600x900: the active step OSCILLATED — site became active 2 times, instrument 3
 *          times, where 3 times, record 2 times; one continuous pass must hand each step the class
 *          exactly once
 *
 *   4. THE CONTINUOUS SIGNAL, QUANTISED TO ITS OWN STEP. `data-progress` published as
 *      `Math.round(measureProgress(...))` — the shape the vehicle had before it published anything
 *      at all, where a consumer can only ever catch up at the handover. Red on the assertion the
 *      owner's report is about:
 *
 *        FAIL @ 1600x900: progress did not move on 181 of 182 scroll-advancing frames INSIDE a step
 *          (99%, longest still run 58 frames ending at scroll 1472, progress stuck at 1) — the
 *          element must evolve as the reader scrolls, not catch up at the handover
 *        FAIL @ 1600x900: the step and the progress drifted 1.00 steps apart at scroll 528 (step
 *          instrument, progress 0) — a scrubbed visual and the words beside it must describe the
 *          same moment
 *
 *      Green on this code: 6-8 still frames of 170-192, worst drift 0.50-0.54, which is the
 *      max-overlap crossover itself rather than a drift.
 *
 *   5. THE SIGNAL NOT PUBLISHED AT ALL. The one `setAttribute` deleted:
 *
 *        FAIL @ 1600x900: no readable `data-progress` on 227/227 animation frames — a consumer has
 *          nothing to scrub a visual against, so the visual can only ever catch up at a step
 *          boundary
 *
 * WHAT IT PROVABLY DOES NOT CATCH — read this before trusting it for anything wider.
 *
 *   0. WHETHER A CONSUMER ACTUALLY USES THE SIGNAL. H proves `data-progress` is published, moves
 *      inside a step and stays in lock-step with the words. It cannot prove any visual on the page
 *      reads it — a beat that ignores it still passes every assertion here while looking exactly
 *      like the slideshow the owner rejected. That proof belongs to the beat's own drive harness,
 *      which reads the visual's OWN published state, and both single-visual beats have one.
 *
 *   1. WHETHER THE BEAT IS ANY GOOD. Four steps that arrive in order, over a graphic that never
 *      moves, can still be four charts nobody needed. Every assertion here is mechanical.
 *
 *   2. WHETHER THE SPLIT IS THE RIGHT SPLIT. F proves the prose never touches the graphic; nothing
 *      here proves the graphic still has enough width to be read at, or that the prose column is
 *      wide enough for a comfortable measure. The rendered size of each cell is REPORTED at every
 *      width for exactly that reason, and choosing the numbers was done by opening the render.
 *
 *   3. THE BAND FOUR BEATS STILL RESERVE. The seed reclaimed its own in the ninth correction, and
 *      `test/seed-tracks.test.ts` locks it. Four beats on disk still carry their own copy of
 *      `PROSE_LANE`/`CONTENT_TOP` and still keep 28-36% of every frame clear at the bottom for a
 *      card that travels the whole frame and rests nowhere. Two of them derive a CAMERA from that
 *      constant rather than only a plot box, so reclaiming there is a re-composition of those beats
 *      rather than a constant edited — named as residue in `references/scrolly-discipline.md` and
 *      not measured here.
 *
 *   4. WHERE A BEAT PUTS ITS OWN LABELS. F4 keeps the card from having a vertical edge inside the
 *      frame at narrow widths, which is where slicing was worst; on a desktop the card's edges are
 *      inside the frame by construction, and whether a beat's own label straddles one is the beat's
 *      composition. It is REPORTED, per label, as the longest run of consecutive frames the label
 *      spent cut — 8 to 12 frames of a ~240-frame pass on the beats on disk, all of them in transit
 *      rather than at the position a step is narrated at.
 *
 *   4. ONE SPEED. The scroll is one step per ~60 animation frames, derived from each beat's own
 *      step height so a phone and a desktop get the same dwell. A defect that needs a slower read,
 *      a flick, or a reversal is not sampled. Reversing direction in particular is untested here.
 *
 *   5. TOUCH AND MOMENTUM. The scroll is written to `scrollTop`, not dispatched as a wheel or a
 *      touch drag, so nothing about momentum, rubber-banding or `overscroll-behavior` is proved.
 *
 *   6. A BEAT WHOSE RENDERED HTML ON DISK IS STALE. This walks the artifacts as they stand. A beat
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
