import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  unsupportedArcBeatsErrors,
  ARC_CAPABLE_MAP_TYPES,
} from "../src/map-arc";
import { applyMapArc, deriveMapStory, type MapArcBeat } from "../src/map-story";
import { scrollyStepCount } from "../src/route-story";
import { computeChoropleth } from "../src/choropleth-geo";
import { deriveLocatorStory } from "../src/locator-story";
import type { LocatorMarker } from "../src/locator-geo";
import { deriveCartogramStory } from "../src/cartogram-story";
import { computeCartogram } from "../src/cartogram-geo";
import { mapStoryToChapters } from "../../scrolly/src/chapters";
import world from "../assets/geo/world.geojson" assert { type: "json" };

// The engine's own four story components had the defect a QA sweep found in the scrolly: they
// compose a `meta` for deriveMapStory/deriveSymbolStory and never put `config.arcBeats` in it,
// so a journalist-confirmed walk that PASSED validation was rendered as the salience default —
// on the video track as well as the scrolly one. Guarded at the source, because what went
// wrong is a missing property in an object literal and these components cannot be imported
// under a test (module-scope MapTiler key guard).

const SRC = join(import.meta.dir, "..", "src");

describe("map-native story components forward the confirmed claim-arc", () => {
  const files = [
    "components/ChoroplethStory.tsx", // video
    "components/SymbolStory.tsx", // video
    "components/LocatorStory.tsx", // video
    "components/CartogramStory.tsx", // video
    "components/ChoroplethScrolly.tsx", // scrolly
    "components/SymbolScrolly.tsx", // scrolly
    "components/LocatorScrolly.tsx", // scrolly
    "components/CartogramScrolly.tsx", // scrolly
  ];
  for (const file of files) {
    it(`${file} puts arcBeats in the deriver meta`, () => {
      const source = readFileSync(join(SRC, file), "utf8");
      expect(source).toMatch(/arcBeats:\s*config\.arcBeats/);
    });
  }
});

// ---------------------------------------------------------------------------
// The SIZERS mirror the derivation, and had to be threaded with it.
//
// scrollyStepCount (route-story.ts) and Root.tsx's storyMeta/symbolStoryMeta are
// calculateMetadata functions: they re-derive the walk purely to compute a composition's
// duration, and their comments say they exist so "the counts match exactly". Threading the arc
// into the RENDERER alone broke that agreement in the worst direction — the components built
// their phases from the six confirmed beats while the duration was still sized from the
// salience walk, so the mp4 was sized for 7 steps and cut before the journalist's `turn` and
// `payoff`. An arc SHORTER than the salience walk gives the frozen tail instead. Both are
// worse than either side being wrong alone, which is the whole reason the mirror exists.
// ---------------------------------------------------------------------------

