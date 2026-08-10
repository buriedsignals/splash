// CENTRING PROBE — the leftover height is on ONE side. Is that the whole of the B0 defect?
//
// `PORTRAIT-VERDICT.md` judged the B0 arm — the plot clamped into the aspect its type supports, no
// editorial furniture added — as "a graphic that failed to load". Opening it says why: the content
// is flush to the TOP and roughly 45% of the frame below it is blank. The reading under test here
// is that it is not the QUANTITY of void that fails, it is that the void is on one side. Centred,
// the same void is a margin — a decision rather than an accident.
//
// TWO VARIANTS, for the histogram and for the line (the ranking is skipped: its answer is the
// transposed FORM, already decided in `PORTRAIT-VERDICT.md`):
//
//   V1  block-centred  title, subtitle, source and plot as ONE block, centred in the frame:
//                      equal void above and below.
//   V2  plot-centred   the title stays at the top; the plot is centred in the height that REMAINS.
//                      Not the same thing as V1, and the difference is the point — on a story
//                      format a title that begins a third of the way down may read worse than a
//                      title at the top, even though V1 is the more "balanced" composition.
//
// Same data, same 1080x1920 frame, same palette and the same clamp as the existing B0 arm, so the
// ONLY variable between B0, V1 and V2 is where the block sits.
//
// HOW THE VARIANTS ARE MADE, and why it is done this way. B0 is rendered by the probe's own
// `PortraitHistogram` / `PortraitLine`, untouched; the variant is then produced by BAKING a
// vertical offset into the y coordinates of a subset of that same SVG's children. Nothing is
// re-laid-out and no component is edited, so "the geometry did not change" is true by construction
// rather than by assertion — and it is still MEASURED off the emitted file below, because a probe
// that only asserts its own premise proves nothing. The offset is baked into the coordinates
// rather than carried on a `<g transform>` precisely so that the instruments read the variant's
// REAL positions and can be believed.
//
// Usage, from `twin/`:  bun proof/portrait-aspect-probe/centring-probe.mjs

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

const HERE = dirname(fileURLToPath(import.meta.url));
const PORTRAIT = { width: 1080, height: 1920, typeScale: 1.2 };
/** The three frames this project has already rendered and accepted. Used ONLY to re-derive each
 *  type's aspect range, exactly as `portrait-probe.mjs` does, so V1 and V2 clamp to the same
 *  numbers B0 clamped to and no range is carried across as a hardcoded constant. */
const ACCEPTED = [
  { name: "base", width: 900, height: 560, typeScale: 1 },
  { name: "landscape", width: 1920, height: 1080, typeScale: 2.1 },
  { name: "square", width: 1080, height: 1080, typeScale: 1.2 },
];

// -------------------------------------------------------------------- the platform's own frame
//
// THE FUNCTIONAL CONSTRAINT. A story-format post is not shown on a blank 1080x1920 rectangle: the
// platform draws its own interface over the top and the bottom of it. The two rows below differ in
// STANDING and the difference is recorded rather than smoothed over — one is the platform's own
// published figure, the other is not published by its platform at all.
//
//  Meta — published, and expressed by Meta as PERCENTAGES of the frame: 14% top, 35% bottom, 6%
//  each side, one unified safe zone covering Stories and Reels. The pixels here are that
//  percentage on a 1080x1920 canvas and nothing else.
//  https://www.facebook.com/business/help/980593475366490/
//
//  TikTok — NOT published as pixels. TikTok's own in-feed ad specification says the safe zone
//  "is determined by video dimension type, ad caption length, and interactive add-on usage. The
//  longer the caption, the smaller the safe zone will be", and directs creators to its preview
//  tool and downloadable templates instead. The numbers below are the industry-consensus figures
//  that third-party guides converge on, carried here as an INDICATION, not as a specification —
//  and note the direction of the uncertainty: TikTok says a longer caption makes the safe zone
//  SMALLER, so the real bottom reserve is this or worse, never better.
//  https://ads.tiktok.com/help/article/tiktok-reservation-in-feed-ads-reach-frequency
const SAFE_AREAS = [
  {
    platform: "Instagram Stories + Reels",
    topPx: Math.round(0.14 * 1920),
    bottomPx: Math.round(0.35 * 1920),
    published: true,
  },
  {
    platform: "TikTok (third-party consensus)",
    topPx: 130,
    bottomPx: 484,
    published: false,
  },
];

