// TASK 0 PROBE — draw ONE histogram at the three sizes ruling R2 names, and MEASURE it.
//
// Why this file exists before a single `typeScale` number is written down: `survey/export-sizes.md`
// assigns every chart type to a bucket by reading source, having rendered nothing, and this
// project's record on reasoning-from-source is `HANDOVER.md:668-681` — a heatmap that shipped as a
// flat grey slab with every assertion green. So the spec's cost estimates rest on these five
// measurements and on a person opening the three PNGs, not on the survey.
//
// Usage: bun probe.mjs
//
// It writes, into this directory:
//   probe-{landscape,square,portrait}.png / .svg   the three renders, to be OPENED
//   probe-landscape-half2x.png                     measurement 5's other candidate
//   MEASUREMENTS.md                                the five answers, as produced
//
// The measurements are mechanical, never by impression:
//   1  clipping + collision counts, from the rendered SVG's own <text> runs, each measured with
//      resvg's real ink box at its own drawn font-size
//   2  plot fill — the fraction of frame height the plot rectangle occupies, read off the rendered
//      geometry (the gridlines and the median rule), not recomputed from the component's formulas
//   3  did the measured gutters and the wrapped title re-derive with no edit?  yes/no
//   4  did anything outside {typeScale, tick hints, collision thresholds} need editing?  the diff
//      against ../CarbonFootprintHistogram.tsx IS this answer
//   5  rasteriser — the same delivered pixels, drawn two ways

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import {
  FONT_FAMILY,
  readPalette,
} from "#shared/chart-beat/render-still.mjs";
import { ProbeHistogram } from "./ProbeHistogram.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const BEAT = join(HERE, "..");
const BIN_WIDTH = 4;
const BIN_COUNT = 10;

// Hand-picked, and the reasoning is written down because the whole point of the probe is that a
// number nobody can defend is the defect. A 900-wide frame carrying a 25px title, shown in an
// article at 900 CSS px, is the type size this project has already looked at and accepted. Draw the
// same chart on a 1920-wide frame and show it in the same 900px column and that title lands at
// 11.7px unless the type scales with the frame. So the first candidate for every row is simply
// `width / 900` — apparent-size-preserving — and the probe's job is to say whether that reads.
const CANDIDATES = {
  landscape: { width: 1920, height: 1080, typeScale: 2.1 },
  square: { width: 1080, height: 1080, typeScale: 1.2 },
  portrait: { width: 1080, height: 1920, typeScale: 1.2 },
};

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((row) => {
    const cells = row.split(",");
    const rec = {};
    cols.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------------------------
// Measurement 1's instrument: the REAL ink box of a text run, from the same rasteriser that draws
// it. `measureText` in the craft skill returns a width only; a clipping test needs the height and
// the bearings too, so this asks resvg for the whole box. Drawn at a known baseline (y = 400) and
// translated back, so `y` comes out relative to the baseline — negative above it.
const BASELINE = 400;
const boxes = new Map();
function inkBox(text, { fontSize, fontWeight }) {
  const key = `${fontSize}|${fontWeight}|${text}`;
  if (boxes.has(key)) return boxes.get(key);
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="12000" height="900">` +
    `<text x="0" y="${BASELINE}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="${fontWeight}">${escaped}</text>` +
    `</svg>`;
  const b = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
  const box = b
    ? { x: b.x, y: b.y - BASELINE, width: b.width, height: b.height }
    : { x: 0, y: 0, width: 0, height: 0 };
  boxes.set(key, box);
  return box;
}

function attr(tag, name) {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

/** Every drawn text run, with its ink box in FRAME coordinates. */
function textRuns(svg) {
  const runs = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const tag = m[1];
    const content = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    if (!content.trim()) continue;
    const x = Number(attr(tag, "x"));
    const y = Number(attr(tag, "y"));
    const fontSize = Number(attr(tag, "font-size"));
    const fontWeight = Number(attr(tag, "font-weight") ?? 400);
    const anchor = attr(tag, "text-anchor") ?? "start";
    const box = inkBox(content, { fontSize, fontWeight });
    const shift = anchor === "middle" ? -box.width / 2 : anchor === "end" ? -box.width : 0;
    runs.push({
      text: content,
      fontSize,
      left: x + box.x + shift,
      right: x + box.x + shift + box.width,
      top: y + box.y,
      bottom: y + box.y + box.height,
    });
  }
  return runs;
}

/** The plot rectangle, read off the rendered geometry rather than recomputed from the component's
 *  own formulas — a recomputation would agree with the component by construction and prove nothing
 *  about what was drawn. Horizontal gridlines give left/right; the dashed median rule gives
 *  top/bottom. */
function plotRect(svg) {
  const lines = [...svg.matchAll(/<line\b([^>]*?)\/?>/g)].map((m) => ({
    x1: Number(attr(m[1], "x1")),
    x2: Number(attr(m[1], "x2")),
    y1: Number(attr(m[1], "y1")),
    y2: Number(attr(m[1], "y2")),
    dashed: /stroke-dasharray/.test(m[1]),
  }));
  const horizontal = lines.filter((l) => l.y1 === l.y2 && l.x2 > l.x1);
  const vertical = lines.filter((l) => l.x1 === l.x2 && l.dashed);
  if (horizontal.length === 0 || vertical.length === 0)
    throw new Error("could not read the plot rectangle off the rendered svg");
  return {
    left: Math.min(...horizontal.map((l) => l.x1)),
    right: Math.max(...horizontal.map((l) => l.x2)),
    top: Math.min(...vertical.map((l) => Math.min(l.y1, l.y2))),
    bottom: Math.max(...vertical.map((l) => Math.max(l.y1, l.y2))),
  };
}

function measure(svg, { width, height }) {
  const runs = textRuns(svg);
  const clipped = runs.filter(
    (r) => r.left < 0 || r.right > width || r.top < 0 || r.bottom > height,
  );
  const collisions = [];
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i];
      const b = runs[j];
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 0 && overlapY > 0)
        collisions.push({ a: a.text, b: b.text, overlapX: +overlapX.toFixed(1), overlapY: +overlapY.toFixed(1) });
    }
  }
  const plot = plotRect(svg);
  // The measurement the collision counter cannot make. A histogram's argument is the SHAPE of a
  // distribution, and shape is an aspect ratio: stretch the plot from 2.4:1 to 0.5:1 and every bar
  // becomes a different object even though not one label moved. Both numbers below come back green
  // on every count above at portrait, which is the point.
  const rects = [...svg.matchAll(/<rect\b([^>]*?)\/?>/g)]
    .map((m) => ({ w: Number(attr(m[1], "width")), h: Number(attr(m[1], "height")) }))
    .filter((r) => r.w > 0 && r.h > 0 && !(r.w === width && r.h === height));
  const tallest = rects.sort((a, b) => b.h - a.h)[0] ?? { w: 1, h: 1 };
  return {
    runs: runs.length,
    plotAspect: +((plot.right - plot.left) / (plot.bottom - plot.top)).toFixed(2),
    tallestBarAspect: +(tallest.h / tallest.w).toFixed(1),
    clipped: clipped.map((r) => ({
      text: r.text,
      over: +Math.max(-r.left, r.right - width, -r.top, r.bottom - height).toFixed(1),
    })),
    collisions,
    plot,
    plotFill: +(((plot.bottom - plot.top) / height) * 100).toFixed(1),
    plotWidthFill: +(((plot.right - plot.left) / width) * 100).toFixed(1),
  };
}

