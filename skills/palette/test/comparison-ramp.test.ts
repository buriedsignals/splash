/**
 * THE ANSWER FOR A PART-TO-WHOLE BEAT WITH MORE PARTS THAN THE NEWSROOM HAS ACCENTS.
 *
 * Round seven, real story `real-gwis-wildfire-counts` (defect D9 of that run). The beat draws six
 * bands; `NEWSROOM.md` records two accents. `seriesInks` derives more, but only as shades of the
 * recorded accents — right when every series is data of equal standing, wrong here, where five of
 * the six bands ARE the comparison field for the sixth, and six shades of the house gold is the
 * "accent colour on every mark" anti-pattern by name. The story had to derive its own ramp inside
 * its component. This is that derivation, with the floor and the pairwise separation measured, and
 * `proposePalette` giving it as the answer.
 *
 * `readApart` and the ink pole are COPIES of the render's own, so both are checked here against
 * the shared originals rather than trusted — the divergence a copy buys is what this file exists
 * to catch.
 */
import { describe, it, expect } from "bun:test";
import {
  comparisonRamp,
  inkPole,
  readApart,
  contrast,
  NON_TEXT_CONTRAST_MIN,
  proposePalette,
} from "../scripts/palette.mjs";
import {
  deriveFurniture,
  readApart as renderReadApart,
  seriesInks,
} from "../../../shared/chart-beat/render-still.mjs";

const GROUNDS = ["#16191B", "#FFFFFF", "#0B0B0B", "#F5F1E8", "#747474", "#808080", "#123456", "#E5E5E5"];
const HOUSE = { name: "Buried Signals", brandColor: "#D4A853", accents: "#5B8A8A", ground: "#16191B" };

describe("the copies this ramp is built on", () => {
  it("should pick the same ink pole the render's own furniture does, on every ground", () => {
    for (const ground of GROUNDS) expect(inkPole(ground)).toBe(deriveFurniture(ground).ink);
  });

  it("should agree with the render's readApart over a sweep, both ways", () => {
    for (const a of GROUNDS) {
      for (const b of ["#D4A853", "#5B8A8A", "#636566", "#0B7A75", "#C1440E", ...GROUNDS]) {
        expect(readApart(a, b)).toBe(renderReadApart(a, b));
      }
    }
  });
});

describe("comparisonRamp", () => {
  it("should walk from the ground toward the ink and clear the mark floor at every step", () => {
    const ramp = comparisonRamp({ ground: "#16191B", accent: "#D4A853", count: 5 });
    expect(ramp).toHaveLength(5);
    for (const step of ramp) expect(contrast(step, "#16191B")).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST_MIN);
  });

  it("should read apart from the accent and from EVERY other step, not only the one below it", () => {
    // `#123456` asks for four: that blue ground has room for four steps and no more, which is
    // itself the refusal below working.
    for (const [ground, count] of [["#16191B", 5], ["#FFFFFF", 5], ["#0B0B0B", 5], ["#123456", 4]] as const) {
      const ramp = comparisonRamp({ ground, accent: "#D4A853", count });
      const all = ["#D4A853", ...ramp];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) expect(readApart(all[i], all[j])).toBe(true);
      }
    }
  });

  it("should run the other way on a light ground, with no edit and no second table", () => {
    const dark = comparisonRamp({ ground: "#16191B", accent: "#D4A853", count: 5 });
    const light = comparisonRamp({ ground: "#FFFFFF", accent: "#0B7A75", count: 5 });
    // Each walk ends further from its own ground than it starts, in opposite directions.
    expect(contrast(dark[4], "#16191B")).toBeGreaterThan(contrast(dark[0], "#16191B"));
    expect(inkPole("#16191B")).toBe("#FFFFFF");
    expect(inkPole("#FFFFFF")).toBe("#000000");
    expect(contrast(light[4], "#FFFFFF")).toBeGreaterThan(contrast(light[0], "#FFFFFF"));
  });

  it("should REFUSE rather than default when the ground leaves no room, saying how far it got", () => {
    expect(() => comparisonRamp({ ground: "#747474", accent: "#D4A853", count: 5 })).toThrow(/ran out at 2/);
    expect(() => comparisonRamp({ ground: "#747474", accent: "#D4A853", count: 5 })).toThrow(/5/);
  });

  it("should refuse a ground, an accent or a count it cannot walk", () => {
    expect(() => comparisonRamp({ ground: "nope", accent: "#D4A853", count: 2 })).toThrow(/ground/);
    expect(() => comparisonRamp({ ground: "#16191B", accent: "nope", count: 2 })).toThrow(/accent/);
    expect(() => comparisonRamp({ ground: "#16191B", accent: "#D4A853", count: 0 })).toThrow(/count/);
  });
});

