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
