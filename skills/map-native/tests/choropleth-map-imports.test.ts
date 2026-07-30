import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Structural, not behavioural — but real: the nine `?raw` geojson imports (spec §1.2) are the
// thing this whole phase removes. This test targets the four files Task 16-18 close, one at a
// time; only ChoroplethMap.tsx's two are asserted here, the rest join as their own tasks land.
//
// DEVIATION from the brief's literal code: the brief hardcoded the repo-root-relative path
// "skills/map-native/src/ChoroplethMap.tsx", which ENOENTs under the brief's OWN prescribed run
// command ("cd skills/map-native && bun test ...", cwd = skills/map-native, not the repo root) —
// confirmed by running it verbatim before this fix. Resolved relative to this test file's own
// directory instead, matching every sibling parity test in this directory (e.g.
// resolve-map-style-parity.test.ts's `join(import.meta.dir, "..", "src", ...)`).
const CHOROPLETH_MAP_PATH = join(
  import.meta.dir,
  "..",
  "src",
  "ChoroplethMap.tsx",
);

describe("no static geojson import in ChoroplethMap.tsx", () => {
  it("ChoroplethMap.tsx does not import world.geojson or us-states.geojson as ?raw", () => {
    const src = readFileSync(CHOROPLETH_MAP_PATH, "utf8");
    expect(src).not.toMatch(/\.geojson\?raw/);
  });
});
