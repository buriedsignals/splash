/**
 * THE SAME MEASUREMENT AS `chart-web/test/degrades-without-javascript.test.ts`, ON THIS FORMAT'S
 * OWN MARKS.
 *
 * `MapWebSeed.tsx`'s own comment states the discipline: "`aria-label`/`data-detail` are baked in at
 * build time, not assembled by the inline script, so the no-JS page is still keyboard-reachable and
 * its value is still announced with the script absent entirely." This is the measurement that claim
 * earns for the marks themselves.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { staticFrameSurvives } from "../scripts/detect-degrades-without-javascript.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

setDefaultTimeout(600000);

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason every other copy in this repository states. */
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

/** The 4 delivered `mapgen-*-web` beats — the same set `keyboard-reach.test.ts` walks. */
function mapWebArtifacts(): string[] {
  const dirs = ["mapgen-symbol-web", "mapgen-dot-web", "mapgen-hexgrid-web", "mapgen-locator-web"];
  const found: string[] = [];
  for (const dir of dirs) {
    const full = join(PROOF, dir);
    if (!existsSync(full)) continue;
    for (const entry of readdirSync(full)) if (entry.endsWith(".html")) found.push(join(full, entry));
  }
  return found;
}

describe("every map-web page on disk", () => {
  it("keeps every mark when scripting is taken away", async () => {
    const files = mapWebArtifacts();
    expect(files.length).toBeGreaterThanOrEqual(4);
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    const offenders: string[] = [];
    try {
      for (const file of files) {
        const page = await browser.newPage();
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await staticFrameSurvives(page);
        if (found.marksWithout !== found.marksWithJs || found.marksWithJs === 0)
          offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
        await page.close();
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
