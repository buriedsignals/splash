/**
 * THE STYLE ROUTE: a page's own typographic signature, read from its computed styles.
 *
 * This is the half of the harvest that reaches TYPE. What it measures is exactly what separates
 * published work from this tree's own output: across 122 components Splash uses one family, four
 * weights, and — measured on 2026-09-07 — ZERO italic, ZERO letter-spacing and ZERO case
 * transforms, while ABC alone uses 77 letter-spaced runs and 57 case-transformed ones. A harvester
 * that collapsed those into one tuple would report the two as identical, so the three tests below
 * are the ones that matter.
 *
 * It drives a real browser, so it lands in the HEAVY lane on its own: `scripts/test-lanes.mjs`
 * derives the lane by following imports, and nothing needs registering.
 *
 * The page is built with `setContent`, never fetched: a test whose result depends on a live
 * newsroom's markup fails for reasons that have nothing to do with this code.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import {
  harvestStyles,
  findGraphic,
  describeGraphic,
} from "../../../scripts/design-base/harvest-styles.mjs";

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
];

const PAGE = `<!doctype html><body style="background:#FFFCEE;margin:0">
  <!-- IIB's page ROOT is div#iib-page.iib-base.has-banner--top. A class match that did not ask
       how big the match was called the whole document a banner and found no graphic anywhere. -->
  <div class="page-root has-banner--top">
  <h1 style="font-family:Georgia;font-size:30px;font-weight:700">Plain heading</h1>
  <p style="font-family:Georgia;font-size:14px;font-style:italic;width:600px">An italic caveat that runs on long enough to be measured as a real column of running text rather than as a caption or a label, which is the distinction the column floor exists to draw.</p>
  <span style="font-family:Helvetica;font-size:10px;letter-spacing:2px;text-transform:uppercase">tracked label</span>
  <!-- Four runs identical on family, size and weight, differing ONLY on the three axes this tree
       never uses. If the key drops any of them these collapse into one tuple, and the harvester
       reports a page's whole annotation register as its axis register. -->
  <span style="font-family:Helvetica;font-size:12px;font-weight:400">register plain</span>
  <span style="font-family:Helvetica;font-size:12px;font-weight:400;font-style:italic">register italic</span>
  <span style="font-family:Helvetica;font-size:12px;font-weight:400;letter-spacing:3px">register tracked</span>
  <span style="font-family:Helvetica;font-size:12px;font-weight:400;text-transform:uppercase">register caps</span>
  <div style="display:none"><p style="font-family:Georgia;font-size:99px">Never painted, never counted, and long enough to pass the length floor for a column.</p></div>
  <!-- The site's own wordmark, drawn LARGER than the piece's chart so that size alone cannot
       separate them. It is chrome because of where it lives, and that is the only thing that
       tells them apart. -->
  <header><svg width="900" height="600"><rect width="900" height="600" fill="#3274DA"></rect></svg></header>
  <svg width="400" height="300"><circle cx="30" cy="30" r="20" fill="#0B7A75"></circle><line x1="0" y1="0" x2="120" y2="60" stroke="#E41E26"></line></svg>
  <!-- Over the floor on one axis only: an icon strip is not a graphic. -->
  <svg width="1400" height="100"><rect width="1400" height="100" fill="#111111"></rect></svg>
  </div>
</body>`;

let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
let measured: Awaited<ReturnType<typeof harvestStyles>>;
let picked: Awaited<ReturnType<typeof describeGraphic>> | null;

beforeAll(async () => {
  const chrome = CHROMES.find(existsSync);
  if (!chrome) throw new Error(`no Chrome at any of: ${CHROMES.join(", ")}`);
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setContent(PAGE, { waitUntil: "load" });
  measured = await harvestStyles(page);
  const { element: graphic } = await findGraphic(page);
  picked = graphic ? await describeGraphic(graphic) : null;
});

afterAll(async () => {
  await browser?.close();
});

describe("the style route", () => {
  it("should keep four runs that differ ONLY on italic, tracking and case as four tuples", () => {
    // The decision under test is the KEY, and it can only be tested by runs that agree on
    // everything else. Four spans at Helvetica 12/400 differ one axis each; a key that drops any
    // axis merges them, and a page's annotation register is then reported as its axis register.
    const register = measured.type.filter(
      (t) => t.family === "Helvetica" && t.size === 12,
    );
    expect(register).toHaveLength(4);
    expect(new Set(register.map((t) => t.key)).size).toBe(4);
    expect(register.filter((t) => t.style === "italic")).toHaveLength(1);
    expect(register.filter((t) => Number(t.tracking) === 3)).toHaveLength(1);
    expect(register.filter((t) => t.transform === "uppercase")).toHaveLength(1);
  });

  it("should record absent tracking as the number zero, not as the word normal", () => {
    // `letterSpacing` reads back as "normal" when unset. Kept as a word it sorts and compares
    // against nothing, and two runs at zero tracking look different from each other.
    const plain = measured.type.find(
      (t) =>
        t.family === "Helvetica" &&
        t.size === 12 &&
        t.style === "normal" &&
        t.transform === "none",
    );
    expect(plain?.tracking).toBe(0);
  });

  it("should carry the other five axes on the tuple as well as in the key", () => {
    const italic = measured.type.find(
      (t) => t.family === "Georgia" && t.style === "italic",
    );
    expect(italic?.size).toBe(14);

    const tracked = measured.type.find(
      (t) => t.family === "Helvetica" && t.size === 10,
    );
    expect(tracked?.transform).toBe("uppercase");
    expect(Number(tracked?.tracking)).toBe(2);
  });

  it("should read the ground off the page rather than assuming white", () => {
    expect(measured.ground).toBe("rgb(255, 252, 238)");
  });

  it("should take both fill and stroke off the marks", () => {
    const colours = measured.marks.map((m) => m.colour);
    expect(
      colours.some((c) => c.startsWith("fill") && c.includes("11, 122, 117")),
    ).toBe(true);
    expect(
      colours.some((c) => c.startsWith("stroke") && c.includes("228, 30, 38")),
    ).toBe(true);
  });

  it("should count nothing that is not painted", () => {
    // A hidden element carries computed styles like any other. Counting it would report a
    // typographic vocabulary the reader never sees.
    expect(measured.type.some((t) => t.size === 99)).toBe(false);
  });

  it("should measure the column off the widest paragraph actually painted", () => {
    expect(measured.column?.px).toBe(600);
    expect(measured.column?.ch).toBeGreaterThan(50);
  });

  it("should never file the site's own masthead as the piece's graphic", () => {
    // THE DEFECT THIS CLOSES, measured on 2026-09-08. The pixel route and the style route each
    // looked for the graphic on their own, and filed `logo-100.svg` — 280x80 in Ferdio's masthead —
    // against a chart the other one had photographed. Both halves read as measured and they named
    // different objects. Here the masthead is 900x600 and the chart 400x300, so only the exclusion
    // can separate them.
    expect(picked?.w).toBe(400);
    expect(picked?.h).toBe(300);
    expect(picked?.tag).toBe("svg");
  });

  it("should not call a strip under the floor on one axis a graphic", () => {
    // 1400x100 beats the 400x300 chart on area and paints nothing a reader can read as a chart.
    // Area alone would file it; a floor on BOTH axes is what refuses it.
    expect(picked?.h).toBeGreaterThanOrEqual(120);
  });

  it("should not call the whole document a banner because its wrapper is named after one", () => {
    // THE DEFECT THIS CLOSES. `[class*='banner']` matched `div#iib-page.has-banner--top`, the root
    // of every informationisbeautiful.net page, so every graphic on the site was "inside a banner"
    // and twenty references were filed as having no graphic — which reads exactly like a page that
    // has none. A class match counts only while the thing it matched is actually a strip.
    expect(picked).not.toBeNull();
  });
});

/**
 * THE GRAPHIC IN ANOTHER DOCUMENT.
 *
 * Every informationisbeautiful.net piece embeds its visualisation from `vizsweet.com`. Re-measured
 * on 2026-09-08, the host page reports IBM Plex Sans and Quicksand — the article's furniture — and
 * the frame reports Inter Tight at 45.2 for the title, uppercase at 14 for the film names, and
 * seven mark colours. Twenty records had been filed carrying the first and calling it the graphic's.
 */
