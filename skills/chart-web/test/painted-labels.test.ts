/**
 * `labels-name-their-own-row` COULD NOT FIRE ON THIS FORMAT, AND THAT READ AS COVERAGE.
 *
 * `mislabelledRows` refuses a de-collided label stack that stopped naming what it names. It is
 * recorded `carried` for chart-web in `doctrine/references/guard-catalogue.json`. Its reader,
 * `labelStacksFrom`, scans SVG `<text>` — and this format draws no `<text>` at all: every word on
 * the page is an HTML element positioned over the geometry. Measured on the delivered page of the
 * real Ember story: `0 label stack(s), 0 link(s)`. A requirement that cannot fire is worse than a
 * missing one.
 *
 * Neither decision is changed here — both are byte-identical across seven skills
 * (`splash/test/guard-copies-parity.test.ts`). What changed is the INPUT: the page is measured as it
 * is laid out, and what it paints is written back in the notation the decision reads. These tests
 * are the proof that the translation carries the evidence a crossing is visible in, and that a
 * crossed chart-web page now goes red where before it could not.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  labelStacksFrom,
  mislabelledRows,
} from "../scripts/detect-label-rows.mjs";
import { inlineSvgOf, paintedLabelSvg } from "../scripts/painted-labels.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

setDefaultTimeout(120000);

/** A chart-web-shaped painted page: two columns of de-collided labels, each label drawn away from
 *  the mark it names and joined back to it by a leader, and two marks joining the two columns. The
 *  numbers are the ones `labelStacksFrom`'s own tolerances are written against — a leader end within
 *  `0.5 x fontSize` of its label's anchor, rows a whole pixel apart, marks whose ends land on the
 *  anchors exactly. `crossed` decides which anchor each right-hand label was pulled from. */
function paintedPage({ crossed }: { crossed: boolean }) {
  const labels = [
    { text: "Norway 60%", x: 100, y: 100, fontSize: 13 },
    { text: "Sweden 55%", x: 100, y: 140, fontSize: 13 },
    { text: "Norway 64%", x: 500, y: 100, fontSize: 13 },
    { text: "Sweden 62%", x: 500, y: 140, fontSize: 13 },
  ];
  const leaders = [
    { x1: 100, y1: 100, x2: 200, y2: 110 },
    { x1: 100, y1: 140, x2: 200, y2: 130 },
    crossed
      ? { x1: 500, y1: 100, x2: 400, y2: 130 }
      : { x1: 500, y1: 100, x2: 400, y2: 110 },
    crossed
      ? { x1: 500, y1: 140, x2: 400, y2: 110 }
      : { x1: 500, y1: 140, x2: 400, y2: 130 },
  ];
  const marks = [
    { x1: 200, y1: 110, x2: 400, y2: 110 },
    { x1: 200, y1: 130, x2: 400, y2: 130 },
  ];
  return { labels, lines: [...leaders, ...marks] };
}

describe("paintedLabelSvg — what the page paints, in the notation the decision reads", () => {
  it("should write every painted label as a placed <text> and every drawn line as a <line>", () => {
    const svg = paintedLabelSvg({
      labels: [{ text: "Norway 60%", x: 100.004, y: 200.5, fontSize: 13 }],
      lines: [{ x1: 1, y1: 2, x2: 3, y2: 4 }],
    });
    expect(svg).toContain(
      `<text x="100.00" y="200.50" font-size="13">Norway 60%</text>`,
    );
    expect(svg).toContain(`<line x1="1.00" y1="2.00" x2="3.00" y2="4.00"/>`);
  });

  it("should keep a label's own text readable in the sentence a crossing is reported under", () => {
    const svg = paintedLabelSvg({
      labels: [{ text: "R&D <spend>", x: 1, y: 2, fontSize: 12 }],
      lines: [],
    });
    expect(svg).toContain(">RD spend<");
  });

  it("should hand labelStacksFrom the stacks a screen-space translation makes visible", () => {
    const { stacks, links } = labelStacksFrom(
      paintedLabelSvg(paintedPage({ crossed: false })),
    );
    expect(stacks.length).toBe(2);
    expect(links.length).toBe(2);
  });
});

describe("mislabelledRows over a painted chart-web page", () => {
  it("should say nothing about a page whose rows name what they are joined to", () => {
    const { stacks, links } = labelStacksFrom(
      paintedLabelSvg(paintedPage({ crossed: false })),
    );
    expect(mislabelledRows(stacks, links)).toEqual([]);
  });

  it("should refuse a row whose two labels are joined to something else", () => {
    const { stacks, links } = labelStacksFrom(
      paintedLabelSvg(paintedPage({ crossed: true })),
    );
    const crossings = mislabelledRows(stacks, links);
    expect(crossings.length).toBe(2);
    expect(crossings[0]).toContain(
      "are drawn on one line, and the marks they name are joined to something else",
    );
  });

  // D14: `labelStacksFrom` hands back `{stacks, links}` and `mislabelledRows` takes the two
  // separately. The obvious composition throws `stacks.map is not a function` from inside this
  // skill — which is exactly what a story beat's own runner did on the real Ember story. The pair
  // is byte-identical across seven skills and cannot be reshaped from here, so the hazard is
  // recorded as a test instead: the throw is real, it comes from the skill, and every caller in
  // this skill goes through the destructured form above.
  it("should throw from inside the skill when the pair is composed the obvious way", () => {
    const found = labelStacksFrom(
      paintedLabelSvg(paintedPage({ crossed: true })),
    );
    // @ts-expect-error — the shape mismatch under test
    expect(() => mislabelledRows(found)).toThrow(/is not a function/);
  });
});

describe("the delivered pages this format actually ships", () => {
  const EMBER = join(
    TWIN,
    "stories/real-ember-renewables-share/beats/1-where-your-country-sits/renders/where-your-country-sits.html",
  );

  it("should carry inline SVG and not one <text> in it — the reason the guard could never fire", () => {
    expect(existsSync(EMBER)).toBe(true);
    const html = readFileSync(EMBER, "utf8");
    const svgs = inlineSvgOf(html);
    expect(svgs.length).toBeGreaterThan(0);
    expect(svgs.join("")).not.toContain("<text");
    // Read the page's own SVG the way the decision was written to: nothing at all.
    expect(labelStacksFrom(svgs.join("")).stacks.length).toBe(0);
  });

  it("should paint labels a screen-space reader can see, where the SVG reader saw none", async () => {
    const puppeteer = (await import("puppeteer")).default;
    const { readPaintedGeometry } =
      await import("../scripts/painted-labels.mjs");
    const browser = await puppeteer.launch({ executablePath: chrome() });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 800 });
      await page.goto(`file://${EMBER}`, { waitUntil: "load" });
      const painted = await readPaintedGeometry(page);
      expect(painted.labels.length).toBeGreaterThan(0);
      expect(
        painted.labels.map((label: { text: string }) => label.text).join(" | "),
      ).toContain("%");
      const svg = paintedLabelSvg(painted);
      expect((svg.match(/<text/g) ?? []).length).toBe(painted.labels.length);
    } finally {
      await browser.close();
    }
  });
});

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason every other copy in this repository states. */
function chrome(): string {
  const { existsSync: has, readdirSync } = require("node:fs");
  const { homedir } = require("node:os");
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (has(cache))
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
  const found = candidates.find((path) => has(path));
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}
