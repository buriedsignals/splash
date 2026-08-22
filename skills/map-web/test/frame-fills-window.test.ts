/**
 * FINDING 3 (round-two stress): does the graphic actually occupy a real share of the reader's own
 * window, at three widths, on a REAL delivered page — never a claim taken on trust. Drives a real
 * browser (the same `resolveChrome`/Puppeteer shape every capture script in this tree carries) and
 * measures `.mw-viewport`'s own bounding box against the window it was opened in.
 *
 * `graphicFillsItsFrame` (`scripts/detect-fills-its-frame.mjs`) is the pure decision and is
 * unchanged; `bindingAxisFraction` in the same file is what this format now feeds it, and that file's
 * own header carries the measurement that withdrew the area fraction.
 *
 * THE POPULATION IS DERIVED, NOT LISTED. This file used to name two pages — the seed and
 * `stress-f-housing-pressure` — while the floor claimed to be a fact about the format. It is now
 * driven over every page `discoverMapWebPages()` finds, which is the same derivation every other
 * sweep in this skill reads, so a beat added tomorrow is measured against the floor rather than
 * silently exempt from it. A floor is only ever as good as the population it was taken from, and
 * this one is now taken from and asserted over the same ten pages.
 */
import { describe, expect, it } from "bun:test";
import puppeteer from "puppeteer-core";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  bindingAxisFraction,
  graphicFillsItsFrame,
  FLOOR_FRACTION,
  MARGIN_FRACTION,
  MEASURED_MIN_FRACTION,
} from "../scripts/detect-fills-its-frame.mjs";
import { discoverMapWebPages } from "../scripts/discover-pages.mjs";

describe("bindingAxisFraction — the axis the box is actually bound on", () => {
  it("reads 1.0 for a portrait box that fills a landscape window's height", () => {
    // The reading the AREA fraction got wrong. A 500x900 plate in a 1600x900 window is a correctly
    // fitted portrait camera: it touches the height and there is no layout that makes it touch the
    // width too. Area says 31.3%; the binding axis says the box is as tall as the window is.
    expect(bindingAxisFraction({ width: 500, height: 900 }, { width: 1600, height: 900 })).toBe(1);
  });

  it("reads 1.0 for a landscape box that fills a portrait window's width", () => {
    expect(bindingAxisFraction({ width: 375, height: 200 }, { width: 375, height: 812 })).toBe(1);
  });

  it("falls when the box failed to grow into the room it had", () => {
    // Half the window on both axes — the shape that is genuinely wrong, and the only shape a floor
    // should be red for.
    expect(
      bindingAxisFraction({ width: 800, height: 450 }, { width: 1600, height: 900 }),
    ).toBeCloseTo(0.5, 10);
  });

  it("is aspect-independent where the area fraction is not", () => {
    // TWO plates, both fitted CORRECTLY, in the SAME window. A 400x900 portrait camera and a
    // 1600x400 landscape one each touch exactly one axis of a 1600x900 window, and neither has any
    // room left to grow into. The binding axis says so about both. The area fraction says 25.0%
    // about one and 44.4% about the other — a 19-point spread between two equally correct bakes,
    // which is the reading that made a re-bake look like a regression.
    const window = { width: 1600, height: 900 };
    const portrait = { width: 400, height: 900 };
    const landscape = { width: 1600, height: 400 };
    expect(bindingAxisFraction(portrait, window)).toBe(1);
    expect(bindingAxisFraction(landscape, window)).toBe(1);
    const area = (box: { width: number; height: number }) =>
      (box.width * box.height) / (window.width * window.height);
    expect(area(portrait)).toBeCloseTo(0.25, 10);
    expect(area(landscape)).toBeCloseTo(0.4444, 4);
  });

  it("refuses a side nobody measured rather than answering about it", () => {
    // `plateFollowsGround`'s own rule, one level down: a fraction built out of a missing number is a
    // reading nobody took, and returning it as a pass is the silent direction.
    expect(() =>
      bindingAxisFraction({ width: 100, height: NaN }, { width: 1600, height: 900 }),
    ).toThrow(/box height/);
    expect(() =>
      bindingAxisFraction({ width: 100, height: 100 }, { width: 0, height: 900 }),
    ).toThrow(/no axis to bind against/);
  });
});

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — a skill's own
 *  scripts stay copy-pasteable, so this is not imported from anywhere else. */
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
    "/usr/bin/google-chrome",
  );
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error(`no Chrome to drive — looked at ${candidates.join(", ")}`);
  return found;
}

