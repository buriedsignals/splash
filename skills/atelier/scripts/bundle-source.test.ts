import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
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

describe("bundle-source CLI — map-native assembly", () => {
  const scriptPath = join(import.meta.dir, "bundle-source.mjs");
  const sampleConfig = join(
    REPO,
    "skills",
    "map-native",
    "assets",
    "sample-data",
    "choropleth.json",
  );

  it("assembles a runnable, layout-preserving map bundle", () => {
    const work = mkdtempSync(join(tmpdir(), "bundle-source-map-"));
    const manifestPath = join(work, "source-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({ engine: "map-native", type: "choropleth" }),
    );
    const dest = join(work, "carte-source");
    try {
      const out = execFileSync(
        "bun",
        [scriptPath, manifestPath, sampleConfig, dest],
        { encoding: "utf8" },
      );
      expect(out).toContain("BUNDLE_SOURCE_RESULT");
      // Layout preserved — the engine mount + a reached component live under skills/map-native/src.
      expect(
        existsSync(join(dest, "skills", "map-native", "src", "mount.tsx")),
      ).toBe(true);
      expect(
        existsSync(
          join(dest, "skills", "map-native", "src", "ChoroplethMap.tsx"),
        ),
      ).toBe(true);
      // Off-path cross-skill importers are NOT copied.
      expect(
        existsSync(join(dest, "skills", "map-native", "src", "conformance.ts")),
      ).toBe(false);
      // Scaffold pieces present.
      for (const f of [
        "package.json",
        "vite.config.ts",
        "index.html",
        "tsconfig.json",
        "config.json",
        "README.md",
        ".env.example",
      ])
        expect(existsSync(join(dest, f))).toBe(true);
      // Deps complete AND include remotion (the trap the metafile/tracer self-corrects).
      const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
      expect(pkg.dependencies["@maptiler/sdk"]).toBe("3.6.0");
      expect(pkg.dependencies.remotion).toBe("4.0.482");
      expect(pkg.scripts.build).toBe("vite build");
      // No copied file has a DANGLING cross-skill relative import (would break a rebuild).
      assertNoDanglingRelativeImports(join(dest, "skills"));
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});

describe("bundle-source CLI — scrolly assembly (3-tree closure)", () => {
  const scriptPath = join(import.meta.dir, "bundle-source.mjs");
  // traceClosure walks mount.tsx's static imports, not the config — any real scrolly config
  // works here. Scrolly.tsx imports both ScrollyChart and ScrollyMap, so its closure spans
  // THREE skills (scrolly + map-native + chart-native); this proves all three get copied.
  const sampleConfig = join(
    REPO,
    "skills",
    "scrolly",
    "assets",
    "sample-data",
    "scrolly.json",
  );

  it("assembles a runnable bundle spanning scrolly + map-native + chart-native", () => {
    const work = mkdtempSync(join(tmpdir(), "bundle-source-scrolly-"));
    const manifestPath = join(work, "source-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({ engine: "scrolly", kind: "map" }),
    );
    const dest = join(work, "story-source");
    try {
      const out = execFileSync(
        "bun",
        [scriptPath, manifestPath, sampleConfig, dest],
        { encoding: "utf8" },
      );
      expect(out).toContain("BUNDLE_SOURCE_RESULT");
      // The scrolly entry itself.
      expect(
        existsSync(join(dest, "skills", "scrolly", "src", "mount.tsx")),
      ).toBe(true);
      // Proves all 3 trees were copied — scrolly pulls map-native geometry/story modules and
      // chart-native's chart geometry/story modules directly (Scrolly.tsx imports both
      // ScrollyChart and ScrollyMap).
      const mapNativeFiles = readdirSync(
        join(dest, "skills", "map-native", "src"),
      ).filter((f) => /\.(ts|tsx)$/.test(f));
      expect(mapNativeFiles.length).toBeGreaterThan(0);
      const chartNativeFiles = readdirSync(
        join(dest, "skills", "chart-native", "src"),
      ).filter((f) => /\.(ts|tsx)$/.test(f));
      expect(chartNativeFiles.length).toBeGreaterThan(0);
      // Scaffold pieces present.
      for (const f of [
        "package.json",
        "vite.config.ts",
        "index.html",
        "tsconfig.json",
        "config.json",
        "README.md",
        ".env.example",
      ])
        expect(existsSync(join(dest, f))).toBe(true);
      // Deps derived from the traced specifiers span all 3 skills' package.json.
      const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
      expect(pkg.dependencies["@maptiler/sdk"]).toBeTruthy();
      expect(pkg.dependencies["@turf/turf"]).toBeTruthy();
      expect(pkg.dependencies.react).toBeTruthy();
      // No copied file has a DANGLING cross-skill relative import (would break a rebuild).
      assertNoDanglingRelativeImports(join(dest, "skills"));
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});

// Asserts no copied .ts/.tsx file under `dir` has an unresolvable relative import — a copy-set
// completeness check shared by every engine's assembly test.
function assertNoDanglingRelativeImports(dir) {
  const allTs = walk(dir).filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of allTs) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/\bfrom\s*["'](\.[^"']+)["']/g)) {
      const target = resolve(dirname(f), m[1].replace(/\?.*$/, ""));
      const exts = ["", ".ts", ".tsx", ".js", ".jsx", ".json", ".geojson"];
      const ok =
        exts.some((e) => existsSync(target + e)) ||
        exts.some((e) => existsSync(join(target, "index" + e)));
      expect(ok).toBe(true);
    }
  }
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