describe("the composition sizers agree with the walk that renders", () => {
  // The render proof's fixture: 8 rows of data, a 6-region confirmed arc that is NOT the
  // salience order and NOT the salience LENGTH (salience caps at 3 leaders + tail).
  const ROWS = [
    { code: "NOR", share: 99 },
    { code: "SWE", share: 68 },
    { code: "DEU", share: 59 },
    { code: "GBR", share: 48 },
    { code: "ESP", share: 44 },
    { code: "ITA", share: 41 },
    { code: "FRA", share: 27 },
    { code: "POL", share: 21 },
  ];
  const ARC = [
    { region: "NOR", role: "establish" as const, text: "un" },
    { region: "SWE", role: "build" as const, text: "deux" },
    { region: "POL", role: "build" as const, text: "trois" },
    { region: "DEU", role: "build" as const, text: "quatre" },
    { region: "FRA", role: "turn" as const, text: "cinq" },
    { region: "ITA", role: "payoff" as const, text: "six" },
  ];
  const base = {
    title: "Le renouvelable, du nord au sud",
    description: "Part du renouvelable, 2024",
    valueUnit: "%",
    basemap: "world",
    regionKey: "code",
    valueField: "share",
    lang: "fr",
    rows: ROWS,
  };

  // What the RENDERER walks — the components' own derivation, reproduced here.
  function renderedSteps(config: Record<string, unknown>): number {
    const layout = computeChoropleth(
      config as never,
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      { bins: 5, scaleType: "sequential" },
    );
    const beats = deriveMapStory(
      layout,
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      {
        title: base.title,
        insight: base.title,
        unit: base.valueUnit,
        lang: base.lang,
        arcBeats: config.arcBeats as never,
      },
    );
    return mapStoryToChapters(beats, {
      title: base.title,
      description: base.description,
      regionsWithData: layout.joined.filter((j) => j.value !== null).length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the salience walk's", () => {
    const config = { ...base, arcBeats: ARC };
    // title + establish + 6 confirmed reveals + takeaway, minus the beats mapStoryToChapters
    // drops — whatever that number is, both sides must say it.
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the salience walk's", () => {
    // Without this the assertion above would pass on a fixture where the two happen to agree,
    // which is exactly the state the branch shipped in before the review caught it.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the salience sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

// Same class of proof for locator, added when the locator deriver gained arc support
// (map-storyboard-and-video-geography, Task 1). LocatorStory.tsx/LocatorScrolly.tsx both
// literally call deriveLocatorStory(config.markers, meta) then mapStoryToChapters(beats, ...)
// (see LocatorScrolly.tsx's per-beat camera-solution build) — reproduced here as
// `renderedSteps`, exactly like the choropleth block above.
describe("the locator sizer agrees with the walk that renders", () => {
  const MARKERS: LocatorMarker[] = [
    { lon: 6.1, lat: 46.2, label: "Geneva" },
    { lon: 6.6, lat: 46.5, label: "Lausanne" },
    { lon: 8.5, lat: 47.4, label: "Zurich" },
    { lon: 7.4, lat: 46.9, label: "Bern" },
    { lon: 4.8, lat: 45.7, label: "Chambéry" },
  ];
  const ARC: MapArcBeat[] = [
    { region: "Zurich", role: "establish", text: "Zurich anchors it." },
    { region: "Bern", role: "build", text: "Bern widens it." },
    { region: "Geneva", role: "payoff", text: "Geneva closes it." },
  ];
  const base = {
    type: "locator" as const,
    title: "Five places, in the order the story needs",
    description: "Five Swiss/French places",
    basemap: "world",
    markers: MARKERS,
  };

  function renderedSteps(config: Record<string, unknown>): number {
    const beats = deriveLocatorStory(config.markers as LocatorMarker[], {
      title: config.title as string,
      description: config.description as string | undefined,
      insight:
        (config.insight as string | undefined) ?? (config.title as string),
      arcBeats: config.arcBeats as MapArcBeat[] | undefined,
    });
    return mapStoryToChapters(beats, {
      title: config.title as string,
      description: config.description as string | undefined,
      regionsWithData: (config.markers as unknown[]).length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the salience walk's", () => {
    const config = { ...base, arcBeats: ARC };
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the salience walk's", () => {
    // 3 confirmed reveals vs. 5 salience reveals (all 5 markers, few-annotated, default cap) —
    // the two walks CANNOT accidentally agree here, so this is a real lever.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the salience sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

// Same class of proof for cartogram, added when the cartogram deriver gained arc support
// (map-storyboard-and-video-geography, Task 2). CartogramStory.tsx/CartogramScrolly.tsx both
// literally call deriveCartogramStory(layout, meta) then mapStoryToChapters(beats, ...) —
// reproduced here as `renderedSteps`, exactly like the choropleth/locator blocks above.
describe("the cartogram sizer agrees with the walk that renders", () => {
  // Real ISO codes (world.geojson's iso_a3 join, cartogram's default joinKey) — same
  // countries the choropleth sizer block above already exercises.
  const VALUES = [
    { id: "NOR", value: 99 },
    { id: "SWE", value: 68 },
    { id: "DEU", value: 59 },
    { id: "GBR", value: 48 },
    { id: "ESP", value: 44 },
    { id: "ITA", value: 41 },
    { id: "FRA", value: 27 },
    { id: "POL", value: 21 },
  ];
  const ARC: MapArcBeat[] = [
    { region: "DEU", role: "establish", text: "Germany anchors it." },
    { region: "POL", role: "build", text: "Poland widens it." },
    { region: "NOR", role: "payoff", text: "Norway closes it." },
  ];
  const base = {
    type: "cartogram" as const,
    title: "Eight regions, in the order the story needs",
    description: "Eight European cartogram cells",
    basemap: "world",
    values: VALUES,
  };

  function renderedSteps(config: Record<string, unknown>): number {
    const layout = computeCartogram(
      config as never,
      world as unknown as GeoJSON.FeatureCollection,
    );
    const beats = deriveCartogramStory(layout, {
      title: config.title as string,
      description: config.description as string | undefined,
      insight:
        (config.insight as string | undefined) ?? (config.title as string),
      arcBeats: config.arcBeats as MapArcBeat[] | undefined,
    });
    return mapStoryToChapters(beats, {
      title: config.title as string,
      description: config.description as string | undefined,
      regionsWithData: layout.cells.length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the value-ranked walk's", () => {
    const config = { ...base, arcBeats: ARC };
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the value-ranked walk's", () => {
    // 3 confirmed reveals vs. 5 value-ranked reveals (all 8 regions, default cap) — the two
    // walks CANNOT accidentally agree here, so this is a real lever.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the value-ranked sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

describe("Remotion's calculateMetadata sizers forward the arc too", () => {
  // Root.tsx cannot be imported under a test (remotion + module-scope MapTiler key), and what
  // went wrong is a missing property in an object literal — same guard shape as above.
  it("storyMeta, symbolStoryMeta, locatorStoryMeta and cartogramStoryMeta all put arcBeats in the deriver meta", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "remotion", "src", "Root.tsx"),
      "utf8",
    );
    expect(source.match(/arcBeats:\s*cfg\.arcBeats/g) ?? []).toHaveLength(4);
  });
});

describe("applyMapArc marks its beats as authored", () => {
  it("stamps every arc reveal, so a caption composer can tell it from a derived one", () => {
    const beats = applyMapArc(
      [
        { region: "A", role: "establish", text: "one" },
        { region: "B", role: "payoff", text: "two" },
      ],
      (region) => ({
        camera: [0, 0, 1, 1],
        highlight: [region],
        name: region,
        value: "1",
      }),
    );
    expect(beats.map((b) => b.authored)).toEqual([true, true]);
    // The claim is the copy — never a derived "name — value".
    expect(beats.map((b) => b.copy)).toEqual(["one", "two"]);
  });
});

describe("unsupportedArcBeatsErrors", () => {
  const plan = [{ region: "A", role: "establish" as const, text: "a" }];

  it("is silent for every arc-capable type", () => {
    for (const type of ARC_CAPABLE_MAP_TYPES)
      expect(unsupportedArcBeatsErrors({ arcBeats: plan }, type)).toEqual([]);
  });

  it("is silent when no plan was submitted", () => {
    expect(unsupportedArcBeatsErrors({}, "hex-grid")).toEqual([]);
  });

  it("refuses by name, and names the way out", () => {
    // "cartogram" used to be the example here — it moved to the capable side in
    // map-storyboard-and-video-geography Task 2, so a non-capable type stands in now.
    const errors = unsupportedArcBeatsErrors({ arcBeats: plan }, "route");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("arcBeats");
    expect(errors[0]).toContain("route");
    // The refusal has to say which types DO walk an arc — otherwise it is a dead end.
    for (const type of ARC_CAPABLE_MAP_TYPES) expect(errors[0]).toContain(type);
  });

  it("refuses an EMPTY plan too — an empty array is still a field the render ignores", () => {
    // "locator" used to be the example here — it moved to the capable side in
    // map-storyboard-and-video-geography Task 1, so a non-capable type stands in now.
    expect(
      unsupportedArcBeatsErrors({ arcBeats: [] }, "dot-density"),
    ).toHaveLength(1);
  });
});
