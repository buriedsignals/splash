// The video family (ChoroplethStory/ChoroplethReveal, Task 7) used to fetch a shipped
// world.geojson and join on a hardcoded "iso_a3" — silently rendering an empty map for any
// non-world geography (a Swiss-canton choropleth, joined on "name"). This suite pins the fix:
// resolveVideoGeometry must resolve its features from the INJECTED config.geometry, using
// config.geography.joinKey, never the shipped file or the hardcoded key.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Topology } from "topojson-specification";
import { resolveVideoGeometry } from "./video-geometry";
import { resolveGeometryForProduce } from "../../../../lib/geo/resolve-for-produce";

const ASSETS = join(import.meta.dir, "..", "..", "assets", "geo");

// A minimal, hand-built, valid Topology — two Swiss cantons, properties keyed by "name" (never
// "iso_a3": Natural Earth's shipped world.geojson has no canton features at all, so a component
// still reading it would resolve zero regions here, not merely the wrong ones).
const CANTON_TOPOLOGY: Topology = {
  type: "Topology",
  objects: {
    cantons: {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          arcs: [[0]],
          properties: { name: "Genève" },
        },
        {
          type: "Polygon",
          arcs: [[1]],
          properties: { name: "Vaud" },
        },
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

describe("resolveVideoGeometry — non-world injected geometry (Swiss cantons)", () => {
  it("resolves its features from config.geometry, joined on config.geography.joinKey, not on iso_a3", () => {
    const { world, joinKey } = resolveVideoGeometry(
      {
        geometry: CANTON_TOPOLOGY,
        geography: {
          origin: "declared",
          set: "declared",
          level: "canton",
          joinKey: "name",
          joinKeyFamily: "name",
        },
      },
      "choropleth-story-test",
    );

    expect(joinKey).toBe("name");
    expect(world.features).toHaveLength(2);
    const names = world.features.map((f) => f.properties?.name).sort();
    expect(names).toEqual(["Genève", "Vaud"]);
    // The shipped world basemap's join property must play no role here.
    expect(
      world.features.every((f) => f.properties?.iso_a3 === undefined),
    ).toBe(true);
  });
});

describe("resolveVideoGeometry — legacy config (basemap only, no geography)", () => {
  it("falls back to the basemap registry's joinKey, same as ChoroplethMap.tsx's interactive path", () => {
    const { joinKey } = resolveVideoGeometry(
      {
        geometry: CANTON_TOPOLOGY, // decode succeeds regardless — only joinKey is under test here
        basemap: "world",
      },
      "choropleth-story-test",
    );
    expect(joinKey).toBe("iso_a3");
  });

  it("defaults to world's joinKey when neither geography nor basemap is set", () => {
    const { joinKey } = resolveVideoGeometry(
      { geometry: CANTON_TOPOLOGY },
      "choropleth-story-test",
    );
    expect(joinKey).toBe("iso_a3");
  });
});

describe("resolveVideoGeometry — missing geometry fails loud", () => {
  it("throws a named error instead of silently rendering nothing", () => {
    expect(() =>
      resolveVideoGeometry({ basemap: "world" }, "choropleth-story-test"),
    ).toThrow(/choropleth-story-test.*config\.geometry is required/);
  });
});

describe("resolveVideoGeometry — the world path, against the REAL produce pipeline", () => {
  it("resolves exactly the subset produce.mjs injects for a world config — same as ChoroplethMap.tsx's interactive path, not the full shipped file", async () => {
    // BEFORE (today's video behaviour, still real for the interactive family until this task's
    // fix lands): the video fetches the shipped world.geojson directly and gets every feature
    // in it, regardless of how many rows the config actually carries data for.
    const rawWorld = JSON.parse(
      readFileSync(join(ASSETS, "world.geojson"), "utf8"),
    ) as GeoJSON.FeatureCollection;
    const beforeCount = rawWorld.features.length;

    // AFTER: produce.mjs resolves config.geometry the same way for every choropleth caller
    // (interactive and video alike) — subset to the rows actually present, via subsetGeometry.
    // This is Task 20's already-proven, already-shipped behaviour; Task 7 only makes the video
    // family READ it instead of re-fetching a duplicate raw file.
    const config: Record<string, unknown> = {
      type: "choropleth",
      regionKey: "code",
      valueField: "v",
      basemap: "world",
      rows: [
        { code: "FRA", v: 1 },
        { code: "DEU", v: 2 },
        { code: "USA", v: 3 },
      ],
      title: "t",
      description: "d",
      source: { name: "s" },
    };
    await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });

    const { world, joinKey } = resolveVideoGeometry(
      config as { geometry?: Topology; geography?: unknown; basemap?: string },
      "choropleth-story-test",
    );
    const afterCount = world.features.length;

    expect(joinKey).toBe("iso_a3");
    expect(afterCount).toBe(3); // FRA, DEU, USA — the rows actually present
    expect(beforeCount).toBe(241); // the full shipped world.geojson — locked as a reference

    // The two numbers are DIFFERENT by design, not a regression this task introduces:
    // subsetGeometry (produce.mjs, Task 20) restricts every choropleth's config.geometry to the
    // rows it actually carries data for, interactive and video alike. Reported, not asserted
    // equal — see task-7-report.md for the full comparison this test backs.
    expect(afterCount).toBeLessThan(beforeCount);
  }, 30_000);
});
