/**
 * THE SAME MEASUREMENT AS `chart-web/test/keyboard-reach.test.ts`, ON THIS FORMAT'S OWN MARKS.
 *
 * `MapWebSeed.tsx` draws each mark as a real `<button type="button">` — natively focusable with no
 * `tabIndex` needed — carrying `aria-label={detail}` and `data-detail={detail}` off the SAME
 * variable (`assets/MapWebSeed.tsx`, the interaction-layer button), baked at build time rather than
 * assembled by the inline script. This is the measurement that decision earns.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { keyboardReachesEveryMark } from "../scripts/detect-reachable-by-keyboard.mjs";

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

/** The 4 delivered `mapgen-*-web` beats — this format's own generation set, the same 4 files
 *  `same-facts-without-the-picture`'s `map-web` exception in the catalogue measures. */
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
  it("is reachable by Tab and names every one of its marks", async () => {
    const files = mapWebArtifacts();
    expect(files.length).toBeGreaterThanOrEqual(4);
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    const offenders: string[] = [];
    try {
      const page = await browser.newPage();
      for (const file of files) {
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await keyboardReachesEveryMark(page);
        if (found.focusable !== found.marks || found.detailShown !== found.marks)
          offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
