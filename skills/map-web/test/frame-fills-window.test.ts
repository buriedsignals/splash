/**
 * DOES THE GRAPHIC TAKE THE WHOLE BOX ITS HOST GAVE IT — measured on every REAL delivered page, at
 * three widths, in a real browser, never a claim taken on trust.
 *
 * THE RULE THIS FILE NOW ASSERTS, from the owner, looking at a real delivered page in a 2990px
 * window (2026-08-23): *the map must take all the available width, every time* — and, on the
 * correction that followed, *the height is not an editorial choice either; like the scrolly, it must
 * take all the space available.* One rule on both axes.
 *
 * WHAT IT REPLACES, AND WHY BOTH EARLIER READINGS WERE SOUND. This test used to measure
 * `.mw-viewport` against the reader's WINDOW: first as an AREA, then — from 2026-08-23 — as the
 * fraction of the axis the box was BOUND ON, because a portrait plate in a landscape window is
 * smaller in area by construction and the area reading fell when a re-bake made the drawing better.
 * That fix was right, and it is exactly why the page the owner was looking at passed: Japan's box was
 * bound on height, filled it, and read 62.9% while covering 33.2% of its container's width. The
 * quantity changed, not the rigour. `detect-fills-its-frame.mjs`'s own header carries the full
 * argument and the numbers.
 *
 * TWO THINGS THIS FILE DELIBERATELY DOES NOT DO.
 *   · IT DOES NOT CALIBRATE A FLOOR. There is nothing to calibrate: the box is its container or it
 *     is not. The anti-vacuity half that the measured floors needed is replaced by a test that the
 *     rule can still fire — a box deliberately shrunk in the reading goes red.
 *   · IT DOES NOT ASSERT ZERO CLIPPED LABELS. `verify-fills-the-box.mjs` measures those and the two
 *     pages that still cut a run are RECORDED below with the number, because a clearance big enough
 *     to fix them costs more of the subject than the run is worth — stated rather than hidden.
 */
import { describe, expect, it } from "bun:test";
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  containerFraction,
  graphicFillsItsFrame,
  FLOOR_FRACTION,
  SUB_PIXEL,
} from "../scripts/detect-fills-its-frame.mjs";
import {
  plateGeometryFor,
  READING_VIEWPORTS,
} from "../scripts/verify-fills-the-box.mjs";
import { discoverMapWebPages } from "../scripts/discover-pages.mjs";

describe("containerFraction — the worse of the two axes, never an area and never the better one", () => {
  it("reads 1.0 for a box that is its container", () => {
    expect(
      containerFraction(
        { width: 1568, height: 585 },
        { width: 1568, height: 585 },
      ),
    ).toBe(1);
  });

  it("reads the SHORTFALL, not the axis that happens to be full", () => {
    // The shape the binding-axis reading called 100%: a box that fills the height of a wide
    // container and a third of its width. This is the number the owner was looking at.
    expect(
      containerFraction(
        { width: 520.1, height: 566.4 },
        { width: 1568, height: 566.4 },
      ),
    ).toBeCloseTo(0.3317, 4);
    // …and the same shape the other way up.
    expect(
      containerFraction(
        { width: 1568, height: 200 },
        { width: 1568, height: 600 },
      ),
    ).toBeCloseTo(0.3333, 4);
  });

  it("is not an area, which would have called that box 33% full at half the shortfall", () => {
    const box = { width: 1568, height: 300 };
    const container = { width: 1568, height: 600 };
    const area =
      (box.width * box.height) / (container.width * container.height);
    expect(area).toBeCloseTo(0.5, 6);
    expect(containerFraction(box, container)).toBeCloseTo(0.5, 6);
    // They agree here only because one axis is full. They part company as soon as both fall short:
    expect(
      containerFraction({ width: 784, height: 300 }, container),
    ).toBeCloseTo(0.5, 6);
    expect((784 * 300) / (1568 * 600)).toBeCloseTo(0.25, 6);
  });

  it("refuses a side nobody measured rather than answering about it", () => {
    expect(() =>
      containerFraction(
        { width: 100, height: Number.NaN },
        { width: 1568, height: 585 },
      ),
    ).toThrow(/box height/);
    expect(() =>
      containerFraction({ width: 100, height: 100 }, { width: 0, height: 585 }),
    ).toThrow(/no room to fill/);
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

/**
 * THE PAGES THAT DO NOT FILL THEIR CONTAINER, EACH WITH THE MEASUREMENT THAT SAYS WHY, and the list
 * may only shrink.
 *
 * Both are the SAME study set: a camera that already spans a full turn of longitude. There is no
 * world east or west of it to bake margin out of — past the world's own width MapLibre draws a
 * repeat continent carrying none of the beat's marks — so the three requirements are provably
 * two-of-three: at `real-owid-life-expectancy`'s widest measured box, a 1568px-wide graphic showing
 * the whole world is 1065px tall against a 610px stage. Filling the width would cost 42.7% of the
 * latitude range — everything south of 22.7°S and north of 71.8°N.
 *
 * A page earns a place here by DERIVATION, never by being typed in: `deliveryFrame` computes
 * `cannotCover` from the camera's own longitude span, the bake records it in `geometry.json`, the
 * render lays the page out the old way and PRINTS the reason, and this test refuses a page that
 * falls short WITHOUT that finding on its plate. A beat cannot be added here by hand to make it pass.
 */
const STATED_EXCEPTIONS = [
  "proof/mapgen-hexgrid-web/hex-grid.html",
  "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
];

type Reading = {
  rel: string;
  at: string;
  container: { width: number; height: number };
  box: { width: number; height: number };
  cannotCover: unknown;
};

/** Every delivered page, at every width, measured once in one browser. The box AND the container, so
 *  the reading and the thing it is a fraction OF are both in the failure message — a bare percentage
 *  cannot be argued with. */
async function readEveryPage(): Promise<Reading[]> {
  const pages = discoverMapWebPages();
  // A sweep over a population that turned out to be empty passes silently, which is the one way this
  // could go green while measuring nothing at all.
  expect(`${pages.length} map-web pages found`).not.toBe(
    "0 map-web pages found",
  );
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const readings: Reading[] = [];
    for (const found of pages) {
      const geometry = plateGeometryFor(found.abs);
      for (const viewport of READING_VIEWPORTS) {
        await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(found.abs).href, { waitUntil: "load" });
        const measured = await page.evaluate(() => {
          const size = (selector: string) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height };
          };
          return { box: size(".mw-viewport"), container: size(".mw-stage") };
        });
        if (!measured.box || !measured.container)
          throw new Error(
            `${found.rel}: the delivered page has no .mw-viewport inside a .mw-stage`,
          );
        readings.push({
          rel: found.rel,
          at: `${viewport.width}x${viewport.height}`,
          container: measured.container,
          box: measured.box,
          cannotCover: geometry?.cannotCover ?? null,
        });
      }
    }
    return readings;
  } finally {
    await browser.close();
  }
}