const EMBEDDED = `<!doctype html><body style="background:#FFFFFF;margin:0">
  <p style="font-family:Georgia;font-size:16px;width:600px">The article around the graphic, long enough to be measured as a real column of running text rather than as a caption, which is the distinction the column floor draws.</p>
  <svg width="300" height="200"><rect width="300" height="200" fill="#DDDDDD"></rect></svg>
  <iframe style="width:1000px;height:700px;border:0" srcdoc="<body style='margin:0;background:#26232C'><h1 style='font-family:Courier;font-size:44px;letter-spacing:3px;color:#FFFFFF'>The graphic speaks for itself</h1></body>"></iframe>
</body>`;

describe("a graphic served from another document", () => {
  let host: Awaited<ReturnType<typeof puppeteer.launch>>;
  let graphic: Awaited<ReturnType<typeof describeGraphic>> | null;
  let inside: Awaited<ReturnType<typeof harvestStyles>> | null;
  let outside: Awaited<ReturnType<typeof harvestStyles>>;

  beforeAll(async () => {
    const chrome = CHROMES.find(existsSync);
    if (!chrome) throw new Error(`no Chrome at any of: ${CHROMES.join(", ")}`);
    host = await puppeteer.launch({
      executablePath: chrome,
      headless: "new",
      args: ["--no-sandbox"],
    });
    const page = await host.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(EMBEDDED, { waitUntil: "load" });
    outside = await harvestStyles(page);
    const { element: handle } = await findGraphic(page);
    graphic = handle ? await describeGraphic(handle) : null;
    const frame = handle ? await handle.contentFrame() : null;
    inside = frame ? await harvestStyles(frame) : null;
  });

  afterAll(async () => {
    await host?.close();
  });

  it("should pick the frame over the page's own smaller svg", () => {
    expect(graphic?.tag).toBe("iframe");
    expect(graphic?.w).toBe(1000);
  });

  it("should read the type INSIDE the frame, which the host page does not contain", () => {
    // The host reports Georgia. The graphic reports Courier at 44 with three of tracking. A record
    // that carried only the host's reading would describe the publisher, not the piece.
    expect(outside.type.some((t) => t.family === "Courier")).toBe(false);
    const display = inside?.type.find((t) => t.family === "Courier");
    expect(display?.size).toBe(44);
    expect(Number(display?.tracking)).toBe(3);
  });

  it("should not take an empty frame over a real graphic", async () => {
    // THE DEFECT THIS CLOSES, measured on Reuters' swing-states record. The picker returned a
    // 300 x 250 `about:blank` iframe at the top of the page — the standard IAB medium rectangle,
    // unfilled. It cleared the size floor and sat in no landmark, so nothing refused it, and the
    // record then carried a frame reading with ZERO type tuples that read as a completed
    // measurement of the piece. Here the empty frame is three times the chart's area.
    const page = await host.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(
      `<!doctype html><body style="margin:0">` +
        `<iframe src="about:blank" style="width:900px;height:700px;border:0"></iframe>` +
        `<svg width="400" height="300"><rect width="400" height="300" fill="#E41E26"></rect></svg>` +
        `</body>`,
      { waitUntil: "load" },
    );
    const { element } = await findGraphic(page);
    expect(await element!.evaluate((el) => el.tagName)).toBe("svg");
    await page.close();
  });

  it("should read the frame's own ground, not the page's", () => {
    expect(outside.ground).toBe("rgb(255, 255, 255)");
    expect(inside?.ground).toBe("rgb(38, 35, 44)");
  });
});