function rasterise(svg, atWidth) {
  return new Resvg(svg, {
    font: { loadSystemFonts: true },
    fitTo: { mode: "width", value: atWidth },
  })
    .render()
    .asPng();
}

async function main() {
  const csv = await readFile(join(BEAT, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  const values = rows.map((r) => Number(r["CO2 emissions per capita"]));
  const bins = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const lo = i * BIN_WIDTH;
    const hi = lo + BIN_WIDTH;
    const count = values.filter((v) => (i === BIN_COUNT - 1 ? v >= lo : v >= lo && v < hi)).length;
    bins.push({ lo, hi, count });
  }
  const med = median(values);
  const topBin = [...bins].reverse().find((b) => b.count > 0);
  const topBinCountries = rows
    .filter((r) => Number(r["CO2 emissions per capita"]) >= topBin.lo)
    .map((r) => r.Entity);

  // Every colour identical to the beat's own too, and read from the same place: the beat's
  // `PALETTE.md`, one directory up. This copy still strokes the median rule in the accent (see this
  // file's own frozen note), so it is the one caller that spends it — reading it rather than
  // naming it keeps the probe measuring the beat's colours instead of a stale copy of them.
  const { ground, accent } = readPalette(HERE, { stopAt: join(HERE, "..", "..") });

  // Every word identical to the beat's own render.mjs — a probe that shortened the title would be
  // measuring a different chart.
  const words = {
    bins,
    title: "Six in ten countries emit under 4 tonnes of CO2 per person a year",
    limits:
      "Per-country distribution for 2023 — each of the 213 countries counts equally here, not weighted by population. A few oil and gas producers sit far out on the right.",
    source:
      "Source: Global Carbon Budget (2025), via Our World in Data · 2023 data, extracted 8 August 2026",
    alt: `Histogram of CO2 emissions per capita across ${values.length} countries in 2023, in ${BIN_WIDTH}-tonne bins from 0 to ${topBin.lo} and above. The distribution is heavily right-skewed: ${bins[0].count} countries sit in the 0-${BIN_WIDTH} tonne bin, more than any other bin; the rest thin out into a long tail, topped by ${topBinCountries.join(" and ")} alone above ${topBin.lo} tonnes, at ${Math.max(...values).toFixed(1)} tonnes. A dashed median line sits at ${med.toFixed(1)} tonnes.`,
    ground,
    accent,
    median: med,
    medianLabel: `Median: ${med.toFixed(1)} t`,
  };

  await mkdir(HERE, { recursive: true });
  const report = [];

  // The base, for comparison: the beat exactly as it ships today.
  const baseSvg = renderToStaticMarkup(
    createElement(ProbeHistogram, { ...words, width: 900, height: 560, typeScale: 1 }),
  );
  const base = measure(baseSvg, { width: 900, height: 560 });
  report.push({ name: "base (900x560, typeScale 1)", size: { width: 900, height: 560, typeScale: 1 }, ...base });

  for (const [name, size] of Object.entries(CANDIDATES)) {
    const svg = renderToStaticMarkup(createElement(ProbeHistogram, { ...words, ...size }));
    await writeFile(join(HERE, `probe-${name}.svg`), svg);
    await writeFile(join(HERE, `probe-${name}.png`), rasterise(svg, size.width));
    const m = measure(svg, size);
    report.push({ name, size, ...m });
  }

  // Measurement 5 — the same 1920x1080 delivered pixels, drawn two ways. Left: the frame IS the
  // export size, rasterised 1:1. Right: a half frame at 2x, which is what `render-still.mjs` does
  // today. Type is measured against a different ruler in each, which is the whole question.
  const halfSvg = renderToStaticMarkup(
    createElement(ProbeHistogram, { ...words, width: 960, height: 540, typeScale: 1.05 }),
  );
  await writeFile(join(HERE, "probe-landscape-half2x.svg"), halfSvg);
  await writeFile(join(HERE, "probe-landscape-half2x.png"), rasterise(halfSvg, 1920));
  const half = measure(halfSvg, { width: 960, height: 540 });
  report.push({ name: "landscape, half frame at 2x (960x540, typeScale 1.05)", size: { width: 960, height: 540, typeScale: 1.05 }, ...half });

  // Measurement 4: the diff against the beat, counted rather than asserted.
  const lines = (t) => t.split("\n");
  const beatSrc = await readFile(join(BEAT, "CarbonFootprintHistogram.tsx"), "utf8");
  const probeSrc = await readFile(join(HERE, "ProbeHistogram.tsx"), "utf8");

  const md = [];
  md.push("# Task 0 — the probe, as produced");
  md.push("");
  md.push("Regenerate with `bun probe.mjs` from this directory. Every number below is written by");
  md.push("that script; nothing here is typed by hand.");
  md.push("");
  md.push(`Generated from ${values.length} countries, median ${med.toFixed(2)} t/capita.`);
  md.push("");
  md.push("## 1 + 2 — clipping, collisions, plot fill");
  md.push("");
  md.push("| render | frame | typeScale | runs | clipped | collisions | plot fill H | plot fill W | plot aspect | tallest bar h:w |");
  md.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of report) {
    md.push(
      `| ${r.name} | ${r.size.width}x${r.size.height} | ${r.size.typeScale} | ${r.runs} | **${r.clipped.length}** | **${r.collisions.length}** | ${r.plotFill}% | ${r.plotWidthFill}% | ${r.plotAspect}:1 | ${r.tallestBarAspect}:1 |`,
    );
  }
  md.push("");
  for (const r of report) {
    if (r.clipped.length === 0 && r.collisions.length === 0) continue;
    md.push(`### ${r.name}`);
    md.push("");
    for (const c of r.clipped) md.push(`- CLIPPED by ${c.over}px: ${JSON.stringify(c.text)}`);
    for (const c of r.collisions)
      md.push(`- COLLISION ${c.overlapX}x${c.overlapY}px: ${JSON.stringify(c.a)} / ${JSON.stringify(c.b)}`);
    md.push("");
  }
  md.push("## 4 — what needed editing");
  md.push("");
  md.push(`\`ProbeHistogram.tsx\` is ${lines(probeSrc).length} lines against the beat's ${lines(beatSrc).length}.`);
  md.push("Run `diff -u ../CarbonFootprintHistogram.tsx ProbeHistogram.tsx` and read it: the answer");
  md.push("to measurement 4 is whether that diff contains anything outside {typeScale, tick hints,");
  md.push("collision thresholds, the frame itself}.");
  md.push("");
  md.push("## 5 — the rasteriser");
  md.push("");
  md.push("`probe-landscape.png` and `probe-landscape-half2x.png` are both 1920x1080 files.");
  md.push("Open them side by side at 100%: the question is whether the half frame at 2x reads");
  md.push("softer, and whether either has type that is too small at the delivered size.");
  md.push("");
  await writeFile(join(HERE, "MEASUREMENTS.md"), md.join("\n") + "\n");

  for (const r of report) {
    console.log(
      `${r.name.padEnd(48)} clipped=${String(r.clipped.length).padStart(2)} collisions=${String(r.collisions.length).padStart(2)} fillH=${String(r.plotFill).padStart(5)}% aspect=${String(r.plotAspect).padStart(5)}:1 bar=${r.tallestBarAspect}:1`,
    );
    for (const c of r.clipped) console.log(`    CLIPPED ${c.over}px  ${JSON.stringify(c.text)}`);
    for (const c of r.collisions)
      console.log(`    COLLIDE ${c.overlapX}x${c.overlapY}  ${JSON.stringify(c.a)} / ${JSON.stringify(c.b)}`);
  }
  console.log(`\nwrote ${join(HERE, "MEASUREMENTS.md")}`);
}

main();
