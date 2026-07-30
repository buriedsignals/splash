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
  });

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
});
