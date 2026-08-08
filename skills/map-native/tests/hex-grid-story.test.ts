import { describe, it, expect } from "bun:test";
import { deriveHexGridStory } from "../src/hex-grid-story";
import type { HexGridLayout } from "../src/hex-grid-geo";

const cell = (
  id: number,
  value: number,
  count: number,
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
  count,
  value,
  color: "#2171b5",
  binIdx: 0,
});
const layout: HexGridLayout = {
  cells: [cell(2, 5, 5), cell(4, 18, 18), cell(6, 11, 11)],
  bins: [],
  cellSizeKm: 20,
  bounds: [2, 45, 6.2, 45.2],
  aggregate: "count",
  binShape: "hex",
  aggregateLabel: "points per hexagon",
  capped: false,
  valueUnit: "",
};

describe("deriveHexGridStory", () => {
  const beats = deriveHexGridStory(layout, {
    title: "Where the incidents cluster",
  });
  it("emits title + establish + reveals + takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(3);
  });
  it("reveals the highest cell first with a value + rank caption", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].copy).toContain("18 points");
    expect(reveals[0].copy).toContain("densest");
    expect(reveals[0].highlight).toEqual(["1"]); // index of the value-18 cell
  });
  it("keeps the reveal camera framed on the zone (never a single tiny cell)", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    const [w, s, e, n] = reveals[0].camera;
    // the reveal span is >= 50% of the full extent span (2..6.2 = 4.2 wide → >= 2.1)
    expect(e - w).toBeGreaterThanOrEqual((6.2 - 2) * 0.5 - 1e-6);
  });
  it("caps reveals at maxReveals", () => {
    expect(
      deriveHexGridStory(
        layout,
        { title: "x-title here" },
        { maxReveals: 1 },
      ).filter((b) => b.kind === "reveal").length,
    ).toBe(1);
  });
  it("never forces a fake name — callout.name stays the rank descriptor", () => {
    const reveals = deriveHexGridStory(layout, {
      title: "Where the incidents cluster",
    }).filter((b) => b.kind === "reveal");
    // "the densest hexagon" since the rank descriptor and its bin noun became ONE locale
    // row (lib/core/story-copy.ts's `densestBin`): "the densest hexagon" but "l'hexagone le
    // plus dense" — a caller cannot join them across languages.
    expect(reveals[0].callout?.name).toBe("the densest hexagon");
    expect(reveals[1].callout?.name).toBe("the 2nd densest hexagon");
  });
});

describe("deriveHexGridStory — valueUnit", () => {
  it("appends the config's valueUnit to sum/mean callouts", () => {
    const sumLayout: HexGridLayout = {
      ...layout,
      aggregate: "sum",
      valueUnit: "kWh",
    };
    const reveals = deriveHexGridStory(sumLayout, {
      title: "Where consumption is highest",
    }).filter((b) => b.kind === "reveal");
    // "18 kWh", not "18kWh". This assertion used to pin the bare concatenation, which is the
    // same defect a real run shipped on a choropleth popup as "157détenus / 100 000 hab." while
    // the legend beside it read "43–65,8 détenus / 100 000 hab.". Every value+unit surface now
    // routes through `labelWithUnit`, which spaces a word unit and keeps "%"/"€" tight — so the
    // byte change here is the fix arriving, not a drift.
    expect(reveals[0].callout?.value).toBe("18 kWh");

    const meanLayout: HexGridLayout = {
      ...layout,
      aggregate: "mean",
      valueUnit: "kWh",
    };
    const meanReveals = deriveHexGridStory(meanLayout, {
      title: "Where consumption is highest",
    }).filter((b) => b.kind === "reveal");
    // Was "18.0kWh avg" — the parasitic ".0" on a whole-number mean. Routing through
    // localizeValueLabel (task 9) applies its bare-integer rule here too ("an integer
    // prints bare, never a parasitic 52.0" — lib/core/locale.ts), the same convention
    // chart-native's ten value-label call sites already follow. Deliberate byte change,
    // not a drift: matches the brief's own reference implementation exactly.
    expect(meanReveals[0].callout?.value).toBe("18 kWh avg");
  });
  it("never applies valueUnit to a count aggregate (count is of points, not the value)", () => {
    const countLayout: HexGridLayout = { ...layout, valueUnit: "kWh" };
    const reveals = deriveHexGridStory(countLayout, {
      title: "Where the incidents cluster",
    }).filter((b) => b.kind === "reveal");
    expect(reveals[0].callout?.value).toBe("18 points");
  });
  it("omits the unit entirely when the config sets none", () => {
    const reveals = deriveHexGridStory(layout, {
      title: "Where the incidents cluster",
    }).filter((b) => b.kind === "reveal");
    expect(reveals[0].callout?.value).toBe("18 points");
  });
});

// The rank descriptor and its bin noun are text this deriver GENERATES — furniture. Inline
// they were English literals ("the densest" + "hexagon"/"cell"), so a French hex-grid read
// "the densest hexagon". They share one locale row because the two cannot be concatenated
// across languages ("the densest hexagon", but "l'hexagone le plus dense").
describe("deriveHexGridStory — the rank descriptor follows the deliverable's language", () => {
  const revealsIn = (lang: string | undefined) =>
    deriveHexGridStory(layout, {
      title: "Where the incidents cluster",
      lang,
    }).filter((b) => b.kind === "reveal");

  it("still reads in English when no language is declared", () => {
    expect(revealsIn(undefined)[0].copy).toContain("the densest hexagon");
  });

  it("leaks no English into a French, German or Italian hex-grid", () => {
    expect(revealsIn("fr")[0].copy).toContain("l'hexagone le plus dense");
    expect(revealsIn("de")[0].copy).toContain("das dichteste Sechseck");
    expect(revealsIn("it")[0].copy).toContain("l'esagono più denso");
    for (const lang of ["fr", "de", "it"])
      for (const b of revealsIn(lang))
        expect(b.copy).not.toMatch(/densest|hexagon\b/);
  });
});