// ---------------------------------------------------------------------------- the instruments
// Lifted verbatim from `portrait-probe.mjs`, which lifted them from the probe before it: a text
// run's REAL ink box, from the same rasteriser that draws it.
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

function svgLines(svg) {
  return [...svg.matchAll(/<line\b([^>]*?)\/?>/g)].map((m) => ({
    x1: Number(attr(m[1], "x1")),
    x2: Number(attr(m[1], "x2")),
    y1: Number(attr(m[1], "y1")),
    y2: Number(attr(m[1], "y2")),
  }));
}

function svgRects(svg, width, height) {
  return [...svg.matchAll(/<rect\b([^>]*?)\/?>/g)]
    .map((m) => ({
      x: Number(attr(m[1], "x")),
      y: Number(attr(m[1], "y")),
      w: Number(attr(m[1], "width")),
      h: Number(attr(m[1], "height")),
    }))
    .filter((r) => r.w > 0 && r.h > 0 && !(r.w === width && r.h === height));
}

function svgCircles(svg) {
  return [...svg.matchAll(/<circle\b([^>]*?)\/?>/g)].map((m) => ({
    cy: Number(attr(m[1], "cy")),
    r: Number(attr(m[1], "r")),
  }));
}

function pathPoints(svg) {
  const out = [];
  for (const m of svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g))
    for (const p of m[1].matchAll(/[ML]\s*(-?[\d.]+),(-?[\d.]+)/g))
      out.push({ x: Number(p[1]), y: Number(p[2]) });
  return out;
}

/** The plot rectangle, read off the RENDERED geometry — the same reader `portrait-probe.mjs` uses,
 *  so the aspect this file reports is comparable with the one already recorded for B0. */
function plotRect(svg) {
  const all = svgLines(svg);
  const byExtent = new Map();
  for (const l of all.filter((l) => l.y1 === l.y2 && l.x2 > l.x1)) {
    const key = `${l.x1}|${l.x2}`;
    byExtent.set(key, [...(byExtent.get(key) ?? []), l]);
  }
  const horizontal = [...byExtent.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  if (horizontal.length < 2) throw new Error("could not read a plot rectangle off the gridlines");
  const vertical = all.filter((l) => l.x1 === l.x2 && Math.abs(l.y2 - l.y1) > 0);
  return {
    left: Math.min(...horizontal.map((l) => l.x1)),
    right: Math.max(...horizontal.map((l) => l.x2)),
    top: vertical.length > 0 ? Math.min(...vertical.map((l) => Math.min(l.y1, l.y2))) : Math.min(...horizontal.map((l) => l.y1)),
    bottom: vertical.length > 0 ? Math.max(...vertical.map((l) => Math.max(l.y1, l.y2))) : Math.max(...horizontal.map((l) => l.y1)),
  };
}

/** Every drawn thing's vertical ink extent, over any fragment of markup. Returns null when the
 *  fragment draws nothing (a `<desc>`, an empty text run). */
function inkExtent(markup, { width, height }) {
  const tops = [];
  const bottoms = [];
  for (const r of textRuns(markup)) {
    tops.push(r.top);
    bottoms.push(r.bottom);
  }
  for (const l of svgLines(markup)) {
    tops.push(Math.min(l.y1, l.y2));
    bottoms.push(Math.max(l.y1, l.y2));
  }
  for (const r of svgRects(markup, width, height)) {
    tops.push(r.y);
    bottoms.push(r.y + r.h);
  }
  for (const c of svgCircles(markup)) {
    tops.push(c.cy - c.r);
    bottoms.push(c.cy + c.r);
  }
  for (const p of pathPoints(markup)) {
    tops.push(p.y);
    bottoms.push(p.y);
  }
  if (tops.length === 0) return null;
  return { top: Math.min(...tops), bottom: Math.max(...bottoms) };
}

/** The svg's top-level children, in document order, as raw markup. A balanced walk rather than a
 *  regex, because a `<g>` holds a `<line>` and a `<text>` and a regex cannot see that. */
function topLevelChildren(svg) {
  const open = svg.indexOf(">", svg.indexOf("<svg")) + 1;
  const close = svg.lastIndexOf("</svg>");
  const body = svg.slice(open, close);
  const children = [];
  let i = 0;
  while (i < body.length) {
    if (body[i] !== "<") {
      if (!/\s/.test(body[i])) throw new Error(`unexpected text at the svg's top level: ${JSON.stringify(body.slice(i, i + 40))}`);
      i += 1;
      continue;
    }
    const name = /^<([A-Za-z][\w:-]*)/.exec(body.slice(i))?.[1];
    if (!name) throw new Error(`could not read a tag name at ${i}`);
    const tagEnd = body.indexOf(">", i);
    if (tagEnd === -1) throw new Error("unterminated tag");
    if (body[tagEnd - 1] === "/") {
      children.push(body.slice(i, tagEnd + 1));
      i = tagEnd + 1;
      continue;
    }
    let depth = 1;
    let cursor = tagEnd + 1;
    while (depth > 0) {
      const nextOpen = body.indexOf(`<${name}`, cursor);
      const nextClose = body.indexOf(`</${name}>`, cursor);
      if (nextClose === -1) throw new Error(`unclosed <${name}>`);
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        cursor = nextOpen + name.length + 1;
      } else {
        depth -= 1;
        cursor = nextClose + name.length + 3;
      }
    }
    children.push(body.slice(i, cursor));
    i = cursor;
  }
  return { head: svg.slice(0, open), children, tail: svg.slice(close) };
}

