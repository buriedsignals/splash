import { describe, it, expect } from "bun:test";
import { computeChoropleth, type ChoroplethData } from "../src/choropleth-geo";
import { deriveMapStory } from "../src/map-story";

function feat(iso: string, name: string, x: number, y: number) {
  return {
    type: "Feature",
    properties: { iso_a3: iso, name },
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
  };
}
const features = {
  type: "FeatureCollection",
  features: [
    feat("NOR", "Norway", 8, 60),
    feat("DEU", "Germany", 10, 50),
    feat("POL", "Poland", 19, 52),
  ],
} as any;
const data: ChoroplethData = {
  regionKey: "code",
  valueField: "share",
  rows: [
    { code: "NOR", share: 99 },
    { code: "DEU", share: 59 },
    { code: "POL", share: 21 },
  ],
};
const meta = {
  title: "Renewables across Europe",
  insight: "North high, south low",
  unit: "%",
};

describe("deriveMapStory", () => {
  it("returns establish → reveal(max) → reveal(min) → takeaway", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual([
      "establish",
      "reveal",
      "reveal",
      "takeaway",
    ]);
    expect(beats[1].highlight).toEqual(["NOR"]); // max
    expect(beats[2].highlight).toEqual(["POL"]); // min
  });
  it("establish uses the full data bounds and the title; no dim, no callout", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const [establish] = deriveMapStory(layout, features, "iso_a3", meta);
    expect(establish.camera).toEqual(layout.bounds);
    expect(establish.copy).toBe(meta.title);
    expect(establish.dim).toBe(false);
    expect(establish.callout).toBeNull();
  });
  it("reveal beats carry a name — value callout and dim the rest", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats[1].callout).toEqual({
      region: "NOR",
      name: "Norway",
      text: "Norway — 99%",
    });
    expect(beats[1].dim).toBe(true);
    expect(beats[1].copy).toBe("Norway — 99%");
  });
  it("takeaway returns to full bounds with the insight copy", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    const last = beats[beats.length - 1];
    expect(last.kind).toBe("takeaway");
    expect(last.camera).toEqual(layout.bounds);
    expect(last.copy).toBe(meta.insight);
  });
  it("consecutive beats have distinct cameras (the camera moves)", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    for (let i = 1; i < beats.length; i++)
      expect(beats[i].camera).not.toEqual(beats[i - 1].camera);
  });
  it("emits a single reveal when only one region has data", () => {
    const one: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [{ code: "DEU", share: 59 }],
    };
    const layout = computeChoropleth(one, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual([
      "establish",
      "reveal",
      "takeaway",
    ]);
  });
  it("breaks max/min ties by ascending region key (deterministic)", () => {
    const tie: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [
        { code: "POL", share: 50 },
        { code: "NOR", share: 50 },
        { code: "DEU", share: 10 },
      ],
    };
    const layout = computeChoropleth(tie, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats[1].highlight).toEqual(["NOR"]); // first by key among the tied maxima
  });
});
