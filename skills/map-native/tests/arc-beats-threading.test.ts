import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  unsupportedArcBeatsErrors,
  ARC_CAPABLE_MAP_TYPES,
} from "../src/map-arc";
import { applyMapArc, deriveMapStory } from "../src/map-story";
import { scrollyStepCount } from "../src/route-story";
import { computeChoropleth } from "../src/choropleth-geo";
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
    "components/ChoroplethScrolly.tsx", // scrolly
    "components/SymbolScrolly.tsx", // scrolly
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

describe("Remotion's calculateMetadata sizers forward the arc too", () => {
  // Root.tsx cannot be imported under a test (remotion + module-scope MapTiler key), and what
  // went wrong is a missing property in an object literal — same guard shape as above.
  it("storyMeta and symbolStoryMeta both put arcBeats in the deriver meta", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "remotion", "src", "Root.tsx"),
      "utf8",
    );
    expect(source.match(/arcBeats:\s*cfg\.arcBeats/g) ?? []).toHaveLength(2);
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

  it("is silent for the two arc-capable types", () => {
    for (const type of ARC_CAPABLE_MAP_TYPES)
      expect(unsupportedArcBeatsErrors({ arcBeats: plan }, type)).toEqual([]);
  });

  it("is silent when no plan was submitted", () => {
    expect(unsupportedArcBeatsErrors({}, "hex-grid")).toEqual([]);
  });

  it("refuses by name, and names the way out", () => {
    const errors = unsupportedArcBeatsErrors({ arcBeats: plan }, "cartogram");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("arcBeats");
    expect(errors[0]).toContain("cartogram");
    // The refusal has to say which types DO walk an arc — otherwise it is a dead end.
    for (const type of ARC_CAPABLE_MAP_TYPES) expect(errors[0]).toContain(type);
  });

  it("refuses an EMPTY plan too — an empty array is still a field the render ignores", () => {
    expect(unsupportedArcBeatsErrors({ arcBeats: [] }, "locator")).toHaveLength(
      1,
    );
  });
});
