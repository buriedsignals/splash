// resolveCartogramGeometry (CartogramStory.tsx) is the fix for Task 8: the cartogram video
// family used to fetch staticFile("geo/world.geojson") unconditionally and join on a hardcoded
// "iso_a3" — a Swiss-canton (or any non-world) config silently rendered an empty world map. This
// test proves the function now reads config.geometry (never a bundled world file) and prefers
// config.geography.joinKey over the world default, mirroring ChoroplethMap.tsx's own proven
// decode/join-key resolution (src/ChoroplethMap.tsx:258-284). CartogramReveal.tsx imports this
// same function (mirrors ChoroplethScrolly.tsx's `stepSlide` — one file exports, siblings
// import), so this test covers both CartogramStory and CartogramReveal's own resolution.
import { describe, it, expect } from "bun:test";
import type { Topology } from "topojson-specification";
import { resolveCartogramGeometry } from "./CartogramStory";
import type { CartogramConfigShape } from "../validate-config.ts";
import type { GeographyRef } from "../basemaps.ts";

// A minimal WORLD-shaped topology — 3 countries, joined on "iso_a3" (the module's own default).
const WORLD_TOPOLOGY = {
  type: "Topology",
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          properties: { iso_a3: "CHN", name: "China" },
          arcs: [[0]],
        },
        {
          type: "Polygon",
          properties: { iso_a3: "IND", name: "India" },
          arcs: [[1]],
        },
        {
          type: "Polygon",
          properties: { iso_a3: "RUS", name: "Russia" },
          arcs: [[2]],
        },
      ],
    },
  },
  arcs: [
    [
      [80, 40],
      [90, 40],
      [90, 45],
      [80, 45],
      [80, 40],
    ],
    [
      [75, 20],
      [85, 20],
      [85, 25],
      [75, 25],
      [75, 20],
    ],
    [
      [60, 55],
      [70, 55],
      [70, 60],
      [60, 60],
      [60, 55],
    ],
  ],
} as unknown as Topology;

// A NON-WORLD topology — 2 Swiss cantons, joined on "name" (a real non-iso_a3 join key,
// mirroring resolve-for-produce.ts's own natural-earth-admin-1 registry entry). This must NEVER
// match anything the shipped world.geojson would have produced — the whole point of this test.
const CANTON_TOPOLOGY = {
  type: "Topology",
  objects: {
    cantons: {
      type: "GeometryCollection",
      geometries: [
        { type: "Polygon", properties: { name: "Zurich" }, arcs: [[0]] },
        { type: "Polygon", properties: { name: "Geneva" }, arcs: [[1]] },
      ],
    },
  },
  arcs: [
    [
      [8.4, 47.3],
      [8.6, 47.3],
      [8.6, 47.5],
      [8.4, 47.5],
      [8.4, 47.3],
    ],
    [
      [6.1, 46.1],
      [6.2, 46.1],
      [6.2, 46.3],
      [6.1, 46.3],
      [6.1, 46.1],
    ],
  ],
} as unknown as Topology;

const CANTON_GEOGRAPHY: GeographyRef = {
  origin: "shipped",
  set: "natural-earth-admin-1",
  scope: "CHE",
  level: "admin-1",
  joinKey: "name",
  joinKeyFamily: "name",
  fileExtension: "topojson",
};

const baseConfig: Pick<CartogramConfigShape, "type" | "values" | "title"> = {
  type: "cartogram",
  values: [{ id: "Zurich", value: 10 }],
  title: "Which canton emits the most?",
};

describe("resolveCartogramGeometry", () => {
  it("resolves a non-world geography from its OWN injected geometry, not the shipped world file", () => {
    const config: CartogramConfigShape = {
      ...baseConfig,
      geometry: CANTON_TOPOLOGY,
      geography: CANTON_GEOGRAPHY,
    };

    const { world, joinKey } = resolveCartogramGeometry(config);

    expect(joinKey).toBe("name");
    expect(world.type).toBe("FeatureCollection");
    // 2 cantons — a world.geojson read would have produced ~180 countries, none named "Zurich".
    expect(world.features.length).toBe(2);
    const names = world.features.map((f) => f.properties?.name).sort();
    expect(names).toEqual(["Geneva", "Zurich"]);
  });

  it("resolves a world config exactly as today — iso_a3, same feature count", () => {
    // No `geography` — the legacy shape (matches assets/sample-data/cartogram-scaled.json,
    // which still only carries `basemap: "world"`). Proves the fallback path is unchanged.
    const config: CartogramConfigShape = {
      ...baseConfig,
      geometry: WORLD_TOPOLOGY,
      basemap: "world",
    };

    const { world, joinKey } = resolveCartogramGeometry(config);

    expect(joinKey).toBe("iso_a3");
    expect(world.features.length).toBe(3);
    const isoCodes = world.features.map((f) => f.properties?.iso_a3).sort();
    expect(isoCodes).toEqual(["CHN", "IND", "RUS"]);
  });

  it("resolves a world config carrying an explicit config.geography the same way (real produce-injected shape)", () => {
    const config: CartogramConfigShape = {
      ...baseConfig,
      geometry: WORLD_TOPOLOGY,
      geography: {
        origin: "shipped",
        set: "natural-earth-admin-0",
        level: "country",
        joinKey: "iso_a3",
        joinKeyFamily: "iso_a3",
        fileExtension: "geojson",
      },
    };

    const { world, joinKey } = resolveCartogramGeometry(config);

    expect(joinKey).toBe("iso_a3");
    expect(world.features.length).toBe(3);
  });

  it("throws a named error when config.geometry is absent (no bundled fallback geometry anymore)", () => {
    const config: CartogramConfigShape = { ...baseConfig };
    expect(() => resolveCartogramGeometry(config)).toThrow(
      /config\.geometry is required/,
    );
  });
});