/**
 * The offset, BAKED into the coordinates. Every vertical attribute the two components draw with —
 * `y`, `y1`, `y2`, `cy` — plus the line path's own points. `x`, `font-size` and the rest are left
 * alone: `\by="` cannot match inside `font-family="` because the character before the `y` is a word
 * character, so no word boundary exists there.
 */
function shiftY(markup, dy) {
  return markup
    .replace(/\b(y|y1|y2|cy)="(-?[\d.]+)"/g, (_, name, value) => `${name}="${(Number(value) + dy).toFixed(1)}"`)
    .replace(/\bd="([^"]+)"/g, (_, d) =>
      `d="${d.replace(/([ML])\s*(-?[\d.]+),(-?[\d.]+)/g, (__, cmd, x, y) => `${cmd}${x},${(Number(y) + dy).toFixed(1)}`)}"`,
    );
}

function rasterise(svg, atWidth) {
  return new Resvg(svg, { font: { loadSystemFonts: true }, fitTo: { mode: "width", value: atWidth } })
    .render()
    .asPng();
}

const written = [];
async function emit(name, svg, { width }) {
  await writeFile(join(HERE, `${name}.svg`), svg);
  await writeFile(join(HERE, `${name}.png`), rasterise(svg, width));
  written.push(name);
}

function rangeFrom(aspects) {
  const lo = Math.floor(Math.min(...aspects) * 10) / 10;
  const hi = Math.ceil(Math.max(...aspects) * 10) / 10;
  return [lo, hi];
}

/**
 * THE CLAIM THIS PROBE RESTS ON, CHECKED BY MUTATION rather than by assertion: a variant differs
 * from B0 in the VERTICAL POSITION of its children and in nothing else — not a colour, not a font
 * size, not a width, not a document order, not a wrap. Blank every vertical coordinate in both
 * files; if the claim is true the two blanked strings are byte-identical, and if it is false this
 * throws with the first line that disagrees.
 *
 * The negative control matters as much as the check: the two files must DIFFER before blanking.
 * Without it, a recomposer that returned B0 unchanged would pass silently.
 */
function assertCompositionOnly(b0, variant, label) {
  const blank = (s) =>
    s
      .replace(/\b(y|y1|y2|cy)="-?[\d.]+"/g, (_, name) => `${name}="_"`)
      .replace(/([ML])\s*(-?[\d.]+),(-?[\d.]+)/g, (_, cmd, x) => `${cmd}${x},_`);
  if (b0 === variant) throw new Error(`${label}: the variant is byte-identical to B0 — nothing was recomposed`);
  const [a, b] = [blank(b0), blank(variant)];
  if (a === b) return;
  const i = [...a].findIndex((ch, k) => ch !== b[k]);
  throw new Error(`${label}: the variant differs from B0 in more than vertical position, near ${JSON.stringify(a.slice(Math.max(0, i - 60), i + 60))}`);
}

