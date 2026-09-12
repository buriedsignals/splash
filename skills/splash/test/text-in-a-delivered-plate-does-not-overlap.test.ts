/**
 * NO TWO TEXT RUNS IN A DELIVERED PLATE SHARE INK, AND NONE LEAVES THE FRAME.
 *
 * THE GAP THIS FILLS. `treatment-labels-do-not-collide.test.ts` proves the ARBITER refuses a
 * collision between the labels it was asked to place. Most of the words on a plate never reach the
 * arbiter: a title, a standfirst, a source line, a row name in its gutter, an axis tick. Measured
 * on the 27-row diverging bar, where the arbiter reported a clean placement while the standfirst
 * printed the average of the falls twice and the subject's note ran through the name of the country
 * it was about. Both were drawn directly, so nothing was watching.
 *
 * This reads the SVG each beat actually shipped and rebuilds every run's ink box with the same
 * instrument the renderer used — resvg's own bounding box, through `measureText` and
 * `measureTextBand`. It is the delivered file that is measured, not the element that was rendered.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  inkBoxes,
  frameOf,
  overlappingRuns,
  runsOutsideFrame,
  haloedRuns,
  strokeSegments,
  runsCrossedByAStroke,
  textRuns,
} from "../../../scripts/design-base/text-boxes.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");

/** Every plate rendered through the design base: one SVG per filed direction, in `renders/`. */
const plates = readdirSync(PROOF)
  .map((beat) => join(PROOF, beat, "renders"))
  .filter((dir) => existsSync(dir))
  .flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".svg"))
      .map((f) => join(dir, f)),
  );

describe("a delivered plate", () => {
  it("should have been rendered at all, so this file is measuring something", () => {
    expect(plates.length).toBeGreaterThan(0);
  });

  for (const plate of plates) {
    const name = plate.slice(PROOF.length + 1);

    // One test per plate, both readings, and a minute of budget: every distinct string is measured
    // by rasterising a probe, and a 60-run plate is a few seconds of that on a cold cache. Two
    // tests per plate would pay for the same measurements twice.
    it(
      `should keep every text run clear of every other one, of every line, and inside its frame — ${name}`,
      () => {
        const svg = readFileSync(plate, "utf8");
        const boxes = inkBoxes(svg);
        expect(
          overlappingRuns(boxes).map(
            (h) =>
              `"${h.a.text}" / "${h.b.text}" share ${h.overlap.x.toFixed(1)}x${h.overlap.y.toFixed(1)}px`,
          ),
        ).toEqual([]);
        expect(
          runsOutsideFrame(boxes, frameOf(svg)).map(
            (r) => `"${r.text}" at ${r.box.x.toFixed(1)},${r.box.y.toFixed(1)}`,
          ),
        ).toEqual([]);
        /** AND CLEAR OF THE PLATE'S OWN LINES. Rémy read this one off the delivered plates — *les
         *  textes sur le graphe sont coupés par les lignes ce qui les rend peu lisibles* — and
         *  nothing here could see it: the two readings above compare a text box to another text box
         *  and to the frame, and a gridline is neither. 26 crossings across six beats were shipped
         *  before this line existed. The fix it asks for is the halo this tree already draws
         *  wherever a label can land on more than one colour, so a run with one is exempt. It rides
         *  on this test rather than its own because `inkBoxes` is the expensive part and it is
         *  already paid for here. */
        expect(
          runsCrossedByAStroke(boxes, strokeSegments(svg), haloedRuns(svg)).map(
            (h) => `"${h.run.text}" is crossed by a line`,
          ),
        ).toEqual([]);
      },
      60_000,
    );
  }
});

describe("the ink reader", () => {
  const svg = (runs: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">${runs}</svg>`;
  const run = (text: string, x: number, y: number, anchor = "start") =>
    `<text x="${x}" y="${y}" font-family="Avenir Next" font-size="14" font-weight="400" text-anchor="${anchor}">${text}</text>`;

  it("should see two runs printed over each other", () => {
    const hits = overlappingRuns(inkBoxes(svg(run("Luxembourg", 40, 100) + run("−20,48", 60, 100))));
    expect(hits).toHaveLength(1);
  });

  it("should leave two runs on the same line but side by side alone", () => {
    const hits = overlappingRuns(inkBoxes(svg(run("Luxembourg", 40, 100) + run("−20,48", 200, 100))));
    expect(hits).toEqual([]);
  });

  it("should read an end-anchored run as ending at its x", () => {
    const [{ box }] = inkBoxes(svg(run("Luxembourg", 300, 100, "end")));
    expect(box.x + box.width).toBeCloseTo(300, 0);
  });

  it("should decode the entities React writes, so a plate is measured in the characters it draws", () => {
    // `&#x27;` is six characters of markup and one glyph of ink. Read literally it over-measures a
    // title by ~30px and reports an overlap with the standfirst beside it that a look at the render
    // shows is not there — a checker that cries wolf teaches its reader to ignore it.
    const [{ text }] = textRuns(svg(run("qu&#x27;en 1967", 40, 100)));
    expect(text).toBe("qu'en 1967");
  });

  it("should see a run that has left the frame", () => {
    const boxes = inkBoxes(svg(run("hors cadre", 380, 100)));
    expect(runsOutsideFrame(boxes, { width: 400, height: 200 })).toHaveLength(1);
    expect(runsOutsideFrame(inkBoxes(svg(run("dedans", 40, 100))), { width: 400, height: 200 })).toEqual([]);
  });
});
