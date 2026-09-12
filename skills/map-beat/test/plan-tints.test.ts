import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { plateTints, SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { matchConvention } from "../../palette/scripts/palette.mjs";

const DIRECTIONS = "docs/design-base/directions";
const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"));

describe("the plate tints", () => {
  it("should separate sea from land on every filed direction", () => {
    for (const file of filed) {
      const d = readDirection(join(DIRECTIONS, file));
      const { water, land } = plateTints(d);
      expect(contrast(water, land)).toBeGreaterThanOrEqual(SEA_LAND_MIN);
    }
  });

  it("should keep the basemap quieter than the marks on every filed direction", () => {
    for (const file of filed) {
      const d = readDirection(join(DIRECTIONS, file));
      const { water, land } = plateTints(d);
      expect(contrast(water, d.ground)).toBeLessThan(1.6);
      expect(contrast(land, d.ground)).toBeLessThan(1.6);
    }
  });

  it("should refuse rather than return a sea nobody can tell from the land", () => {
    /** A ground that IS the filed water hue: every dose of that hue mixed into it returns the hue
     *  unchanged, so no dose can ever pull the sea away from the land. The beat must be told, not
     *  handed a flat map nobody chose. */
    const hue = matchConvention("water").accent;
    expect(() => plateTints({ ground: hue, accent: hue })).toThrow(/no dose/);
  });
});