// ------------------------------------------------------------------------------ the two recomposers
//
// Both take B0's own markup and move a SUBSET of its children down by a measured amount. The
// subsets are decided by GEOMETRY, never by document order: the line draws its source line third,
// before the gridlines, but paints it on the frame's bottom margin, and an order-based split would
// carry a credit into the middle of the frame.
const FOOTER_BAND = 120;

function partition(svg, frame) {
  const { head, children, tail } = topLevelChildren(svg);
  const plot = plotRect(svg);
  const tagged = children.map((child) => {
    const ink = inkExtent(child, frame);
    if (ink === null || /^<rect\b[^>]*\bwidth="1080"[^>]*\bheight="1920"/.test(child)) return { child, ink, group: "frame" };
    if (ink.bottom <= plot.top) return { child, ink, group: "header" };
    if (ink.top >= frame.height - FOOTER_BAND) return { child, ink, group: "footer" };
    return { child, ink, group: "chart" };
  });
  const of = (group) => tagged.filter((e) => e.group === group);
  if (of("header").length === 0 || of("chart").length === 0)
    throw new Error(`the partition found no ${of("header").length === 0 ? "header" : "chart"} — the classification is wrong for this drawing`);
  const span = (list) =>
    list.length === 0 ? null : { top: Math.min(...list.map((e) => e.ink.top)), bottom: Math.max(...list.map((e) => e.ink.bottom)) };
  /** Re-emit with the named groups shifted and EVERY child left in its original document order.
   *  Order is not geometry, but re-ordering would make "the variant differs from B0 only in y"
   *  false, and that sentence is the whole warrant for calling this a composition-only change. */
  const rebuild = (moving, dy) =>
    head + tagged.map((e) => (moving.includes(e.group) ? shiftY(e.child, dy) : e.child)).join("") + tail;
  return { head, tail, plot, rebuild, headerSpan: span(of("header")), chartSpan: span(of("chart")), footerSpan: span(of("footer")) };
}

/** V1 — the whole block (header + chart) centred in the frame, equal void above and below. Anything
 *  the drawing pinned to the bottom margin stays pinned: a credit is furniture of the FRAME, and
 *  dragging it into the middle would be a second change on top of the one under test. */
function blockCentred(svg, frame) {
  const p = partition(svg, frame);
  const blockTop = Math.min(p.headerSpan.top, p.chartSpan.top);
  const blockBottom = Math.max(p.headerSpan.bottom, p.chartSpan.bottom);
  const dy = (frame.height - (blockBottom - blockTop)) / 2 - blockTop;
  return { svg: p.rebuild(["header", "chart"], dy), dy: +dy.toFixed(1) };
}

/**
 * V3 — the same block as V1, centred on the PLATFORM's band instead of on the page's. Not one of
 * the two variants the task asked for: it was added after the safe-area numbers came back, because
 * they say the frame's own centre is not where a story-format post's centre is. Instagram's
 * published band (269–1248px) sits INSIDE TikTok's cited one (130–1436px), so centring on the
 * stricter of the two satisfies both, and this arm is centred on Instagram's.
 */
function safeBandCentred(svg, frame, band) {
  const p = partition(svg, frame);
  const blockTop = Math.min(p.headerSpan.top, p.chartSpan.top);
  const blockBottom = Math.max(p.headerSpan.bottom, p.chartSpan.bottom);
  const dy = band.topPx + (frame.height - band.bottomPx - band.topPx - (blockBottom - blockTop)) / 2 - blockTop;
  return {
    svg: p.rebuild(["header", "chart"], dy),
    dy: +dy.toFixed(1),
    blockHeight: +(blockBottom - blockTop).toFixed(1),
    bandHeight: frame.height - band.bottomPx - band.topPx,
  };
}

