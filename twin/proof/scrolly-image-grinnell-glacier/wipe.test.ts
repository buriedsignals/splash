// THE PICTURE MOVES WITH THE READER, AND IT NEVER PAINTS A PHOTOGRAPH OF NO YEAR.
//
// This beat shipped as four fixed pictures and a cross-fade with every guard around it green,
// because nothing anywhere asked whether the picture CHANGED between two arrivals. Driven
// continuously — a per-frame recorder installed before the scroll was touched, both directions,
// three widths — it measured 0 of 113, 0 of 97 and 0 of 78 intra-step frames on which any geometry
// moved. `wipe-drive.mjs` is the repair; this file guards its pure half.
//
// THE MUTATIONS, run in an rsync copy outside this tree, with the red they produced.
//
// M1 — `wipeAt` snaps instead of wiping (`return { from: Math.round(p), to: Math.round(p), t: 0 }`
//      unconditionally), which is the cross-fade this beat shipped, put back:
//
//        (fail) the wipe > shows exactly one photograph at an authored position
//        (fail) the wipe > names the two photographs on screen and how far the boundary has travelled
//        (fail) the wipe > holds the OUTGOING photograph on the right and reveals the incoming one
//               from the left
//        (fail) the wipe > is LINEAR in the reader's own scroll, not eased
//        (fail) the wipe > clamps outside the piece rather than running off either end
//         8 pass, 5 fail
//
// M2 — `columnWidthFor` fills the frame's width regardless of the height available
//      (`return box.width - gutter * 2;`), which is the defect the first render of this round had
//      in its CSS: the picture ran past the frame's floor and took the credit line with it.
//
//        error: expect(received).toBe(expected)
//        Expected: 493   Received: 1568
//        (fail) contain, and fill > grows the picture until the HEIGHT binds on a wide frame
//        (fail) contain, and fill > is HEIGHT-bound on the phone this beat is actually verified at
//        (fail) contain, and fill > never returns a negative width when the frame is shorter than
//               its own chrome
//         10 pass, 3 fail
//
// M3 — `readProgress` returns 0 instead of throwing on a missing attribute. A sequence that
//      silently sits on photograph 1 forever looks exactly like one whose script never ran.
//
//        error: expect(received).toThrow(expected)
//        Expected substring: "data-progress"
//        Received function did not throw
//        (fail) the beat refuses to run without the scaffold's published signal > names
//               data-progress rather than defaulting
//         12 pass, 1 fail
import { describe, expect, it } from "bun:test";
import {
  columnWidthFor,
  progressSourceOf,
  readProgress,
  seamAt,
  wipeAt,
} from "./wipe-drive.mjs";

function node(attributes: Record<string, string>, parent: unknown = null) {
  return {
    getAttribute: (name: string) =>
      name in attributes ? attributes[name] : null,
    parentElement: parent,
  };
}

