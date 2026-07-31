// DotDensityScrolly used to fetch staticFile("geo/world.geojson") unconditionally and join on a
// module-level `JOIN_KEY = "iso_a3"` constant — so a Swiss-canton (or any non-world) config
// silently rendered zero regions (computeDotDensity does not throw on a zero-match set; it just
// returns an empty `regions` array — a genuinely SILENT empty map, unlike choropleth/cartogram
// which throw loud). This test proves the wiring the component now uses: resolveVideoGeometry
// (Task 7's shared helper) decodes config.geometry and resolves config.geography.joinKey, then
// computeDotDensity is called with THAT joinKey — never the hardcoded "iso_a3" constant — the
// same call shape DotDensityScrolly.tsx's init effect uses after this task's fix.
import { describe, it, expect } from "bun:test";
import type { Topology } from "topojson-specification";
import { resolveVideoGeometry } from "../core/video-geometry";
import { computeDotDensity } from "../dot-density-geo";

// Two Swiss cantons, properties keyed by "name" — never "iso_a3".
const CANTON_TOPOLOGY: Topology = {
  type: "Topology",
  objects: {
    cantons: {
      type: "GeometryCollection",
      geometries: [
        { type: "Polygon", arcs: [[0]], properties: { name: "Genève" } },
        { type: "Polygon", arcs: [[1]], properties: { name: "Vaud" } },
      ],
    },
  },
  arcs: [
    [
      [6, 46],
      [6, 47],
      [7, 47],
      [7, 46],
      [6, 46],
    ],
    [
      [6.5, 46.5],
      [6.5, 47.5],
      [7.5, 47.5],
      [7.5, 46.5],
      [6.5, 46.5],
    ],
  ],
} as unknown as Topology;

describe("DotDensityScrolly wiring — non-world injected geometry (Swiss cantons)", () => {
  it("resolveVideoGeometry + computeDotDensity join on the injected joinKey, matching real cantons", () => {
    const config = {
      regionKey: "name",
      valueField: "value",
      rows: [
        { name: "Genève", value: 100 },
        { name: "Vaud", value: 200 },
      ],
      geometry: CANTON_TOPOLOGY,
      geography: {
        origin: "declared" as const,
        set: "declared",
        level: "canton",
        joinKey: "name",
        joinKeyFamily: "name",
      },
    };

    const { world, joinKey } = resolveVideoGeometry(
      config,
      "dot-density-scrolly-test",
    );
    expect(joinKey).toBe("name");

    const layout = computeDotDensity(config, world, joinKey);
    expect(layout.regions).toHaveLength(2);
    expect(layout.regions.map((r) => r.key).sort()).toEqual(["Genève", "Vaud"]);
  });

  it("the hardcoded iso_a3 join key against the same injected geometry matches nothing — the bug this test pins", () => {
    const config = {
      regionKey: "name",
      valueField: "value",
      rows: [
        { name: "Genève", value: 100 },
        { name: "Vaud", value: 200 },
      ],
      geometry: CANTON_TOPOLOGY,
    };
    const { world } = resolveVideoGeometry(config, "dot-density-scrolly-test");
    // The pre-fix behaviour: hardcoded "iso_a3" against a canton topology that has no such
    // property — every feature is unmatched. computeDotDensity does not throw on this (unlike
    // choropleth/cartogram) — it silently returns zero regions, a genuinely invisible map.
    const layout = computeDotDensity(config, world, "iso_a3");
    expect(layout.regions).toHaveLength(0);
  });
});
