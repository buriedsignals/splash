/**
 * A PLATE PRINTED TWO OF ITS OWN LINES THROUGH EACH OTHER AND EVERY GUARD WAS GREEN.
 *
 * `assertWithinFrame` checks a run against the frame's sides; `assertWithinHeight` against its top
 * and foot. Neither asks whether two runs occupy the same pixels. Measured 2026-09-23 on a real
 * story's still, whose closing block was laid out in two halves — the comparison positioned from
 * the plot above it, the share from the credit below it, and nothing between them:
 *
 *   "5.7× less than Romania alone"            baseline 1174.8, 36px
 *   "85% of the EU's 30,001 reported cases"   baseline 1182.0, 36px
 *
 * Seven pixels apart at 36px: 80% of their own type, one printed through the other. The render
 * reported success.
 *
 * TWO CALIBRATIONS, BOTH MEASURED RATHER THAN CHOSEN, and the first version of this guard failed
 * both:
 *   · it reported 42 of the 118 delivered stills, and every pair at a perfect overlap was the
 *     tree's own HALO — one label drawn as a stroke and again as a fill at the same coordinates.
 *   · with haloes excluded, the worst overlap anything already shipped carries is 0.27: adjacent
 *     lines set tight, which is typography. The defect above is 0.80. The threshold is a half.
 *
 * Swept after both: 118 delivered SVGs, 0 refused.
 */
import { describe, expect, it } from "bun:test";
import { assertNoOverlappingText } from "../scripts/render-still.mjs";

const line = (text: string, y: number, size = 36, x = 80) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="400">${text}</text>`;
const plate = (...lines: string[]) => `<svg width="1080" height="1920">${lines.join("")}</svg>`;

describe("two lines never land on each other", () => {
  it("refuses the collision this guard was written from", () => {
    const svg = plate(
      line("5.7× less than Romania alone", 1174.8),
      line("85% of the EU's 30,001 reported cases", 1182),
    );
    expect(() => assertNoOverlappingText(svg, { what: "the still" })).toThrow(/through each other/);
  });

  it("names both runs, their baselines and how much ink they share", () => {
    const svg = plate(line("5.7× less than Romania alone", 1174.8), line("85% of the EU's 30,001", 1182));
    expect(() => assertNoOverlappingText(svg, { what: "the still" })).toThrow(/baseline 1175/);
    expect(() => assertNoOverlappingText(svg, { what: "the still" })).toThrow(/% of the smaller run/);
  });

  it("accepts the same two lines stepped by their register's own lead", () => {
    expect(() =>
      assertNoOverlappingText(plate(line("5.7× less than Romania alone", 1130), line("85% of the EU's 30,001", 1182))),
    ).not.toThrow();
  });

  it("accepts one label haloed — the same words drawn twice at the same place", () => {
    const halo = plate(line("Allemagne 1251k", 220, 11), line("Allemagne 1251k", 220, 11));
    expect(() => assertNoOverlappingText(halo)).not.toThrow();
  });

  it("accepts two columns side by side at the same height", () => {
    expect(() => assertNoOverlappingText(plate(line("Romania", 600), line("25,505", 600, 36, 700)))).not.toThrow();
  });

  it("accepts adjacent lines set tight, which the catalogue carries at 0.27 and is typography", () => {
    // 10px type, baselines 8px apart: they share 0.2 of their own band.
    expect(() => assertNoOverlappingText(plate(line("9 PAYS", 268, 10), line("BASCULÉS", 276, 10)))).not.toThrow();
  });

  it("says out loud when a rotated run went unmeasured", () => {
    const svg = plate(
      line("5.7× less than Romania alone", 1174.8),
      line("85% of the EU's 30,001", 1182),
      `<text x="80" y="900" font-size="36" transform="rotate(-90 80 900)">sideways</text>`,
    );
    expect(() => assertNoOverlappingText(svg)).toThrow(/1 rotated or transformed run\(s\) were not measured/);
  });
});
