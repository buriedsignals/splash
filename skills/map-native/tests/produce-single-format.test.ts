// The single-format-produce-export redesign: produce.mjs must build EXACTLY the one
// requested VisualFormat's artifacts — no cross-format byproducts. Before this change,
// "static" ALSO unconditionally built interactive.html/interactive.png whenever the
// channel allowed interactive (the over-produce bug this locks in the fix for).
// Real subprocess runs (real Vite build, real Playwright snaps, real Remotion render
// for the video case) — no mocks, per this repo's testing convention (mirrors
// chart-native/tests/produce-single-format.test.ts).
import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runProduce } from "./helpers/run-produce.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const PRODUCE = join(root, "scripts", "produce.mjs");
const CHOROPLETH_CONFIG = "assets/sample-data/choropleth.json";

// Gate-contention flake class (the single most frequent root-gate failure this week).
// These e2e tests shell the REAL produce.mjs, which drives live headless MapLibre renders
// that each fetch vector tiles from api.maptiler.com — no mocks, per this repo's testing
// convention. Run in isolation the full map-native suite is ~115 s; but under the
// SEQUENTIAL root gate (scripts/check.mjs) map-native runs AFTER dw-chart's ~15 live
// Datawrapper publishes and chart-native's Remotion renders, and a flapping network plus
// accumulated load stretches a healthy ~86 s "interactive" run past the old 120 s per-test
// ceiling — bun kills the test and the whole gate has to be re-run. The "interactive"
// format is the heaviest: produce.mjs drives SIX live browser renders for it (snap-proof +
// four responsive widths + snap-a11y), each fetching tiles, vs the "static" format's one.
// Give the live-render produce e2e tests generous, bounded headroom (~2.8x the healthy
// baseline) so contention slowness fails-slow-then-passes rather than tripping the timeout;
// a genuine hang still fails cleanly, far under the video watchdog's 15-min ceiling. Mirrors
// the timeout bumps that just fixed the same flake class in install/configurator-core.test.ts
// (real-API round-trips) and skills/map-dw (live e2e). The "video" test below keeps its own
// 180_000 — a single Remotion render on a different engine, already tuned + watchdog-guarded.
const LIVE_RENDER_PRODUCE_TIMEOUT_MS = 240_000;

// Token-free-gate honesty: produce.mjs shells real MapLibre/Remotion renders that need a
// live MapTiler key (VITE_MAPTILER_KEY) to fetch vector tiles — without one every case
// here would hard-fail (not skip), so `bun run check` was silently NOT green on a keyless
// CI checkout. Self-skip the same way the DW-live suites do without DATAWRAPPER_API_TOKEN
// (skills/dw-chart/tests/produce.test.ts).
const hasMapTilerKey = !!process.env.VITE_MAPTILER_KEY;
if (!hasMapTilerKey) {
  console.warn(
    "skills/map-native/tests/produce-single-format.test.ts: VITE_MAPTILER_KEY not set — skipping (live MapTiler-backed produce e2e)",
  );
}
const d = hasMapTilerKey ? describe : describe.skip;

