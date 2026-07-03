import { describe, it, expect } from "bun:test";
import {
  computeChoropleth,
  type ChoroplethData,
  regionBounds,
} from "../src/choropleth-geo";

const features = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { iso_a3: "FRA" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [2, 48],
            [3, 48],
            [3, 49],
            [2, 49],
            [2, 48],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { iso_a3: "DEU" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [10, 50],
            [11, 50],
            [11, 51],
            [10, 51],
            [10, 50],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { iso_a3: "ESP" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-4, 40],
            [-3, 40],
            [-3, 41],
            [-4, 41],
            [-4, 40],
          ],
        ],
      },
    },
  ],
} as any;
const data: ChoroplethData = {
  regionKey: "code",
  valueField: "share",
  rows: [
    { code: "FRA", share: 25 },
    { code: "DEU", share: 58 },
    { code: "ESP", share: 44 },
  ],
};

describe("computeChoropleth", () => {
  it("joins rows to features by the join key", () => {
    const l = computeChoropleth(data, features, "iso_a3");
    expect(l.joined.find((j) => j.key === "DEU")!.value).toBe(58);
  });
  it("defaults sequential bins to the blue ramp", () => {
    const l = computeChoropleth(data, features, "iso_a3");
    expect(l.bins[0].color).toBe("#deebf7");
  });
  it("honours a named subject-fit palette instead of blue", () => {
    const l = computeChoropleth(data, features, "iso_a3", {
      palette: "oranges",
    });
    expect(l.bins.map((b) => b.color)).not.toContain("#deebf7");
    expect(l.bins[0].color).toBe("#ffffb2");
  });
  it("marks a region with no data as null and lists it in noData", () => {
    const l = computeChoropleth(
      { ...data, rows: data.rows.slice(0, 2) },
      features,
      "iso_a3",
    );
    expect(l.joined.find((j) => j.key === "ESP")!.value).toBeNull();
    expect(l.noData).toContain("ESP");
  });
  it("reports unmatched CSV rows (a data error, not silent drop)", () => {
    const l = computeChoropleth(
      { ...data, rows: [...data.rows, { code: "XXX", share: 5 }] },
      features,
      "iso_a3",
    );
    expect(l.unmatched).toContain("XXX");
  });
  it("produces the requested number of sequential bins, ascending", () => {
    const l = computeChoropleth(data, features, "iso_a3", { bins: 3 });
    expect(l.bins).toHaveLength(3);
    for (let i = 1; i < l.bins.length; i++)
      expect(l.bins[i].min).toBeGreaterThanOrEqual(l.bins[i - 1].max);
  });
  it("computes a non-empty bbox of the joined regions (basemap-fit)", () => {
    const l = computeChoropleth(data, features, "iso_a3");
    expect(l.bounds[2]).toBeGreaterThan(l.bounds[0]);
    expect(l.bounds[3]).toBeGreaterThan(l.bounds[1]);
  });
  it("frames the mainland, excluding far-flung overseas territories", () => {
    // FRA as a MultiPolygon: metropolitan mainland + a tiny distant territory
    // (like French Guiana / Réunion in Natural Earth admin-0). The bounds must
    // frame the mainland cluster, NOT stretch to the territory (the whole-world bug).
    const withTerritory = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso_a3: "FRA" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [2, 48],
                  [4, 48],
                  [4, 50],
                  [2, 50],
                  [2, 48],
                ],
              ],
              // far-flung speck near the equator/Atlantic — must be ignored
              [
                [
                  [-53, 4],
                  [-52.9, 4],
                  [-52.9, 4.1],
                  [-53, 4.1],
                  [-53, 4],
                ],
              ],
            ],
          },
        },
      ],
    } as any;
    const oneRow: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [{ code: "FRA", share: 25 }],
    };
    const l = computeChoropleth(oneRow, withTerritory, "iso_a3");
    // West edge must be the mainland (~2°E), not the -53°W territory
    expect(l.bounds[0]).toBeGreaterThan(-10);
    // South edge must be the mainland (~48°N), not the 4°N territory
    expect(l.bounds[1]).toBeGreaterThan(40);
  });
  it("uses a diverging scale around the midpoint when asked", () => {
    const l = computeChoropleth(data, features, "iso_a3", {
      scaleType: "diverging",
      midpoint: 44,
    });
    expect(l.scaleType).toBe("diverging");
  });
  it("throws on a non-numeric value", () => {
    expect(() =>
      computeChoropleth(
        { ...data, rows: [{ code: "FRA", share: "n/a" }] },
        features,
        "iso_a3",
      ),
    ).toThrow(/invalid/);
  });
  it("centers diverging scale on midpoint with neutral color in middle bin", () => {
    const l = computeChoropleth(data, features, "iso_a3", {
      scaleType: "diverging",
      midpoint: 44,
      bins: 5,
    });
    expect(l.bins).toHaveLength(5);
    const middleBin = l.bins[2]; // middle bin at index 2 in array of 5
    expect(middleBin.color).toBe("#f7f7f7"); // neutral DIVERGING[2]
  });
  it("handles single bin without NaN color index", () => {
    const l = computeChoropleth(data, features, "iso_a3", { bins: 1 });
    expect(l.bins).toHaveLength(1);
    expect(l.bins[0].color).toBeDefined();
    expect(typeof l.bins[0].color).toBe("string");
    expect(l.bins[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it("throws when no CSV rows match any feature", () => {
    expect(() =>
      computeChoropleth(
        { ...data, rows: [{ code: "ZZZ", share: 99 }] },
        features,
        "iso_a3",
      ),
    ).toThrow(/no region matched/);
  });
});

describe("regionBounds", () => {
  it("frames a region by its mainland polygon, ignoring far-flung territory", () => {
    const fra = {
      type: "Feature",
      properties: { iso_a3: "FRA" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [2, 48],
              [4, 48],
              [4, 50],
              [2, 50],
              [2, 48],
            ],
          ],
          [
            [
              [-53, 4],
              [-52.9, 4],
              [-52.9, 4.1],
              [-53, 4.1],
              [-53, 4],
            ],
          ],
        ],
      },
    } as any;
    const b = regionBounds(fra);
    expect(b[0]).toBeGreaterThan(-10); // west = mainland ~2°E, not -53°W
    expect(b[1]).toBeGreaterThan(40); // south = mainland ~48°N, not 4°N
  });
});
