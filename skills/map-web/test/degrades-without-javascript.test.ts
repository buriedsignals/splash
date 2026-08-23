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
import { join } from "node:path";
import puppeteer from "puppeteer";
import { staticFrameSurvives } from "../scripts/detect-degrades-without-javascript.mjs";
import { discoverMapWebPages, TWIN } from "../scripts/discover-pages.mjs";
import {
  RECORDED_PAGES,
  pagesThatLeftTheWalk,
} from "./delivered-pages-ratchet.ts";

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
  it("keeps every mark when scripting is taken away", async () => {
    // DISCOVERED, not listed — see `scripts/discover-pages.mjs`'s own header note: this used to
    // walk 4 hardcoded directories and silently skip 2 of the format's 6 delivered pages.
    //
    // NINE, not seven: `stress-ab-emigration-flows`'s `where-the-routes-lead` beat ships a
    // delivered page and its export copy, both genuinely new map-web pages (round six). The two
    // before them were `stress-f-housing-pressure`'s `housing-pressure-choropleth` (2026-08-20/21).
    // This count is an exact ratchet on purpose — the next beat is expected to redden it too,
    // bumped deliberately rather than widened into a floor. 10 -> 12 on 2026-08-23:
    // `stories/r8-map-web-japan-bear-casualties` landed its render and its export copy, and the
    // ratchet did exactly what it is for — it went red on the beat's own commit and is bumped here,
    // by hand, having driven both new pages.
    const files = discoverMapWebPages().map((page) => page.abs);
    // A PAGE MAY JOIN FREELY; NO PAGE MAY LEAVE UNNAMED. This used to be `expect(…length).toBe(12)`
    // under a paragraph asking the next author to bump it by hand — a count that cannot say WHICH
    // page went missing, stays green on one-in-one-out, and whose honest edit is indistinguishable
    // from the edit that papers a page over. `RECORDED_PAGES` names the population instead.
    // Argued in full in `test/delivered-pages-ratchet.ts`.
    expect(pagesThatLeftTheWalk(RECORDED_PAGES, files, TWIN)).toEqual([]);
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    const offenders: string[] = [];
    try {
      for (const file of files) {
        const page = await browser.newPage();
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await staticFrameSurvives(page);
        if (found.marksWithout !== found.marksWithJs || found.marksWithJs === 0)
          offenders.push(
            `${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`,
          );
        await page.close();
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
