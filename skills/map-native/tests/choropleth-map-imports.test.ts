import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Structural, not behavioural — but real: the nine `?raw` geojson imports (spec §1.2) are the
// thing this whole phase removes. This test targets the four files Task 16-18 close, one at a
// time; ChoroplethMap.tsx's two (Task 16) plus CartogramMap.tsx/DotDensityMap.tsx/RouteMap.tsx's
// one each (Task 17) are asserted here.
//
// DEVIATION from the brief's literal code: the brief hardcoded repo-root-relative paths (e.g.
// "skills/map-native/src/ChoroplethMap.tsx"), which ENOENT under the brief's OWN prescribed run
// command ("cd skills/map-native && bun test ...", cwd = skills/map-native, not the repo root) —
// confirmed by running it verbatim before this fix (Task 16). Resolved relative to this test
// file's own directory instead, matching every sibling parity test in this directory (e.g.
// resolve-map-style-parity.test.ts's `join(import.meta.dir, "..", "src", ...)`).
const srcPath = (name: string) => join(import.meta.dir, "..", "src", name);

describe("no static geojson import in ChoroplethMap.tsx", () => {
  it("ChoroplethMap.tsx does not import world.geojson or us-states.geojson as ?raw", () => {
    const src = readFileSync(srcPath("ChoroplethMap.tsx"), "utf8");
    expect(src).not.toMatch(/\.geojson\?raw/);
  });
});

describe("no static geojson import in CartogramMap/DotDensityMap/RouteMap.tsx (Task 17)", () => {
  it("CartogramMap.tsx does not import world.geojson as ?raw", () => {
    const src = readFileSync(srcPath("CartogramMap.tsx"), "utf8");
    expect(src).not.toMatch(/\.geojson\?raw/);
  });
  it("DotDensityMap.tsx does not import world.geojson as ?raw", () => {
    const src = readFileSync(srcPath("DotDensityMap.tsx"), "utf8");
    expect(src).not.toMatch(/\.geojson\?raw/);
  });
  it("RouteMap.tsx does not import world.geojson as ?raw", () => {
    const src = readFileSync(srcPath("RouteMap.tsx"), "utf8");
    expect(src).not.toMatch(/\.geojson\?raw/);
  });
});
