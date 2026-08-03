// The skill's own smoke for D5/D7 geometry resolution (Task 4, geography-anywhere repair).
//
// Companion to produce-cli-validation.test.ts's own "spawn the REAL CLI" discipline: a
// `bun test` suite that never actually runs `scripts/produce.mjs`'s build path can stay green
// for a reason production does not have — which is exactly what happened here. Commit 7532fdc7
// removed the four static `?raw` geojson imports from the scrolly map components (loud
// "config.geometry is required" throws replacing them) but skills/scrolly/scripts/produce.mjs
// never gained a resolution step, and nothing in this skill's `bun test` caught it: the same
// commit hand-inlined a 9 304-line TopoJSON into assets/sample-data/scrolly.json, and no test
// here ever ran the CLI against it. This test does — against the real, committed sample (which
// now carries no `geometry` of its own, see that fixture's own history), and reads the
// PRODUCER'S OWN output, not the fixture.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Topology } from "topojson-specification";

const scrollyRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sampleConfigPath = join(
  scrollyRoot,
  "assets",
  "sample-data",
  "scrolly.json",
);

// Token-free-gate honesty: this spawns the real produce.mjs against a map-track (choropleth)
// config, which drives a real headless MapLibre render needing a live MapTiler key
// (VITE_MAPTILER_KEY) to fetch vector tiles — without one it hard-fails (not skips), so
// `bun run check` was silently NOT green on a keyless checkout. Self-skip the same way the
// DW-live suites do without DATAWRAPPER_API_TOKEN (skills/dw-chart/tests/produce.test.ts) and
// map-native's own live-render produce e2e does without this same key
// (skills/map-native/tests/produce-single-format.test.ts).
const hasMapTilerKey = !!process.env.VITE_MAPTILER_KEY;
if (!hasMapTilerKey) {
  console.warn(
    "skills/scrolly/src/produce-geometry-smoke.test.ts: VITE_MAPTILER_KEY not set — skipping (live MapTiler-backed produce e2e)",
  );
}
const d = hasMapTilerKey ? describe : describe.skip;

d("the scrolly CLI resolves a map track's geometry (D5/D7)", () => {
  it("builds the committed sample (a choropleth, un-typed, no bundled geometry) and writes a real Topology into its own output config.json", () => {
    const workDir = mkdtempSync(join(tmpdir(), "scrolly-geometry-smoke-"));
    const outDir = join(workDir, "out");
    try {
      const proc = Bun.spawnSync(
        ["bun", "scripts/produce.mjs", sampleConfigPath, outDir],
        {
          cwd: scrollyRoot,
          stdout: "pipe",
          stderr: "pipe",
          // Measured (lib/loop/map-scrolly-e2e.test.ts's own real build): ~15s for the Vite
          // single-file build + the reduced-motion Playwright snap. Generous margin for
          // contention (this machine runs several worktrees' suites in parallel).
          timeout: 90_000,
        },
      );

      if (proc.exitCode !== 0) {
        throw new Error(
          `produce.mjs exited ${proc.exitCode}\nstdout:\n${proc.stdout.toString()}\nstderr:\n${proc.stderr.toString()}`,
        );
      }

      const config = JSON.parse(
        readFileSync(join(outDir, "config.json"), "utf8"),
      ) as { geometry?: Topology; type?: string; basemap?: string };

      // NOT the fixture's own bytes: the sample on disk carries `basemap`/`regionKey`/`rows`
      // and no `geometry` at all (grep the committed file — this assertion would still pass on
      // a config.json that was merely COPIED from the input, so the real proof is the shape).
      expect(config.geometry?.type).toBe("Topology");
      expect(
        Object.keys(config.geometry?.objects ?? {}).length,
      ).toBeGreaterThan(0);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  }, 90_000);
});
