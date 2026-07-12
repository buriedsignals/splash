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

describe("produce.mjs single-format dispatch", () => {
  it("produce interactive builds interactive.html and NOT the static/video artifacts", async () => {
    const out = await runProduce(CHOROPLETH_CONFIG, "interactive");
    expect(existsSync(`${out}/interactive.html`)).toBe(true);
    expect(existsSync(`${out}/static.png`)).toBe(false);
    expect(existsSync(`${out}/landscape.mp4`)).toBe(false);
    expect(existsSync(`${out}/portrait.mp4`)).toBe(false);
    // the review still IS produced (ephemeral Gate-3 byproduct) — never dropped.
    expect(existsSync(`${out}/interactive.png`)).toBe(true);
  }, 120_000);

  it("produce static builds only the image, no html, no video", async () => {
    const out = await runProduce(CHOROPLETH_CONFIG, "static");
    expect(existsSync(`${out}/static.png`)).toBe(true);
    expect(existsSync(`${out}/interactive.html`)).toBe(false);
    expect(existsSync(`${out}/interactive.png`)).toBe(false);
    expect(existsSync(`${out}/landscape.mp4`)).toBe(false);
  }, 120_000);

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
  });

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