describe("proposePalette's answer for a part-to-whole beat", () => {
  it("should say nothing about a comparison field when no series were declared", () => {
    expect(proposePalette({ newsroom: HOUSE, subject: "wildfires", surface: "screen" }).comparisonField).toBeNull();
  });

  it("should give the ramp when the parts outrun the accents that would be recorded", () => {
    const p = proposePalette({
      newsroom: HOUSE,
      subject: "wildfires in Africa",
      surface: "screen",
      series: { count: 6, kind: "part-to-whole" },
    });
    const field = p.comparisonField!;
    expect(field.outrunsTheRecord).toBe(true);
    expect(field.accent).toBe("#D4A853");
    expect(field.ramp).toHaveLength(5);
    expect(field.refusal).toBeNull();
    // Every step measured against the REAL ground, not against the paper default.
    for (const step of field.measured) {
      expect(step.contrast).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST_MIN);
      expect(step.nearest.contrast).toBeGreaterThan(0);
    }
  });

  it("should hand the record straight to seriesInks, so the render needs no second mechanism", () => {
    const p = proposePalette({
      newsroom: HOUSE,
      subject: "wildfires in Africa",
      surface: "screen",
      series: { count: 6, kind: "part-to-whole" },
    });
    const field = p.comparisonField!;
    // What the SKILL records in PALETTE.md, read back the way every beat reads it.
    const recorded = { ground: p.ground, accent: field.accent, accents: field.accents, source: "PALETTE.md" };
    expect(seriesInks(recorded, 6)).toEqual([field.accent, ...field.ramp]);
  });

  it("should NOT propose a ramp when the recorded accents already answer the beat", () => {
    const p = proposePalette({
      newsroom: HOUSE,
      subject: "wildfires in Africa",
      surface: "screen",
      series: { count: 2, kind: "part-to-whole" },
    });
    expect(p.comparisonField!.outrunsTheRecord).toBe(false);
    expect(p.comparisonField!.ramp).toBeNull();
    expect(p.comparisonField!.says).toMatch(/seriesInks/);
  });

  it("should point at seriesInks, not at a ramp, when the series are of equal standing", () => {
    const p = proposePalette({
      newsroom: HOUSE,
      subject: "wildfires in Africa",
      surface: "screen",
      series: { count: 6, kind: "equal" },
    });
    expect(p.comparisonField!.ramp).toBeNull();
    expect(p.comparisonField!.says).toMatch(/seriesInks/);
  });

  it("should STATE the refusal rather than throw, when the ground leaves no room for the field", () => {
    // A grey ground with an accent that DOES clear the floor on it (3.78:1), so the refusal under
    // test is the ramp's own and not "there was no accent to build a field around".
    const grey = { name: "Grey", brandColor: "#16191B", ground: "#747474" };
    const p = proposePalette({
      newsroom: grey,
      subject: "wildfires in Africa",
      surface: "screen",
      series: { count: 6, kind: "part-to-whole" },
    });
    expect(p.comparisonField!.ramp).toBeNull();
    expect(p.comparisonField!.refusal).toMatch(/ran out at 2/);
    // The rest of the proposal survives: the journalist still gets the options and the escape.
    expect(p.recommended).not.toBeNull();
  });

  it("should refuse a series declaration it holds no answer for, rather than guess one", () => {
    expect(() =>
      proposePalette({ newsroom: HOUSE, series: { count: 6, kind: "stacked-ish" } }),
    ).toThrow(/kind/);
    expect(() => proposePalette({ newsroom: HOUSE, series: { count: 1.5, kind: "equal" } })).toThrow(/count/);
  });
});

// A ramp nobody is shown is a ramp nobody can record, and a REFUSAL nobody is shown is worse: the
// beat gets drawn anyway. Same rule `surfaceLimit` follows.
describe("the comparison field in the document the journalist reads", () => {
  it("should print every step with what it measured, and the line to record", async () => {
    const { formatProposal } = await import("../scripts/format-proposal.mjs");
    const p = proposePalette({
      newsroom: HOUSE,
      subject: "wildfires in Africa",
      surface: "screen",
      series: { count: 6, kind: "part-to-whole" },
    });
    const printed = formatProposal(p);
    for (const step of p.comparisonField!.ramp!) expect(printed).toContain(step);
    for (const step of p.comparisonField!.measured) expect(printed).toContain(`${step.contrast}:1`);
    expect(printed).toContain(p.comparisonField!.accent!);
  });

  it("should print the refusal when there is no ramp to print", async () => {
    const { formatProposal } = await import("../scripts/format-proposal.mjs");
    const p = proposePalette({
      newsroom: { name: "Grey", brandColor: "#16191B", ground: "#747474" },
      subject: "wildfires in Africa",
      surface: "screen",
      series: { count: 6, kind: "part-to-whole" },
    });
    expect(formatProposal(p)).toContain(p.comparisonField!.refusal!);
  });

  it("should say nothing at all when no series were declared", async () => {
    const { formatProposal } = await import("../scripts/format-proposal.mjs");
    const printed = formatProposal(proposePalette({ newsroom: HOUSE, subject: "wildfires", surface: "screen" }));
    expect(printed).not.toContain("The other parts of this beat");
  });
});
