import { describe, it, expect } from "bun:test";
import type * as maptilersdk from "@maptiler/sdk";
import {
  stagedByKey,
  AREAL_TIMELINE_OPTS,
  makeStoryMeta,
  addSubjectEmphasisLayers,
} from "./story-choreography.ts";

describe("stagedByKey", () => {
  it("returns a staged entrance per key, keyed by trigger frame", () => {
    const triggers = new Map([
      ["A", 30],
      ["B", 120],
    ]);
    const m = stagedByKey(triggers, 30, 30, 0.9); // frame 30: A just triggered (ls=0), B not yet
    expect(m.get("A")!.borderProgress).toBe(0); // ls=0 → border not started
    expect(m.get("B")!.borderProgress).toBe(0); // ls<0 → clamped 0
    const later = stagedByKey(triggers, 30 + 30 * 5, 30, 0.9); // A at ls=5s → fully entered
    expect(later.get("A")!.borderProgress).toBeCloseTo(1, 5);
    expect(later.get("A")!.fillOpacity).toBeCloseTo(0.9, 5);
    expect(later.get("A")!.labelReveal).toBeCloseTo(1, 5);
  });
});

describe("AREAL_TIMELINE_OPTS", () => {
  it("carries the tuned revealHold + move", () => {
    expect(AREAL_TIMELINE_OPTS.revealHold).toBe(3.0);
    expect(AREAL_TIMELINE_OPTS.move).toBe(1.3);
  });
});

describe("makeStoryMeta", () => {
  it("builds a calculateMetadata fn from a frame computer", () => {
    const meta = makeStoryMeta(() => 456);
    expect(meta({ props: { config: {} } })).toEqual({ durationInFrames: 456 });
  });
});

// Fake map recorder — addSubjectEmphasisLayers only ever calls addSource/addLayer,
// so a minimal recorder (cast to maptilersdk.Map) is enough to observe which
// source/layer ids it builds without a real MapLibre instance.
function makeFakeMap() {
  const sourceIds: string[] = [];
  const layerIds: string[] = [];
  const fake = {
    addSource: (id: string) => {
      sourceIds.push(id);
    },
    addLayer: (layer: { id: string }) => {
      layerIds.push(layer.id);
    },
  };
  return { map: fake as unknown as maptilersdk.Map, sourceIds, layerIds };
}

const FEATURE_FOR = () =>
  ({ type: "FeatureCollection", features: [] }) as GeoJSON.FeatureCollection;

describe("addSubjectEmphasisLayers", () => {
  it("bloom:true (default) creates both a bloom and a trail source+layer per key", () => {
    const { map, sourceIds, layerIds } = makeFakeMap();
    addSubjectEmphasisLayers(map, ["A"], {
      idPrefix: "choro",
      featureFor: FEATURE_FOR,
      colorFor: () => "#ff0000",
      dark: false,
    });
    expect(sourceIds).toEqual(["choro-bloom-A", "choro-trail-A"]);
    expect(layerIds).toEqual(["choro-bloom-A", "choro-trail-A"]);
  });

  it("bloom:false creates only the trail source+layer, no bloom", () => {
    const { map, sourceIds, layerIds } = makeFakeMap();
    addSubjectEmphasisLayers(map, ["A"], {
      idPrefix: "dotdensity",
      featureFor: FEATURE_FOR,
      colorFor: () => "#ff0000",
      dark: false,
      bloom: false,
    });
    expect(sourceIds).toEqual(["dotdensity-trail-A"]);
    expect(layerIds).toEqual(["dotdensity-trail-A"]);
    expect(sourceIds.some((id) => id.includes("bloom"))).toBe(false);
  });
});
