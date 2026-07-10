// The single-format-produce-export redesign: produce.mjs must build EXACTLY the one
// requested VisualFormat's artifacts — no cross-format byproducts (the pre-refactor
// bug: a "formats=all" default always built static+interactive together, and video
// added a third pass on top). Real subprocess runs (real Vite build, real Playwright
// snaps, real Remotion render for the video case) — no mocks, per this repo's testing
// convention (see tests/produce-conformance*.test.ts, package.json's "audit" script).
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

describe("produce.mjs single-format dispatch", () => {
  it("produce interactive builds interactive.html and NOT the static/video artifacts", async () => {
    const out = await runProduce(
      "bar",
      "assets/sample-data/bars.json",
      "interactive",
    );
    expect(existsSync(`${out}/interactive.html`)).toBe(true);
    expect(existsSync(`${out}/static.png`)).toBe(false);
    expect(existsSync(`${out}/static.html`)).toBe(false);
    expect(existsSync(`${out}/portrait.mp4`)).toBe(false);
    expect(existsSync(`${out}/landscape.mp4`)).toBe(false);
    // the review still IS produced (ephemeral Gate-3 byproduct) — never dropped.
    expect(existsSync(`${out}/interactive.png`)).toBe(true);
  }, 120_000);

  it("produce static builds only the image, no html, no video", async () => {
    const out = await runProduce(
      "bar",
      "assets/sample-data/bars.json",
      "static",
    );
    expect(existsSync(`${out}/static.png`)).toBe(true);
    expect(existsSync(`${out}/interactive.html`)).toBe(false);
    expect(existsSync(`${out}/interactive.png`)).toBe(false);
    expect(existsSync(`${out}/landscape.mp4`)).toBe(false);
  }, 120_000);

  it("produce video builds only the mp4 + its review still, no static/interactive artifacts", async () => {
    const out = await runProduce(
      "bar",
      "assets/sample-data/bars.json",
      "video",
    );
    // default channel is article-web -> landscape aspect
    expect(existsSync(`${out}/landscape.mp4`)).toBe(true);
    expect(existsSync(`${out}/video-landscape-still.png`)).toBe(true);
    expect(existsSync(`${out}/static.png`)).toBe(false);
    expect(existsSync(`${out}/interactive.html`)).toBe(false);
    expect(existsSync(`${out}/interactive.png`)).toBe(false);
  }, 180_000);

  it("produce scrolly fails hard — chart-native does not build scrolly directly (owned by the scrolly producer)", () => {
    const configPath = join(root, "assets/sample-data/bars.json");
    const outDir = mkdtempSync(
      join(tmpdir(), "chart-native-produce-bar-scrolly-"),
    );
    let threw = false;
    try {
      execFileSync("bun", [PRODUCE, "bar", configPath, outDir, "scrolly"], {
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

  it('rejects an unknown/legacy format value (e.g. the old "all" default) instead of silently building everything', () => {
    const configPath = join(root, "assets/sample-data/bars.json");
    const outDir = mkdtempSync(join(tmpdir(), "chart-native-produce-bar-all-"));
    let threw = false;
    try {
      execFileSync("bun", [PRODUCE, "bar", configPath, outDir, "all"], {
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
});