/**
 * THE LARGEST GRAPHIC ON A PAGE NEED NOT BE THE ONE THE URL NAMES.
 *
 * Two re-verification agents found this independently, on different families. An
 * informationisbeautiful.net page carries the piece it is about AND the next piece down: on
 * *Major LLMs ranked by performance* the named chart is a 1380 x 806 frame and a treemap five
 * screens below is 1280 x 903 — 43 560 pixels larger. The record then reads `ok`,
 * `measuredFrom: graphic.png`, and reports a real, correct palette of the wrong drawing. Nothing
 * arithmetic catches that: it is a true measurement of a different piece.
 */
const TWO_PIECES = `<!doctype html><body style="margin:0;background:#FFFFFF">
  <svg id="named" width="1000" height="700"><rect width="1000" height="700" fill="#1757B6"></rect></svg>
  <div style="height:4000px"></div>
  <svg id="later" width="1100" height="800"><rect width="1100" height="800" fill="#E41E26"></rect></svg>
</body>`;

describe("a page carrying two pieces", () => {
  let host: Awaited<ReturnType<typeof puppeteer.launch>>;
  let picked: Awaited<ReturnType<typeof describeGraphic>> | null;
  let buried: Awaited<ReturnType<typeof describeGraphic>> | null;
  let banner: Awaited<ReturnType<typeof describeGraphic>> | null;
  let grid: Awaited<ReturnType<typeof findGraphic>>;
  let layers: Awaited<ReturnType<typeof findGraphic>>;

  beforeAll(async () => {
    const chrome = CHROMES.find(existsSync);
    if (!chrome) throw new Error(`no Chrome at any of: ${CHROMES.join(", ")}`);
    host = await puppeteer.launch({
      executablePath: chrome,
      headless: "new",
      args: ["--no-sandbox"],
    });
    const page = await host.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(TWO_PIECES, { waitUntil: "load" });
    const { element: handle } = await findGraphic(page);
    picked = handle ? await describeGraphic(handle) : null;

    // And the other case: a page whose ONLY graphic is far down is still measured, because a page
    // that buries its graphic is a real page.
    const second = await host.newPage();
    await second.setViewport({ width: 1440, height: 900 });
    await second.setContent(
      `<!doctype html><body style="margin:0"><div style="height:4000px"></div>${'<svg width="1100" height="800"><rect width="1100" height="800" fill="#E41E26"></rect></svg>'}</body>`,
      { waitUntil: "load" },
    );
    const { element: deep } = await findGraphic(second);
    buried = deep ? await describeGraphic(deep) : null;

    // ABC's shape: a small banner up top, the real chart far below and six times its size.
    const third = await host.newPage();
    await third.setViewport({ width: 1440, height: 900 });
    await third.setContent(
      `<!doctype html><body style="margin:0">` +
        `<svg width="900" height="230"><rect width="900" height="230" fill="#CCCCCC"></rect></svg>` +
        `<div style="height:1600px"></div>` +
        `<svg width="1200" height="760"><rect width="1200" height="760" fill="#1757B6"></rect></svg>` +
        `</body>`,
      { waitUntil: "load" },
    );
    const { element: real } = await findGraphic(third);
    banner = real ? await describeGraphic(real) : null;

    // NPR's shape: a wall of covers, all one size and all narrow. Ten is the count threshold and
    // half the viewport is the width one, so twelve covers at 240 px make the case on both.
    const fourth = await host.newPage();
    await fourth.setViewport({ width: 1440, height: 900 });
    const cover = '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" style="width:240px;height:406px">';
    await fourth.setContent(`<!doctype html><body style="margin:0">${cover.repeat(12)}</body>`, {
      waitUntil: "load",
    });
    grid = await findGraphic(fourth);

    // ProPublica's shape: one map drawn as several stacked full-width layers. Twelve of them, so
    // only the width condition can tell this from the wall of covers above.
    const fifth = await host.newPage();
    await fifth.setViewport({ width: 1440, height: 900 });
    const layer = '<svg width="1400" height="800"><rect width="1400" height="800" fill="#1757B6"></rect></svg>';
    await fifth.setContent(`<!doctype html><body style="margin:0">${layer.repeat(12)}</body>`, {
      waitUntil: "load",
    });
    layers = await findGraphic(fifth);
  });

  afterAll(async () => {
    await host?.close();
  });

  it("should take the piece the page leads with, not the larger one below it", () => {
    expect(picked?.w).toBe(1000);
    expect(picked?.nearTheTop).toBe(true);
  });

  it("should take the far larger piece below over a banner at the top", () => {
    // THE REGRESSION THIS CLOSES, measured on the real corpus. A first version preferred anything in
    // the first screens outright, and the ABC mullet record went from its 1440 x 900 chart at
    // y=1840 to a 900 x 230 banner at y=128 — a sixth the size. Position breaks a tie between
    // rivals; it does not promote a decoration over the piece.
    expect(banner?.w).toBe(1200);
    expect(banner?.h).toBe(760);
  });

  it("should refuse a wall of thumbnails rather than return an arbitrary one of them", () => {
    // THE DEFECT THIS CLOSES. Preferring the earliest among comparable rivals is right when there
    // are two. On NPR's *Book Concierge* there are two hundred book covers, and the rule dutifully
    // returned the first one — a different arbitrary answer, not a better one. Measured on the three
    // pages that define the question: NPR has 91 candidates within 75 % of its largest, the IIB page
    // that genuinely carries two pieces has 2, ABC's single dominant chart has 1.
    expect(grid.element).toBeNull();
    expect(grid.why).toMatch(/grid of \d+ images/);
  });

  it("should not call an article of full-width panels a grid", () => {
    // THE REGRESSION THIS CLOSES, measured on the corpus. A count alone took the corpus from two
    // refusals to six, and four of the six were real graphics — ABC's seven slope panels,
    // ProPublica's map drawn as six stacked full-viewport SVGs, La Nación's map, ESPN. A grid is
    // many candidates AND small ones: six drawings at full width are layers of one picture, not
    // tiles of anything.
    expect(layers.element).not.toBeNull();
    expect(layers.why).toBeNull();
  });

  it("should still measure a page that buries its only graphic, and say that it did", () => {
    // The preference is not a floor. What it may never do is hide that it did not apply.
    expect(buried?.w).toBe(1100);
    expect(buried?.nearTheTop).toBe(false);
    expect(buried?.documentTop).toBeGreaterThan(1800);
  });
});

