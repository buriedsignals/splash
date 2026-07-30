import { describe, it, expect } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT_PATH = join(import.meta.dir, "bundle-source.mjs");

describe("bundle-source.mjs ships a DECLARED (non-shipped) geography inside config.json", () => {
  it("the exported bundle's config.json carries real geometry bytes, and `bun install && bun run build` succeeds", () => {
    // A tiny, hand-built Topology standing in for Task 20's real produce.mjs output — the
    // fixture element under test: `geometry` is a real Topology object, not a string reference
    // to a file path (which would be exactly the "builds without its map" failure this task
    // guards against — an exported bundle has no access to the original run's frozen input dir).
    const config = {
      type: "choropleth",
      regionKey: "canton",
      valueField: "v",
      rows: [{ canton: "Genève", v: 1 }],
      geography: {
        origin: "declared",
        set: "declared",
        level: "canton",
        joinKey: "name",
        joinKeyFamily: "name",
      },
      geometry: {
        type: "Topology",
        objects: { data: { type: "GeometryCollection", geometries: [] } },
        arcs: [],
      },
      title: "t",
      description: "d",
      source: { name: "s" },
    };
    const runDir = mkdtempSync(join(tmpdir(), "bundle-source-geo-test-"));
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(config));
    // Manifest fixture mirrors the existing map-native assembly test in bundle-source.test.ts
    // (`{ engine: "map-native", type: "choropleth" }`) — traceClosure only needs `engine` to
    // pick the mount entry; `type` is carried for parity/documentation, unused by the tracer.
    const manifestPath = join(runDir, "source-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({ engine: "map-native", type: "choropleth" }),
    );
    const destDir = join(runDir, "bundle");
    try {
      const r = spawnSync(
        "bun",
        [SCRIPT_PATH, manifestPath, configPath, destDir],
        { encoding: "utf8" },
      );
      expect(r.status).toBe(0);
      const bundledConfig = JSON.parse(
        readFileSync(join(destDir, "config.json"), "utf8"),
      );
      expect(bundledConfig.geometry.type).toBe("Topology"); // the map travelled with the bundle
      const install = spawnSync("bun", ["install"], {
        cwd: destDir,
        encoding: "utf8",
      });
      expect(install.status).toBe(0);
      // A dummy VITE_MAPTILER_KEY is required for this build to prove anything beyond "vite
      // didn't crash": every map-native component throws `VITE_MAPTILER_KEY missing` at MODULE
      // TOP LEVEL (skills/map-native/src/ChoroplethMap.tsx:37-38 etc.). With no key, Vite
      // inlines `import.meta.env.VITE_MAPTILER_KEY` as `undefined` at build time, and Rollup's
      // dead-code elimination then proves that unconditional throw makes mount.tsx's own
      // top-level code (createRoot(...).render(...), the __CONFIG__ resolution) UNREACHABLE —
      // so it is silently stripped from the bundle. A build without a key still exits 0 and
      // still contains config.json's raw bytes (checked above), so `built.status === 0` alone
      // is NOT proof the injected config/geometry ever reaches the runtime-executable app —
      // verified by hand while writing this test: the same assertions below FAIL without this
      // key (dist/index.html then contains neither "no #root element" nor "canton"/"Topology").
      writeFileSync(
        join(destDir, ".env"),
        "VITE_MAPTILER_KEY=dummy-test-key-for-tree-shaking\n",
      );
      const built = spawnSync("bun", ["run", "build"], {
        cwd: destDir,
        encoding: "utf8",
      });
      expect(built.status).toBe(0);
      expect(existsSync(join(destDir, "dist", "index.html"))).toBe(true);
      const builtHtml = readFileSync(
        join(destDir, "dist", "index.html"),
        "utf8",
      );
      // mount.tsx's own code survived tree-shaking (the guard above did its job)…
      expect(builtHtml).toContain("no #root element");
      // …and the config/geometry it resolves from __CONFIG__ is IN the runtime-executable
      // bundle, not just in the copied-verbatim config.json file: this is the real proof the
      // map travels with the bundle, not a coincidence of the fixture.
      expect(builtHtml).toContain("canton");
      expect(builtHtml).toContain("Topology");
      expect(builtHtml).toContain("joinKeyFamily");
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  }, 180_000); // real installs + a real Vite build — slow, expected
});
