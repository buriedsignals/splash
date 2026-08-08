// THE MAP FAMILY'S CLOSING CAPTION — one rule, six types, both delivery paths.
//
// Measured before this existed (2026-08-08, on built pages and rendered video frames — see
// docs/splash/proofs/2026-08-08-map-closing-captions/): a symbol, hex-grid, cartogram,
// dot-density or locator story with no `insight` closed its scrolly on its own DESCRIPTION,
// verbatim ("Venture funding raised by startups headquartered in each city, 2024" as both the
// opening and the closing card), and closed its video on NO CAPTION AT ALL — the takeaway
// beat's `copy` was `closingInsight(...)`, which is "" when there is no distinct editorial line,
// and every consumer of "" falls somewhere unhelpful.
//
// These tests pin the derived closer for each of the five, in each of the four languages the
// story-copy table covers, and they pin the DELIBERATE silences: a type with nothing honest left
// to say must return "" on purpose, not compose a claim its data does not support.
import { describe, it, expect } from "bun:test";
import {
  closingCaption,
  deriveBinTakeawayCopy,
  deriveDotTakeawayCopy,
  derivePlacesTakeawayCopy,
  deriveTakeawayCopy,
} from "../src/map-story";
import { deriveSymbolStory } from "../src/symbol-story";
import { deriveHexGridStory } from "../src/hex-grid-story";
import { deriveCartogramStory } from "../src/cartogram-story";
import { deriveDotDensityStory } from "../src/dot-density-story";
import { deriveLocatorStory } from "../src/locator-story";
import type { HexGridLayout } from "../src/hex-grid-geo";
import type { CartogramLayout } from "../src/cartogram-geo";
import type { DotDensityLayout } from "../src/dot-density-geo";

const lastCopy = (beats: { kind: string; copy: string }[]) =>
  beats[beats.length - 1].copy;

