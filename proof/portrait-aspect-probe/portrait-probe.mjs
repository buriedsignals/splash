// PORTRAIT PROBE — is a portrait frame's plot supposed to be portrait?
//
// The prior probe (`../static-carbon-footprint-spread/probe/`) rendered one histogram at the three
// export sizes and came back with the finding this file acts on: at 1080x1920 every count is zero
// — nothing clipped, nothing collided, 84.2% plot fill, the best of the three — and the chart has
// stopped making its point, because the plot's aspect went 2.35:1 to 0.54:1 and the tallest bar
// 4.2:1 to 18.4:1. No measurement catches it and the reader understands something different.
//
// THE HYPOTHESIS UNDER TEST, in the owner's words: a frame's aspect and a plot's aspect are two
// different things, and today the plot fills the frame. Instead — the type declares the aspect
// range its geometry supports; the plot takes the nearest aspect inside that range; the leftover
// height goes to editorial furniture. The frame is 9:16; the plot is not.
//
// WHAT IS RENDERED, all at 1080x1920, same data, same palette, same type scale unless an arm's
// whole point is that it differs:
//
//   histogram   A  h-a-stretch          the plot fills the frame — what the tool draws today
//               B0 h-b0-capped-bare     plot clamped into range, leftover LEFT EMPTY (the control)
//               B  h-b-capped-furnished plot clamped, leftover spent on words (the hypothesis)
//   line        A  l-a-stretch          the seed's own portrait render
//               B  l-b-capped-furnished
//   ranking     A  r-a-columns-stretch  the sibling case: ten vertical columns
//               B  r-b-columns-furnished
//               C  r-c-bars-transposed  the same ten values as horizontal bars
//
// B0 exists because B changes two things at once (the clamp AND the words). Without a control that
// changes only the clamp, nothing the eye reports about B could be attributed to either.
//
// WHERE THE ASPECT RANGE COMES FROM. It is not invented in this file. For each type, the same
// component is rendered in its "stretch" arm at the three frames this project has already looked at
// and accepted — 900x560 (the beat's own frame), 1920x1080 and 1080x1080 — and the range is the
// extremes of what those three renders MEASURED, rounded outward to a tenth. So "the aspect range
// the type supports" is a record of renders that were opened, not a designer's number.
//
// Usage, from `twin/`:  bun proof/portrait-aspect-probe/portrait-probe.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { readPalette, FONT_FAMILY } from "#shared/chart-beat/render-still.mjs";
import { PortraitHistogram } from "./PortraitHistogram.tsx";
import { PortraitLine } from "./PortraitLine.tsx";
import { PortraitRanking, formatValue } from "./PortraitRanking.tsx";
import { ChartSeed } from "../../skills/chart-beat/assets/ChartSeed.tsx";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PORTRAIT = { width: 1080, height: 1920, typeScale: 1.2 };
/** The three frames this project has already rendered and accepted, used ONLY to derive each
 *  type's aspect range. `typeScale` is the shipped table's, plus the beat's own 900x560 base. */
const ACCEPTED = [
  { name: "base", width: 900, height: 560, typeScale: 1 },
  { name: "landscape", width: 1920, height: 1080, typeScale: 2.1 },
  { name: "square", width: 1080, height: 1080, typeScale: 1.2 },
];
/** The hypothesis says the leftover buys a LARGER TITLE as well as more words. `headerScale` is
 *  what carries that, and it is the only type-size difference between B0 and B. */
const FURNISHED_HEADER_SCALE = 1.75;

// ---------------------------------------------------------------------------- the instruments
// Lifted verbatim from the prior probe: a text run's REAL ink box, from the same rasteriser that
// draws it, so "clipped" and "collided" mean the pixels and not the arithmetic.
const BASELINE = 400;
const boxes = new Map();
function inkBox(text, { fontSize, fontWeight }) {
  const key = `${fontSize}|${fontWeight}|${text}`;
  if (boxes.has(key)) return boxes.get(key);
  const escaped = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="12000" height="900">` +
    `<text x="0" y="${BASELINE}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="${fontWeight}">${escaped}</text>` +
    `</svg>`;
  const b = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
  const box = b ? { x: b.x, y: b.y - BASELINE, width: b.width, height: b.height } : { x: 0, y: 0, width: 0, height: 0 };
  boxes.set(key, box);
  return box;
}

