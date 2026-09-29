// THE ROW FLOOR, DRIVEN — the half `row-floor.test.ts` cannot hold by reading.
//
//   1. A declared floor grows the plot cell at 375 px and leaves it untouched at 1400 px — measured
//      against the same page with no declaration, in Chrome.
//   2. `verify-web.mjs`'s fit check, run on real files:
//        - an UNDECLARED page taller than its window still fails "no vertical scroll";
//        - a DECLARED page whose overflow is the floor's own passes it, with the reason printed;
//        - a DECLARED page that also overflows for another reason (furniture taller than the window
//          with or without the floor) still fails, and says the overflow is not the floor's.
//
// The pages are written by the trunk's own `buildCss` / `stampRowFloor` / `webDocument`
// (`row-floor-fixture.ts`). Only the FIT lines of the verifier's report are read: the fixtures draw
// no reading and no control, so the rest of its report is about checks they were never built for.
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { FLOOR, rowPage } from "./row-floor-fixture.ts";

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

const dir = mkdtempSync(join(tmpdir(), "chart-web-row-floor-"));
const write = (name: string, html: string) => {
  const path = join(dir, name);
  writeFileSync(path, html);
  return path;
};

describe("a declared row floor, in a real browser", () => {
  it("grows the cell to the floor at 375 px and leaves it untouched at 1400 px", async () => {
    const plain = write("plain.html", rowPage());
    const floored = write("floored.html", rowPage({ rowFloor: FLOOR }));
    const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--force-device-scale-factor=1"] });
    const cells: Record<string, { w: number; h: number }> = {};
    try {
      const page = await browser.newPage();
      for (const [w, h] of [
        [375, 812],
        [1400, 900],
      ])
        for (const [name, file] of [
          ["plain", plain],
          ["floored", floored],
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
    // 375: the ratio gives 267 × 133.5 — rows 13.4 px apart under 18 px labels. The floor asks for
    // 18 × 400 / 40 = 180 px of cell, and the width does not move.
    expect(cells["plain@375"]).toEqual({ w: 267, h: 133.5 });
    expect(cells["floored@375"]).toEqual({ w: 267, h: 180 });
    // 1400: the ratio already gives 645 px, far above the floor — the page is the page it was.
    expect(cells["floored@1400"]).toEqual(cells["plain@1400"]);
    expect(cells["plain@1400"].h).toBeGreaterThan(180);
  });
});

/** The verifier's FIT lines for one viewport, from a real run on one file. */
function fitLines(file: string, viewport: string) {
  const run = spawnSync("bun", [VERIFIER, "--file", file], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const text = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const fit = text.split("\nFIT —")[1]?.split("\nTYPEFACE —")[0] ?? "";
  return fit.split("\n").filter((l) => l.includes(`${viewport}:`));
}
const line = (lines: string[], what: string) => lines.find((l) => l.includes(what)) ?? `(no "${what}" line)`;

describe("verify-web accepts a scroll only when it is the declared floor's", () => {
  it("still fails an undeclared page that overflows", () => {
    const lines = fitLines(write("undeclared-overflow.html", rowPage({ spacerPx: 700 })), "phone 375x812");
    expect(line(lines, "no vertical scroll")).toMatch(/^\s+FAIL .*the page declares no row floor/);
    expect(line(lines, "the source line is on screen")).toMatch(/^\s+FAIL /);
  });

  it("passes a declared page whose overflow is all the floor's, and says so", () => {
    const lines = fitLines(write("declared-attributable.html", rowPage({ spacerPx: 520, rowFloor: FLOOR })), "phone 375x812");
    expect(line(lines, "no vertical scroll")).toMatch(/^\s+ok .*overflow [1-9]\d*px\) — all of it the declared row floor's/);
    expect(line(lines, "the source line is on screen")).toMatch(/^\s+ok .*the declared row floor scrolls/);
    expect(line(lines, "the x-axis is on screen")).toMatch(/^\s+ok /);
  });

  it("still fails a declared page whose overflow is more than its floor explains", () => {
    const lines = fitLines(write("declared-excess.html", rowPage({ spacerPx: 700, rowFloor: FLOOR })), "phone 375x812");
    expect(line(lines, "no vertical scroll")).toMatch(/^\s+FAIL .*without its row floor the page still overflows/);
    expect(line(lines, "the source line is on screen")).toMatch(/^\s+FAIL /);
  });
});
