/**
 * A FIXED MASTHEAD IS NOT PART OF THE PIECE'S GRAPHIC.
 *
 * THE DEFECT, found independently by two re-verification agents on two different families.
 * Photographing the element instead of cropping the page (METHOD correction 13) fixed the
 * coordinate arithmetic and left a residue: puppeteer scrolls the element into view, and a
 * `position: fixed` masthead is then painted over its first rows. On `100.datavizproject.com` the
 * panel sits 172 px down under a fixed nav, so every clip carried three or four rows of solid
 * `rgb(50, 116, 218)` — 2 472 px, 0.365 % of every frame, in all five records.
 *
 * A third of a percent would be a rounding error if the nav were any other colour. It is the same
 * blue Ferdio draws its charts in. Measured: the strip is 96 % of one record's entire reported blue,
 * 84 % of another's, 55.7 % of a third's — and it is why one record buckets at `#3274D9` where its
 * siblings say `#3274D8`. Every guard passed on all five.
 *
 * The page is left as it was found. Only the picture changes.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";
import { withFloatingChromeHidden } from "../../../scripts/design-base/harvest.mjs";
import { findGraphic } from "../../../scripts/design-base/harvest-styles.mjs";

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
];

/**
 * Ferdio's own shape, and the height matters. Puppeteer CENTRES an element that fits, so a short
 * graphic clears the masthead on its own and the defect does not reproduce — measured, on the first
 * version of this fixture. Ferdio's panel is 823 px in a 900 px viewport: too tall to be centred
 * clear of an 80 px nav, so the nav lands on it. The graphic here is 860.
 */
const NAV = { r: 50, g: 116, b: 218 };
const PAGE = `<!doctype html><body style="margin:0;background:#FFFFFF">
  <div style="position:fixed;top:0;left:0;width:1440px;height:80px;background:rgb(50,116,218)"></div>
  <div style="height:900px"></div>
  <svg width="800" height="860"><rect width="800" height="860" fill="#E41E26"></rect></svg>
  <div style="height:1200px"></div>
</body>`;

let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
let page: Awaited<ReturnType<typeof browser.newPage>>;
let DIR: string;

beforeAll(async () => {
  const chrome = CHROMES.find(existsSync);
  if (!chrome) throw new Error(`no Chrome at any of: ${CHROMES.join(", ")}`);
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setContent(PAGE, { waitUntil: "load" });
  DIR = mkdtempSync(join(tmpdir(), "splash-fixed-"));
});

afterAll(async () => {
  await browser?.close();
  rmSync(DIR, { recursive: true, force: true });
});

/** How many pixels of the shot are the masthead's exact colour. */
function navPixels(file: string): number {
  const png = PNG.sync.read(readFileSync(file));
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4)
    if (png.data[i] === NAV.r && png.data[i + 1] === NAV.g && png.data[i + 2] === NAV.b) n += 1;
  return n;
}

describe("photographing a graphic that scrolls under a fixed masthead", () => {
  it("should carry the masthead into the picture when nothing hides it", async () => {
    // The test's own premise. Without this the fix below could be passing because the fixture never
    // reproduced the defect — which is how a green test that proves nothing gets written.
    const { element: target } = await findGraphic(page);
    expect(target).not.toBeNull();
    const naked = join(DIR, "naked.png");
    await target!.screenshot({ path: naked });
    expect(navPixels(naked)).toBeGreaterThan(1000);
    await target!.dispose();
  });

  it("should photograph only the graphic when the floating chrome is hidden", async () => {
    const { element: target } = await findGraphic(page);
    const clean = join(DIR, "clean.png");
    await withFloatingChromeHidden(
      page,
      () => target!.screenshot({ path: clean }),
      target,
    );
    expect(navPixels(clean)).toBe(0);
    await target!.dispose();
  });



  it("should leave the page exactly as it found it", async () => {
    // A harvester that fixed its picture by permanently altering the page would measure a document
    // nobody publishes, and the style route runs on that same document.
    const before = await page.evaluate(
      () => getComputedStyle(document.querySelector("div")!).visibility,
    );
    const { element: target } = await findGraphic(page);
    await withFloatingChromeHidden(page, () => target!.screenshot({ path: join(DIR, "x.png") }));
    await target!.dispose();
    const after = await page.evaluate(() => ({
      visibility: getComputedStyle(document.querySelector("div")!).visibility,
      marked: document.querySelectorAll("[data-harvest-hidden]").length,
    }));
    expect(after.visibility).toBe(before);
    expect(after.marked).toBe(0);
  });
});

