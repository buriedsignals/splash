import { describe, it, expect } from "bun:test";
import { deriveDotDensityStory } from "../src/dot-density-story";
import type { DotDensityLayout } from "../src/dot-density-geo";

// Two square regions, same size; AAA has more dots (denser).
const feat = (id: string): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id, name: id === "AAA" ? "Alphaland" : "Betaville" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
    ],
  },
});
const layout: DotDensityLayout = {
  regions: [
    {
      key: "AAA",
      feature: feat("AAA"),
      groups: [{ category: null, color: "#2171b5", count: 40, seed: 1 }],
    },
    {
      key: "BBB",
      feature: feat("BBB"),
      groups: [{ category: null, color: "#2171b5", count: 5, seed: 2 }],
    },
  ],
  dotValue: 1000,
  categories: [],
  legend: [],
  bounds: [0, 0, 4, 4],
  hasCategories: false,
  capped: false,
  totalDots: 45,
  unmatched: [],
};

describe("deriveDotDensityStory", () => {
  const beats = deriveDotDensityStory(layout, {
    title: "Where the people are",
    unit: "people",
  });
  it("emits title + establish + reveals + takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(2);
  });
  it("reveals the densest region first (AAA before BBB), value compact-formatted", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].highlight).toEqual(["AAA"]);
    expect(reveals[0].copy).toContain("Alphaland");
    // 40 dots × dotValue 1000 = 40,000 → compact "40k"
    expect(reveals[0].callout?.value).toContain("40k");
    expect(reveals[0].copy).toContain("40k");
  });
  it("caps reveals at maxReveals", () => {
    const capped = deriveDotDensityStory(
      layout,
      { title: "Where the people are" },
      { maxReveals: 1 },
    );
    expect(capped.filter((b) => b.kind === "reveal").length).toBe(1);
  });
});
