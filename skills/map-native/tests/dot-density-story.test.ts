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

// "mostly" is an adverb this deriver GENERATES — furniture, and it was an English literal
// inside the caption. The CATEGORY it introduces is data and stays verbatim.
describe("deriveDotDensityStory — the dominant-category clause is localized", () => {
  const categorized = {
    ...layout,
    hasCategories: true,
    legend: [{ category: "solaire", color: "#2171b5" }],
    regions: layout.regions.map((r) => ({
      ...r,
      groups: r.groups.map((g) => ({ ...g, color: "#2171b5" })),
    })),
  };
  const firstReveal = (lang: string | undefined) =>
    deriveDotDensityStory(categorized as typeof layout, {
      title: "Where the people are",
      unit: "people",
      lang,
    }).filter((b) => b.kind === "reveal")[0];

  it("still reads 'mostly' when no language is declared", () => {
    expect(firstReveal(undefined).copy).toContain("mostly solaire");
  });

  it("leaks no English adverb into a French, German or Italian caption", () => {
    expect(firstReveal("fr").copy).toContain("majoritairement solaire");
    expect(firstReveal("de").copy).toContain("überwiegend solaire");
    expect(firstReveal("it").copy).toContain("prevalentemente solaire");
    for (const lang of ["fr", "de", "it"])
      expect(firstReveal(lang).copy).not.toMatch(/mostly/);
  });
});

// `x.name` was `properties.name ?? key` — a `??`, which does not catch an empty string the way
// choropleth's own label path does, so the caption rendered "— 40k people". Fixed at the LOOKUP,
// not at the composer: unlike a locator's value or a symbol point's label, there IS a next rung
// to fall to (the join key), so a blank name is a resolution that stopped early, not a half of
// the caption that was never going to exist. (The locator defect's mirror — see
// symbol-story.test.ts for the case that genuinely has no fallback.)
describe("deriveDotDensityStory — a region whose name resolves to empty", () => {
  it("never opens a caption on a dangling separator", () => {
    const blank = {
      ...layout,
      regions: layout.regions.map((r) => ({
        ...r,
        feature: {
          ...r.feature,
          properties: { ...(r.feature.properties ?? {}), name: "" },
        },
      })),
    };
    const beats = deriveDotDensityStory(blank as typeof layout, {
      title: "Where the people are",
      unit: "people",
    });
    for (const b of beats.filter((x) => x.kind === "reveal")) {
      expect(b.copy).not.toMatch(/^\s*[—–]/);
      expect(b.callout!.text).not.toMatch(/^\s*[—–]/);
    }
  });
});