/** V2 — the header stays exactly where B0 put it; the chart is centred in the height that remains
 *  between the header's last line of ink and the bottom of the usable frame (the footer's own ink
 *  where there is one, the frame's edge where there is not). */
function plotCentred(svg, frame) {
  const p = partition(svg, frame);
  const regionTop = p.headerSpan.bottom;
  const regionBottom = p.footerSpan === null ? frame.height : p.footerSpan.top;
  const chartHeight = p.chartSpan.bottom - p.chartSpan.top;
  const dy = regionTop + (regionBottom - regionTop - chartHeight) / 2 - p.chartSpan.top;
  return { svg: p.rebuild(["chart"], dy), dy: +dy.toFixed(1) };
}

// ------------------------------------------------------------- what a composition is measured by
function compose(svg, frame, titleText) {
  const p = partition(svg, frame);
  const blockTop = Math.min(p.headerSpan.top, p.chartSpan.top);
  const blockBottom = Math.max(p.headerSpan.bottom, p.chartSpan.bottom);
  const title = textRuns(svg).find((r) => titleText.startsWith(r.text.slice(0, 20)));
  if (title === undefined) throw new Error("could not find the title's own run");
  const runs = textRuns(svg);
  const covered = (top, bottom) => runs.filter((r) => r.bottom > frame.height - bottom || r.top < top).map((r) => r.text);
  return {
    voidAbovePx: +blockTop.toFixed(1),
    voidBelowPx: +(frame.height - blockBottom).toFixed(1),
    voidAbovePct: +((blockTop / frame.height) * 100).toFixed(1),
    voidBelowPct: +(((frame.height - blockBottom) / frame.height) * 100).toFixed(1),
    titleTopPct: +((title.top / frame.height) * 100).toFixed(1),
    plotAspect: +((p.plot.right - p.plot.left) / (p.plot.bottom - p.plot.top)).toFixed(2),
    plotCentrePct: +((((p.plot.top + p.plot.bottom) / 2) / frame.height) * 100).toFixed(1),
    plotTopPct: +((p.plot.top / frame.height) * 100).toFixed(1),
    plotBottomPct: +((p.plot.bottom / frame.height) * 100).toFixed(1),
    safeArea: SAFE_AREAS.map((s) => ({
      platform: s.platform,
      plotCentreSafe: (p.plot.top + p.plot.bottom) / 2 >= s.topPx && (p.plot.top + p.plot.bottom) / 2 <= frame.height - s.bottomPx,
      plotFullySafe: p.plot.top >= s.topPx && p.plot.bottom <= frame.height - s.bottomPx,
      titleSafe: title.top >= s.topPx && title.bottom <= frame.height - s.bottomPx,
      textUnderChrome: covered(s.topPx, s.bottomPx),
    })),
  };
}