/**
 * A SCROLLYTELLING GRAPHIC IS ITSELF `position: sticky`, AND THE FIX ABOVE HID IT.
 *
 * THE DEFECT, and it was this file's own fix. Sticky is how a scrollytelling chart holds still
 * while the prose scrolls past it, so a rule that hid everything floating hid the piece. Measured
 * within the hour of writing the rule, on ABC's mullet count: its 1440 x 900 canvas came back
 * 97.76 % cream, zero chromatic, `monochrome` — a true photograph of a graphic the harvester had
 * just made invisible, filed as the piece's palette, and green all the way through.
 *
 * With the graphic and its holders exempt the same reference reads `#1757B6` at 2.04 %, against
 * 1.12 % before any of this: brought into view and given time, it finishes drawing.
 */
describe("a graphic that is itself sticky", () => {
  const STICKY = `<!doctype html><body style="margin:0;background:#FFFFFF">
    <div style="position:fixed;top:0;left:0;width:1440px;height:80px;background:rgb(50,116,218)"></div>
    <div style="height:900px"></div>
    <div style="position:sticky;top:0;height:900px">
      <svg width="800" height="700"><rect width="800" height="700" fill="#E41E26"></rect></svg>
    </div>
    <div style="height:2000px"></div>
  </body>`;

  it("should photograph the piece, not an invisible one", async () => {
    const sticky = await browser.newPage();
    await sticky.setViewport({ width: 1440, height: 900 });
    await sticky.setContent(STICKY, { waitUntil: "load" });
    const { element: target } = await findGraphic(sticky);
    expect(target).not.toBeNull();
    const shot = join(DIR, "sticky.png");
    await withFloatingChromeHidden(
      sticky,
      () => target!.screenshot({ path: shot }),
      target,
    );
    await target!.dispose();

    const png = PNG.sync.read(readFileSync(shot));
    let drawn = 0;
    for (let i = 0; i < png.data.length; i += 4)
      if (png.data[i] === 228 && png.data[i + 1] === 30 && png.data[i + 2] === 38) drawn += 1;
    expect(drawn).toBeGreaterThan(png.width * png.height * 0.9);
    expect(navPixels(shot)).toBe(0);
    await sticky.close();
  });
});

/**
 * THE FRAME HAS ITS OWN CHROME, AND THE FIRST PASS DID NOT REACH IT.
 *
 * THE DEFECT, measured on NSIDC's Charctic. The graphic is an iframe; its masthead is `sticky`
 * INSIDE that frame's own document, so hiding floating elements in the host page left it in the
 * picture. `#C4E0F5`, `#003366` and `#0062CC` led the palette, `measuredFrom` said `graphic.png`,
 * and the record was true and useless. It was caught only because the style route independently
 * named a different set of marks — one route checking the other, which is not a guard.
 */
describe("a graphic in a frame that carries its own masthead", () => {
  const INNER =
    `<body style="margin:0;background:#FFFFFF">` +
    `<div style="position:sticky;top:0;height:80px;background:rgb(50,116,218)"></div>` +
    `<svg width="800" height="700"><rect width="800" height="700" fill="#E41E26"></rect></svg>` +
    `</body>`;

  it("should hide the frame's own floating furniture too", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(
      `<!doctype html><body style="margin:0">` +
        `<iframe srcdoc="${INNER.replace(/"/g, "&quot;")}" style="width:1000px;height:800px;border:0"></iframe>` +
        `</body>`,
      { waitUntil: "load" },
    );
    const { element: target } = await findGraphic(page);
    expect(await target!.evaluate((el) => el.tagName)).toBe("IFRAME");
    const shot = join(DIR, "framed.png");
    await withFloatingChromeHidden(page, () => target!.screenshot({ path: shot }), target);
    expect(navPixels(shot)).toBe(0);
    await target!.dispose();
    await page.close();
  });
});
