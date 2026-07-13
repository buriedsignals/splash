import { describe, it, expect } from "bun:test";
import { join } from "node:path";
import {
  stripQuery,
  importSpecifiers,
  resolveRelative,
  traceClosure,
} from "./bundle-source.mjs";

const REPO = join(import.meta.dir, "..", "..", ".."); // skills/atelier/scripts → repo root
const MAP_MOUNT = join(REPO, "skills", "map-native", "src", "mount.tsx");

describe("stripQuery", () => {
  it("removes a ?raw / ?url vite suffix", () => {
    expect(stripQuery("../assets/world.geojson?raw")).toBe(
      "../assets/world.geojson",
    );
    expect(stripQuery("./x")).toBe("./x");
  });
});

describe("importSpecifiers", () => {
  it("finds from-imports, side-effect imports and export-from", () => {
    const src = [
      `import React from "react";`,
      `import { a } from "./a";`,
      `import type { T } from "../b";`,
      `import "@maptiler/sdk/dist/maptiler-sdk.css";`,
      `export { z } from "./z";`,
    ].join("\n");
    const specs = importSpecifiers(src);
    expect(specs).toContain("react");
    expect(specs).toContain("./a");
    expect(specs).toContain("../b");
    expect(specs).toContain("@maptiler/sdk/dist/maptiler-sdk.css");
    expect(specs).toContain("./z");
  });
});

describe("resolveRelative", () => {
  it("resolves an extensionless relative import to a real .tsx file", () => {
    const choro = join(
      REPO,
      "skills",
      "map-native",
      "src",
      "ChoroplethMap.tsx",
    );
    expect(resolveRelative(MAP_MOUNT, "./ChoroplethMap")).toBe(choro);
  });
  it("returns null for an unresolvable specifier", () => {
    expect(resolveRelative(MAP_MOUNT, "./does-not-exist")).toBeNull();
  });
});

describe("traceClosure — map-native interactive entry", () => {
  const { files, bareSpecifiers } = traceClosure(MAP_MOUNT);
  const rel = files.map((f) => f.slice(REPO.length + 1));
  it("includes the 7 map components reached from mount.tsx", () => {
    expect(rel).toContain("skills/map-native/src/ChoroplethMap.tsx");
    expect(rel).toContain("skills/map-native/src/SymbolMap.tsx");
    expect(rel).toContain("skills/map-native/src/CartogramMap.tsx");
  });
  it("stays entirely within skills/map-native (no scrolly/chart-native)", () => {
    expect(rel.every((r) => r.startsWith("skills/map-native/"))).toBe(true);
  });
  it("excludes the off-path files that import ../../scrolly", () => {
    expect(rel).not.toContain("skills/map-native/src/conformance.ts");
    expect(rel).not.toContain("skills/map-native/src/route-story.ts");
  });
  it("pulls remotion as a bare dep (via route-geo → video-scene)", () => {
    expect(bareSpecifiers).toContain("remotion");
    expect(bareSpecifiers).toContain("@maptiler/sdk");
    expect(bareSpecifiers).toContain("react-dom/client");
  });
});
