// ChoroplethScrolly used to fetch staticFile("geo/world.geojson") unconditionally and join on a
// hardcoded "iso_a3" (Task 13) — a Swiss-canton (or any non-world) config silently rendered an
// empty map, because the shipped world.geojson has no canton features at all. This test proves
// the exact wiring the component now uses: resolveVideoGeometry (Task 7's shared helper) decodes
// config.geometry and resolves config.geography.joinKey, then computeChoropleth/deriveMapStory
// are called with THAT joinKey — never "iso_a3" — the same call shape ChoroplethScrolly.tsx's
// init effect uses after this task's fix.
import { describe, it, expect } from "bun:test";
import type { Topology } from "topojson-specification";
import { resolveVideoGeometry } from "../core/video-geometry";
import { computeChoropleth } from "../choropleth-geo";
import { deriveMapStory } from "../map-story";

// Two Swiss cantons, properties keyed by "name" — never "iso_a3" (the shipped world.geojson has
// no canton features at all, so a component still reading it would resolve zero regions here).
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

describe("ChoroplethScrolly wiring — non-world injected geometry (Swiss cantons)", () => {
  it("resolveVideoGeometry + computeChoropleth join on the injected joinKey, matching real cantons", () => {
    const config = {
      regionKey: "name",
      valueField: "value",
      rows: [
        { name: "Genève", value: 10 },
        { name: "Vaud", value: 20 },
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
      "choropleth-scrolly-test",
    );
    expect(joinKey).toBe("name");

    const layout = computeChoropleth(config, world, joinKey, { bins: 5 });
    // Both cantons matched by name — neither in `unmatched`, neither `noData`.
    expect(layout.unmatched).toHaveLength(0);
    expect(layout.noData).toHaveLength(0);
    expect(layout.joined.filter((j) => j.value !== null)).toHaveLength(2);

    const beats = deriveMapStory(layout, world, joinKey, {
      title: "t",
      insight: "t",
      valueField: "value",
    });
    // At least one beat references a real canton key, not an iso_a3 code.
    const allKeys = beats.flatMap((b) => b.highlight);
    expect(allKeys.some((k) => k === "Genève" || k === "Vaud")).toBe(true);
  });

  it("using the hardcoded iso_a3 join key against the same injected geometry matches nothing — the bug this test pins", () => {
    const config = {
      regionKey: "name",
      valueField: "value",
      rows: [
        { name: "Genève", value: 10 },
        { name: "Vaud", value: 20 },
      ],
      geometry: CANTON_TOPOLOGY,
    };
    const { world } = resolveVideoGeometry(config, "choropleth-scrolly-test");
    // The pre-fix behaviour: hardcoded "iso_a3" against a canton topology that has no such
    // property — every feature is unmatched, so computeChoropleth refuses loudly instead of
    // silently rendering an empty map.
    expect(() =>
      computeChoropleth(config, world, "iso_a3", { bins: 5 }),
    ).toThrow(/no region matched/);
  });
});
