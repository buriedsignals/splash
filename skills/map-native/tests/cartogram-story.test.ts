import { describe, it, expect } from "bun:test";
import { deriveCartogramStory } from "../src/cartogram-story";
import { computeCartogram } from "../src/cartogram-geo";
import { beatsForMode, resolveRevealMode } from "../src/map-story";
import { buildTimeline } from "../src/story-timeline";
import { AREAL_TIMELINE_OPTS } from "../src/story-choreography";

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

  it("callout.name uses the cell's display name, not the bare id", () => {
    const namedFeatures: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: features.features.map((f) => ({
        ...f,
        properties: { ...f.properties, name: `Region ${f.properties!.iso_a3}` },
      })),
    };
    const namedLayout = computeCartogram(
      { variant: "scaled", values, valueLabel: "pop" },
      namedFeatures,
    );
    const namedBeats = deriveCartogramStory(namedLayout, meta);
    const top = namedBeats.filter((b) => b.kind === "reveal")[0];
    expect(top.callout!.name).toBe("Region B");
    expect(top.callout!.region).toBe("B"); // highlight/lookup key stays the id
  });

  it("callout.value appends valueUnit when the config provides one", () => {
    const unitLayout = computeCartogram(
      { variant: "scaled", values, valueLabel: "pop", valueUnit: "%" },
      features,
    );
    const unitBeats = deriveCartogramStory(unitLayout, meta);
    const top = unitBeats.filter((b) => b.kind === "reveal")[0];
    expect(top.callout!.value).toBe("16%");
  });
});

// Mode-aware duration — the same threading CartogramStory.tsx and Root.tsx's
// calculateMetadata must both apply (single source of truth), so the sequential MP4
// doesn't end with a frozen tail. Mirrors ChoroplethStory/Root.tsx's storyMeta parity.
describe("cartogram beats threaded through beatsForMode + buildTimeline(AREAL_TIMELINE_OPTS)", () => {
  const beats = deriveCartogramStory(layout, meta);

  it("sequential mode drops the establish beat, context keeps it", () => {
    const context = beatsForMode(beats, resolveRevealMode({}));
    const sequential = beatsForMode(
      beats,
      resolveRevealMode({ revealMode: "sequential" }),
    );
    expect(context.some((b) => b.kind === "establish")).toBe(true);
    expect(sequential.some((b) => b.kind === "establish")).toBe(false);
    expect(sequential.length).toBe(context.length - 1);
  });

  it("sequential total frames are shorter than context (one fewer beat + move)", () => {
    const contextFrames = buildTimeline(
      beatsForMode(beats, "context").map((b) => b.kind),
      30,
      AREAL_TIMELINE_OPTS,
    ).totalFrames;
    const sequentialFrames = buildTimeline(
      beatsForMode(beats, "sequential").map((b) => b.kind),
      30,
      AREAL_TIMELINE_OPTS,
    ).totalFrames;
    expect(sequentialFrames).toBeLessThan(contextFrames);
  });
});
