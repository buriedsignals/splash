import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { resolveGeometryForProduce } from "./resolve-for-produce";

const ASSETS = join(import.meta.dir, "../../skills/map-native/assets/geo");

describe("resolveGeometryForProduce", () => {
  it("should resolve a legacy shipped-basemap choropleth into real geometry", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      basemap: "world",
      regionKey: "code",
      rows: [
        { code: "FRA", value: 1 },
        { code: "DEU", value: 2 },
      ],
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    expect(wrote).toBe(true);
    expect((config.geometry as { type: string }).type).toBe("Topology");
    expect((config.geography as { origin: string }).origin).toBe("shipped");
  }, 30_000); // real bunx mapshaper, two passes now (filter+measure, then simplify+encode)

  it("should resolve a type-less choropleth config (config.type absent) the same as an explicit one — the default-typed-choropleth convention every shipped sample fixture (e.g. assets/sample-data/choropleth.json) relies on. This is the case that let commit 0d691b38's regression ship silently through Task 2's own review: `String(config.type)` alone reads an absent type as the literal string \"undefined\", never in JOINING_TYPES, so resolution silently no-op'd for exactly this shape (FIX 2)", async () => {
    const config: Record<string, unknown> = {
      // `type` deliberately omitted — the shipped-fixture convention.
      basemap: "world",
      regionKey: "code",
      rows: [
        { code: "FRA", value: 1 },
        { code: "DEU", value: 2 },
      ],
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    expect(wrote).toBe(true);
    expect((config.geometry as { type: string }).type).toBe("Topology");
  }, 30_000); // real bunx mapshaper, two passes now (filter+measure, then simplify+encode)

  it("should return false and leave the config alone when there is no geography", async () => {
    const config: Record<string, unknown> = { type: "line", rows: [] };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    expect(wrote).toBe(false);
    expect(config.geometry).toBeUndefined();
  });

  it("should thread geography.scope through to the geometry subset, so an admin-1 join scoped to CHE does not also pick up France's 'Jura' (Task 15)", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      regionKey: "canton",
      rows: [{ canton: "Jura", value: 1 }],
      geography: {
        origin: "shipped",
        set: "natural-earth-admin-1",
        scope: "CHE",
        level: "canton",
        joinKey: "name",
        joinKeyFamily: "name",
      },
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    expect(wrote).toBe(true);
    const geometry = config.geometry as {
      objects: Record<
        string,
        { geometries: { properties: Record<string, unknown> }[] }
      >;
    };
    const layerKey = Object.keys(geometry.objects)[0]!;
    const geoms = geometry.objects[layerKey]!.geometries;
    expect(geoms).toHaveLength(1); // not 2 — France's Jura is scoped out
  }, 30_000);

  it("should refuse a declared geography in the video format rather than render another map", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      regionKey: "code",
      rows: [{ code: "GE", value: 1 }],
      geography: {
        origin: "declared",
        set: "ch-cantons",
        level: "canton",
        joinKey: "name",
        joinKeyFamily: "name",
        sourcePath: "/tmp/nope.geojson",
      },
      geoCredit: { name: "swisstopo" },
    };
    await expect(
      resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
        format: "video",
      }),
    ).rejects.toThrow(/video/i);
  });

  it("should refuse a SHIPPED non-world geography (us-states) in the video format — it now resolves cleanly into config.geometry, but the video family still reads world.geojson/iso_a3 unconditionally, so the render would silently come out an empty world map with no error at all", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      basemap: "us-states",
      regionKey: "code",
      rows: [{ code: "CA", value: 1 }],
    };
    await expect(
      resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
        format: "video",
      }),
    ).rejects.toThrow(/video/i);
  });

  it("should NOT refuse a shipped world geography in the video format — the one geography the video family can actually render", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      basemap: "world",
      regionKey: "code",
      rows: [
        { code: "FRA", value: 1 },
        { code: "DEU", value: 2 },
      ],
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
      format: "video",
    });
    expect(wrote).toBe(true);
  }, 30_000); // real bunx mapshaper, two passes now (filter+measure, then simplify+encode)
});
