/**
 * A CHART-WEB BEAT FILLS THE CONTAINER IT IS GIVEN. NO CAP, NO RUNG.
 *
 * The genre's second build replaced "one SVG per pre-rendered width, swapped by a media query" with
 * ONE fluid frame: geometry stretches, type does not. The owner's own read of the capped build is
 * the reason it exists — *the visual must take the full available width* — and the failure mode is
 * specific and visible: a `.chart-figure` capped at 900px inside a 1600px window leaves 700px of
 * empty page beside the graphic, which reads as a layout that failed rather than as a measure.
 *
 * That build was retired beat by beat, and it was never finished. Measured the day this guard was
 * written: `more-heatmap-co2-per-capita-decades` was the last chart-web beat still shipping two
 * pre-rendered rungs under `.chart-figure { max-width: 900px }` and a `@media (max-width: 675px)`
 * boundary, eleven months after the redesign that removed them everywhere else. Nothing measured it,
 * so nothing said so.
 *
 * WHAT THIS ASSERTS, driven rather than read: for every delivered artifact carrying this genre's own
 * contract class `.chart-figure`, at 1600 and at 3440, **the figure's rendered width is the
 * document's own width**. It is a measurement in a browser, so a cap expressed as `max-width`, as a
 * fixed `width`, as a rung swapped in by a media query, or as a wrapper around the figure all fail
 * it identically — the guard does not care how the cap was written, only that the reader gets one.
 *
 * SCOPE, stated so it is not trusted past it.
 *   1. `.chart-figure` ONLY. The map genre's own root is `.map-figure` / `.map-web-page` and five
 *      map beats DO still cap (860 or 900px of a 1600px window, measured). They are a different
 *      genre with a different frame contract and a chantier of their own; a guard that failed them
 *      here would be asserting a rule nobody has yet decided applies to them.
 *   2. TWO WIDTHS. A frame that fills at 1600 and 3440 and breaks at 900 is not caught.
 *   3. IT SAYS NOTHING ABOUT HEIGHT. `.chart-figure`'s window-fit clamp (`max-height: 100dvh`) is
 *      the other half of the frame rule and is verified by `twin-chart-web/scripts/verify-web.mjs`,
 *      not here.
 *   4. IT SAYS NOTHING ABOUT WHAT IS INSIDE. A figure that fills the window and draws its chart in
 *      the left third passes. `FRAME_PAD_PX` and the plot's own grid are the shared stylesheet's
 *      job.
 *
 * THE MUTATION THAT REDDENS IT, run in a copy of the tree under `/tmp/fluid-mut/`, never here.
 * `.chart-figure { max-width: 900px }` — the exact declaration the heatmap shipped — added to that
 * beat's own appended stylesheet, and the beat re-rendered in the copy:
 *
 *   0 pass · 1 fail
 *   Received: "proof/more-heatmap-co2-per-capita-decades/co2-heatmap.html @ 1600: .chart-figure
 *   renders 900px wide inside a 1600px document — 700px of the frame the reader has is not the
 *   beat's
 *   proof/more-heatmap-co2-per-capita-decades/co2-heatmap.html @ 3440: .chart-figure renders 900px
 *   wide inside a 3440px document — 2540px of the frame the reader has is not the beat's"
 *
 * Two lines, one per width, and the other 17 chart-web artifacts stayed green — so the red is
 * attributable to the beat that was capped.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import puppeteer from "puppeteer";

const TWIN = resolve(import.meta.dirname, "../../..");
const PROOF = join(TWIN, "proof");

setDefaultTimeout(600000);

/** Wide, and wider. 1600 is the width the owner's own capped screenshot was taken at; 3440 is where
 *  a cap is most obviously a defect and where the genre's own verification already drives. */
const WIDTHS = [1600, 3440];

/** How far short of the document a figure may render before it counts as capped. One CSS pixel of
 *  sub-pixel rounding, not a tolerance for a design decision. */
const SLACK_PX = 2;

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason `twin-map-web/test/standalone.test.ts`'s own copy states. */
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

function deliveredHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) deliveredHtml(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out.sort();
}

/** Every `.chart-figure` in the page, with its rendered width against the document's own. A scrolly
 *  ships several; all of them are read, because a capped step is a capped step. */
const READ_FIGURES = `(() => {
  const doc = document.documentElement.clientWidth;
  return {
    doc,
    figures: [...document.querySelectorAll(".chart-figure")].map((f) =>
      Math.round(f.getBoundingClientRect().width),
    ),
  };
})()`;

describe("a chart-web beat's frame is fluid", () => {
  it("fills the width of the document it is opened in", async () => {
    const files = deliveredHtml(PROOF);
    expect(files.length).toBeGreaterThan(0);

    const browser = await puppeteer.launch({
      executablePath: resolveChrome(),
      args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
    });
    const failures: string[] = [];
    const seen: string[] = [];
    try {
      const page = await browser.newPage();
      for (const width of WIDTHS) {
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        for (const file of files) {
          await page.goto(`file://${file}`, { waitUntil: "load" });
          const { doc, figures } = (await page.evaluate(READ_FIGURES)) as {
            doc: number;
            figures: number[];
          };
          if (figures.length === 0) continue;
          const rel = relative(TWIN, file);
          seen.push(`  ${rel} @ ${width}: ${figures.join(", ")} of ${doc}`);
          for (const w of figures)
            if (w < doc - SLACK_PX)
              failures.push(
                `${rel} @ ${width}: .chart-figure renders ${w}px wide inside a ${doc}px document — ` +
                  `${doc - w}px of the frame the reader has is not the beat's`,
              );
        }
      }
    } finally {
      await browser.close();
    }

    console.log(`chart-web figures measured:\n${seen.join("\n")}`);
    expect(seen.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toBe("");
  });
});
