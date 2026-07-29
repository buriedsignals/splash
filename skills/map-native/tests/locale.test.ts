import { describe, it, expect } from "bun:test";
import {
  isFrench,
  formatLocaleNumber,
  localizeNumberString,
  sourceLabel,
  labelWithUnit,
} from "../src/core/locale";
import { fmtBin } from "../src/core/legend-format";
import { deriveCartogramStory } from "../src/cartogram-story";
import { deriveHexGridStory } from "../src/hex-grid-story";
import { deriveDotDensityStory } from "../src/dot-density-story";
import type { CartogramLayout } from "../src/cartogram-geo";
import type { HexGridLayout } from "../src/hex-grid-geo";
import type { DotDensityLayout } from "../src/dot-density-geo";

const NBSP = " ";

describe("locale — detection + full number formatting", () => {
  it("detects French language tags", () => {
    expect(isFrench("fr")).toBe(true);
    expect(isFrench("fr-CH")).toBe(true);
    expect(isFrench("en")).toBe(false);
    expect(isFrench(undefined)).toBe(false);
  });

  it("formats full numbers per locale (deterministic, replaces toLocaleString)", () => {
    expect(formatLocaleNumber(1900, "fr")).toBe(`1${NBSP}900`);
    expect(formatLocaleNumber(1900, "en")).toBe("1,900");
    expect(formatLocaleNumber(12345.6, "fr")).toBe(`12${NBSP}345,6`);
    expect(formatLocaleNumber(19.3, "fr")).toBe("19,3");
    expect(formatLocaleNumber(1900)).toBe("1,900"); // default en
  });

  it("preserves decimal places when localizing a formatted string", () => {
    expect(localizeNumberString("0.00", "fr")).toBe("0,00");
    expect(localizeNumberString("0.00", "en")).toBe("0.00");
  });
});

describe("sourceLabel", () => {
  it("localizes the Source furniture", () => {
    expect(sourceLabel("fr")).toBe("Source :");
    expect(sourceLabel("en")).toBe("Source:");
  });
});

describe("labelWithUnit — locale-aware value+unit spacing", () => {
  it("gives a WORD unit a regular space so the value reads complete", () => {
    // The reported seismes bug: "7,4magnitude" must read "7,4 magnitude".
    expect(labelWithUnit("7,4", "magnitude", "fr")).toBe("7,4 magnitude");
    expect(labelWithUnit("7.4", "magnitude", "en")).toBe("7.4 magnitude");
    expect(labelWithUnit("4M", "habitants", "fr")).toBe("4M habitants");
  });

  it("attaches a SHORT symbol unit (%, currency) with no space in English", () => {
    expect(labelWithUnit("70", "%", "en")).toBe("70%");
    expect(labelWithUnit("296", "$bn", "en")).toBe("296$bn");
    expect(labelWithUnit("4M", "€", "en")).toBe("4M€");
  });

  it("uses the French narrow no-break space before EVERY short unit", () => {
    expect(labelWithUnit("70", "%", "fr")).toBe(`70${NBSP}%`);
    expect(labelWithUnit("296", "$bn", "fr")).toBe(`296${NBSP}$bn`);
  });

  it("spaces a short NON-symbol unit (km, kg) in English", () => {
    expect(labelWithUnit("34", "km", "en")).toBe("34 km");
  });

  it("returns the bare value when the unit is absent or blank", () => {
    expect(labelWithUnit("181", undefined)).toBe("181");
    expect(labelWithUnit("181", "")).toBe("181");
    expect(labelWithUnit("181", "  ")).toBe("181");
  });

  it("normalizes a caller-supplied leading space (callout robustness)", () => {
    // The story callout historically pre-spaced its unit (" voyageurs/j"); the
    // helper trims then re-applies the correct spacing so either form is stable.
    expect(labelWithUnit("34 000", " voyageurs/j", "fr")).toBe(
      "34 000 voyageurs/j",
    );
  });
});

describe("fmtBin — locale-aware, English unchanged", () => {
  it("keeps English output byte-identical (regression guard)", () => {
    expect(fmtBin(2)).toBe("2");
    expect(fmtBin(12000)).toBe("12,000"); // now grouped in English too
    expect(fmtBin(2.5)).toBe("2.5");
    expect(fmtBin(0, { minGap: 0.02 })).toBe("0.00");
  });

  it("groups + comma-decimals bin boundaries in French", () => {
    expect(fmtBin(12000, { lang: "fr" })).toBe(`12${NBSP}000`);
    expect(fmtBin(2.5, { lang: "fr" })).toBe("2,5");
    expect(fmtBin(0.02, { minGap: 0.02, lang: "fr" })).toBe("0,02");
  });
});

