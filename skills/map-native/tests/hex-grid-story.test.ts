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
    expect(reveals[0].callout?.name).toBe("the densest");
    expect(reveals[1].callout?.name).toBe("the 2nd densest");
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
    expect(reveals[0].callout?.value).toBe("18kWh");

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
    expect(meanReveals[0].callout?.value).toBe("18kWh avg");
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
