// CartogramScrolly used to fetch staticFile("geo/world.geojson") unconditionally, and
// computeCartogram defaults to joining on "iso_a3" when no `joinKey` is threaded onto its data
// argument (cartogram-geo.ts:62) — so a Swiss-canton (or any non-world) config silently rendered
// an empty map. This test proves the wiring the component now uses: resolveVideoGeometry (Task
// 7's shared helper) decodes config.geometry and resolves config.geography.joinKey, then
// computeCartogram is called with `{ ...config, joinKey }` (joinKey is threaded onto the data
// object, never a positional arg — mirrors cartogram-geo.ts's own contract) — the same call
// shape CartogramScrolly.tsx's init effect uses after this task's fix.
import { describe, it, expect } from "bun:test";
import type { Topology } from "topojson-specification";
import { resolveVideoGeometry } from "../core/video-geometry";
import { computeCartogram } from "../cartogram-geo";

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

describe("CartogramScrolly wiring — non-world injected geometry (Swiss cantons)", () => {
  it("resolveVideoGeometry + computeCartogram({...config, joinKey}) join on the injected joinKey", () => {
    const config = {
      values: [
        { id: "Genève", value: 10 },
        { id: "Vaud", value: 20 },
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
      "cartogram-scrolly-test",
    );
    expect(joinKey).toBe("name");

    const layout = computeCartogram({ ...config, joinKey }, world);
    expect(layout.cells).toHaveLength(2);
    expect(layout.cells.map((c) => c.id).sort()).toEqual(["Genève", "Vaud"]);
  });

  it("computeCartogram's iso_a3 default against the same injected geometry throws — the bug this test pins", () => {
    const config = {
      values: [
        { id: "Genève", value: 10 },
        { id: "Vaud", value: 20 },
      ],
      geometry: CANTON_TOPOLOGY,
    };
    const { world } = resolveVideoGeometry(config, "cartogram-scrolly-test");
    // No `joinKey` threaded onto the data object → computeCartogram defaults to "iso_a3"
    // (cartogram-geo.ts:62), which the canton topology has no such property for.
    expect(() => computeCartogram(config, world)).toThrow(/no region matched/);
  });
});