function attr(tag, name) {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

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
      left: x + box.x + shift,
      right: x + box.x + shift + box.width,
      top: y + box.y,
      bottom: y + box.y + box.height,
    });
  }
  return runs;
}

function rects(svg, width, height) {
  return [...svg.matchAll(/<rect\b([^>]*?)\/?>/g)]
    .map((m) => ({
      x: Number(attr(m[1], "x")),
      y: Number(attr(m[1], "y")),
      w: Number(attr(m[1], "width")),
      h: Number(attr(m[1], "height")),
    }))
    .filter((r) => r.w > 0 && r.h > 0 && !(r.w === width && r.h === height));
}

function lines(svg) {
  return [...svg.matchAll(/<line\b([^>]*?)\/?>/g)].map((m) => ({
    x1: Number(attr(m[1], "x1")),
    x2: Number(attr(m[1], "x2")),
    y1: Number(attr(m[1], "y1")),
    y2: Number(attr(m[1], "y2")),
  }));
}

/**
 * The plot rectangle, read off the RENDERED geometry, never recomputed from the component's own
 * formulas — a recomputation would agree with the component by construction and prove nothing.
 * Two readers, because the two drawings state their plot differently and neither is guessed:
 *
 *  "gridlines"  histogram and line — the y scale is `.nice()`d, so its first and last gridline sit
 *               exactly on the plot's floor and ceiling, and every gridline spans its full width.
 *  "marks"      the rankings — no gridline set (every mark is directly labelled), but the value
 *               scale is zero-anchored, so the LONGEST mark reaches the plot's far edge exactly and
 *               the shortest sits on the zero baseline. The bounding box of the marks IS the plot
 *               on the value axis; on the category axis it is the band scale's own extent, inset by
 *               `paddingOuter`, which is stated in the measurement rather than hidden.
 */
function plotRect(svg, how) {
  if (how === "gridlines") {
    const all = lines(svg);
    // The GRIDLINE SET, isolated from any other horizontal rule in the frame. The furnished arms
    // draw a hairline above their annotation block, which is wider than the plot and lower than its
    // floor: counted as a gridline it silently inflated the plot rectangle. Gridlines are the group
    // that shares one (x1, x2) pair and is the most numerous — a property of the drawing, not a
    // list of which lines to ignore.
    const byExtent = new Map();
    for (const l of all.filter((l) => l.y1 === l.y2 && l.x2 > l.x1)) {
      const key = `${l.x1}|${l.x2}`;
      byExtent.set(key, [...(byExtent.get(key) ?? []), l]);
    }
    const horizontal = [...byExtent.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    if (horizontal.length < 2) throw new Error("could not read a plot rectangle off the gridlines");
    // A full-height vertical rule (the histogram's median) spans the plot exactly; the gridlines do
    // not, because `.nice()` stops the top tick at the last ROUND value and a bar may stand above
    // it. Reading top/bottom off the gridlines under-measured the histogram's plot by 6 points of
    // frame height against the prior probe, which read them off the median rule — so the rule wins
    // wherever there is one, and this reader reproduces `probe.mjs`'s numbers exactly.
    const vertical = all.filter((l) => l.x1 === l.x2 && Math.abs(l.y2 - l.y1) > 0);
    const spans = vertical.length > 0 ? vertical : [];
    return {
      left: Math.min(...horizontal.map((l) => l.x1)),
      right: Math.max(...horizontal.map((l) => l.x2)),
      top: spans.length > 0 ? Math.min(...spans.map((l) => Math.min(l.y1, l.y2))) : Math.min(...horizontal.map((l) => l.y1)),
      bottom: spans.length > 0 ? Math.max(...spans.map((l) => Math.max(l.y1, l.y2))) : Math.max(...horizontal.map((l) => l.y1)),
    };
  }
  const marks = how.marks;
  return {
    left: Math.min(...marks.map((r) => r.x)),
    right: Math.max(...marks.map((r) => r.x + r.w)),
    top: Math.min(...marks.map((r) => r.y)),
    bottom: Math.max(...marks.map((r) => r.y + r.h)),
  };
}

/** The steepest drawn segment of a line path, in degrees off horizontal, and the overall
 *  first-to-last angle. This is the line's equivalent of "tallest bar h:w": the quantity a reader
 *  judges a line by is its SLOPE, and slope is not preserved when the plot's aspect changes. */
function pathAngles(svg) {
  const d = /<path\b[^>]*\bd="([^"]+)"/.exec(svg)?.[1];
  if (!d) throw new Error("no path in this svg");
  const points = [...d.matchAll(/[ML]\s*(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
  const deg = (a, b) => (Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * 180) / Math.PI;
  let steepest = 0;
  for (let i = 1; i < points.length; i++) steepest = Math.max(steepest, deg(points[i - 1], points[i]));
  return {
    steepestSegmentDeg: +steepest.toFixed(1),
    endToEndDeg: +deg(points[0], points[points.length - 1]).toFixed(1),
  };
}

function measure(svg, { width, height, how, markKind, editorialWords }) {
  const runs = textRuns(svg);
  const clipped = runs.filter((r) => r.left < 0 || r.right > width || r.top < 0 || r.bottom > height);
  const collisions = [];
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i];
      const b = runs[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 0 && oy > 0)
        collisions.push({ a: a.text, b: b.text, overlapX: +ox.toFixed(1), overlapY: +oy.toFixed(1) });
    }
  }
  const marks = rects(svg, width, height);
  const plot = plotRect(svg, how === "gridlines" ? "gridlines" : { marks });
  // The mark whose aspect carries the argument. For columns and histogram bars that is the tallest
  // (height against its own width); for a transposed bar it is the longest, and the ratio is
  // length against thickness — the same quantity with the axes swapped, so the two are comparable.
  const primary =
    markKind === "horizontal"
      ? [...marks].sort((a, b) => b.w - a.w)[0]
      : [...marks].sort((a, b) => b.h - a.h)[0];
  const markAspect =
    primary === undefined
      ? null
      : markKind === "horizontal"
        ? +(primary.w / primary.h).toFixed(1)
        : +(primary.h / primary.w).toFixed(1);
  return {
    runs: runs.length,
    clipped: clipped.map((r) => ({ text: r.text, over: +Math.max(-r.left, r.right - width, -r.top, r.bottom - height).toFixed(1) })),
    collisions,
    plotAspect: +((plot.right - plot.left) / (plot.bottom - plot.top)).toFixed(2),
    plotFill: +(((plot.bottom - plot.top) / height) * 100).toFixed(1),
    markAspect,
    markCount: marks.length,
    editorialWords,
  };
}