/**
 * A FIXED SHEET OVER THE WHOLE VIEWPORT IS A VEIL, AND IT WINS BY BEING BIGGEST.
 *
 * THE DEFECT, measured on Eurostat's energy-balance app. Two SVGs on the page: the diagram at
 * 1440 x 803, and a `position: fixed` sheet at 1440 x 900 filled `rgba(255,255,255,0.08)` — the
 * guided tour's veil. The veil is larger, so the picker chose it; and since a graphic is never
 * hidden from its own photograph, the floating-chrome pass then exempted the one thing it exists to
 * remove. `#999999` at 68.42 %: a dimmed screenshot of a website, both routes green.
 */
describe("a page wearing a guided-tour veil", () => {
  it("should photograph the diagram under the sheet, not the sheet", async () => {
    const host = await puppeteer.launch({
      executablePath: CHROMES.find(existsSync)!,
      headless: "new",
      args: ["--no-sandbox", "--hide-scrollbars"],
    });
    const page = await host.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(
      // THE VEIL COMES FIRST IN DOCUMENT ORDER, as it does on the live page. Written the other way
      // round this fixture proves nothing: the two are of comparable size and both at the top, so
      // the earliest already wins and the diagram is picked whether the veil rule exists or not.
      // That version was written, run against a mutation, and stayed green.
      `<!doctype html><body style="margin:0">` +
        `<svg style="position:fixed;top:0;left:0" width="1440" height="900">` +
        `<rect width="1440" height="900" fill="rgba(255,255,255,0.08)"></rect></svg>` +
        `<svg width="1400" height="803"><rect width="1400" height="803" fill="#1757B6"></rect></svg>` +
        `</body>`,
      { waitUntil: "load" },
    );
    const { element } = await findGraphic(page);
    const box = element ? await describeGraphic(element) : null;
    expect(box?.w).toBe(1400);
    expect(box?.h).toBe(803);
    await host.close();
  });
});