// ---------------------------------------------------------------------------------- the two beats
// The word builders are copies of `portrait-probe.mjs`'s, so the variants are fed byte-identical
// inputs to B0's. Copied rather than imported because that file runs its own `main()` on import.
const BIN_WIDTH = 4;
const BIN_COUNT = 10;

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows
    .filter((r) => r.length > 0)
    .map((row) => {
      if (row.includes('"')) throw new Error(`quoted field in frozen data, parser is too simple: ${row}`);
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

async function histogramWords() {
  const rows = parseCsv(await readFile(join(HERE, "data-distribution.csv"), "utf8"));
  const values = rows.map((r) => Number(r["CO2 emissions per capita"]));
  const bins = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const lo = i * BIN_WIDTH;
    const hi = lo + BIN_WIDTH;
    bins.push({ lo, hi, count: values.filter((v) => (i === BIN_COUNT - 1 ? v >= lo : v >= lo && v < hi)).length });
  }
  const med = median(values);
  const top = [...bins].reverse().find((b) => b.count > 0);
  const topCountries = rows.filter((r) => Number(r["CO2 emissions per capita"]) >= top.lo).map((r) => r.Entity);
  const max = Math.max(...values);
  const share = (bins[0].count / values.length) * 100;
  return {
    bins,
    median: med,
    medianLabel: `Median: ${med.toFixed(1)} t`,
    title: "Six in ten countries emit under 4 tonnes of CO2 per person a year",
    limits:
      "Per-country distribution for 2023 — each of the 213 countries counts equally here, not weighted by population. A few oil and gas producers sit far out on the right.",
    source: "Source: Global Carbon Budget (2025), via Our World in Data · 2023 data, extracted 8 August 2026",
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
  const steepest = present.reduce((worst, d, i) => (i === 0 ? worst : Math.max(worst, Math.abs(present[i - 1].value - d.value))), 0);
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

// ------------------------------------------------------------------------------------- the run
async function main() {
  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: join(HERE, "..") });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}\n`);

  const H = await histogramWords();
  const L = await lineWords();

  const types = [
    {
      key: "h",
      name: "histogram",
      title: H.title,
      render: (frame, arm, range) =>
        createElement(PortraitHistogram, { ...H, ground, accent, arm, plotAspectRange: range, headerScale: frame.typeScale, ...frame }),
    },
    {
      key: "l",
      name: "line",
      title: L.title,
      render: (frame, arm, range) =>
        createElement(PortraitLine, { ...L, ground, accent, arm, plotAspectRange: range, headerScale: frame.typeScale, ...frame }),
    },
  ];

  const rows = [];
  for (const type of types) {
    // 1 — the same range B0 clamped to, re-derived the same way.
    const aspects = [];
    for (const frame of ACCEPTED) {
      const svg = renderToStaticMarkup(type.render(frame, "stretch", [1, 1]));
      const plot = plotRect(svg);
      aspects.push(+((plot.right - plot.left) / (plot.bottom - plot.top)).toFixed(2));
    }
    const range = rangeFrom(aspects);
    console.log(`${type.name.padEnd(10)} accepted aspects ${aspects.join(", ")} -> range ${range.join("–")}`);

    // 2 — B0 itself, then the two recompositions of it.
    const b0 = renderToStaticMarkup(type.render(PORTRAIT, "capped", range));
    const v1 = blockCentred(b0, PORTRAIT);
    const v2 = plotCentred(b0, PORTRAIT);
    // The histogram's B0 was rendered and committed by `portrait-probe.mjs`; the line's never was —
    // the earlier probe gave the line a stretch arm and a furnished arm and no bare control. Both
    // variants below are recompositions OF that control, so for the line it has to exist to be
    // compared against, and it is written here rather than assumed.
    if (type.key === "l") await emit(`${type.key}-b0-capped-bare`, b0, PORTRAIT);
    await emit(`${type.key}-v1-block-centred`, v1.svg, PORTRAIT);
    await emit(`${type.key}-v2-plot-centred`, v2.svg, PORTRAIT);
    const v3 = safeBandCentred(b0, PORTRAIT, SAFE_AREAS[0]);
    await emit(`${type.key}-v3-safe-band-centred`, v3.svg, PORTRAIT);
    assertCompositionOnly(b0, v1.svg, `${type.name} V1`);
    assertCompositionOnly(b0, v2.svg, `${type.name} V2`);
    assertCompositionOnly(b0, v3.svg, `${type.name} V3`);
    console.log("  the three variants differ from B0 in vertical position and in nothing else");
    console.log(
      `  block ink height ${v3.blockHeight}px against ${SAFE_AREAS[0].platform}'s ${v3.bandHeight}px band — ` +
        (v3.blockHeight <= v3.bandHeight ? "it fits" : `it OVERFLOWS by ${(v3.blockHeight - v3.bandHeight).toFixed(1)}px`),
    );

    for (const [arm, svg, dy] of [
      [`${type.key}-b0-capped-bare`, b0, 0],
      [`${type.key}-v1-block-centred`, v1.svg, v1.dy],
      [`${type.key}-v2-plot-centred`, v2.svg, v2.dy],
      [`${type.key}-v3-safe-band-centred`, v3.svg, v3.dy],
    ]) {
      const m = compose(svg, PORTRAIT, type.title);
      rows.push({ type: type.name, arm, dy, ...m });
      console.log(
        `  ${arm.padEnd(22)} dy=${String(dy).padStart(6)} void ${String(m.voidAbovePx).padStart(6)} above / ${String(m.voidBelowPx).padStart(6)} below  ` +
          `title top ${String(m.titleTopPct).padStart(4)}%  plot ${m.plotAspect}:1  centre ${String(m.plotCentrePct).padStart(4)}%`,
      );
    }
  }

  // 3 — did the clamp survive the recomposition? A translate cannot change an aspect, but the
  // numbers above are read off the EMITTED files, so this compares them rather than assuming it.
  for (const type of types) {
    const armRows = rows.filter((r) => r.type === type.name);
    const aspects = new Set(armRows.map((r) => r.plotAspect));
    console.log(`\n${type.name}: plot aspect across the ${armRows.length} arms = ${[...aspects].join(", ")} ${aspects.size === 1 ? "— unchanged, as required" : "— CHANGED, the recomposition is not composition-only"}`);
    if (aspects.size !== 1) throw new Error(`${type.name}: the recomposition moved the plot's aspect`);
  }

  // 4 — the report.
  const md = [];
  md.push("# Centring probe — the measurements, as produced");
  md.push("");
  md.push("Regenerate with `bun proof/portrait-aspect-probe/centring-probe.mjs` from `twin/`.");
  md.push("Every number here is written by that script. `CENTRING-VERDICT.md` beside it is the other");
  md.push("half — what a person saw when the PNGs were opened — and is not generated.");
  md.push("");
  md.push("`void above` / `void below` bound the BLOCK: the header's first ink to the chart's last.");
  md.push("Anything the drawing pins to the bottom margin (the line's source credit) is outside the");
  md.push("block by construction and is reported separately in the verdict.");
  md.push("");
  md.push("| arm | shift | void above | void below | title top edge | plot aspect | plot centre |");
  md.push("|---|---|---|---|---|---|---|");
  for (const r of rows)
    md.push(
      `| \`${r.arm}\` | ${r.dy === 0 ? "—" : `${r.dy > 0 ? "+" : ""}${r.dy}px`} | ${r.voidAbovePx}px (${r.voidAbovePct}%) | ${r.voidBelowPx}px (${r.voidBelowPct}%) | ${r.titleTopPct}% | ${r.plotAspect}:1 | ${r.plotCentrePct}% |`,
    );
  md.push("");
  md.push("The plot's own aspect is identical across every arm of each type: the variants move");
  md.push("the drawing and change nothing about it, which is what makes the comparison a comparison.");
  md.push("");
  md.push("## Against the platforms' own safe areas");
  md.push("");
  md.push("A story-format post is not shown on a blank rectangle. Each row asks whether the arm's");
  md.push("plot sits clear of the platform's published chrome, and names any text that falls under it.");
  md.push("");
  md.push("| platform | top | bottom | safe band | standing |");
  md.push("|---|---|---|---|---|");
  for (const s of SAFE_AREAS)
    md.push(
      `| ${s.platform} | ${s.topPx}px | ${s.bottomPx}px | ${s.topPx}–${1920 - s.bottomPx}px (${(((1920 - s.bottomPx - s.topPx) / 1920) * 100).toFixed(0)}% of the frame) | ${s.published ? "published by the platform" : "**not published** — third-party consensus, and TikTok says a longer caption makes it smaller" } |`,
    );
  md.push("");
  md.push("| arm | platform | plot centre in the band | whole plot in the band | title in the band | text under the chrome |");
  md.push("|---|---|---|---|---|---|");
  for (const r of rows)
    for (const s of r.safeArea)
      md.push(
        `| \`${r.arm}\` | ${s.platform} | ${s.plotCentreSafe ? "yes" : "**no**"} | ${s.plotFullySafe ? "yes" : "**no**"} | ${s.titleSafe ? "yes" : "**no**"} | ${s.textUnderChrome.length === 0 ? "none" : s.textUnderChrome.map((t) => `"${t.slice(0, 34)}${t.length > 34 ? "…" : ""}"`).join("; ")} |`,
      );
  md.push("");
  await writeFile(join(HERE, "CENTRING-MEASUREMENTS.md"), md.join("\n") + "\n");
  console.log(`\nwrote CENTRING-MEASUREMENTS.md and ${written.length} renders — now open them and look.`);
}

main();