describe("the graphic takes the whole box its host gives it", () => {
  it("covers its container on BOTH axes, on every delivered page, at every width", async () => {
    const short: string[] = [];
    for (const reading of await readEveryPage()) {
      if (STATED_EXCEPTIONS.includes(reading.rel)) continue;
      const fraction = containerFraction(reading.box, reading.container);
      if (graphicFillsItsFrame(fraction, FLOOR_FRACTION).under)
        short.push(
          `${reading.rel} @ ${reading.at}: box ${reading.box.width.toFixed(1)}x` +
            `${reading.box.height.toFixed(1)} in a container ${reading.container.width.toFixed(1)}x` +
            `${reading.container.height.toFixed(1)} — covers ${(fraction * 100).toFixed(1)}% of it`,
        );
    }
    expect(short.join("\n") || "every page fills its container").toBe(
      "every page fills its container",
    );
  }, 600000);

  it("names every page that does not, and each one's plate says why", async () => {
    // THE HALF THAT KEEPS THE LIST HONEST, in both directions. A page may only sit in
    // `STATED_EXCEPTIONS` while its own plate carries the DERIVED `cannotCover` finding — so the
    // list cannot be used to excuse a page that merely failed — and a page that stops needing the
    // exception has to be removed rather than left behind as a stale entry.
    const readings = await readEveryPage();
    const falling = new Set(
      readings
        .filter(
          ({ box, container }) =>
            graphicFillsItsFrame(
              containerFraction(box, container),
              FLOOR_FRACTION,
            ).under,
        )
        .map(({ rel }) => rel),
    );
    expect([...falling].sort()).toEqual([...STATED_EXCEPTIONS].sort());
    for (const rel of STATED_EXCEPTIONS) {
      const one = readings.find((reading) => reading.rel === rel);
      expect(
        `${rel}: cannotCover ${one?.cannotCover ? "recorded" : "MISSING"}`,
      ).toBe(`${rel}: cannotCover recorded`);
    }
  }, 600000);

  it("is not vacuous: the rule still fires on a box that fell short", () => {
    // The floors this file used to carry had to be re-measured against a population to stay able to
    // fire. This one cannot drift — but it can be written the wrong way round, so the shape the
    // owner actually reported is asserted red here, against the same floor the sweep uses.
    const owner = containerFraction(
      { width: 520.1, height: 566.4 },
      { width: 1568, height: 566.4 },
    );
    expect(graphicFillsItsFrame(owner, FLOOR_FRACTION).under).toBe(true);
    // …and one sub-pixel of browser rounding is not a shortfall.
    expect(graphicFillsItsFrame(1 - SUB_PIXEL / 2, FLOOR_FRACTION).under).toBe(
      false,
    );
  });
});
