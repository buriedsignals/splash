import { describe, it, expect } from "bun:test";
import { join } from "node:path";
import {
  stripQuery,
  importSpecifiers,
  resolveRelative,
  traceClosure,
  packageName,
  deriveDeps,
  bundleViteConfig,
  bundleIndexHtml,
  bundleTsconfig,
  bundleReadme,
  bundleEnvExample,
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
  it("ignores commented-out imports (// line and /* */ block)", () => {
    const src = [
      `// import { foo } from "./bar";`,
      `/* import { baz } from "./qux"; */`,
      `import { real } from "./real";`,
    ].join("\n");
    const specs = importSpecifiers(src);
    expect(specs).not.toContain("./bar");
    expect(specs).not.toContain("./qux");
    expect(specs).toContain("./real");
  });
  it("does not mistake a :// URL for a line comment", () => {
    const src = `import x from "./a"; const u = "https://example.com";`;
    const specs = importSpecifiers(src);
    expect(specs).toContain("./a");
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
    expect(rel).toContain("skills/map-native/src/DotDensityMap.tsx");
    expect(rel).toContain("skills/map-native/src/HexGridMap.tsx");
    expect(rel).toContain("skills/map-native/src/LocatorMap.tsx");
    expect(rel).toContain("skills/map-native/src/RouteMap.tsx");
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

describe("packageName", () => {
  it("keeps a scoped package name, drops the subpath", () => {
    expect(packageName("@maptiler/sdk/dist/maptiler-sdk.css")).toBe(
      "@maptiler/sdk",
    );
    expect(packageName("react-dom/client")).toBe("react-dom");
    expect(packageName("react")).toBe("react");
  });
});

describe("deriveDeps", () => {
  const pkgs = [
    {
      dependencies: {
        "@maptiler/sdk": "3.6.0",
        remotion: "4.0.482",
        react: "19.2.7",
        "react-dom": "19.2.7",
      },
      devDependencies: {
        vite: "8.1.0",
        "@vitejs/plugin-react": "6.0.3",
        "vite-plugin-singlefile": "2.3.3",
        typescript: "6.0.3",
        "@types/react": "19.2.17",
        "@types/react-dom": "19.2.3",
      },
    },
  ];
  it("maps closure specifiers to pinned versions and includes fixed devDeps", () => {
    const { dependencies, devDependencies } = deriveDeps(
      [
        "react",
        "react-dom/client",
        "@maptiler/sdk",
        "@maptiler/sdk/dist/maptiler-sdk.css",
        "remotion",
      ],
      pkgs,
    );
    expect(dependencies).toEqual({
      react: "19.2.7",
      "react-dom": "19.2.7",
      "@maptiler/sdk": "3.6.0",
      remotion: "4.0.482",
    });
    expect(devDependencies.vite).toBe("8.1.0");
    expect(devDependencies["vite-plugin-singlefile"]).toBe("2.3.3");
  });
  it("skips node: builtins", () => {
    const { dependencies } = deriveDeps(["node:child_process", "react"], pkgs);
    expect(dependencies["node:child_process"]).toBeUndefined();
    expect(dependencies.react).toBe("19.2.7");
  });
  it("throws when a specifier has no version in the involved skills", () => {
    expect(() => deriveDeps(["left-pad"], pkgs)).toThrow(/no version for/);
  });
  it("throws on a version conflict across skills", () => {
    const conflicting = [
      { dependencies: { react: "19.2.7" } },
      { dependencies: { react: "18.0.0" } },
    ];
    expect(() => deriveDeps(["react"], conflicting)).toThrow(
      /version conflict/,
    );
  });
});

describe("scaffold emitters", () => {
  it("map vite.config bakes ./config.json into __CONFIG__ and forces interactive", () => {
    const cfg = bundleViteConfig("map-native");
    expect(cfg).toContain('readFileSync(new URL("./config.json"');
    expect(cfg).toContain("__INTERACTIVE__: JSON.stringify(true)");
    expect(cfg).toContain("viteSingleFile()");
  });
  it("scrolly vite.config dedupes react (single copy) and bakes __CONFIG__", () => {
    const cfg = bundleViteConfig("scrolly");
    expect(cfg).toContain('dedupe: ["react", "react-dom"]');
    expect(cfg).toContain("__CONFIG__");
  });
  it("index.html points its module script at the engine mount", () => {
    expect(bundleIndexHtml("map-native", "Ma carte")).toContain(
      'src="/skills/map-native/src/mount.tsx"',
    );
    expect(bundleIndexHtml("map-native", "Ma carte")).toContain(
      "<title>Ma carte</title>",
    );
  });
  it("env example declares the MapTiler key, empty", () => {
    expect(bundleEnvExample()).toContain("VITE_MAPTILER_KEY=");
  });
  it("README documents the key + build and the online-only caveat", () => {
    const r = bundleReadme("map-native", "Ma carte");
    expect(r).toContain("bun install");
    expect(r).toContain("VITE_MAPTILER_KEY");
  });
});
