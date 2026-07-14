import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeChoropleth } from "../src/choropleth-geo";
import { computeHexGrid } from "../src/hex-grid-geo";
import { houseRamp } from "../src/theme/house-ramp";

const world = JSON.parse(
  readFileSync(
    join(import.meta.dir, "..", "assets", "geo", "world.geojson"),
    "utf8",
  ),
);
const HOUSE = "#0A5C36";

describe("ramp map types consume brandHue → a derived house ramp", () => {
  it("choropleth uses houseRamp(brandHue) for its bins when no explicit palette is set", () => {
    const layout = computeChoropleth(
      {
        regionKey: "code",
        valueField: "share",
        rows: [
          { code: "NOR", share: 99 },
          { code: "FRA", share: 27 },
          { code: "DEU", share: 59 },
        ],
        brandHue: HOUSE,
      },
      world,
      "iso_a3",
      { bins: 5 },
    );
    expect(layout.bins.map((b) => b.color)).toEqual(houseRamp(HOUSE, 5));
  });

  it("an EXPLICIT palette still wins over brandHue", () => {
    const layout = computeChoropleth(
      {
        regionKey: "code",
        valueField: "share",
        rows: [{ code: "NOR", share: 99 }],
        brandHue: HOUSE,
      },
      world,
      "iso_a3",
      { bins: 5, palette: "oranges" },
    );
    // oranges registry ramp, not the green house ramp
    expect(layout.bins.map((b) => b.color)).not.toEqual(houseRamp(HOUSE, 5));
  });

  it("hex-grid uses houseRamp(brandHue) when no palette is set", () => {
    const grid = computeHexGrid(
      {
        points: [
          { lon: 10, lat: 60, value: 5 },
          { lon: 2, lat: 48, value: 1 },
          { lon: 13, lat: 52, value: 9 },
        ],
        aggregate: "sum",
        brandHue: HOUSE,
      },
      world,
    );
    const used = new Set(grid.cells.map((c) => c.color));
    const ramp = new Set(houseRamp(HOUSE));
    // every cell colour comes from the derived house ramp
    for (const c of used) expect(ramp.has(c)).toBe(true);
  });
});

import { runProduceMapConformance } from "../src/core/map-produce-conformance";

describe("produce guard validates the HOUSE ramp, not the default, when brandHue is set", () => {
  const base = {
    title: "Solar capacity is highest in the sunbelt",
    description: "Installed solar capacity per capita by country, 2024.",
    source: { name: "Heidi.news" },
    regionKey: "code",
    valueField: "share",
    rows: [
      { code: "NOR", share: 99 },
      { code: "FRA", share: 27 },
    ],
  };

  it("does NOT false-fire the subject-default rule for a house-ramp choropleth", () => {
    const r = runProduceMapConformance("choropleth", {
      ...base,
      subject: "solar energy capacity",
      brandHue: "#E69F00",
    });
    expect(r.violations.some((v) => v.includes("no explicit palette"))).toBe(
      false,
    );
  });

  it("still fires the subject-default rule when NO palette AND NO brandHue is set", () => {
    const r = runProduceMapConformance("choropleth", {
      ...base,
      subject: "solar energy capacity",
    });
    expect(r.violations.some((v) => v.includes("no explicit palette"))).toBe(
      true,
    );
  });
});
