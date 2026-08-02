import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { resolveGeometryForProduce } from "./resolve-for-produce";
import { matchGeography } from "../../skills/map-native/src/geo-match";
import { assembleMapNative } from "../loop/assemble/map-native";
import type { ProductionBrief } from "../core/production-brief";

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
      // The REAL committed index's own "Jura" collision (lib/geo/adm1-index.json) — both
      // countries' hits are threaded through; resolveAdm1FeatureIds (resolve-for-produce.ts)
      // is what picks the CHE one via `scope` below, not a raw-name match against the file.
      featureIdsByValue: {
        Jura: [
          { featureId: "CHE-160", country: "CHE" },
          { featureId: "FRA-5312", country: "FRA" },
        ],
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

  it("THE JOURNALIST'S REAL CASE: a CSV spelled without accents ('Geneve', 'Zurich', 'Neuchatel') joins the real shipped ADM1 file (whose own properties ARE accented — 'Genève', 'Zürich', 'Neuchâtel') through the real matchGeography → assembleMapNative → resolveGeometryForProduce path, and produces a subset instead of the 'absent from the file' refusal", async () => {
    // Step 1 — orient's own match, exactly as a journalist's run performs it: the NORMALIZED
    // ADM1 index resolves every unaccented value (this is the "26 of 26 cantons recognised"
    // moment the journalist sees at framing).
    const columns = ["canton", "rent"];
    const rows = [
      { canton: "Geneve", rent: "1780" },
      { canton: "Zurich", rent: "1650" },
      { canton: "Neuchatel", rent: "1400" },
    ];
    const geo = matchGeography(columns, rows);
    expect(geo).toBeDefined();
    expect(geo!.geography.set).toBe("natural-earth-admin-1");
    expect(geo!.matched).toBe(3);
    expect(geo!.unmatched).toEqual([]);

    // Step 2 — the assembler, exactly as produce() calls it: threads geo.featureIdsByValue
    // onto the config rather than leaving it to be recomputed from raw values later.
    const brief: ProductionBrief = {
      elementId: "e1",
      nativeType: "choropleth",
      format: "static",
      angle: {
        confirmedTakeaway: "Geneva rents run highest among these three cantons",
        altInsight: "A map of three Swiss cantons shaded by rent",
        unit: "CHF",
      },
      dataCsv: "canton,rent\nGeneve,1780\nZurich,1650\nNeuchatel,1400",
      attribution: "Test fixture",
      geo,
    };
    const assembled = assembleMapNative(brief);
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;
    const config = assembled.value as Record<string, unknown>;
    expect(config.featureIdsByValue).toBeDefined();

    // Step 3 — the actual bug site: resolveGeometryForProduce against the REAL shipped
    // natural-earth-admin-1.topojson. Before the fix, this recomputed featureIds from the raw
    // ("Geneve") values and compared them against the file's real, accented `properties.name`
    // — finding nothing, and throwing "3 of the 3 requested regions are absent from the
    // file". After the fix, it uses the RESOLVED featureId instead and produces a real subset.
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
    expect(geoms).toHaveLength(3);
    // The delivered geometry still carries the file's own (accented) names — a journalist's
    // unaccented spelling only had to survive the JOIN, never the rendered label.
    const names = geoms.map((g) => g.properties.name).sort();
    expect(names).toEqual(["Genève", "Neuchâtel", "Zürich"]);
  }, 30_000);

  it("should refuse a declared geography in the video format — no production code threads geography.sourcePath yet (Task 9's own finding, unchanged as of Task 10), so this path has never been built or verified, unlike the shipped-geography case below", async () => {
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

  it("should NOT refuse a SHIPPED non-world geography (us-states) in the video format anymore — Tasks 7-9/13 moved every video composition onto config.geometry via the shared resolveVideoGeometry, so a shipped non-world subset renders the same real geometry as static/interactive/scrolly instead of silently coming out an empty world map", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      basemap: "us-states",
      regionKey: "code",
      rows: [{ code: "CA", value: 1 }],
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
      format: "video",
    });
    expect(wrote).toBe(true);
    expect((config.geometry as { type: string }).type).toBe("Topology");
  }, 30_000); // real bunx mapshaper, two passes now (filter+measure, then simplify+encode)

  it("should NOT refuse a SHIPPED admin-1 geography scoped to a single country (a Swiss-canton choropleth) in the video format — the exact shape Task 10's own render proof (task-10-report.md) used", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      regionKey: "canton",
      rows: [
        { canton: "Zürich", rent: 1650 },
        { canton: "Genève", rent: 1780 },
      ],
      valueField: "rent",
      geography: {
        origin: "shipped",
        set: "natural-earth-admin-1",
        scope: "CHE",
        level: "canton",
        joinKey: "name",
        joinKeyFamily: "name",
      },
      // The real committed index's own resolved ids for these two cantons.
      featureIdsByValue: {
        Zürich: [{ featureId: "CHE-176", country: "CHE" }],
        Genève: [{ featureId: "CHE-159", country: "CHE" }],
      },
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
      format: "video",
    });
    expect(wrote).toBe(true);
    const geometry = config.geometry as {
      objects: Record<
        string,
        { geometries: { properties: Record<string, unknown> }[] }
      >;
    };
    const layerKey = Object.keys(geometry.objects)[0]!;
    expect(geometry.objects[layerKey]!.geometries).toHaveLength(2); // Zürich + Genève only
  }, 30_000);

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

  describe("cartogram — pinned separately from the choropleth/dot-density 'rows' path (Task 15 follow-up)", () => {
    it("should resolve a shipped world-geography cartogram unchanged — values[].id used directly, no featureIdsByValue involved", async () => {
      const config: Record<string, unknown> = {
        type: "cartogram",
        basemap: "world",
        values: [
          { id: "FRA", value: 1 },
          { id: "DEU", value: 2 },
        ],
      };
      const wrote = await resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
      });
      expect(wrote).toBe(true);
      const geometry = config.geometry as {
        objects: Record<string, { geometries: unknown[] }>;
      };
      const layerKey = Object.keys(geometry.objects)[0]!;
      expect(geometry.objects[layerKey]!.geometries).toHaveLength(2);
    }, 30_000);

    it("should resolve an admin-1 cartogram whose values[].id is spelled WITHOUT accents, via the same resolved-featureId path as choropleth — the fix is not choropleth-only", async () => {
      const config: Record<string, unknown> = {
        type: "cartogram",
        values: [
          { id: "Zurich", value: 1650 },
          { id: "Geneve", value: 1780 },
        ],
        geography: {
          origin: "shipped",
          set: "natural-earth-admin-1",
          scope: "CHE",
          level: "canton",
          joinKey: "name",
          joinKeyFamily: "name",
        },
        featureIdsByValue: {
          Zurich: [{ featureId: "CHE-176", country: "CHE" }],
          Geneve: [{ featureId: "CHE-159", country: "CHE" }],
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
      expect(geoms).toHaveLength(2);
      const names = geoms.map((g) => g.properties.name).sort();
      expect(names).toEqual(["Genève", "Zürich"]);
    }, 30_000);

    it("should refuse loudly, before any mapshaper call, when an admin-1 cartogram carries no featureIdsByValue at all — the no-silent-fallback guarantee", async () => {
      const config: Record<string, unknown> = {
        type: "cartogram",
        values: [{ id: "Geneve", value: 1780 }],
        geography: {
          origin: "shipped",
          set: "natural-earth-admin-1",
          scope: "CHE",
          level: "canton",
          joinKey: "name",
          joinKeyFamily: "name",
        },
        // featureIdsByValue deliberately absent — simulates a manifest matched before this
        // field existed.
      };
      await expect(
        resolveGeometryForProduce({
          config,
          assetsGeoDir: ASSETS,
          renderWidthPx: 1200,
        }),
      ).rejects.toThrow(/featureIdsByValue is unset/);
    });
  });

  describe("route — pinned separately: the only type that scans every id in the source rather than filtering to a per-row list (Task 15 follow-up)", () => {
    it("should resolve a route unchanged against the world geometry — every feature in the source, not a per-row id list", async () => {
      const config: Record<string, unknown> = {
        type: "route",
        route: [
          [2.35, 48.85],
          [13.4, 52.52],
        ],
        basemap: "world",
      };
      const wrote = await resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
      });
      expect(wrote).toBe(true);
      const geometry = config.geometry as {
        objects: Record<string, { geometries: unknown[] }>;
      };
      const layerKey = Object.keys(geometry.objects)[0]!;
      // world.geojson: every feature in the source comes back, not a per-row filtered subset —
      // the same "every id, not a filter" behaviour route had before this fix, unaffected by
      // the admin-1-only featureId threading above (route can never be admin-1 — see
      // resolve-for-produce.ts's own comment on assemblePointFamily always resolving it
      // against "world").
      expect(geometry.objects[layerKey]!.geometries.length).toBeGreaterThan(
        100,
      );
    }, 30_000);
  });
});
