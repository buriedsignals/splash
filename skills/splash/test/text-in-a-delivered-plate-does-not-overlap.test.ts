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
import { readFileSync } from "node:fs";
import { PROOF, renderedPlates } from "../../../tests/support/proof.ts";
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

/** Every plate rendered through the design base: one SVG per filed direction, in `renders/`. */
const plates = renderedPlates().map(({ path }) => path);

/**
 * OWED — A RATCHET. Read this before touching it; you may not add to it.
 *
 * On 2026-09-29, the day before the public release, the committed demo renders below carried these
 * defects and could not be re-rendered before the release. They are real defects, not false
 * positives: each entry is a run this file measures as sharing ink with another, leaving its frame,
 * or being struck by one of the plate's lines. They are named here so the rest of the corpus stays
 * guarded rather than the whole file going red and being ignored.
 *
 * The list may ONLY SHRINK. A finding not written here fails as a new defect — including a second
 * site on a render that is already listed. A listed finding that no longer occurs fails too, and
 * tells whoever fixed it to delete the entry, so the list cannot outlive the defects it names.
 *
 * Keyed by render and by the run(s) involved, not by the measured pixels: a re-render that moves a
 * still-defective run by a pixel is the same defect, and a run that stops colliding is a fix. A key
 * holds the run's exact characters — ` ` is the no-break space the plate really prints.
 */
const OWED: Readonly<Record<string, readonly string[]>> = {};

type Finding = { key: string; detail: string };

/** Every finding the three readings make on one delivered plate. All three are always gathered,
 *  so a render owed for one kind of defect is still held to the other two. */
function findingsOn(svg: string): Finding[] {
  const boxes = inkBoxes(svg);
  return [
    ...overlappingRuns(boxes).map((h) => ({
      key: `overlap: "${h.a.text}" / "${h.b.text}"`,
      detail: `"${h.a.text}" / "${h.b.text}" share ${h.overlap.x.toFixed(1)}x${h.overlap.y.toFixed(1)}px`,
    })),
    ...runsOutsideFrame(boxes, frameOf(svg)).map((r) => ({
      key: `outside the frame: "${r.text}"`,
      detail: `"${r.text}" at ${r.box.x.toFixed(1)},${r.box.y.toFixed(1)} is outside the frame`,
    })),
    /** AND CLEAR OF THE PLATE'S OWN LINES. Rémy read this one off the delivered plates — *les
     *  textes sur le graphe sont coupés par les lignes ce qui les rend peu lisibles* — and
     *  nothing here could see it: the two readings above compare a text box to another text box
     *  and to the frame, and a gridline is neither. 26 crossings across six beats were shipped
     *  before this line existed. The fix it asks for is the halo this tree already draws
     *  wherever a label can land on more than one colour, so a run with one is exempt. It rides
     *  on this test rather than its own because `inkBoxes` is the expensive part and it is
     *  already paid for here. */
    ...runsCrossedByAStroke(boxes, strokeSegments(svg), haloedRuns(svg)).map((h) => ({
      key: `crossed by a line: "${h.run.text}"`,
      detail: `"${h.run.text}" is crossed by a line`,
    })),
  ];
}

/** The ratchet, as a list of messages that must be empty: every finding that is not owed, and every
 *  owed entry that no longer occurs. Counted, so one owed collision cannot cover a second. */
function ratchet(name: string, found: Finding[], owed: readonly string[] = []): string[] {
  const remaining = [...owed];
  const fresh: Finding[] = [];
  for (const f of found) {
    const i = remaining.indexOf(f.key);
    if (i >= 0) remaining.splice(i, 1);
    else fresh.push(f);
  }
  return [
    ...fresh.map((f) => `NEW DEFECT, not in OWED — ${f.detail}`),
    ...remaining.map(
      (key) => `FIXED, no longer occurs — delete this entry from OWED["${name}"]: ${key}`,
    ),
  ];
}

describe("a delivered plate", () => {
  it("should have been rendered at all, so this file is measuring something", () => {
    expect(plates.length).toBeGreaterThan(0);
  });

  it("should owe nothing on a render that no longer exists, and carry no empty entry", () => {
    const names = new Set(plates.map((p) => p.slice(PROOF.length + 1)));
    expect(
      Object.entries(OWED)
        .filter(([name, owed]) => !names.has(name) || owed.length === 0)
        .map(([name]) => `delete OWED["${name}"]: the render is gone or the entry is empty`),
    ).toEqual([]);
  });

  for (const plate of plates) {
    const name = plate.slice(PROOF.length + 1);

    // One test per plate, all three readings, and a minute of budget: every distinct string is
    // measured by rasterising a probe, and a 60-run plate is a few seconds of that on a cold cache.
    // Separate tests per reading would pay for the same measurements again.
    it(
      `should keep every text run clear of every other one, of every line, and inside its frame — ${name}`,
      () => {
        expect(ratchet(name, findingsOn(readFileSync(plate, "utf8")), OWED[name])).toEqual([]);
      },
      60_000,
    );
  }
});

describe("the ink reader", () => {
  const svg = (runs: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">${runs}</svg>`;
  const run = (text: string, x: number, y: number, anchor = "start") =>
    // A Google family the ladders really hold, because the render draws from FILES now: a probe set
    // in a macOS face is a probe `measureText` refuses before it can read anything.
    `<text x="${x}" y="${y}" font-family="Open Sans" font-size="14" font-weight="400" text-anchor="${anchor}">${text}</text>`;

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
