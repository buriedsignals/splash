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
import { join } from "node:path";
import puppeteer from "puppeteer";
import { keyboardReachesEveryMark } from "../scripts/detect-reachable-by-keyboard.mjs";
import { discoverMapWebPages, TWIN } from "../scripts/discover-pages.mjs";

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
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

describe("every map-web page on disk", () => {
  it("is reachable by Tab and names every one of its marks", async () => {
    // DISCOVERED, not listed — see `scripts/discover-pages.mjs`'s own header note: this used to
    // walk 4 hardcoded directories and silently skip 2 of the format's 6 delivered pages.
    //
    // NINE, not seven: `stress-ab-emigration-flows`'s `where-the-routes-lead` beat ships a
    // delivered page and its export copy, both genuinely new map-web pages (round six). The two
    // before them were `stress-f-housing-pressure`'s `housing-pressure-choropleth` (2026-08-20/21).
    // This count is an exact ratchet on purpose — the next beat is expected to redden it too,
    // bumped deliberately rather than widened into a floor.
    const files = discoverMapWebPages().map((page) => page.abs);
    expect(files.length).toBe(10);
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    const offenders: string[] = [];
    try {
      const page = await browser.newPage();
      for (const file of files) {
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await keyboardReachesEveryMark(page);
        if (
          found.focusable !== found.marks ||
          found.detailShown !== found.marks
        )
          offenders.push(
            `${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`,
          );
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