// ---------------------------------------------------------------------------
// The shared entry: insight first, derived closer second.
// ---------------------------------------------------------------------------
describe("closingCaption", () => {
  it("prefers a journalist's insight when it is genuinely a different sentence", () => {
    expect(
      closingCaption("Half the map has none", "Where funding lands", "6 sites"),
    ).toBe("Half the map has none");
  });

  it("falls through to the derived closer when the insight is the title again", () => {
    expect(
      closingCaption("Where funding lands", "Where funding lands", "6 sites"),
    ).toBe("6 sites");
  });

  it("falls through when there is no insight at all — the loop-assembled shape", () => {
    expect(closingCaption(undefined, "Where funding lands", "6 sites")).toBe(
      "6 sites",
    );
  });

  it("returns the empty string when neither exists — a deliberate silence, not a title echo", () => {
    expect(closingCaption(undefined, "Where funding lands", "")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// symbol + cartogram reuse the choropleth closer — same data shape (named subjects,
// one number each), so the same honest sentence: leader, tail, and the fold gap.
// ---------------------------------------------------------------------------
describe("deriveTakeawayCopy with a nameless subject", () => {
  it("drops the separator rather than opening on one (a symbol point's label is optional)", () => {
    expect(
      deriveTakeawayCopy({
        pattern: "magnitude",
        maxName: "",
        maxValue: 220,
        maxLabel: "220 MW",
        minName: "",
        minValue: 44,
        minLabel: "44 MW",
      }),
    ).toBe("220 MW, 44 MW — a 5-fold gap");
  });
});

describe("deriveSymbolStory closing caption", () => {
  const points = [
    { lon: -0.13, lat: 51.5, value: 296, label: "London" },
    { lon: 2.35, lat: 48.86, value: 181, label: "Paris" },
    { lon: 4.9, lat: 52.37, value: 52, label: "Amsterdam" },
  ];

  it("closes on the leader, the tail and the gap — never on the description", () => {
    const beats = deriveSymbolStory(points, {
      title: "London leads Europe's tech-funding map",
      unit: "$bn",
    });
    expect(lastCopy(beats)).toBe(
      "London: 296$bn, Amsterdam: 52$bn — a 6-fold gap",
    );
  });

  it("reaches the tail even when the reveal walk is capped short of it", () => {
    const beats = deriveSymbolStory(
      points,
      { title: "T", unit: "$bn" },
      { maxReveals: 1 },
    );
    // One reveal (London) — but the map still DRAWS Amsterdam, so the close may name it.
    expect(beats.filter((b) => b.kind === "reveal")).toHaveLength(1);
    expect(lastCopy(beats)).toBe(
      "London: 296$bn, Amsterdam: 52$bn — a 6-fold gap",
    );
  });

  it("localizes the words, the separator and the number", () => {
    const beats = deriveSymbolStory(points, {
      title: "T",
      unit: "$bn",
      lang: "fr",
    });
    expect(lastCopy(beats)).toBe(
      "London : 296 $bn, Amsterdam : 52 $bn — un écart de 1 à 6",
    );
  });

  it("keeps a journalist's own closing line", () => {
    const beats = deriveSymbolStory(points, {
      title: "T",
      insight: "Three cities took nine tenths of it",
      unit: "$bn",
    });
    expect(lastCopy(beats)).toBe("Three cities took nine tenths of it");
  });

  it("stays silent for a single point — one subject has no spread to close on", () => {
    const beats = deriveSymbolStory([points[0]], { title: "T", unit: "$bn" });
    expect(lastCopy(beats)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// hex-grid: anonymous bins, so the honest facts are the PEAK and HOW MANY bins.
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
const hexLayout = (
  cells: HexGridLayout["cells"],
  over: Partial<HexGridLayout> = {},
): HexGridLayout => ({
  cells,
  bins: [],
  cellSizeKm: 20,
  bounds: [2, 45, 6.2, 45.2],
  aggregate: "count",
  binShape: "hex",
  aggregateLabel: "points per hexagon",
  capped: false,
  valueUnit: "",
  ...over,
});

describe("deriveBinTakeawayCopy", () => {
  it("states the peak and the bin count", () => {
    expect(
      deriveBinTakeawayCopy({
        peakLabel: "18 points",
        binCount: 62,
        binShape: "hex",
      }),
    ).toBe("18 points in the densest hexagon, 62 hexagons in all");
  });

  it("names a square grid's own bin", () => {
    expect(
      deriveBinTakeawayCopy({
        peakLabel: "18 points",
        binCount: 62,
        binShape: "square",
      }),
    ).toBe("18 points in the densest cell, 62 cells in all");
  });

  it("is silent for a single bin — a peak needs something to be a peak OF", () => {
    expect(
      deriveBinTakeawayCopy({
        peakLabel: "18 points",
        binCount: 1,
        binShape: "hex",
      }),
    ).toBe("");
  });

  it("localizes the noun, its article and the count", () => {
    expect(
      deriveBinTakeawayCopy({
        peakLabel: "18 points",
        binCount: 62,
        binShape: "hex",
        lang: "fr",
      }),
    ).toBe("18 points dans l'hexagone le plus dense, 62 hexagones au total");
    expect(
      deriveBinTakeawayCopy({
        peakLabel: "18 Punkte",
        binCount: 62,
        binShape: "square",
        lang: "de",
      }),
    ).toBe("18 Punkte in der dichtesten Zelle, 62 Zellen insgesamt");
    expect(
      deriveBinTakeawayCopy({
        peakLabel: "18 punti",
        binCount: 62,
        binShape: "hex",
        lang: "it",
      }),
    ).toBe("18 punti nell'esagono più denso, 62 esagoni in totale");
  });
});

describe("deriveHexGridStory closing caption", () => {
  it("closes on its own densest bin, in the aggregate's own words", () => {
    const beats = deriveHexGridStory(
      hexLayout([hexCell(2, 5), hexCell(4, 18), hexCell(6, 11)]),
      { title: "Where incidents cluster", description: "…" },
    );
    expect(lastCopy(beats)).toBe(
      "18 points in the densest hexagon, 3 hexagons in all",
    );
  });

  it("carries a mean aggregate's own value wording into the close", () => {
    const beats = deriveHexGridStory(
      hexLayout([hexCell(2, 5), hexCell(4, 18)], {
        aggregate: "mean",
        valueUnit: "kWh",
      }),
      { title: "T" },
    );
    expect(lastCopy(beats)).toBe(
      "18 kWh avg in the densest hexagon, 2 hexagons in all",
    );
  });
});

// ---------------------------------------------------------------------------
// cartogram: named cells with one value each — the choropleth closer, again.
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

describe("deriveCartogramStory closing caption", () => {
  const layout: CartogramLayout = {
    cells: [
      cartoCell("NOR", "Norway", 98, 2),
      cartoCell("AUT", "Austria", 80, 4),
      cartoCell("POL", "Poland", 21, 6),
    ],
    bins: [],
    variant: "grid",
    bounds: [2, 45, 7, 46],
    valueLabel: "renewable share",
    valueUnit: "%",
    scaleType: "sequential",
  };

  it("closes on the cell that dominates, against the one that trails", () => {
    const beats = deriveCartogramStory(layout, {
      title: "Europe's renewable share",
    });
    expect(lastCopy(beats)).toBe("Norway: 98%, Poland: 21% — a 5-fold gap");
  });

  it("localizes the gap clause and the unit spacing", () => {
    const beats = deriveCartogramStory(layout, { title: "T", lang: "de" });
    expect(lastCopy(beats)).toBe(
      "Norway: 98 %, Poland: 21 % — ein Verhältnis von 1 zu 5",
    );
  });
});

// ---------------------------------------------------------------------------
// dot-density: what one dot is worth, and how much the map draws in all.
// ---------------------------------------------------------------------------
describe("deriveDotTakeawayCopy", () => {
  it("states the dot's worth and the map-wide total", () => {
    expect(
      deriveDotTakeawayCopy({
        dotValueLabel: "50k people",
        totalLabel: "480M",
      }),
    ).toBe("one dot = 50k people, 480M in all");
  });

  it("is silent when the map drew nothing", () => {
    expect(
      deriveDotTakeawayCopy({ dotValueLabel: "50k people", totalLabel: "" }),
    ).toBe("");
  });

  it("localizes the sentence", () => {
    expect(
      deriveDotTakeawayCopy({
        dotValueLabel: "50k personnes",
        totalLabel: "480M",
        lang: "fr",
      }),
    ).toBe("un point = 50k personnes, 480M au total");
    expect(
      deriveDotTakeawayCopy({
        dotValueLabel: "50k",
        totalLabel: "480M",
        lang: "de",
      }),
    ).toBe("ein Punkt = 50k, 480M insgesamt");
    expect(
      deriveDotTakeawayCopy({
        dotValueLabel: "50k",
        totalLabel: "480M",
        lang: "it",
      }),
    ).toBe("un punto = 50k, 480M in totale");
  });
});

describe("deriveDotDensityStory closing caption", () => {
  const square = (x: number): GeoJSON.Feature => ({
    type: "Feature",
    properties: { name: `R${x}` },
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
  });
  const layout: DotDensityLayout = {
    regions: [
      {
        key: "AAA",
        feature: square(2),
        groups: [{ color: "#2171b5", count: 60, dots: [] }],
      },
      {
        key: "BBB",
        feature: square(4),
        groups: [{ color: "#2171b5", count: 40, dots: [] }],
      },
    ] as unknown as DotDensityLayout["regions"],
    dotValue: 50000,
    categories: [],
    legend: [],
    bounds: [2, 45, 5, 46],
    hasCategories: false,
    capped: false,
    totalDots: 100,
    unmatched: [],
  };

  it("closes on the dot's worth and the total the map draws", () => {
    const beats = deriveDotDensityStory(layout, { title: "T", unit: "people" });
    expect(lastCopy(beats)).toBe("one dot = 50k people, 5M in all");
  });
});

// ---------------------------------------------------------------------------
// locator: no numbers at all — how many places, and how far apart they reach.
// ---------------------------------------------------------------------------
describe("derivePlacesTakeawayCopy", () => {
  it("states the count and the span", () => {
    expect(derivePlacesTakeawayCopy({ placeCount: 5, spanKm: 6.2 })).toBe(
      "5 sites, 6 km end to end",
    );
  });

  it("drops a span that rounds to nothing rather than printing '0 km'", () => {
    expect(derivePlacesTakeawayCopy({ placeCount: 4, spanKm: 0.4 })).toBe(
      "4 sites",
    );
  });

  it("is silent for a single place — no count worth stating, no span at all", () => {
    expect(derivePlacesTakeawayCopy({ placeCount: 1, spanKm: 0 })).toBe("");
  });

  it("localizes the count word and the span", () => {
    expect(
      derivePlacesTakeawayCopy({ placeCount: 5, spanKm: 6.2, lang: "fr" }),
    ).toBe("5 sites, 6 km d'un bout à l'autre");
    expect(
      derivePlacesTakeawayCopy({ placeCount: 5, spanKm: 6.2, lang: "de" }),
    ).toBe("5 Standorte, 6 km von Ende zu Ende");
    expect(
      derivePlacesTakeawayCopy({ placeCount: 5, spanKm: 6.2, lang: "it" }),
    ).toBe("5 siti, 6 km da un capo all'altro");
  });

  it("groups a long span in the deliverable's own convention", () => {
    expect(
      derivePlacesTakeawayCopy({ placeCount: 12, spanKm: 1240.6, lang: "fr" }),
    ).toBe("12 sites, 1 241 km d'un bout à l'autre");
  });
});

describe("deriveLocatorStory closing caption", () => {
  const markers = [
    { lon: 2.2945, lat: 48.8584, label: "Eiffel Tower" },
    { lon: 2.3499, lat: 48.853, label: "Notre-Dame" },
    { lon: 2.3699, lat: 48.8503, label: "Pont d'Austerlitz" },
  ];

  it("closes on how many places it plotted and how far they reach", () => {
    const beats = deriveLocatorStory(markers, { title: "T", lang: undefined });
    expect(lastCopy(beats)).toBe("3 sites, 6 km end to end");
  });

  it("counts every plotted marker, not just the ones the walk visits", () => {
    const beats = deriveLocatorStory(
      markers,
      { title: "T", lang: undefined },
      { maxReveals: 1 },
    );
    expect(beats.filter((b) => b.kind === "reveal")).toHaveLength(1);
    expect(lastCopy(beats)).toBe("3 sites, 6 km end to end");
  });
});
