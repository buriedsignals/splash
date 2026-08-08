// A SUPERLATIVE MUST BE TRUE OF THE DATA, NOT OF A WALK'S POSITION.
//
// Measured on built pages, 2026-08-08 (docs/splash/proofs/2026-08-08-map-closing-captions §4a,
// §4b — the renders those measurements were read off are in that folder). The scrolly caption
// engine composed its rank descriptor from a beat's POSITION among the reveals — the last reveal
// got "the lowest", the first got "the highest of the N shown" — which is honest only for
// choropleth, whose `magnitudeRevealRows` deliberately appends the data's TRUE tail. The other
// four types walk a plain top-N, so their last beat is merely the last one visited. Verbatim,
// from the pages:
//
//   symbol       "Rome — 67$bn, the lowest"            ← Amsterdam, 52$bn, drawn on the same map
//   hex-grid     "#5 hexagon — 15 points, the lowest"  ← of 62 hexagons
//   cartogram    "Denmark — 64, the lowest"            ← of 18 cells
//   dot-density  "Netherlands — 18M, the highest of the 14 shown"  … then UK 67M, Germany 84M
//                "Italy — 59M, the lowest"             ← Belgium, 12M, on the same page
//
// THE RULE, one place, every type: rank language comes from the tags the DERIVER declared
// (`Beat.rank` / `Beat.rankRole`), never from position — `magnitudeRankTags` is where a deriver
// answers "what rank may I claim?", and `rankClaimViolations` is the mechanical check that the
// answer is true of the data. A walk that ranked nothing, or ranked something OTHER than the
// number its caption prints (dot-density orders by density), declares nothing and gets no rank
// language at all.
//
// These tests run the REAL derivers and the REAL caption engine over fixtures built so that the
// walk's last beat is NOT the minimum — the exact shape the defect needs to appear.
import { describe, it, expect } from "bun:test";
import {
  magnitudeRankTags,
  rankClaimViolations,
  type Beat,
} from "../src/map-story";
import { deriveSymbolStory } from "../src/symbol-story";
import { deriveCartogramStory } from "../src/cartogram-story";
import { deriveHexGridStory } from "../src/hex-grid-story";
import { deriveDotDensityStory } from "../src/dot-density-story";
import { mapStoryToChapters } from "../../scrolly/src/chapters";
import type { HexGridLayout } from "../src/hex-grid-geo";
import type { CartogramLayout } from "../src/cartogram-geo";
import type { DotDensityLayout } from "../src/dot-density-geo";

const revealProse = (beats: Beat[], regionsWithData: number, lang?: string) =>
  mapStoryToChapters(beats, {
    title: "T",
    description: "D",
    regionsWithData,
    lang,
  })
    .steps.filter(
      (s) => typeof s.ref === "number" && beats[s.ref].kind === "reveal",
    )
    .map((s) => s.prose);