function words(...strings) {
  return strings
    .filter(Boolean)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

function rasterise(svg, atWidth) {
  return new Resvg(svg, { font: { loadSystemFonts: true }, fitTo: { mode: "width", value: atWidth } })
    .render()
    .asPng();
}

const written = [];
async function emit(name, svg, { width, height }) {
  await writeFile(join(HERE, `${name}.svg`), svg);
  await writeFile(join(HERE, `${name}.png`), rasterise(svg, width));
  written.push(name);
}

/** The declared range: the extremes of what the three accepted renders measured, rounded outward
 *  to a tenth. Nothing here is picked. */
function rangeFrom(aspects) {
  const lo = Math.floor(Math.min(...aspects) * 10) / 10;
  const hi = Math.ceil(Math.max(...aspects) * 10) / 10;
  return [lo, hi];
}

function parseCsv(text) {
  const [header, ...rows] = parseCsvRows(text.trim());
  const cols = header;
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((row) => {
      if (row.includes('"')) throw new Error(`quoted field in frozen data, parser is too simple: ${row}`);
      const cells = row;
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

// ---------------------------------------------------------------------------------- the beats
const BIN_WIDTH = 4;
const BIN_COUNT = 10;

async function histogramWords() {
  const rows = parseCsv(await readFile(join(HERE, "data-distribution.csv"), "utf8"));
  const values = rows.map((r) => Number(r["CO2 emissions per capita"]));
  const bins = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const lo = i * BIN_WIDTH;
    const hi = lo + BIN_WIDTH;
    bins.push({
      lo,
      hi,
      count: values.filter((v) => (i === BIN_COUNT - 1 ? v >= lo : v >= lo && v < hi)).length,
    });
  }
  const med = median(values);
  const top = [...bins].reverse().find((b) => b.count > 0);
  const topCountries = rows
    .filter((r) => Number(r["CO2 emissions per capita"]) >= top.lo)
    .map((r) => r.Entity);
  const max = Math.max(...values);
  const share = (bins[0].count / values.length) * 100;

  return {
    bins,
    median: med,
    medianLabel: `Median: ${med.toFixed(1)} t`,
    title: "Six in ten countries emit under 4 tonnes of CO2 per person a year",
    limits:
      "Per-country distribution for 2023 — each of the 213 countries counts equally here, not weighted by population. A few oil and gas producers sit far out on the right.",
    source:
      "Source: Global Carbon Budget (2025), via Our World in Data · 2023 data, extracted 8 August 2026",
    // Every number below is computed from the frozen file three lines up. At landscape these would
    // be a clause in the subtitle or nothing at all; the portrait frame is what gives them room.
    notes: [
      {
        lead: "The bulk.",
        body: `${bins[0].count} of the ${values.length} countries — ${share.toFixed(0)}% — emit less than ${BIN_WIDTH} tonnes a head, and the first bar is ${(bins[0].count / bins[1].count).toFixed(1)} times the height of the second.`,
      },
      {
        lead: "The middle.",
        body: `Half of all countries fall below ${med.toFixed(1)} tonnes and half above it. That is the dashed rule, and it sits inside the first bar rather than in the middle of the axis — which is what a right-skewed distribution looks like.`,
      },
      {
        lead: "The tail.",
        body: `${topCountries.join(" and ")} alone sits above ${top.lo} tonnes, at ${max.toFixed(1)} — ${(max / med).toFixed(0)} times the median country.`,
      },
    ],
    alt: `Histogram of CO2 emissions per capita across ${values.length} countries in 2023, in ${BIN_WIDTH}-tonne bins from 0 to ${top.lo} and above. The distribution is heavily right-skewed: ${bins[0].count} countries sit in the 0-${BIN_WIDTH} tonne bin, more than any other bin; the rest thin out into a long tail, topped by ${topCountries.join(" and ")} alone above ${top.lo} tonnes, at ${max.toFixed(1)} tonnes. A dashed median line sits at ${med.toFixed(1)} tonnes.`,
  };
}

async function lineWords() {
  const data = JSON.parse(await readFile(join(HERE, "data-line.json"), "utf8"));
  const present = data.filter((d) => d.value !== null);
  const first = present[0];
  const last = present[present.length - 1];
  const drop = first.value - last.value;
  const pct = (drop / first.value) * 100;
  const missing = data.filter((d) => d.value === null).map((d) => d.year);
  const [floor, ceiling] = scaleLinear()
    .domain(extent(present.map((d) => d.value)))
    .nice()
    .domain();
  const steepest = present.reduce(
    (worst, d, i) =>
      i === 0 ? worst : Math.max(worst, Math.abs(present[i - 1].value - d.value)),
    0,
  );
  return {
    data,
    title: "Rainfall over the sample town fell by a third",
    standfirst: `Annual total, ${first.year} to ${last.year}. Sample data — the seed's own file, kept so this probe compares layouts and not stories.`,
    source: "Sample data — not a real measurement",
    unit: "mm",
    subject: "the sample town",
    notes: [
      {
        lead: "The fall.",
        body: `${first.value} mm in ${first.year} to ${last.value} mm in ${last.year} — ${drop} mm less, a drop of ${pct.toFixed(0)}% over ${last.year - first.year} years.`,
      },
      {
        lead: "The pace.",
        body: `It is a drift, not a collapse: the largest year-on-year change in the series is ${steepest} mm, about ${((steepest / first.value) * 100).toFixed(0)}% of the ${first.year} total.`,
      },
      {
        lead: "The gap.",
        body: `No reading was taken in ${missing.join(" or ")}. The line is broken there rather than bridged, and the axis is fitted to the readings' own range of ${floor} to ${ceiling} mm rather than anchored at zero.`,
      },
    ],
    alt: `A line falling from ${first.value} to ${last.value} mm across ${present.length} readings between ${first.year} and ${last.year}, with no reading in ${missing.join(" or ")}.`,
  };
}

const ISO3 = /^[A-Z]{3}$/;
async function rankingWords() {
  const rows = parseCsv(await readFile(join(HERE, "data-ranking.csv"), "utf8"));
  const column = "Annual CO₂ emissions";
  const countries = rows.filter((r) => ISO3.test(r.Code));
  const world = rows.find((r) => r.Code === "OWID_WRL");
  const ranked = countries
    .map((r) => ({ country: r.Entity, value: Number(r[column]) / 1e9 }))
    .sort((a, b) => b.value - a.value);
  const top = ranked.slice(0, 10);
  const subject = top[0].country;

  let combined = 0;
  let beatenCount = 0;
  for (const row of top.slice(1)) {
    if (combined + row.value > top[0].value) break;
    combined += row.value;
    beatenCount += 1;
  }
  const beaten = top.slice(1, beatenCount + 1);
  const share = (top.reduce((s, r) => s + r.value, 0) * 1e9) / Number(world[column]);
  const spelled = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const NEEDS_THE = new Set(["United States", "United Kingdom", "Netherlands", "Philippines"]);
  const named = (c) => (NEEDS_THE.has(c) ? `the ${c}` : c);
  const listOf = (cs) => {
    const names = cs.map(named);
    return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  };
  const ratioToSecond = top[0].value / top[1].value;
  const lastPlace = top[9];

  return {
    rows: top,
    subject,
    title: `${subject} emitted more CO₂ in 2024 than the next ${spelled[beatenCount]} countries put together`,
    subtitle: `Annual territorial CO₂ from fossil fuels and industry, billion tonnes. These ten countries account for ${(share * 100).toFixed(0)}% of the world total.`,
    source: "Source: Global Carbon Budget 2025, via Our World in Data · 2024 data, extracted 9 August 2026",
    callout: {
      value: top[0].value,
      text: `more than ${listOf(beaten.map((r) => r.country))} added together (${formatValue(combined)} bn t)`,
    },
    notes: [
      {
        lead: "The gap.",
        body: `${named(subject)} emits ${formatValue(top[0].value)} billion tonnes, ${ratioToSecond.toFixed(1)} times ${listOf([top[1].country])}'s ${formatValue(top[1].value)} — and more than ranks two to ${spelled[beatenCount + 1]} added together.`,
      },
      {
        lead: "The ten.",
        body: `Between them these ten account for ${(share * 100).toFixed(0)}% of the ${formatValue(Number(world[column]) / 1e9)} billion tonnes the world emitted in 2024.`,
      },
      {
        lead: "The floor.",
        body: `Tenth place, ${named(lastPlace.country)}, emits ${formatValue(lastPlace.value)} billion tonnes — ${(top[0].value / lastPlace.value).toFixed(0)} times less than ${named(subject)}.`,
      },
    ],
    alt: `Ranking of the ten countries with the highest CO₂ emissions in 2024. ${named(subject)} leads at ${formatValue(top[0].value)} billion tonnes, ${ratioToSecond.toFixed(1)} times ${listOf([top[1].country])}, and more than ${listOf(beaten.map((r) => r.country))} added together. The remaining bars fall to ${formatValue(lastPlace.value)} billion tonnes for ${named(lastPlace.country)}.`,
  };
}

// ------------------------------------------------------------------------------------- the run
async function main() {
  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: join(HERE, "..") });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}\n`);

  const H = await histogramWords();
  const L = await lineWords();
  const R = await rankingWords();

  const report = [];
  const ranges = {};

  // 1 — DERIVE THE RANGES, by rendering the stretch arm at the three accepted frames.
  const rangeRows = [];
  for (const [type, render, how, markKind] of [
    [
      "histogram",
      (f) =>
        createElement(PortraitHistogram, {
          ...H,
          ground,
          accent,
          arm: "stretch",
          plotAspectRange: [1, 1],
          headerScale: f.typeScale,
          ...f,
        }),
      "gridlines",
      "vertical",
    ],
    [
      "line",
      (f) =>
        createElement(PortraitLine, {
          ...L,
          ground,
          accent,
          arm: "stretch",
          plotAspectRange: [1, 1],
          headerScale: f.typeScale,
          ...f,
        }),
      "gridlines",
      "vertical",
    ],
    [
      "ranking-columns",
      (f) =>
        createElement(PortraitRanking, {
          ...R,
          ground,
          accent,
          arm: "stretch",
          plotAspectRange: [1, 1],
          headerScale: f.typeScale,
          ...f,
        }),
      "marks",
      "vertical",
    ],
  ]) {
    const aspects = [];
    for (const frame of ACCEPTED) {
      const svg = renderToStaticMarkup(render(frame));
      const m = measure(svg, { ...frame, how, markKind, editorialWords: 0 });
      aspects.push(m.plotAspect);
      rangeRows.push({ type, frame: frame.name, size: `${frame.width}x${frame.height}`, plotAspect: m.plotAspect, markAspect: m.markAspect });
    }
    ranges[type] = rangeFrom(aspects);
    console.log(`${type.padEnd(16)} accepted aspects ${aspects.join(", ")} -> declared range ${ranges[type].join("–")}`);
  }
  console.log("");

  // 2 — THE ARMS, all at 1080x1920.
  const arms = [
    {
      id: "h-a-stretch",
      label: "histogram A — plot fills the frame (today)",
      how: "gridlines",
      markKind: "vertical",
      words: words(H.title, H.limits, H.source),
      element: createElement(PortraitHistogram, {
        ...H,
        ground,
        accent,
        arm: "stretch",
        plotAspectRange: ranges.histogram,
        headerScale: PORTRAIT.typeScale,
        ...PORTRAIT,
      }),
    },
    {
      id: "h-b0-capped-bare",
      label: "histogram B0 — plot clamped, leftover left empty (control)",
      how: "gridlines",
      markKind: "vertical",
      words: words(H.title, H.limits, H.source),
      element: createElement(PortraitHistogram, {
        ...H,
        ground,
        accent,
        arm: "capped",
        plotAspectRange: ranges.histogram,
        headerScale: PORTRAIT.typeScale,
        ...PORTRAIT,
      }),
    },
    {
      id: "h-b-capped-furnished",
      label: "histogram B — plot clamped, leftover spent on furniture",
      how: "gridlines",
      markKind: "vertical",
      words: words(H.title, H.limits, H.source, ...H.notes.map((n) => `${n.lead} ${n.body}`)),
      element: createElement(PortraitHistogram, {
        ...H,
        ground,
        accent,
        arm: "furnished",
        plotAspectRange: ranges.histogram,
        headerScale: FURNISHED_HEADER_SCALE,
        ...PORTRAIT,
      }),
    },
    {
      // B AT STORY TYPE SIZES. The first furnished render left ~20% of the frame blank between the
      // axis and the annotations, and the obvious reading is "the rule leaves a hole". There is a
      // second reading the prior probe already wrote down for square: this whole probe is typeset
      // at `width / 900`, which preserves apparent size in an ARTICLE COLUMN and is the wrong
      // reference for a post held at arm's length on a phone, where a 1080-wide frame is shown at
      // maybe 400 CSS px. This arm asks which reading is right by typesetting for the phone and
      // looking at what is left. Nothing else changes.
      id: "h-b2-story-type",
      label: "histogram B2 — the same clamp and the same words, typeset for a phone",
      how: "gridlines",
      markKind: "vertical",
      words: words(H.title, H.limits, H.source, ...H.notes.map((n) => `${n.lead} ${n.body}`)),
      element: createElement(PortraitHistogram, {
        ...H,
        ground,
        accent,
        arm: "furnished",
        plotAspectRange: ranges.histogram,
        width: 1080,
        height: 1920,
        typeScale: 1.9,
        headerScale: 2.6,
      }),
    },
    {
      id: "l-a-stretch",
      label: "line A — plot fills the frame (today)",
      how: "gridlines",
      markKind: "vertical",
      words: words(L.title, L.source),
      element: createElement(PortraitLine, {
        ...L,
        ground,
        accent,
        arm: "stretch",
        plotAspectRange: ranges.line,
        headerScale: PORTRAIT.typeScale,
        ...PORTRAIT,
      }),
    },
    {
      id: "l-b-capped-furnished",
      label: "line B — plot clamped, leftover spent on furniture",
      how: "gridlines",
      markKind: "vertical",
      words: words(L.title, L.standfirst, L.source, ...L.notes.map((n) => `${n.lead} ${n.body}`)),
      element: createElement(PortraitLine, {
        ...L,
        ground,
        accent,
        arm: "furnished",
        plotAspectRange: ranges.line,
        headerScale: FURNISHED_HEADER_SCALE,
        ...PORTRAIT,
      }),
    },
    {
      id: "r-a-columns-stretch",
      label: "ranking A — ten vertical columns, plot fills the frame (today)",
      how: "marks",
      markKind: "vertical",
      words: words(R.title, R.subtitle, R.source, R.callout.text),
      element: createElement(PortraitRanking, {
        ...R,
        ground,
        accent,
        arm: "stretch",
        plotAspectRange: ranges["ranking-columns"],
        headerScale: PORTRAIT.typeScale,
        ...PORTRAIT,
      }),
    },
    {
      id: "r-b-columns-furnished",
      label: "ranking B — ten vertical columns, plot clamped, leftover furnished",
      how: "marks",
      markKind: "vertical",
      words: words(R.title, R.subtitle, R.source, R.callout.text, ...R.notes.map((n) => `${n.lead} ${n.body}`)),
      element: createElement(PortraitRanking, {
        ...R,
        ground,
        accent,
        arm: "furnished",
        plotAspectRange: ranges["ranking-columns"],
        headerScale: FURNISHED_HEADER_SCALE,
        ...PORTRAIT,
      }),
    },
    {
      id: "r-c-bars-transposed",
      label: "ranking C — the same ten values as horizontal bars",
      how: "marks",
      markKind: "horizontal",
      words: words(R.title, R.subtitle, R.source, R.callout.text, ...R.notes.map((n) => `${n.lead} ${n.body}`)),
      element: createElement(PortraitRanking, {
        ...R,
        ground,
        accent,
        arm: "transposed",
        plotAspectRange: ranges["ranking-columns"],
        headerScale: FURNISHED_HEADER_SCALE,
        ...PORTRAIT,
      }),
    },
  ];

  for (const arm of arms) {
    const svg = renderToStaticMarkup(arm.element);
    await emit(arm.id, svg, PORTRAIT);
    const m = measure(svg, { ...PORTRAIT, how: arm.how, markKind: arm.markKind, editorialWords: arm.words });
    const angles = arm.id.startsWith("l-") ? pathAngles(svg) : null;
    report.push({ ...arm, ...m, angles });
    console.log(
      `${arm.id.padEnd(22)} clipped=${String(m.clipped.length).padStart(2)} collisions=${String(m.collisions.length).padStart(2)} ` +
        `fill=${String(m.plotFill).padStart(5)}% aspect=${String(m.plotAspect).padStart(5)}:1 mark=${m.markAspect}:1 words=${m.editorialWords}` +
        (angles ? ` steepest=${angles.steepestSegmentDeg}deg end-to-end=${angles.endToEndDeg}deg` : ""),
    );
    for (const c of m.clipped) console.log(`    CLIPPED ${c.over}px  ${JSON.stringify(c.text)}`);
    for (const c of m.collisions) console.log(`    COLLIDE ${c.overlapX}x${c.overlapY}  ${JSON.stringify(c.a)} / ${JSON.stringify(c.b)}`);
  }

  // 3 — CROSS-CHECK: is arm A really what the tool draws today? `PortraitLine` claims to be a copy
  // of the seed; render the SEED ITSELF at portrait and compare the two plot rectangles. If they
  // disagree, arm A is a straw man and every comparison below it is worthless.
  const seedSvg = renderToStaticMarkup(
    createElement(ChartSeed, {
      data: L.data,
      title: L.title,
      source: L.source,
      alt: L.alt,
      ground,
      accent,
      subject: L.subject,
      size: "portrait",
    }),
  );
  await emit("l-a-seed-itself", seedSvg, PORTRAIT);
  const seed = measure(seedSvg, { ...PORTRAIT, how: "gridlines", markKind: "vertical", editorialWords: words(L.title, L.source) });
  const seedAngles = pathAngles(seedSvg);
  const armA = report.find((r) => r.id === "l-a-stretch");
  console.log(
    `\ncross-check: the seed itself at portrait -> aspect ${seed.plotAspect}:1, fill ${seed.plotFill}%, ` +
      `steepest ${seedAngles.steepestSegmentDeg}deg (probe arm A: ${armA.plotAspect}:1, ${armA.plotFill}%, ${armA.angles.steepestSegmentDeg}deg)`,
  );

  // 4 — the report.
  const md = [];
  md.push("# Portrait probe — the measurements, as produced");
  md.push("");
  md.push("Regenerate with `bun proof/portrait-aspect-probe/portrait-probe.mjs` from `twin/`.");
  md.push("Every number below is written by that script. `PORTRAIT-VERDICT.md` beside this file is");
  md.push("the other half — what a person saw when the PNGs were opened — and is not generated.");
  md.push("");
  md.push("## The declared aspect ranges, and where they come from");
  md.push("");
  md.push("Not picked. Each type's range is the extremes of what its own `stretch` render measured at");
  md.push("the three frames this project has already opened and accepted, rounded outward to a tenth.");
  md.push("");
  md.push("| type | frame | size | plot aspect | tallest mark h:w |");
  md.push("|---|---|---|---|---|");
  for (const r of rangeRows)
    md.push(
      `| ${r.type} | ${r.frame} | ${r.size} | ${r.plotAspect}:1 | ${r.markAspect === null ? "n/a (a line has no such mark)" : `${r.markAspect}:1`} |`,
    );
  md.push("");
  for (const [type, range] of Object.entries(ranges))
    md.push(`- **${type}** — declared range **${range[0]}:1 – ${range[1]}:1**`);
  md.push("");
  md.push("## The arms, all at 1080x1920");
  md.push("");
  md.push("`editorial words` counts the words in the strings the arm actually DRAWS as prose — title,");
  md.push("standfirst/subtitle, source, callout, annotations. Axis tick labels and value labels are");
  md.push("excluded: they are the chart reading itself out, not the frame carrying an argument.");
  md.push("");
  md.push("| arm | clipped | collisions | plot aspect | plot share of frame height | primary mark | editorial words |");
  md.push("|---|---|---|---|---|---|---|");
  for (const r of report)
    md.push(
      `| \`${r.id}\` | **${r.clipped.length}** | **${r.collisions.length}** | ${r.plotAspect}:1 | ${r.plotFill}% | ${r.markAspect === null ? "n/a — see the slope table" : `${r.markAspect}:1`} | ${r.editorialWords} |`,
    );
  md.push("");
  md.push("What each arm is:");
  md.push("");
  for (const r of report) md.push(`- \`${r.id}.png\` — ${r.label}`);
  md.push("");
  md.push("## The line's own measurement: slope");
  md.push("");
  md.push("A histogram's argument is a shape and a ranking's is a length, so `tallest mark h:w` says");
  md.push("what happened to them. A line's argument is a SLOPE, which that column cannot see. Both");
  md.push("angles below are read off the rendered path, in degrees off horizontal.");
  md.push("");
  md.push("| arm | steepest drawn segment | first reading to last |");
  md.push("|---|---|---|");
  for (const r of report.filter((r) => r.angles))
    md.push(`| \`${r.id}\` | ${r.angles.steepestSegmentDeg}° | ${r.angles.endToEndDeg}° |`);
  md.push("");
  md.push("## Cross-check — is arm A a straw man?");
  md.push("");
  md.push("`PortraitLine` claims to be a copy of `ChartSeed.tsx` with one added arm. The seed ITSELF is");
  md.push("rendered at portrait (`l-a-seed-itself.png`) and measured with the same instrument:");
  md.push("");
  md.push(`- seed at portrait: **${seed.plotAspect}:1**, fill **${seed.plotFill}%**, steepest segment **${seedAngles.steepestSegmentDeg}°**`);
  md.push(`- probe arm A:      **${armA.plotAspect}:1**, fill **${armA.plotFill}%**, steepest segment **${armA.angles.steepestSegmentDeg}°**`);
  md.push("");
  md.push(
    seed.plotAspect === armA.plotAspect
      ? "They agree. Arm A is what the tool draws today, not a worse thing built to lose."
      : "**They disagree — read the verdict's note before trusting any comparison against arm A.**",
  );
  md.push("");
  for (const r of report) {
    if (r.clipped.length === 0 && r.collisions.length === 0) continue;
    md.push(`### ${r.id}`);
    md.push("");
    for (const c of r.clipped) md.push(`- CLIPPED by ${c.over}px: ${JSON.stringify(c.text)}`);
    for (const c of r.collisions)
      md.push(`- COLLISION ${c.overlapX}x${c.overlapY}px: ${JSON.stringify(c.a)} / ${JSON.stringify(c.b)}`);
    md.push("");
  }
  await writeFile(join(HERE, "PORTRAIT-MEASUREMENTS.md"), md.join("\n") + "\n");
  console.log(`\nwrote PORTRAIT-MEASUREMENTS.md and ${written.length} renders — now open them and look.`);
}

main();
