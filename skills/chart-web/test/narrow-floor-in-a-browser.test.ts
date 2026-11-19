// THE NARROW PAGE SCROLLS RATHER THAN SHRINK THE CHART (render-web.mjs, narrowFloorCss). Measured 2026-11-19 at
// 375 × 812: a header that wraps onto many lines left the plot its 120 px floor, and the cell — which keeps the
// viewBox's ratio — gave its width back with its height; the connected scatter drew in ~140 × 70 px.
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { rowPage } from "./row-floor-fixture.ts";

setDefaultTimeout(600000);

const SKILL = join(import.meta.dirname, "..");
const ROOT = join(SKILL, "..", "..");
const VERIFIER = join(SKILL, "scripts", "verify-web.mjs");

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries. */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

const dir = mkdtempSync(join(tmpdir(), "chart-web-narrow-floor-"));
const write = (name: string, html: string) => {
  const path = join(dir, name);
  writeFileSync(path, html);
  return path;
};

describe("the narrow floor, in a real browser", () => {
  const cells: Record<string, { w: number; h: number }> = {};
  it("keeps the cell at the column's width at 375 px under a tall header, and leaves 1400 px untouched", async () => {
    const plain = write("plain.html", rowPage({ spacerPx: 640 }));
    const narrow = write("narrow.html", rowPage({ spacerPx: 640, narrow: true }));
    const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--force-device-scale-factor=1"] });
    try {
      const page = await browser.newPage();
      for (const [w, h] of [
        [375, 812],
        [1400, 900],
      ])
        for (const [name, file] of [
          ["plain", plain],
          ["narrow", narrow],
        ] as const) {
          await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
          await page.goto(`file://${file}`, { waitUntil: "load" });
          cells[`${name}@${w}`] = await page.evaluate(() => {
            const r = document.querySelector("svg.chart")!.getBoundingClientRect();
            return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
          });
        }
    } finally {
      await browser.close();
    }
    // 375: the column is 327 px, the track 267 px; the ratio gives 267 × 133.5 and the floor holds exactly that.
    expect([cells["plain@375"].w < 267, cells["narrow@375"]]).toEqual([true, { w: 267, h: 133.5 }]);
  });
  it("should leave a wide window's page as it was", () => {
    expect(cells["narrow@1400"]).toEqual(cells["plain@1400"]);
  });
});

function fitLines(file: string, viewport: string) {
  const run = spawnSync("bun", [VERIFIER, "--file", file], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const text = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const fit = text.split("\nFIT —")[1]?.split("\nTYPEFACE —")[0] ?? "";
  return fit.split("\n").filter((l) => l.includes(`${viewport}:`));
}

describe("verify-web and the narrow floor", () => {
  it("should accept a phone scroll that is all the narrow floor's", () => {
    const lines = fitLines(write("narrow-attributable.html", rowPage({ spacerPx: 580, narrow: true })), "phone 375x812");
    expect(lines.find((l) => l.includes("no vertical scroll"))).toMatch(/^\s+ok .*all of it the declared row floor's/);
  });
});