const WIDTHS = [
  { w: 1600, h: 900 },
  { w: 1280, h: 800 },
  { w: 375, h: 812 },
];

/** Every delivered page, at every width, measured once in one browser. The box AND the window, so
 *  the reading and the thing it is a fraction OF are both in the failure message — a bare percentage
 *  cannot be argued with. */
async function readEveryPage(): Promise<
  { rel: string; w: number; h: number; box: { width: number; height: number } }[]
> {
  const pages = discoverMapWebPages();
  // A sweep over a population that turned out to be empty passes silently, which is the one way this
  // could go green while measuring nothing at all.
  expect(`${pages.length} map-web pages found`).not.toBe("0 map-web pages found");
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const readings = [];
    for (const found of pages)
      for (const { w, h } of WIDTHS) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(found.abs).href, { waitUntil: "load" });
        const box = await page.evaluate(() => {
          const el = document.querySelector(".mw-viewport");
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height };
        });
        if (!box)
          throw new Error(`${found.rel}: no .mw-viewport on the delivered page`);
        readings.push({ rel: found.rel, w, h, box });
      }
    return readings;
  } finally {
    await browser.close();
  }
}

describe("graphicFillsItsFrame — the binding axis, measured over the derived population", () => {
  it("clears this format's own floor on every delivered page, at every width", async () => {
    const under: string[] = [];
    for (const { rel, w, h, box } of await readEveryPage()) {
      const fraction = bindingAxisFraction(box, { width: w, height: h });
      const found = graphicFillsItsFrame(fraction, FLOOR_FRACTION);
      if (found.under)
        under.push(
          `${rel} @ ${w}x${h}: box ${box.width.toFixed(1)}x${box.height.toFixed(1)} covers ` +
            `${(fraction * 100).toFixed(1)}% of the axis it is bound on, under a ` +
            `${(FLOOR_FRACTION * 100).toFixed(1)}% floor`,
        );
    }
    expect(under.join("\n") || "every page clears the floor").toBe(
      "every page clears the floor",
    );
  }, 300000);

  it("is not vacuous: the floor is close enough to the population to be able to fire", async () => {
    // THE HALF THAT MAKES THE FLOOR A MEASUREMENT RATHER THAN A DECORATION. A floor of 0 would pass
    // the test above forever. `MEASURED_MIN_FRACTION` claims to be the worst reading this population
    // actually produces, so the worst reading has to sit ON it, not miles above it — otherwise the
    // constant is a number nobody re-derived and the next author cannot tell.
    const readings = await readEveryPage();
    const worst = readings
      .map(({ rel, w, h, box }) => ({
        rel,
        at: `${w}x${h}`,
        fraction: bindingAxisFraction(box, { width: w, height: h }),
      }))
      .sort((a, b) => a.fraction - b.fraction)[0];
    expect(
      `worst ${(worst.fraction * 100).toFixed(1)}% (${worst.rel} @ ${worst.at})`,
    ).toBe(`worst ${(worst.fraction * 100).toFixed(1)}% (${worst.rel} @ ${worst.at})`);
    // Within one margin of the declared minimum, in both directions: below it and the constant is
    // stale, far above it and the constant was never measured over this population.
    expect(worst.fraction).toBeGreaterThanOrEqual(MEASURED_MIN_FRACTION);
    expect(worst.fraction).toBeLessThan(MEASURED_MIN_FRACTION + MARGIN_FRACTION);
  }, 300000);
});