// ---------------------------------------------------------------------------
// The declaration helper itself.
// ---------------------------------------------------------------------------
describe("magnitudeRankTags", () => {
  it("calls the leader rank 1 and only the LAST subject of the full ordering the tail", () => {
    expect(magnitudeRankTags(0, 6)).toEqual({
      pattern: "magnitude",
      rank: 1,
      rankRole: "leader",
    });
    expect(magnitudeRankTags(4, 6)).toEqual({
      pattern: "magnitude",
      rank: 5,
      rankRole: "leader",
    });
    expect(magnitudeRankTags(5, 6)).toEqual({
      pattern: "magnitude",
      rank: 6,
      rankRole: "tail",
    });
  });

  it("declares nothing for a lone subject — one value is not a distribution", () => {
    expect(magnitudeRankTags(0, 1)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// The mechanical check: does a declared rank hold against the whole data?
// ---------------------------------------------------------------------------
describe("rankClaimViolations", () => {
  const subjects = [
    { name: "London", value: 296 },
    { name: "Paris", value: 181 },
    { name: "Rome", value: 67 },
    { name: "Amsterdam", value: 52 },
  ];
  const reveal = (name: string, tags: Partial<Beat>): Beat => ({
    kind: "reveal",
    camera: [0, 0, 1, 1],
    highlight: [name],
    dim: true,
    callout: { region: name, name, value: "x", text: name },
    copy: name,
    ...tags,
  });

  it("passes a walk whose declared ranks match the data's own ordering", () => {
    expect(
      rankClaimViolations(
        [
          reveal("London", magnitudeRankTags(0, 4)),
          reveal("Paris", magnitudeRankTags(1, 4)),
        ],
        subjects,
      ),
    ).toEqual([]);
  });

  it("catches a TAIL claimed by a beat that is not the minimum — the measured defect", () => {
    const v = rankClaimViolations(
      [reveal("Rome", { pattern: "magnitude", rank: 3, rankRole: "tail" })],
      subjects,
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("Rome");
    expect(v[0]).toContain("tail");
  });

  it("catches a LEADER claimed by a beat that is not the maximum", () => {
    const v = rankClaimViolations(
      [reveal("Paris", { pattern: "magnitude", rank: 1, rankRole: "leader" })],
      subjects,
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("Paris");
  });

  it("catches a rank that disagrees with the subject's place in the ordering", () => {
    const v = rankClaimViolations(
      [reveal("Rome", { pattern: "magnitude", rank: 2, rankRole: "leader" })],
      subjects,
    );
    expect(v).toHaveLength(1);
  });

  it("has nothing to say about a walk that declared no rank", () => {
    expect(rankClaimViolations([reveal("Rome", {})], subjects)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// symbol — the page the defect was measured on, reproduced from the real deriver.
// ---------------------------------------------------------------------------
describe("symbol: a top-N walk that stops short of the minimum", () => {
  // The shipped sample, verbatim: six cities, a cap of five reveals — so Amsterdam (52) is
  // DRAWN but never walked, and Rome (67) is the walk's last beat without being the map's
  // smallest circle.
  const points = [
    { lon: -0.1276, lat: 51.5072, value: 296, label: "London" },
    { lon: 2.3522, lat: 48.8566, value: 181, label: "Paris" },
    { lon: -3.7038, lat: 40.4168, value: 124, label: "Madrid" },
    { lon: 13.405, lat: 52.52, value: 88, label: "Berlin" },
    { lon: 12.4964, lat: 41.9028, value: 67, label: "Rome" },
    { lon: 4.9041, lat: 52.3676, value: 52, label: "Amsterdam" },
  ];
  const subjects = points.map((p) => ({ name: p.label, value: p.value }));

  it("never calls the walk's last beat the lowest — Amsterdam is on the same map", () => {
    const beats = deriveSymbolStory(points, {
      title: "T",
      insight: "",
      unit: "$bn",
    });
    const prose = revealProse(beats, points.length);
    expect(prose.some((p) => p.includes("the lowest"))).toBe(false);
    expect(prose[prose.length - 1]).toBe("Rome — 67$bn, the fifth");
  });

  it("states the leader against every circle drawn, and every rank it declares is true", () => {
    const beats = deriveSymbolStory(points, {
      title: "T",
      insight: "",
      unit: "$bn",
    });
    expect(revealProse(beats, points.length)[0]).toBe(
      "London — 296$bn, the highest of the 6 shown",
    );
    expect(rankClaimViolations(beats, subjects)).toEqual([]);
  });

  it("DOES call it the lowest when the walk provably reaches the minimum", () => {
    const three = points.slice(0, 2).concat(points[5]);
    const beats = deriveSymbolStory(three, {
      title: "T",
      insight: "",
      unit: "$bn",
    });
    const prose = revealProse(beats, three.length);
    expect(prose[prose.length - 1]).toBe("Amsterdam — 52$bn, the lowest");
    expect(
      rankClaimViolations(
        beats,
        three.map((p) => ({ name: p.label, value: p.value })),
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// cartogram — same data shape, same rule.
// ---------------------------------------------------------------------------
const cartoCell = (
  id: string,
  name: string,
  value: number,
  x: number,
): CartogramLayout["cells"][number] => ({
  id,
  name,
  value,
  color: "#2171b5",
  binIdx: 0,
  feature: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [x, 45],
          [x + 1, 45],
          [x + 1, 46],
          [x, 46],
          [x, 45],
        ],
      ],
    },
  },
});

describe("cartogram: a top-5 walk over more cells than it visits", () => {
  const names = [
    ["NOR", "Norway", 98],
    ["AUT", "Austria", 80],
    ["SWE", "Sweden", 75],
    ["PRT", "Portugal", 65],
    ["DNK", "Denmark", 64],
    ["CZE", "Czech Rep.", 15],
  ] as const;
  const layout: CartogramLayout = {
    cells: names.map(([id, name, v], i) => cartoCell(id, name, v, 2 + i * 2)),
    bins: [],
    variant: "grid",
    bounds: [2, 45, 14, 46],
    valueLabel: "renewable share",
    valueUnit: "",
    scaleType: "sequential",
  };
  const subjects = names.map(([, name, v]) => ({ name, value: v }));

  it("never calls Denmark the lowest — the Czech Rep. cell is drawn too", () => {
    const beats = deriveCartogramStory(layout, { title: "T" });
    const prose = revealProse(beats, layout.cells.length);
    expect(prose.some((p) => p.includes("the lowest"))).toBe(false);
    expect(prose[prose.length - 1]).toBe("Denmark — 64, the fifth");
    expect(prose[0]).toBe("Norway — 98, the highest of the 6 shown");
    expect(rankClaimViolations(beats, subjects)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// hex-grid — anonymous bins whose NAME already states the rank.
// ---------------------------------------------------------------------------
const hexCell = (
  id: number,
  value: number,
): HexGridLayout["cells"][number] => ({
  feature: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [id, 45],
          [id + 0.2, 45],
          [id + 0.2, 45.2],
          [id, 45.2],
          [id, 45],
        ],
      ],
    },
  },
  count: value,
  value,
  color: "#2171b5",
  binIdx: 0,
});

describe("hex-grid: the rank is in the bin's name, so it is stated once", () => {
  const layout: HexGridLayout = {
    cells: [18, 18, 18, 16, 15, 3].map((v, i) => hexCell(2 + i, v)),
    bins: [],
    cellSizeKm: 20,
    bounds: [2, 45, 8.2, 45.2],
    aggregate: "count",
    binShape: "hex",
    aggregateLabel: "points per hexagon",
    capped: false,
    valueUnit: "",
  };

  it("never calls the 5th densest bin the lowest, and adds no second rank", () => {
    const beats = deriveHexGridStory(layout, { title: "T" });
    const prose = revealProse(beats, layout.cells.length);
    expect(prose.some((p) => p.includes("the lowest"))).toBe(false);
    expect(prose[0]).toBe("the densest hexagon — 18 points");
    expect(prose[prose.length - 1]).toBe("#5 hexagon — 15 points");
    // A bin whose name IS its rank declares no tags — so there is nothing to be wrong about.
    expect(rankClaimViolations(beats, [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// dot-density — the walk ranks DENSITY, the caption prints the VALUE.
// ---------------------------------------------------------------------------
describe("dot-density: a walk ranked by something other than the number it prints", () => {
  const square = (x: number, w: number, name: string): GeoJSON.Feature => ({
    type: "Feature",
    properties: { name },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [x, 45],
          [x + w, 45],
          [x + w, 46],
          [x, 46],
          [x, 45],
        ],
      ],
    },
  });
  // Netherlands: small and dense. Germany: big and populous. The density order and the
  // population order disagree — exactly the shipped sample's shape.
  const layout: DotDensityLayout = {
    regions: [
      {
        key: "NLD",
        feature: square(2, 0.4, "Netherlands"),
        groups: [{ color: "#2171b5", count: 180, dots: [] }],
      },
      {
        key: "DEU",
        feature: square(4, 6, "Germany"),
        groups: [{ color: "#2171b5", count: 840, dots: [] }],
      },
    ] as unknown as DotDensityLayout["regions"],
    dotValue: 100000,
    categories: [],
    legend: [],
    bounds: [2, 45, 10, 46],
    hasCategories: false,
    capped: false,
    totalDots: 1020,
    unmatched: [],
  };

  it("walks the densest first and claims no rank over the values it prints", () => {
    const beats = deriveDotDensityStory(layout, { title: "T", unit: "" });
    const prose = revealProse(beats, layout.regions.length);
    expect(prose[0]).toBe("Netherlands — 18M");
    expect(prose[1]).toBe("Germany — 84M");
    expect(prose.some((p) => /highest|lowest|second/.test(p))).toBe(false);
    expect(rankClaimViolations(beats, [])).toEqual([]);
  });
});
