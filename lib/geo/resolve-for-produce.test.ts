import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveGeometryForProduce } from "./resolve-for-produce";
import { matchGeography } from "../../skills/map-native/src/geo-match";
import { assembleMapNative } from "../loop/assemble/map-native";
import { computeChoropleth } from "../../skills/map-native/src/choropleth-geo";
import type { ProductionBrief } from "../core/production-brief";

const ASSETS = join(import.meta.dir, "../../skills/map-native/assets/geo");

// The RENDER join needs a real FeatureCollection shape (GeoJSON.FeatureCollection), but
// `computeChoropleth` itself never reads `.geometry` (only `f.properties?.[joinKey]`) — see
// choropleth-geo.ts's own body. So this stub, built straight off the TopoJSON `config.geometry`
// resolveGeometryForProduce just produced, needs no real polygon decoding (no topojson-client
// dependency in this test) — it carries the SAME properties a real decode would, which is the
// only thing this join boundary reads.
function stubFeatureCollectionFrom(geometry: {
  objects: Record<
    string,
    { geometries: { properties?: Record<string, unknown> }[] }
  >;
}): GeoJSON.FeatureCollection {
  const layerKey = Object.keys(geometry.objects)[0]!;
  return {
    type: "FeatureCollection",
    features: geometry.objects[layerKey]!.geometries.map((g) => ({
      type: "Feature",
      properties: g.properties ?? {},
      geometry: { type: "Point", coordinates: [0, 0] },
    })),
  };
}

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

    // REVIEW ROUND 2's finding: closing the SUBSET query was not enough — the RENDER join
    // (ChoroplethMap.tsx → computeChoropleth) reads config.rows[i][regionKey] DIRECTLY, and
    // that was still the raw "Geneve"/"Zurich"/"Neuchatel" before this round. Assert BOTH
    // halves at the actual render-join boundary: (1) config.rows was rewritten to the file's
    // own canonical spelling — the single fix point every consumer (choropleth, cartogram,
    // dot-density) reads from; (2) computeChoropleth, called exactly as ChoroplethMap.tsx
    // calls it, joins every row — not the "no region matched the data" throw review round 2
    // reproduced live.
    const rewrittenRows = (config.rows as Record<string, unknown>[]).map(
      (r) => r[config.regionKey as string],
    );
    expect(rewrittenRows.sort()).toEqual(["Genève", "Neuchâtel", "Zürich"]);
    const fc = stubFeatureCollectionFrom(geometry);
    const layout = computeChoropleth(
      config as unknown as Parameters<typeof computeChoropleth>[0],
      fc,
      (config.geography as { joinKey: string }).joinKey,
    );
    expect(layout.joined.filter((j) => j.value !== null)).toHaveLength(3);
    expect(layout.unmatched).toEqual([]);
  }, 30_000);

  describe("shipped basemap (world/us-states) — the SAME case/whitespace normalization gap, found by review round 1 after the admin-1 fix shipped", () => {
    it("THE SAME CONTRADICTION, ON A DIFFERENT PATH: lowercase US postal codes ('ny', 'ca') join the real shipped us-states.geojson (whose own postal property is ALWAYS uppercase) through the real matchGeography → assembleMapNative → resolveGeometryForProduce path, and produce a subset instead of the 'absent from the file' refusal", async () => {
      const columns = ["state", "value"];
      const rows = [
        { state: "ny", value: "1" },
        { state: "ca", value: "2" },
      ];
      const geo = matchGeography(columns, rows);
      expect(geo).toBeDefined();
      expect(geo!.geography.set).toBe("us-states");
      expect(geo!.matched).toBe(2);
      expect(geo!.unmatched).toEqual([]);

      const brief: ProductionBrief = {
        elementId: "e1",
        nativeType: "choropleth",
        format: "static",
        angle: {
          confirmedTakeaway: "New York and California lead these two states",
          altInsight: "A map of two US states shaded by value",
          unit: "u",
        },
        dataCsv: "state,value\nny,1\nca,2",
        attribution: "Test fixture",
        geo,
      };
      const assembled = assembleMapNative(brief);
      expect(assembled.ok).toBe(true);
      if (!assembled.ok) return;
      const config = assembled.value as Record<string, unknown>;
      // No featureIdsByValue here — this is NOT the ADM1 index path, confirming this fix is
      // a genuinely separate mechanism (query-side normalization), not a reuse of it.
      expect(config.featureIdsByValue).toBeUndefined();

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
      expect(geometry.objects[layerKey]!.geometries).toHaveLength(2);

      // Review round 2: the render join too, with the same control the reviewer used
      // (uppercase lowercase). config.rows must carry "NY"/"CA" now (the file's own
      // convention), and computeChoropleth — the ACTUAL call ChoroplethMap.tsx makes — must
      // join both, not throw "no region matched the data".
      const rewrittenRows = (config.rows as Record<string, unknown>[]).map(
        (r) => r[config.regionKey as string],
      );
      expect(rewrittenRows.sort()).toEqual(["CA", "NY"]);
      const fc = stubFeatureCollectionFrom(geometry);
      const layout = computeChoropleth(
        config as unknown as Parameters<typeof computeChoropleth>[0],
        fc,
        (config.geography as { joinKey: string }).joinKey,
      );
      expect(layout.joined.filter((j) => j.value !== null)).toHaveLength(2);
      expect(layout.unmatched).toEqual([]);
    }, 30_000);

    it("also tolerates a whitespace-padded, mixed-case world ISO-A3 code ('  fra ') the same way matchShippedBasemaps already does at match time", async () => {
      const config: Record<string, unknown> = {
        type: "choropleth",
        basemap: "world",
        regionKey: "code",
        rows: [{ code: "  fra ", value: 1 }],
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
      expect(geometry.objects[layerKey]!.geometries).toHaveLength(1);
    }, 30_000);
  });

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

  describe("declared geometry — a journalist's own file, never normalized or rewritten (review round 2's second finding)", () => {
    // A journalist's own uploaded GeoJSON — mixed-case ("Genève"/"Lausanne", standard French
    // capitalization), the exact shape review round 2 used to prove `normalizeShippedJoinValue`
    // had started reaching a path it must never touch: uppercasing "Genève" (matching the row
    // exactly) into "GENÈVE" no longer matches the file's own "Genève" property — a case that
    // worked before EITHER fix in this file, broken by treating a declared join like a shipped
    // one. Real coordinates (not null/placeholder) since this exercises the actual
    // `subsetGeometry` call, mapshaper included.
    function declaredFixtureDir(): string {
      const dir = mkdtempSync(join(tmpdir(), "declared-geo-"));
      writeFileSync(
        join(dir, "communes.geojson"),
        JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { nom: "Genève" },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [6.1, 46.2],
                    [6.2, 46.2],
                    [6.2, 46.25],
                    [6.1, 46.25],
                    [6.1, 46.2],
                  ],
                ],
              },
            },
            {
              type: "Feature",
              properties: { nom: "Lausanne" },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [6.6, 46.5],
                    [6.7, 46.5],
                    [6.7, 46.55],
                    [6.6, 46.55],
                    [6.6, 46.5],
                  ],
                ],
              },
            },
          ],
        }),
      );
      return dir;
    }

    it("produces (does not refuse) a declared geometry whose values already match its own casing exactly — a case that worked before EITHER fix in this file and must keep working", async () => {
      const dir = declaredFixtureDir();
      const config: Record<string, unknown> = {
        type: "choropleth",
        regionKey: "commune",
        rows: [
          { commune: "Genève", value: 1 },
          { commune: "Lausanne", value: 2 },
        ],
        geography: {
          origin: "declared",
          set: "ch-communes",
          level: "commune",
          joinKey: "nom",
          joinKeyFamily: "nom",
          sourcePath: join(dir, "communes.geojson"),
        },
        geoCredit: { name: "swisstopo" },
      };
      const wrote = await resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
      });
      expect(wrote).toBe(true);
      // Untouched, byte-for-byte — a declared join is never normalized or rewritten.
      expect((config.rows as Record<string, unknown>[])[0]!.commune).toBe(
        "Genève",
      );
      expect((config.rows as Record<string, unknown>[])[1]!.commune).toBe(
        "Lausanne",
      );
      const geometry = config.geometry as {
        objects: Record<string, { geometries: unknown[] }>;
      };
      const layerKey = Object.keys(geometry.objects)[0]!;
      expect(geometry.objects[layerKey]!.geometries).toHaveLength(2);
    }, 30_000);
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

    it("THE JOURNALIST'S REAL CASE, CARTOGRAM: an unaccented CSV joins through the real matchGeography → assembleMapNative → resolveGeometryForProduce path for a cartogram, exactly like the choropleth case above — this is what proves the assembler actually threads featureIdsByValue onto a cartogram config, not just that resolveGeometryForProduce can consume one if handed it directly", async () => {
      const columns = ["canton", "rent"];
      const rows = [
        { canton: "Zurich", rent: "1650" },
        { canton: "Geneve", rent: "1780" },
      ];
      const geo = matchGeography(columns, rows);
      expect(geo).toBeDefined();
      expect(geo!.geography.set).toBe("natural-earth-admin-1");
      expect(geo!.matched).toBe(2);

      const brief: ProductionBrief = {
        elementId: "e1",
        nativeType: "cartogram",
        // "video", not "static" — and the change is a CORRECTION, not an accommodation of a new
        // guard. This fixture is an ADM1 cartogram, and MEASURED 2026-08-07 (real produce, real
        // browser): built as `static` it renders EMPTY, dying on `choropleth: no region matched
        // the data — nothing to map`, because CartogramMap.tsx (the static AND interactive
        // component) resolves its join key as `data.joinKey ?? "iso_a3"` while these features are
        // keyed on `name`. The assembler now refuses that pairing, so the old fixture asserted
        // `assembled.ok` for a config that could never draw. Video is the format where an ADM1
        // cartogram actually works — CartogramStory/Reveal/Scrolly read the key through
        // resolveVideoGeometry — and it costs this test NOTHING: featureIdsByValue threading and
        // resolveGeometryForProduce's subsetting are both format-independent, which is all this
        // case was ever pinning.
        format: "video",
        angle: {
          confirmedTakeaway: "Geneva rents run highest among these two cantons",
          altInsight: "A cartogram of two Swiss cantons sized by rent",
          unit: "CHF",
        },
        dataCsv: "canton,rent\nZurich,1650\nGeneve,1780",
        attribution: "Test fixture",
        geo,
      };
      const assembled = assembleMapNative(brief);
      expect(assembled.ok).toBe(true);
      if (!assembled.ok) return;
      const config = assembled.value as Record<string, unknown>;
      // The wiring under test: assembleMapNative's cartogram branch must have copied
      // geo.featureIdsByValue onto the config itself — this is exactly the spread the
      // mutation test below deletes to confirm this assertion (and the ones after it) is
      // actually load-bearing, not vacuously true.
      expect(config.featureIdsByValue).toBeDefined();

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

  describe("refusal messages name what the file offers, bounded (review round 1 minor finding)", () => {
    it("an unresolved value's refusal lists the OTHER values this column's join already resolved", async () => {
      const config: Record<string, unknown> = {
        type: "choropleth",
        regionKey: "canton",
        rows: [{ canton: "Wallis", value: 1 }],
        geography: {
          origin: "shipped",
          set: "natural-earth-admin-1",
          scope: "CHE",
          level: "canton",
          joinKey: "name",
          joinKeyFamily: "name",
        },
        // "Wallis" itself never resolved (absent as a key) — only its two siblings did.
        featureIdsByValue: {
          Genève: [{ featureId: "CHE-159", country: "CHE" }],
          Zürich: [{ featureId: "CHE-176", country: "CHE" }],
        },
      };
      await expect(
        resolveGeometryForProduce({
          config,
          assetsGeoDir: ASSETS,
          renderWidthPx: 1200,
        }),
      ).rejects.toThrow(
        /this file recognised 2 other value\(s\).*Genève.*Zürich/s,
      );
    });

    it("a scoped-out value's refusal names its own featureId/country AND the other in-scope values", async () => {
      const config: Record<string, unknown> = {
        type: "choropleth",
        regionKey: "canton",
        rows: [
          { canton: "Genève", value: 1 },
          { canton: "Jura", value: 2 },
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
          Genève: [{ featureId: "CHE-159", country: "CHE" }],
          // "Jura" here ONLY matched France (a contrived fixture — the real index also carries
          // the Swiss Jura, but this isolates the scoped-out branch specifically).
          Jura: [{ featureId: "FRA-5312", country: "FRA" }],
        },
      };
      await expect(
        resolveGeometryForProduce({
          config,
          assetsGeoDir: ASSETS,
          renderWidthPx: 1200,
        }),
      ).rejects.toThrow(
        /FRA-5312 \(FRA\).*other values already resolved to "CHE".*Genève/s,
      );
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
