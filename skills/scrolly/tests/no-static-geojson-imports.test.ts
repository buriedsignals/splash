import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

// Task 18: the four cross-skill `?raw` geojson imports removed from skills/scrolly/ (D5). Same
// pattern as skills/map-native/tests/choropleth-map-imports.test.ts (Task 16/17), scoped to this
// skill's own gate run (TEST_DIRS spawns `bun test` with cwd = skills/scrolly — scripts/check.mjs
// — so these paths resolve relative to that cwd, matching the brief's literal code verbatim).
describe("no static geojson import in skills/scrolly", () => {
  for (const f of [
    "src/ScrollyDotDensityMap.tsx",
    "src/ScrollyCartogramMap.tsx",
    "src/ScrollyMap.tsx",
    "src/Scrolly.tsx",
  ]) {
    it(`${f} does not import world.geojson as ?raw`, () => {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/\.geojson\?raw/);
    });
  }
});