describe("the wipe", () => {
  it("shows exactly one photograph at an authored position", () => {
    for (const i of [0, 1, 2, 3]) {
      const at = wipeAt(i, 4, false);
      expect(at.from).toBe(Math.min(i, 2));
      expect(at.t).toBeCloseTo(i === 3 ? 1 : 0, 10);
    }
  });

  it("names the two photographs on screen and how far the boundary has travelled", () => {
    const at = wipeAt(1.4, 4, false);
    expect(at.from).toBe(1);
    expect(at.to).toBe(2);
    expect(at.t).toBeCloseTo(0.4, 10);
  });

  it("holds the OUTGOING photograph on the right and reveals the incoming one from the left", () => {
    // The pair is (from, to) = (2, 3) anywhere in the last leg, so the incoming photograph is the
    // LATER one at every position — the sequence never runs backwards through its own years.
    expect(wipeAt(2.01, 4, false).to).toBe(3);
    expect(wipeAt(2.99, 4, false).to).toBe(3);
    expect(wipeAt(2.99, 4, false).from).toBe(2);
  });

  it("is LINEAR in the reader's own scroll, not eased", () => {
    // The boundary is a thing the reader is dragging. Easing it would make the picture disagree
    // with the thumb — which is the opposite trade from the sibling map beat, whose camera FLIGHT
    // is eased because a flight reads better with a calm departure.
    expect(wipeAt(0.25, 4, false).t).toBeCloseTo(0.25, 10);
    expect(wipeAt(0.5, 4, false).t).toBeCloseTo(0.5, 10);
    expect(wipeAt(0.75, 4, false).t).toBeCloseTo(0.75, 10);
  });

  it("cuts rather than wipes under reduced motion, and still reaches every photograph", () => {
    const seen = new Set<number>();
    for (let p = 0; p <= 3.0001; p += 0.05) {
      const at = wipeAt(p, 4, true);
      expect(at.t).toBe(0);
      expect(at.from).toBe(at.to);
      seen.add(at.from);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it("clamps outside the piece rather than running off either end", () => {
    expect(wipeAt(-2, 4, false)).toEqual({ from: 0, to: 1, t: 0 });
    expect(wipeAt(9, 4, false).to).toBe(3);
  });

  it("puts the boundary where the fraction says, in the picture's own pixels", () => {
    expect(seamAt(0, 400)).toBe(0);
    expect(seamAt(0.25, 400)).toBe(100);
    expect(seamAt(1, 400)).toBe(400);
  });
});

describe("contain, and fill", () => {
  // The owner's ruling: respect the ratio, fill to the max on whichever axis binds.
  const ASPECT = 820 / 1215; // 0.6749 — this sequence's own normalised box.
  const CHROME = 104;
  const GUTTER = 16;

  it("grows the picture until the HEIGHT binds on a wide frame", () => {
    // 1600x900 minus a two-line header: 1600 x 834. Height binds, so the picture is 493 wide, not
    // the 1568 the width would allow.
    expect(
      Math.round(
        columnWidthFor({ width: 1600, height: 834 }, ASPECT, CHROME, GUTTER),
      ),
    ).toBe(493);
  });

  it("grows the picture until the WIDTH binds on a phone", () => {
    // 375x900: the height would allow 537, the width allows 343 — the narrower one wins, so the
    // picture is width-bound and the letterbox is above and below it.
    expect(
      Math.round(
        columnWidthFor({ width: 375, height: 900 }, ASPECT, CHROME, GUTTER),
      ),
    ).toBe(343);
  });

  it("is HEIGHT-bound on the phone this beat is actually verified at", () => {
    // 375x573 is the frame the driven run measures once the header has wrapped to eight lines:
    // the height allows 317 and the width 343, so the picture is height-bound after all. Both
    // regimes are real on one device, which is why the binding axis is computed and not assumed.
    expect(
      Math.round(
        columnWidthFor({ width: 375, height: 573 }, ASPECT, CHROME, GUTTER),
      ),
    ).toBe(317);
  });

  it("never returns a negative width when the frame is shorter than its own chrome", () => {
    expect(
      columnWidthFor({ width: 400, height: 40 }, ASPECT, CHROME, GUTTER),
    ).toBe(0);
  });
});

describe("the beat refuses to run without the scaffold's published signal", () => {
  it("names data-progress rather than defaulting", () => {
    expect(() => readProgress(node({}))).toThrow("data-progress");
    expect(() => readProgress(null)).toThrow("data-progress");
    expect(() => readProgress(node({ "data-progress": "half way" }))).toThrow(
      "data-progress",
    );
  });

  it("walks up to the nearest ancestor carrying it", () => {
    const scrolly = node({ "data-progress": "1.5" });
    const stack = node({}, scrolly);
    expect(
      progressSourceOf(node({ "data-visual": "glacier-wipe" }, stack)),
    ).toBe(scrolly);
    expect(readProgress(scrolly)).toBe(1.5);
  });
});
