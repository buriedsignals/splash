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
      await resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
      });
    });
  }
});
