import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import {
  contrast,
  deriveFurniture,
  measureText,
  renderStill,
} from "../scripts/render-still.mjs";
import { ChartSeed, lineGeometry } from "../assets/ChartSeed.tsx";
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
};

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

describe("lineGeometry", () => {
  it("should break the line where a year is missing rather than drawing across the gap", () => {
    const geometry = lineGeometry(rainfall, {
      width: 900,
      height: 560,
      padding: { top: 120, right: 160, bottom: 60, left: 70 },
    });
    expect(geometry.segments.length).toBe(2);
    expect(geometry.gaps).toEqual([2019]);
  });

  it("should keep the baseline honest by starting the scale at zero", () => {
    const geometry = lineGeometry(rainfall, {
      width: 900,
      height: 560,
      padding: { top: 120, right: 160, bottom: 60, left: 70 },
    });
    expect(geometry.ticksY[0].value).toBe(0);
  });
});

describe("renderStill", () => {
  it("should write an SVG carrying the title, the source and the alt text", async () => {
    const element = createElement(ChartSeed, LIGHT);
    const { svgPath, pngPath } = await renderStill({
      element,
      width: 900,
      height: 560,
      outDir,
      name: "still",
    });

    const svg = await readFile(svgPath, "utf8");
    expect(svg).toContain("Rainfall over Annemasse fell by a third");
    expect(svg).toContain("MeteoSwiss");
    expect(svg).toContain("A line falling from 912 mm");
    expect((await stat(pngPath)).size).toBeGreaterThan(2000);
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
    });
    const { svgPath } = await renderStill({
      element,
      width: 900,
      height: 560,
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
      width: 900,
      height: 560,
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

  it("should keep the end label inside the frame however wide the subject's name is", async () => {
    const subject = "Annemasse-les-Voirons-sur-Arve";
    const element = createElement(ChartSeed, { ...LIGHT, subject });
    const { svgPath } = await renderStill({
      element,
      width: 900,
      height: 560,
      outDir,
      name: "long-label",
    });
    const svg = await readFile(svgPath, "utf8");

    const label = `${subject} 604 mm`;
    const match = svg.match(
      new RegExp(`<text[^>]*\\bx="([\\d.]+)"[^>]*>${label}</text>`),
    );
    expect(match).not.toBeNull();
    const width = measureText(label, { fontSize: 15, fontWeight: 600 });
    expect(Number(match![1]) + width).toBeLessThanOrEqual(900);
  });

  it("should refuse a series with nothing to trace rather than draw a meaningless line", async () => {
    const element = createElement(ChartSeed, {
      ...LIGHT,
      data: [
        { year: 2015, value: 912 },
        { year: 2016, value: null },
      ],
    });
    await expect(
      renderStill({ element, width: 900, height: 560, outDir, name: "thin" }),
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
    ).rejects.toThrow("drawn at 900x560");
  });

  it("should carry its alt text as a desc, never as a root title", async () => {
    const element = createElement(ChartSeed, LIGHT);
    const { svgPath } = await renderStill({
      element,
      width: 900,
      height: 560,
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
