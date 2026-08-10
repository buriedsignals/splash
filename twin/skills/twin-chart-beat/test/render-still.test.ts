import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contrast,
  deriveFurniture,
  measureText,
  renderStill,
} from "../scripts/render-still.mjs";
import { ChartSeed, lineGeometry, yTickValues } from "../assets/ChartSeed.tsx";
import { sizeFor } from "../scripts/sizes.mjs";
import rainfall from "../assets/sample-data/rainfall.json";

let outDir: string;
beforeEach(async () => {
  outDir = await mkdtemp(join(tmpdir(), "renders-"));
});
afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

const LIGHT = {
  data: rainfall,
  title: "Rainfall over Annemasse fell by a third",
  source: "MeteoSwiss, as of 31 May 2026",
  alt: "A line falling from 912 mm in 2015 to 604 mm in 2025.",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  subject: "Annemasse",
  // Every fixture below draws at ONE size, so the numbers these tests assert stay the numbers a
  // reader can check by hand. The size table's own guard lives in
  // `splash-twin/test/size-table-parity.test.ts`; what these prove is that the seed reads it.
  size: "landscape",
};

const FRAME = { width: 1920, height: 1080 };

describe("deriveFurniture", () => {
  it("should put dark ink on a light ground", () => {
    expect(deriveFurniture("#FFFFFF").ink).toBe("#000000");
  });

  it("should put light ink on a dark ground", () => {
    expect(deriveFurniture("#101820").ink).toBe("#FFFFFF");
  });

  it("should never return a colour it was not given a ground for", () => {
    expect(() => deriveFurniture("teal")).toThrow("ground must be #rrggbb");
  });

  it("should pick the ink pole that actually measures higher on a mid grey", () => {
    // #808080 has a relative luminance of 0.2159 — above it black wins (5.3:1) and
    // white loses (4.0:1). A naive "luminance > 0.5 means dark ink" rule picks white here.
    const { ink } = deriveFurniture("#808080");
    expect(ink).toBe("#000000");
    expect(contrast(ink, "#808080")).toBeGreaterThan(
      contrast("#FFFFFF", "#808080"),
    );
  });

  it("should give muted text enough contrast to be read, on every ground", () => {
    for (const ground of [
      "#FFFFFF",
      "#101820",
      "#808080",
      "#7A7A7A",
      "#F2E9DC",
      "#0B2A3A",
    ]) {
      expect(
        contrast(deriveFurniture(ground).muted, ground),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("measureText — malformed calls throw rather than under-measure", () => {
  // The regression this whole fix exists for, measured directly: a bare number used to be
  // silently accepted and produce the SAME width as calling with no options at all, because
  // `{ fontSize } = 40` destructures to `fontSize: undefined` and resvg defaults the size away.
  it("should throw, not silently under-measure, when the second argument is a bare number", () => {
    expect(() => measureText("Solar 7.2 %", 40)).toThrow(/options object/);
  });

  it("should throw when called with no second argument at all", () => {
    expect(() => measureText("Solar 7.2 %")).toThrow(/options object/);
  });

  it("should throw when the second argument is an array, not an options object", () => {
    expect(() => measureText("Solar 7.2 %", [40])).toThrow(/options object/);
  });

  it("should throw when the second argument is null", () => {
    expect(() => measureText("Solar 7.2 %", null)).toThrow(/options object/);
  });

  it("should throw when fontSize is missing from an otherwise well-formed options object", () => {
    expect(() => measureText("Solar 7.2 %", { fontWeight: 600 })).toThrow(
      /fontSize/,
    );
  });

  it("should throw when fontSize is not a finite number", () => {
    expect(() => measureText("Solar 7.2 %", { fontSize: "40" })).toThrow(
      /fontSize/,
    );
    expect(() => measureText("Solar 7.2 %", { fontSize: NaN })).toThrow(
      /fontSize/,
    );
    expect(() => measureText("Solar 7.2 %", { fontSize: Infinity })).toThrow(
      /fontSize/,
    );
  });

  it("should name what was actually passed in the error message", () => {
    expect(() => measureText("Solar 7.2 %", 40)).toThrow("40");
  });

  it("should still return 0 for empty text without requiring an options object", () => {
    // Preserved on purpose: a caller measuring a possibly-absent label with no font decided yet
    // (`measureText(maybeEmptyLabel)`) must not be forced to supply a fontSize it will never use.
    expect(measureText("")).toBe(0);
    expect(measureText(null)).toBe(0);
    expect(measureText(undefined)).toBe(0);
  });

  // The cheap correctness assertion the parity guard alone cannot provide: parity proves ten
  // copies agree with each other, never that any of them is RIGHT. A known string measured at
  // two sizes must scale — this is what the 3.3x under-measure defect actually broke, and a
  // parity test comparing wrong-against-wrong would never have caught it.
  it("should scale a known string's measured width with fontSize, roughly proportionally", () => {
    const small = measureText("Solar 7.2 %", { fontSize: 20 });
    const large = measureText("Solar 7.2 %", { fontSize: 40 });
    expect(small).toBeGreaterThan(0);
    // Doubling fontSize roughly doubles the rendered width — real glyph metrics are not exactly
    // linear (kerning, hinting), so this allows a wide but meaningful band rather than asserting
    // an exact factor of 2. The defect this guards against returned the SAME 61.58 for both
    // sizes — a ratio of 1, nowhere near this band.
    const ratio = large / small;
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.3);
  });
});

const PLOT = {
  width: 900,
  height: 560,
  padding: { top: 120, right: 160, bottom: 60, left: 70 },
};

describe("lineGeometry", () => {
  it("should break the line where a year is missing rather than drawing across the gap", () => {
    const geometry = lineGeometry(rainfall, {
      width: 900,
      height: 560,
      padding: { top: 120, right: 160, bottom: 60, left: 70 },
    });
    // `line.defined()` opens a new sub-path at the hole, so one `d` carries two runs: the
    // break in the stroke is the fact, and the note beside it names the missing year.
    expect(geometry.path.match(/M/g)?.length).toBe(2);
    expect(geometry.gaps.map((gap) => gap.years)).toEqual([[2019]]);
  });

  it("should choose a scale that shows the change rather than flattening it", () => {
    // A line encodes change by slope. Anchoring it at zero when the values sit far above zero
    // draws a gentle sag under a title that says the rainfall fell by a third.
    const geometry = lineGeometry(rainfall, PLOT);
    const ys = geometry.points
      .map((point) => point.y)
      .filter((y): y is number => y !== null);
    const traced = Math.max(...ys) - Math.min(...ys);
    expect(traced / (geometry.plot.bottom - geometry.plot.top)).toBeGreaterThan(
      0.8,
    );
  });

  it("should not leave a third of the frame empty when a series barely dips below zero", () => {
    // The trial's migration beat: readings running -3.4 to 84.1. The hand-rolled step arithmetic
    // padded, floored and then spent a spare step, landing on -45 to 105 — the line used 58% of
    // the plot and the top gridline sat 25% above any reading anyone measured. This is the case
    // the twin lost to the established engine, and it is arithmetic, not judgement.
    const geometry = lineGeometry(
      [
        { year: 1990, value: 55.2 },
        { year: 1997, value: -1.9 },
        { year: 1998, value: -3.4 },
        { year: 2008, value: 84.1 },
        { year: 2024, value: 62.4 },
      ],
      PLOT,
    );
    const ys = geometry.points.map((point) => point.y as number);
    const traced = Math.max(...ys) - Math.min(...ys);
    expect(traced / (geometry.plot.bottom - geometry.plot.top)).toBeGreaterThan(
      0.8,
    );
  });

  it("should label the round values a reader recognises, not the ends of a padded span", () => {
    // d3 rounds the readings' own extent outward and then labels multiples of a round step
    // inside it. The hand-rolled version labelled the padded ends themselves: 500 / 750 / 1000
    // under readings that never leave 604-912. Static density asks for enough gridlines that a
    // reader can put a number on more than the frame's two ends (`static-discipline.md`, "Axis
    // density"), so the round step here is 50, not 100.
    expect(yTickValues(rainfall)).toEqual([
      600, 650, 700, 750, 800, 850, 900, 950,
    ]);
  });

  it("should space x ticks at a regular round interval derived from the series' own span, not first/middle/last", () => {
    // The rainfall sample spans 2015-2025 (11 years); `tickStep` answers a 2-year interval for
    // that span at this file's hint, so 2019 — the year with no reading — sits one year off a
    // tick rather than being the sole thing between two endpoints eleven years apart.
    const geometry = lineGeometry(rainfall, PLOT);
    expect(geometry.ticksX.map((tick) => tick.year)).toEqual([
      2016, 2018, 2020, 2022, 2024,
    ]);
  });

  it("should never take a series of positive values below zero", () => {
    const geometry = lineGeometry(
      [
        { year: 2015, value: 5 },
        { year: 2016, value: 100 },
      ],
      PLOT,
    );
    expect(geometry.domain[0]).toBeGreaterThanOrEqual(0);
  });

  it("should draw the zero line when the series crosses it", () => {
    const crossing = lineGeometry(
      [
        { year: 2015, value: -40 },
        { year: 2016, value: 60 },
      ],
      PLOT,
    );
    expect(crossing.zeroY).not.toBeNull();
    expect(lineGeometry(rainfall, PLOT).zeroY).toBeNull();
  });

  it("should centre a gap note between the readings it separates, not on the missing slot", () => {
    // Unevenly spaced readings: the missing 2018 slot is nowhere near the middle of the hole.
    const geometry = lineGeometry(
      [
        { year: 2015, value: 900 },
        { year: 2018, value: null },
        { year: 2025, value: 600 },
      ],
      PLOT,
    );
    const [before, , after] = geometry.points;
    expect(geometry.gaps[0].x).toBeCloseTo((before.x + after.x) / 2, 6);
    expect(geometry.gaps[0].x).not.toBeCloseTo(geometry.points[1].x, 0);
  });

  it("should collapse a run of missing readings into a single note", () => {
    const geometry = lineGeometry(
      [
        { year: 2015, value: 900 },
        { year: 2016, value: null },
        { year: 2017, value: null },
        { year: 2018, value: 600 },
      ],
      PLOT,
    );
    expect(geometry.gaps.length).toBe(1);
    expect(geometry.gaps[0].years).toEqual([2016, 2017]);
  });
});

describe("renderStill", () => {
  it("should write an SVG carrying the title, the source and the alt text", async () => {
    const element = createElement(ChartSeed, LIGHT);
    const { svgPath, pngPath } = await renderStill({
      element,
      ...FRAME,
      outDir,
      name: "still",
    });

    const svg = await readFile(svgPath, "utf8");
    expect(svg).toContain("Rainfall over Annemasse fell by a third");
    expect(svg).toContain("MeteoSwiss");
    expect(svg).toContain("A line falling from 912 mm");
    expect((await stat(pngPath)).size).toBeGreaterThan(2000);
  });

  it("should refuse to draw at all when no size was chosen, naming the three it knows", () => {
    // The `readPalette` failure mode on this axis: a chart drawn at a size nobody chose looks every
    // bit as deliberate as one drawn in a colour nobody chose. There is no default to fall back to.
    const { size, ...noSize } = LIGHT;
    expect(() =>
      renderToStaticMarkup(createElement(ChartSeed, noSize as typeof LIGHT)),
    ).toThrow(/landscape, square, portrait/);
  });

  it("should draw every one of the three sizes at exactly the table's own pixels", () => {
    // The seam `renderStill` states in the negative — the element decides the size and the
    // rasteriser obeys — asserted in the positive, once, so a seed that quietly kept a FRAME
    // constant beside the table cannot pass.
    for (const size of ["landscape", "square", "portrait"]) {
      const row = sizeFor(size);
      const svg = renderToStaticMarkup(
        createElement(ChartSeed, { ...LIGHT, size }),
      );
      expect([size, svg.slice(0, 200).match(/width="(\d+)"/)?.[1]]).toEqual([
        size,
        String(row.width),
      ]);
      expect([size, svg.slice(0, 200).match(/height="(\d+)"/)?.[1]]).toEqual([
        size,
        String(row.height),
      ]);
    }
  });

  it("should not render a colour that was hard-coded rather than derived", async () => {
    const element = createElement(ChartSeed, {
      data: rainfall,
      title: "T",
      source: "S",
      alt: "A",
      ground: "#101820",
      accent: "#E6A700",
      subject: "Annemasse",
      size: "landscape",
    });
    const { svgPath } = await renderStill({
      element,
      ...FRAME,
      outDir,
      name: "dark",
    });
    const svg = await readFile(svgPath, "utf8");
    expect(svg).not.toContain("#333333");
    expect(svg).not.toContain("#666666");
  });

  it("should paint only with the ground, its derived furniture and the one accent", async () => {
    const ground = "#101820";
    const accent = "#E6A700";
    const element = createElement(ChartSeed, { ...LIGHT, ground, accent });
    const { svgPath } = await renderStill({
      element,
      ...FRAME,
      outDir,
      name: "palette",
    });
    const svg = await readFile(svgPath, "utf8");

    const { ink, muted, grid } = deriveFurniture(ground);
    const allowed = new Set(
      [ground, accent, ink, muted, grid].map((c) => c.toLowerCase()),
    );
    const used = new Set(
      (svg.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase()),
    );
    expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
    expect(used.has(accent.toLowerCase())).toBe(true);
  });

  // Run at ALL THREE sizes, because "the gutter is measured, never fixed" is the claim a size
  // change is most likely to break and least likely to break visibly: a clipped end label at
  // portrait looks like a design choice in a thumbnail. The label's own font size is read off the
  // rendered markup rather than typed, so the assertion follows the type scale instead of pinning
  // it — typing 15 here would have made this test pass at landscape by measuring the wrong string.
  for (const size of ["landscape", "square", "portrait"]) {
    it(`should keep the end label inside the frame however wide the subject's name is, at ${size}`, async () => {
      const subject = "Annemasse-les-Voirons-sur-Arve";
      const { width, height } = sizeFor(size);
      const element = createElement(ChartSeed, { ...LIGHT, subject, size });
      const { svgPath } = await renderStill({
        element,
        width,
        height,
        outDir,
        name: `long-label-${size}`,
      });
      const svg = await readFile(svgPath, "utf8");

      // AND THE LABEL ITSELF IS PER SIZE. At a phone frame the seed drops the subject from the end
      // label and keeps the value: at 42px "Annemasse-les-Voirons-sur-Arve 604 mm" is ~500px of ink
      // laid across the very series it labels, and the subject is already the headline's subject.
      // Asserting the long form at every size would assert a defect at two of the three.
      const phone = sizeFor(size).minTypePx >= 36;
      const label = phone ? "604 mm" : `${subject} 604 mm`;
      const match = svg.match(
        new RegExp(
          `<text[^>]*\\bx="([\\d.]+)"[^>]*\\bfont-size="(\\d+)"[^>]*\\bfont-weight="(\\d+)"[^>]*>${label}</text>`,
        ),
      );
      expect(match).not.toBeNull();
      const inkWidth = measureText(label, {
        fontSize: Number(match![2]),
        fontWeight: Number(match![3]),
      });
      expect(Number(match![1]) + inkWidth).toBeLessThanOrEqual(width);
    });
  }

  it("should refuse a series with nothing to trace rather than draw a meaningless line", async () => {
    const element = createElement(ChartSeed, {
      ...LIGHT,
      data: [
        { year: 2015, value: 912 },
        { year: 2016, value: null },
      ],
    });
    await expect(
      renderStill({ element, ...FRAME, outDir, name: "thin" }),
    ).rejects.toThrow("needs at least two readings");
  });

  it("should refuse to rasterise at a width the element was not drawn at", async () => {
    const element = createElement(ChartSeed, LIGHT);
    await expect(
      renderStill({
        element,
        width: 400,
        height: 560,
        outDir,
        name: "mismatch",
      }),
    ).rejects.toThrow("drawn at 1920x1080");
  });

  it("should carry its alt text as a desc, never as a root title", async () => {
    const element = createElement(ChartSeed, LIGHT);
    const { svgPath } = await renderStill({
      element,
      ...FRAME,
      outDir,
      name: "alt",
    });
    const svg = await readFile(svgPath, "utf8");
    expect(svg).toContain('role="img"');
    expect(svg).toContain(
      "<desc>A line falling from 912 mm in 2015 to 604 mm in 2025.</desc>",
    );
    expect(svg).not.toContain("<title");
  });
});
