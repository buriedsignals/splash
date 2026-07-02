import { describe, it, expect } from "bun:test";
import { locatorGeometry } from "../src/locator-geo";
import { QUALITATIVE } from "../src/route-geo";

const fewCfg = {
  markers: [
    { lon: 2.35, lat: 48.85, label: "Paris" },
    { lon: -0.13, lat: 51.51, label: "London" },
  ],
};

const catCfg = {
  markers: [
    { lon: 2.35, lat: 48.85, label: "A", category: "hospital" },
    { lon: 2.4, lat: 48.9, label: "B", category: "clinic" },
    { lon: 2.3, lat: 48.8, label: "C", category: "hospital" },
    { lon: 2.5, lat: 48.7, label: "D" }, // no category
  ],
};

describe("locatorGeometry", () => {
  it("computes marker bbox bounds [w,s,e,n]", () => {
    const g = locatorGeometry(fewCfg);
    expect(g.bounds).toEqual([-0.13, 48.85, 2.35, 51.51]);
  });

  it("has no categories / empty legend when no marker is categorized", () => {
    const g = locatorGeometry(fewCfg);
    expect(g.hasCategories).toBe(false);
    expect(g.legend).toEqual([]);
    expect(g.categories).toEqual([]);
  });

  it("assigns a CVD palette colour per distinct category, sorted, deterministic", () => {
    const g = locatorGeometry(catCfg);
    expect(g.hasCategories).toBe(true);
    expect(g.categories).toEqual(["clinic", "hospital"]); // sorted
    // legend: one entry per category, colour = QUALITATIVE cycling in sorted order
    expect(g.legend).toEqual([
      { category: "clinic", color: QUALITATIVE[0] },
      { category: "hospital", color: QUALITATIVE[1] },
    ]);
    // same-category markers share the colour; uncategorized marker gets the neutral colour
    const byLabel = Object.fromEntries(
      g.markers.map((m) => [m.label, m.color]),
    );
    expect(byLabel["A"]).toBe(QUALITATIVE[1]); // hospital
    expect(byLabel["C"]).toBe(QUALITATIVE[1]); // hospital
    expect(byLabel["B"]).toBe(QUALITATIVE[0]); // clinic
    expect(byLabel["D"]).toBe("#8a8a8a"); // uncategorized neutral
  });

  it("defaults markerStyle to dot and passes a valid one through", () => {
    expect(locatorGeometry(fewCfg).markerStyle).toBe("dot");
    expect(locatorGeometry({ ...fewCfg, markerStyle: "pin" }).markerStyle).toBe(
      "pin",
    );
    expect(
      locatorGeometry({ ...fewCfg, markerStyle: "nonsense" }).markerStyle,
    ).toBe("dot");
  });
});