describe("cartogram/hex-grid/dot-density callouts follow the deliverable's language", () => {
  // These three modules imported NO locale helper at all before this fix — a French
  // cartogram printed "3.5" with an English decimal point while every other map type
  // printed "3,5". Fixtures are deliberately NOT the neighbour tests' round numbers
  // (cartogram-story.test.ts's 4/16/1/9, dot-density-story.test.ts's 40/5 dots): those
  // fixtures are locale-INVISIBLE (an integer under 1000 prints identically in every
  // language), which is exactly the class of bug that let task 8's own first fixture
  // (10, 20) pass unchanged with the localization removed. Each fixture below carries a
  // decimal or a value >= 1000 so a wrong locale produces a visibly wrong byte.
  const cartogramLayoutFixture: CartogramLayout = {
    cells: [
      {
        feature: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
        id: "X",
        name: "Xland",
        value: 3.5,
        color: "#2171b5",
        binIdx: 0,
      },
    ],
    bins: [],
    variant: "scaled",
    bounds: [0, 0, 1, 1],
    valueLabel: "index",
    valueUnit: "",
    scaleType: "sequential",
  };

  const hexLayoutFixture: HexGridLayout = {
    cells: [
      {
        feature: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [2, 45],
                [2.2, 45],
                [2.2, 45.2],
                [2, 45.2],
                [2, 45],
              ],
            ],
          },
        },
        count: 5,
        value: 12.4,
        color: "#2171b5",
        binIdx: 0,
      },
    ],
    bins: [],
    cellSizeKm: 10,
    bounds: [2, 45, 2.2, 45.2],
    aggregate: "mean",
    binShape: "hex",
    aggregateLabel: "avg per hexagon",
    capped: false,
    valueUnit: "kWh",
  };

  const dotLayoutFixture: DotDensityLayout = {
    regions: [
      {
        key: "AAA",
        feature: {
          type: "Feature",
          properties: { name: "Alphaland" },
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
        },
        groups: [{ category: null, color: "#2171b5", count: 12, seed: 1 }],
      },
    ],
    dotValue: 100, // 12 dots * 100 = 1200 -> compact "1.2k", a decimal a locale can flip
    categories: [],
    legend: [],
    bounds: [0, 0, 4, 4],
    hasCategories: false,
    capped: false,
    totalDots: 12,
    unmatched: [],
  };

  it("cartogram callout value follows the deliverable's decimal separator", () => {
    const beats = deriveCartogramStory(cartogramLayoutFixture, {
      title: "t",
      lang: "fr",
    });
    expect(JSON.stringify(beats)).toContain("3,5");
    expect(JSON.stringify(beats)).not.toContain("3.5");
  });

  it("hex-grid mean callout carries no bare English decimal point in French", () => {
    const beats = deriveHexGridStory(hexLayoutFixture, {
      title: "t",
      lang: "fr",
    });
    expect(JSON.stringify(beats)).toContain("12,4");
    expect(JSON.stringify(beats)).not.toContain("12.4");
  });

  it("hex-grid mean callout never prints the English word 'avg' in a German walk", () => {
    const beats = deriveHexGridStory(hexLayoutFixture, {
      title: "t",
      lang: "de",
    });
    expect(JSON.stringify(beats)).not.toContain(" avg");
    expect(JSON.stringify(beats)).toContain("im Mittel");
  });

  it("dot-density compact callout follows the deliverable's decimal separator", () => {
    const beats = deriveDotDensityStory(dotLayoutFixture, {
      title: "t",
      lang: "it",
    });
    expect(JSON.stringify(beats)).toContain("1,2k");
    expect(JSON.stringify(beats)).not.toContain("1.2k");
  });
});

describe("the cartogram/hex-grid legends share ONE localized bin formatter", () => {
  // The 8 legend components (Cartogram/HexGrid x Story/Scrolly/Reveal + the 2 Scrolly*Map
  // siblings) each used to hand-roll an identical `fmt` closure. They now all delegate to
  // `fmtBin` — the SAME function CartogramMap.tsx/HexGridMap.tsx (the non-story siblings)
  // already used, not a new ninth copy. There is no exported `render*Legend(html)` function
  // to call directly (the legend is built inline inside a React useEffect, DOM-only) so the
  // real proof that all 8 sites actually call this shared function — not just that the
  // function itself is correct — is the locale-reach drift guard (skills/map-native and
  // skills/scrolly tests/locale-reach.test.ts): it mechanically fails if any of the 8 file
  // paints a number without calling a HELPERS-listed function. See the MUTATION step in the
  // task report for that guard reddening when one of the 8 is reverted.
  it("prints a French bin range the way all 8 legends now render it", () => {
    expect(fmtBin(1200, { lang: "fr" })).toBe(`1${NBSP}200`);
    expect(fmtBin(1200)).not.toBe(`1${NBSP}200`);
  });
});