/**
 * A SCAFFOLD OUTSIDE THE DOCUMENT IS NOT A GRAPHIC.
 *
 * Measured on Plotly's documentation pages: `svg 9000 x 9000` at `documentTop -10000` won the
 * largest-painted rule, because that rule had no ceiling and no floor on where a graphic may sit.
 * Two discriminators, both needed: a negative document offset says the element is not in the flow,
 * and a box several times the viewport on both axes says it was never meant to be read at that size.
 */
describe("a page carrying a scaffold", () => {
  /** One page, one real chart, and one thing pretending to be one. */
  async function pickedWidthBeside(scaffold: string): Promise<number | undefined> {
    const host = await puppeteer.launch({
      executablePath: CHROMES.find(existsSync)!,
      headless: "new",
      args: ["--no-sandbox", "--hide-scrollbars"],
    });
    const page = await host.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(
      `<!doctype html><body style="margin:0">${scaffold}` +
        `<svg width="600" height="420"><rect width="600" height="420" fill="#1757B6"></rect></svg>` +
        `</body>`,
      { waitUntil: "load" },
    );
    const { element } = await findGraphic(page);
    const box = element ? await describeGraphic(element) : null;
    await host.close();
    return box?.w;
  }

  it("should refuse one sitting above the top of the document", async () => {
    // ONLY the offset rule can catch this: 2000 x 1400 is well under the size ceiling, and it beats
    // the real chart on area. Measured on Plotly's docs, where the scaffold sat at
    // `documentTop -10000`.
    expect(
      await pickedWidthBeside(
        `<svg style="position:absolute;top:-3000px;left:0" width="2000" height="1400">` +
          `<rect width="2000" height="1400" fill="#CCCCCC"></rect></svg>`,
      ),
    ).toBe(600);
  });

  it("should refuse one many times the size of the window", async () => {
    // ONLY the size ceiling can catch this: it sits at the top of the document, in the flow, with a
    // positive offset. Plotly's was 9000 x 9000 against a 1440 x 900 window.
    expect(
      await pickedWidthBeside(
        `<svg width="9000" height="9000"><rect width="9000" height="9000" fill="#CCCCCC"></rect></svg>`,
      ),
    ).toBe(600);
  });
});
