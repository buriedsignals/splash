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
  it("returns title → establish → reveal(max) → reveal(min) → takeaway", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual([
      "title",
      "establish",
      "reveal",
      "reveal",
      "takeaway",
    ]);
    expect(beats[2].highlight).toEqual(["NOR"]); // max (was beats[1])
    expect(beats[3].highlight).toEqual(["POL"]); // min (was beats[2])
  });
  it("title beat uses meta.title as copy; establish beat has empty copy", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    const [title, establish] = beats;
    expect(title.kind).toBe("title");
    expect(title.copy).toBe(meta.title);
    expect(title.camera).toEqual(layout.bounds);
    expect(title.dim).toBe(false);
    expect(title.callout).toBeNull();
    expect(establish.kind).toBe("establish");
    expect(establish.copy).toBe("");
    expect(establish.camera).toEqual(layout.bounds);
    expect(establish.dim).toBe(false);
    expect(establish.callout).toBeNull();
  });
  it("first reveal (beats[2]) carries a name — value callout and dims the rest", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats[2].callout).toEqual({
      region: "NOR",
      name: "Norway",
      text: "Norway — 99%",
    });
    expect(beats[2].dim).toBe(true);
    expect(beats[2].copy).toBe("Norway — 99%");
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
    // title and establish share layout.bounds — that's expected, the reveal beats differ.
    // Assert ≥2 distinct cameras across all beats.
    const cameras = new Set(beats.map((b) => JSON.stringify(b.camera)));
    expect(cameras.size).toBeGreaterThanOrEqual(2);
    // Reveal beats must differ from establish.
    for (let i = 2; i < beats.length - 1; i++) {
      expect(beats[i].camera).not.toEqual(layout.bounds);
    }
  });
  it("emits title → establish → reveal → takeaway when only one region has data", () => {
    const one: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [{ code: "DEU", share: 59 }],
    };
    const layout = computeChoropleth(one, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual([
      "title",
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
    expect(beats[2].highlight).toEqual(["NOR"]); // first by key among the tied maxima (was beats[1])
  });
});
