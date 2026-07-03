import { describe, it, expect } from "bun:test";
import { deriveCartogramStory } from "../src/cartogram-story";
import { computeCartogram } from "../src/cartogram-geo";

// Four unit-square regions in a 2x2 arrangement, keyed A..D (mirrored from cartogram-geo.test.ts).
const sq = (id: string, x: number, y: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x, y],
      ],
    ],
  },
});
const features: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [sq("A", 0, 1), sq("B", 2, 1), sq("C", 0, -1), sq("D", 2, -1)],
};
// Values: B=16 (highest), D=9 (2nd), A=4 (3rd), C=1 (lowest)
const values = [
  { id: "A", value: 4 },
  { id: "B", value: 16 },
  { id: "C", value: 1 },
  { id: "D", value: 9 },
];

const layout = computeCartogram(
  { variant: "scaled", values, valueLabel: "pop" },
  features,
);

const meta = {
  title: "Population cartogram",
  description: "Regions scaled by population",
  insight: "B has the most people",
};

describe("deriveCartogramStory", () => {
  const beats = deriveCartogramStory(layout, meta);

  it("emits title + establish + reveals + takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBeGreaterThan(0);
    expect(reveals.length).toBeLessThanOrEqual(5);
  });

  it("reveals are ordered by value DESC", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    // top reveal is B (16), second is D (9)
    expect(reveals[0].highlight).toContain("B");
    expect(reveals[1].highlight).toContain("D");
  });

  it("top reveal copy contains value + valueLabel + rank descriptor + region id", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    const top = reveals[0];
    expect(top.copy).toContain("16"); // value
    expect(top.copy).toContain("pop"); // valueLabel
    expect(top.copy).toContain("highest"); // rank descriptor for rank 0
    expect(top.copy).toContain("B"); // region id
  });

  it("second reveal copy contains 2nd-highest rank descriptor", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[1].copy).toContain("2nd highest");
  });

  it("highlight carries the region id", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].highlight).toEqual(["B"]);
  });

  it("reveal camera span >= 50% of the data extent", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    const [fw, fs, fe, fn] = layout.bounds;
    const fullW = fe - fw;
    const fullH = fn - fs;
    for (const rev of reveals) {
      const [w, s, e, n] = rev.camera;
      expect(e - w).toBeGreaterThanOrEqual(fullW * 0.5 - 1e-6);
      expect(n - s).toBeGreaterThanOrEqual(fullH * 0.5 - 1e-6);
    }
  });

  it("reveal has dim:true", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    for (const rev of reveals) {
      expect(rev.dim).toBe(true);
    }
  });

  it("caps reveals at maxReveals", () => {
    const capped = deriveCartogramStory(layout, meta, { maxReveals: 1 });
    const reveals = capped.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(1);
  });

  it("title beat uses full bounds", () => {
    expect(beats[0].camera).toEqual(layout.bounds);
  });

  it("takeaway beat uses full bounds with insight text", () => {
    const takeaway = beats[beats.length - 1];
    expect(takeaway.camera).toEqual(layout.bounds);
    expect(takeaway.copy).toBe(meta.insight);
  });

  it("is deterministic (no Date.now / Math.random)", () => {
    const again = deriveCartogramStory(layout, meta);
    expect(JSON.stringify(again)).toBe(JSON.stringify(beats));
  });
});
