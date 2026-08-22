/**
 * ON A DENSE CAMERA, THE FALLBACK'S POINTER TARGETS COVER EACH OTHER — and until the driver was
 * fixed, nothing could see it.
 *
 * Found by driving the real 241-region world beat with `verify-interaction.mjs` after that script
 * stopped asserting the symbol seed's own invariant over every page (2026-08-22). Measured at
 * 1600x900, where the map draws 898px wide:
 *
 *     241 marks · 143 pointer-active (`needsPointerTarget` gives a button to every region too small
 *     to land a pointer on by its own shape) · 82 of those 143 answered `document.elementFromPoint`
 *     at their OWN centre with a NEIGHBOUR's button — MCO covered by VAT, LTU by LVA, SMR by BIH.
 *
 * At 1024x768 it was 91, at 375x667 it was 122. A reader with JavaScript off cannot point at those
 * regions at all. The seed's thirteen European metro areas are nowhere near each other, which is why
 * this format shipped five beats without it showing.
 *
 * WHAT IS AND IS NOT FIXED, stated because the difference is the whole decision. The button is not
 * removed: it is also the KEYBOARD target and the carrier of the `aria-label`, and both of those
 * channels are complete on that beat — Tab reaches all 241, the table carries all 241. Trading a
 * partial pointer path for a broken keyboard path is the wrong trade for the reader with the least.
 * So this is a limit that is SAID rather than removed, which is this project's own rule for a limit
 * that cannot be removed: `render-web.mjs` prints the count at four widths at production time, and
 * this test is the half that asserts it says so.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  POINTER_TARGET_PX,
  bboxCenter,
  boundingBoxOf,
  collidingPointerTargets,
} from "../assets/geo-choropleth.ts";
import { TWIN } from "../scripts/discover-pages.mjs";

describe("collidingPointerTargets", () => {
  const frame = { width: 1200, height: 815 };

  it("names both marks of a pair that share a target, and leaves a distant one alone", () => {
    const targets = [
      { key: "a", x: 100, y: 100 },
      { key: "b", x: 105, y: 100 },
      { key: "far", x: 900, y: 700 },
    ];
    expect(collidingPointerTargets(targets, frame, 898)).toEqual(["a", "b"]);
  });

  it("answers differently at different drawn widths, because it is a different question", () => {
    // A fixed 28px target seen from the geometry's side is a bigger piece of the frame the smaller
    // the map is drawn. Two marks 30 frame units apart are separate targets on a wide screen and one
    // target on a phone — which is exactly why a single number could never have answered this.
    const targets = [
      { key: "a", x: 100, y: 100 },
      { key: "b", x: 130, y: 100 },
    ];
    expect(collidingPointerTargets(targets, frame, 1200)).toEqual([]);
    expect(collidingPointerTargets(targets, frame, 375)).toEqual(["a", "b"]);
  });

  it("says nothing when it has nothing to measure with", () => {
    expect(
      collidingPointerTargets([{ key: "a", x: 1, y: 1 }], frame, 0),
    ).toEqual([]);
    expect(collidingPointerTargets([], frame, 898)).toEqual([]);
  });

  it("carries the target size the component draws", () => {
    expect(POINTER_TARGET_PX).toBe(28);
  });
});

describe("the real world beat, measured from its own bake", () => {
  const beat = join(
    TWIN,
    "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023",
  );
  const geometryPath = join(beat, "plate", "geometry.json");

  it("reproduces from static files what the live driver found by pointing at pixels", () => {
    expect(existsSync(geometryPath)).toBe(true);
    const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
    // That beat's own copy still carries the ABSOLUTE 26 frame units this skill has since replaced
    // with a fraction of the frame, so the threshold is stated here as the beat's, not as the
    // skill's — otherwise this would be measuring the fix rather than the defect.
    const threshold = 26;
    const targets = geometry.shapes
      .map((shape: { key: string; rings: [number, number][][] }) => ({
        key: shape.key,
        box: boundingBoxOf(shape.rings),
      }))
      .filter(
        ({
          box,
        }: {
          box: { minX: number; maxX: number; minY: number; maxY: number };
        }) => Math.max(box.maxX - box.minX, box.maxY - box.minY) < threshold,
      )
      .map(
        ({
          key,
          box,
        }: {
          key: string;
          box: { minX: number; maxX: number; minY: number; maxY: number };
        }) => {
          const [x, y] = bboxCenter(box);
          return { key, x, y };
        },
      );

    // 143 — the exact number the browser reported as pointer-active on that page.
    expect(geometry.shapes.length).toBe(241);
    expect(targets.length).toBe(143);

    // 108 against the driver's 82, and the gap is the decision being deliberately WIDER than the
    // browser: `elementFromPoint` names only the mark that LOSES the hit test, one per colliding
    // pair, while this names every mark whose own centre lies inside another's target — both halves,
    // because which one wins is a z-order accident a static reading cannot and should not predict.
    // A superset of "cannot be pointed at", which is the right side to err on for a producer's
    // warning.
    const covered = collidingPointerTargets(targets, geometry.frame, 898);
    expect(covered.length).toBe(108);
    expect(covered).toContain("MCO");
    expect(covered).toContain("SMR");

    // Worse on a phone, exactly as the driver found (122 losers there against 138 named here).
    expect(collidingPointerTargets(targets, geometry.frame, 265).length).toBe(
      138,
    );
  });
});

describe("the producer says so", () => {
  it("prints the verdict at more than one width, in the beat's own runner", () => {
    // The half that makes this a mechanism rather than a note: a limit that cannot be removed is
    // stated where the journalist reads it. If this call is deleted, the beat renders in silence.
    const runner = readFileSync(
      join(TWIN, "proof/mapgen-choropleth-web/render-web.mjs"),
      "utf8",
    );
    expect(runner).toContain("collidingPointerTargets(");
    expect(runner).toContain("[1600, 1024, 768, 375]");
    expect(runner).toContain("CANNOT be pointed at in");
  });
});