d("produce.mjs single-format dispatch", () => {
  it(
    "produce interactive builds interactive.html and NOT the static/video artifacts",
    async () => {
      const out = await runProduce(CHOROPLETH_CONFIG, "interactive");
      expect(existsSync(`${out}/interactive.html`)).toBe(true);
      expect(existsSync(`${out}/static.png`)).toBe(false);
      expect(existsSync(`${out}/landscape.mp4`)).toBe(false);
      expect(existsSync(`${out}/portrait.mp4`)).toBe(false);
      // the review still IS produced (ephemeral Gate-3 byproduct) — never dropped.
      expect(existsSync(`${out}/interactive.png`)).toBe(true);
    },
    LIVE_RENDER_PRODUCE_TIMEOUT_MS,
  );

  it(
    "produce static builds only the image, no html, no video",
    async () => {
      const out = await runProduce(CHOROPLETH_CONFIG, "static");
      expect(existsSync(`${out}/static.png`)).toBe(true);
      expect(existsSync(`${out}/interactive.html`)).toBe(false);
      expect(existsSync(`${out}/interactive.png`)).toBe(false);
      expect(existsSync(`${out}/landscape.mp4`)).toBe(false);
    },
    LIVE_RENDER_PRODUCE_TIMEOUT_MS,
  );

  it("produce video builds only the mp4 + its review still, no static/interactive artifacts", async () => {
    const out = await runProduce(CHOROPLETH_CONFIG, "video");
    // default channel is article-web -> landscape aspect; the single video format
    // renders the STORY comp (see produce.mjs's "Video-kind note").
    expect(existsSync(`${out}/landscape.mp4`)).toBe(true);
    expect(existsSync(`${out}/video-landscape-still.png`)).toBe(true);
    expect(existsSync(`${out}/static.png`)).toBe(false);
    expect(existsSync(`${out}/interactive.html`)).toBe(false);
    expect(existsSync(`${out}/interactive.png`)).toBe(false);
    // the video snap guard RAN inside produce (fail-hard) and left its report:
    // produce exiting 0 + this file existing = the real map story mp4 passed
    // container sanity, story-animates, and mp4-matches-reviewed-still.
    expect(existsSync(`${out}/video-verify.json`)).toBe(true);
  }, 180_000);

  // No explicit timeout previously (bun:test's 5_000ms default) relied on
  // resolveGeometryForProduce (lib/geo/resolve-for-produce.ts) being skipped for this
  // default-typed choropleth fixture — a bug (config.type default not honoured) fixed
  // separately. Fixed, it correctly resolves geometry (subsetGeometry's real filter +
  // simplify/encode mapshaper passes) BEFORE produce.mjs's switch even inspects the
  // format and refuses "scrolly", so this now legitimately takes ~5.3s (measured) —
  // real headroom, not a shrunk fixture.
  it("produce scrolly fails hard — map-native does not build scrolly directly (owned by the scrolly producer)", () => {
    const configPath = join(root, CHOROPLETH_CONFIG);
    const outDir = mkdtempSync(
      join(tmpdir(), "map-native-produce-choropleth-scrolly-"),
    );
    let threw = false;
    try {
      execFileSync("bun", [PRODUCE, configPath, outDir, "scrolly"], {
        cwd: root,
        stdio: "pipe",
      });
    } catch (e) {
      threw = true;
      const stderr = (e as { stderr?: Buffer }).stderr?.toString("utf8") ?? "";
      expect(stderr).toContain("scrolly");
      expect(existsSync(`${outDir}/scrolly.html`)).toBe(false);
    }
    expect(threw).toBe(true);
  }, 30_000);

  it('rejects an unknown/legacy format value (the old "all" default) instead of silently building everything', () => {
    const configPath = join(root, CHOROPLETH_CONFIG);
    const outDir = mkdtempSync(
      join(tmpdir(), "map-native-produce-choropleth-all-"),
    );
    let threw = false;
    try {
      execFileSync("bun", [PRODUCE, configPath, outDir, "all"], {
        cwd: root,
        stdio: "pipe",
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(existsSync(`${outDir}/static.png`)).toBe(false);
    expect(existsSync(`${outDir}/interactive.html`)).toBe(false);
  });

  it('rejects the retired "reveal"/"story" sub-format values (single-format collapses them into "video")', () => {
    const configPath = join(root, CHOROPLETH_CONFIG);
    for (const legacy of ["reveal", "story"]) {
      const outDir = mkdtempSync(
        join(tmpdir(), `map-native-produce-choropleth-${legacy}-`),
      );
      let threw = false;
      try {
        execFileSync("bun", [PRODUCE, configPath, outDir, legacy], {
          cwd: root,
          stdio: "pipe",
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    }
  });
});
