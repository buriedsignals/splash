// The lever that would have caught the point-family crash and the vanished small
// countries: both fail during CONFIG RESOLUTION, before any render, so this needs no
// MapTiler key, no network and no browser. A suite that self-skips without a key is
// exactly the blindness this repair exists to close — this one never skips.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce";

const SAMPLES = join(import.meta.dir, "..", "assets", "sample-data");
const ASSETS = join(import.meta.dir, "..", "assets", "geo");
const fixtures = readdirSync(SAMPLES).filter((f) => f.endsWith(".json"));

// The point family (symbol, locator, hex-grid) draws markers at coordinates and reads no
// geometry at all — resolveGeometryForProduce's own JOINING_TYPES allow-list correctly
// returns `wrote === false` for these, on purpose. Mirrored here (not imported: that allow-list
// is deliberately internal to resolve-for-produce.ts) so this suite can tell "correctly skipped"
// apart from "silently skipped by accident", which is exactly the FIX 2 gap: before this suite
// asserted `wrote === true` explicitly, `if (!wrote) return;` treated both the same way, so a
// type-less config (choropleth.json, filter-choropleth.json before commit 0d691b38 fixed the
// default-typed-choropleth convention) returned `wrote === false` for the WRONG reason and this
// suite stayed green anyway — exactly how that defect passed Task 2's own review.
const POINT_FAMILY_TYPES = new Set(["symbol", "locator", "hex-grid"]);

describe("every shipped fixture resolves", () => {
  it("should find fixtures at all (an empty scan must never pass)", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(7);
  });

  for (const name of fixtures) {
    it(`should resolve ${name} without throwing`, async () => {
      const config = JSON.parse(readFileSync(join(SAMPLES, name), "utf8"));
      const wrote = await resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
      });
      const carriesGeography =
        Boolean(config.basemap) || Boolean(config.geography);
      const effectiveType = (config.type as string | undefined) ?? "choropleth";
      const isPointFamily = POINT_FAMILY_TYPES.has(effectiveType);
      if (carriesGeography && !isPointFamily) {
        // THE LEVER (FIX 2): a fixture that names a geography and is not point-family MUST
        // actually have resolved it — asserted directly, not inferred from `if (!wrote) return`
        // silently skipping the rest of this test.
        expect(wrote).toBe(true);
      } else {
        // Point-family fixtures are the one legitimate `wrote === false` — asserted explicitly
        // too, so this branch is a proven exclusion, not an unchecked assumption.
        expect(wrote).toBe(false);
      }
      if (!wrote) return;
      // A simplification that annihilates a shape hands the renderer `geometry: null`, and
      // every consumer reads `.type` on it. Assert the absence here, where the message can
      // name the geography — three layers down it is a bare TypeError, and one layer further
      // it is an unexplained 30s browser timeout.
      const topo = config.geometry as {
        objects: Record<string, { geometries: unknown[] }>;
      };
      const geometries = Object.values(topo.objects).flatMap(
        (o) => o.geometries,
      );
      expect(geometries.length).toBeGreaterThan(0);
      // mapshaper writes an annihilated shape as an explicit `"type":null`, not an omitted
      // key — JSON.parse yields `null`, never `undefined` — so both are checked for.
      const nulls = geometries.filter(
        (g) => (g as { type?: string | null }).type == null,
      );
      expect(nulls).toHaveLength(0);
    }, 30_000); // real bunx mapshaper, two passes now (filter+measure, then simplify+encode)
  }
});

// Every shipped sample-data fixture uses basemap: "world" — not one exercises the OTHER
// shipped basemap, which is why us-states was dead for the whole branch and nothing noticed
// (task-14-brief.md). This case builds a us-states choropleth config by hand rather than adding
// a sample-data fixture, so it exercises the exact geometry that was broken regardless of
// whether a future fixture file changes.
describe("the other shipped basemap (us-states) resolves too", () => {
  it("resolves a us-states choropleth joining on postal, with zero null shapes and surviving properties.name", async () => {
    const config = {
      type: "choropleth",
      basemap: "us-states",
      regionKey: "code",
      valueField: "value",
      rows: [
        { code: "AK", value: 1 },
        { code: "CA", value: 2 },
        { code: "NY", value: 3 },
      ],
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    expect(wrote).toBe(true);
    const topo = config.geometry as {
      objects: Record<
        string,
        {
          geometries: {
            type?: string | null;
            properties?: Record<string, unknown>;
          }[];
        }
      >;
    };
    const geometries = Object.values(topo.objects).flatMap((o) => o.geometries);
    expect(geometries.length).toBe(3);
    const nulls = geometries.filter((g) => g.type == null);
    expect(nulls).toHaveLength(0);
    // us-states' real join key is "postal", not "name" — this assertion genuinely breaks the
    // joinKey: "name" coincidence world.geojson happened to share (Task 6's review gap).
    for (const g of geometries) {
      expect(typeof g.properties?.name).toBe("string");
      expect(g.properties?.name).not.toBe("");
    }
  }, 30_000);
});
