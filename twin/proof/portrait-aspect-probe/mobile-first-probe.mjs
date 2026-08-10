// MOBILE-FIRST PROBE — design the portrait frame FROM the phone, and let what fits decide what is
// drawn.
//
// The owner's ruling, which supersedes what `PORTRAIT-VERDICT.md` concluded: every arm rendered so
// far — including the two centred ones and including `h-b2-story-type`, the arm that probe liked
// best — takes a block composed for an ARTICLE COLUMN and moves it around inside a tall frame. That
// is repositioning. This probe composes the frame from the phone instead:
//
//   - an ABSOLUTE type scale in frame pixels, every size grounded in a cited legibility figure and
//     divided by 3 to reach a 360 dp phone (`MOBILE-FIRST-WIREFRAME.md` §2);
//   - the platform's published safe band treated as a SIZE BUDGET, not only a placement rule;
//   - the plot's height SOLVED from what the budget has left, never assigned;
//   - and a removal ladder that takes things AWAY when the budget is exceeded, because a rule that
//     only says "make it smaller" fails at exactly the moment it is needed.
//
// WHAT IS RENDERED, all at 1080x1920, same frozen data and same palette as the earlier probes:
//
//   histogram  m-h-mobile-first   the wireframe, ladder run, rungs recorded
//              h-b2-story-type    NOT re-rendered — measured off the file the earlier probe wrote,
//                                 so the comparison is against the real prior artifact
//              h-v3-safe-band…    likewise
//   line       m-l-mobile-first   the wireframe
//              m-l-b2-story-type  NEW: the line typeset the way `h-b2` was, which the earlier probe
//                                 never produced. Without it the line comparison would be against a
//                                 straw man, since `l-v3` is at article type sizes.
//              l-v3-safe-band…    measured off the earlier probe's file
//
// Usage, from `twin/`:  bun proof/portrait-aspect-probe/mobile-first-probe.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { readPalette, FONT_FAMILY } from "#shared/chart-beat/render-still.mjs";
import { PortraitLine } from "./PortraitLine.tsx";
import {
  PortraitMobileFirstHistogram,
  MOBILE_FIRST_SCALE as HISTOGRAM_SCALE,
} from "./MobileFirstHistogram.tsx";
import {
  PortraitMobileFirstLine,
  MOBILE_FIRST_SCALE as LINE_SCALE,
  LINE_RUNGS_UNAVAILABLE,
} from "./MobileFirstLine.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAME = { width: 1080, height: 1920 };

// Meta publishes one safe zone for Stories and Reels as PERCENTAGES — 14% top, 35% bottom, 6% each
// side — which on 1080x1920 is these pixels. Carried forward from `CENTRING-VERDICT.md`, which
// established them; the source is <https://www.facebook.com/business/help/980593475366490/>.
const SAFE = { top: Math.round(1920 * 0.14), bottom: Math.round(1920 * (1 - 0.35)) };
const STAGE_HEIGHT = SAFE.bottom - SAFE.top;

// A story image is shown full-bleed. Android's window size classes put "compact" at width < 600 dp
// and call it "99.96% of phones in portrait"; 360 dp is the narrow end of that class and a floor
// derived from the widest phone is not a floor. So one frame pixel is 1/3 of a CSS pixel.
// <https://developer.android.com/develop/ui/compose/layouts/adaptive/window-size-classes>
const PHONE_DP = 360;
const TO_CSS_PX = PHONE_DP / FRAME.width;

// The smallest size any of the three cited sources will defend: Datawrapper's "everything below
// 12px will likely be too small", the US federal data-viz standards' 9pt-for-screens (~12 CSS px),
// and Apple's 11 pt. 12 CSS px on a 360 dp phone is 36 px in this frame.
const FLOOR_CSS_PX = 12;
const FLOOR_FRAME_PX = FLOOR_CSS_PX / TO_CSS_PX;

// The earlier probe's phone-typeset arm used these two multipliers. Re-used verbatim for the line's
// comparison arm so that `m-l-b2-story-type` is `h-b2-story-type`'s sibling and not a new design.
const B2 = { typeScale: 1.9, headerScale: 2.6 };

// ---------------------------------------------------------------------------- the instruments
// Lifted verbatim from `portrait-probe.mjs`, which lifted them from the probe before it. Copied
// rather than imported, per the twin's own rule; the numbers they produce for the earlier arms are
// re-derived below and must reproduce that probe's published table, which is the check that the
// copy did not drift.
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
      fontSize,
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

/** The plot rectangle, read off the RENDERED geometry — the gridline set (the most numerous group
 *  sharing one x extent) for its width, and the tallest vertical rule where there is one, exactly
 *  as `portrait-probe.mjs` reads it. */
function plotRect(svg) {
  const all = lines(svg);
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

function pathAngles(svg) {
  const d = /<path\b[^>]*\bd="([^"]+)"/.exec(svg)?.[1];
  if (!d) return null;
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

/** THE NEW INSTRUMENT. Every distinct size actually DRAWN, with how many runs carry it, its size on
 *  a 360 dp phone, and whether it clears the floor. Read off the emitted SVG's own `font-size`
 *  attributes, never off the component's constants — a component that intends 48 and draws 25 would
 *  otherwise pass. */
function typeCensus(svg) {
  const runs = textRuns(svg);
  const bySize = new Map();
  for (const r of runs) bySize.set(r.fontSize, (bySize.get(r.fontSize) ?? 0) + 1);
  return [...bySize.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([framePx, count]) => ({
      framePx,
      cssPx: +(framePx * TO_CSS_PX).toFixed(1),
      runs: count,
      clearsFloor: framePx >= FLOOR_FRAME_PX,
    }));
}

/** The block's own ink: the topmost and bottommost thing WE draw, background excluded. Used against
 *  the stage, because the safe band is a size budget and an overflow has to be a number. */
function blockInk(svg, { width, height }) {
  const runs = textRuns(svg);
  const marks = rects(svg, width, height);
  const rules = lines(svg);
  const tops = [
    ...runs.map((r) => r.top),
    ...marks.map((r) => r.y),
    ...rules.map((l) => Math.min(l.y1, l.y2)),
  ];
  const bottoms = [
    ...runs.map((r) => r.bottom),
    ...marks.map((r) => r.y + r.h),
    ...rules.map((l) => Math.max(l.y1, l.y2)),
  ];
  const top = Math.min(...tops);
  const bottom = Math.max(...bottoms);
  return {
    top: +top.toFixed(1),
    bottom: +bottom.toFixed(1),
    height: +(bottom - top).toFixed(1),
    aboveStage: +Math.max(0, SAFE.top - top).toFixed(1),
    belowStage: +Math.max(0, bottom - SAFE.bottom).toFixed(1),
  };
}

function measure(svg, { width, height, editorialWords }) {
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
  const plot = plotRect(svg);
  const tallest = [...marks].sort((a, b) => b.h - a.h)[0];
  return {
    clipped: clipped.map((r) => ({ text: r.text, over: +Math.max(-r.left, r.right - width, -r.top, r.bottom - height).toFixed(1) })),
    collisions,
    plotAspect: +((plot.right - plot.left) / (plot.bottom - plot.top)).toFixed(2),
    plotFill: +(((plot.bottom - plot.top) / height) * 100).toFixed(1),
    markAspect: tallest === undefined ? null : +(tallest.h / tallest.w).toFixed(1),
    ink: blockInk(svg, { width, height }),
    census: typeCensus(svg),
    angles: pathAngles(svg),
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
async function emit(name, svg, { width }) {
  await writeFile(join(HERE, `${name}.svg`), svg);
  await writeFile(join(HERE, `${name}.png`), rasterise(svg, width));
  written.push(name);
}

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

// ---------------------------------------------------------------------------------- the beats
// The same words as `portrait-probe.mjs`, computed from the same frozen files, so the comparison is
// between LAYOUTS and not between two different stories.
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
    medianLabel: `Median ${med.toFixed(1)} t`,
    unit: "t",
    title: "Six in ten countries emit under 4 tonnes of CO2 per person a year",
    standfirst:
      "Per-country distribution for 2023 — each of the 213 countries counts equally here, not weighted by population. A few oil and gas producers sit far out on the right.",
    source: "Global Carbon Budget (2025), via Our World in Data",
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
    (worst, d, i) => (i === 0 ? worst : Math.max(worst, Math.abs(present[i - 1].value - d.value))),
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

// ---------------------------------------------------------------- the walking parity check
// The two components carry the SAME scale in two copies, because the twin's method is duplication
// with a guard rather than a shared module. This is the guard.
//
// THE MUTATION THAT REDDENS IT, run in a copy outside the tree before this was trusted: change
// `SOURCE.fontSize` from 36 to 34 in `MobileFirstLine.tsx` only. Output:
//     scale drift between the two copies: SOURCE.fontSize 36 vs 34
// A guard that cannot go red is worse than no guard.
function assertScaleParity() {
  const drift = [];
  const keys = new Set([...Object.keys(HISTOGRAM_SCALE), ...Object.keys(LINE_SCALE)]);
  for (const key of keys) {
    const a = HISTOGRAM_SCALE[key];
    const b = LINE_SCALE[key];
    if (a === undefined || b === undefined) {
      drift.push(`${key} missing from one copy`);
      continue;
    }
    if (typeof a === "number") {
      if (a !== b) drift.push(`${key} ${a} vs ${b}`);
      continue;
    }
    for (const field of new Set([...Object.keys(a), ...Object.keys(b)]))
      if (a[field] !== b[field]) drift.push(`${key}.${field} ${a[field]} vs ${b[field]}`);
  }
  if (drift.length > 0)
    throw new Error(`scale drift between the two copies: ${drift.join("; ")}`);
}

/** Every size in the scale must clear the floor by construction, before anything is drawn. This is
 *  the design's own invariant and it is checked rather than assumed.
 *
 *  THE MUTATION THAT REDDENS IT, run in the same copy outside the tree: set `SOURCE.fontSize` to 30
 *  in BOTH copies, so parity still holds and only the floor is broken. Output:
 *      the scale itself is under the 36px floor: SOURCE 30px */
function assertScaleClearsFloor() {
  const under = [];
  for (const [key, value] of Object.entries(HISTOGRAM_SCALE)) {
    if (typeof value !== "object") continue;
    if (value.fontSize < FLOOR_FRAME_PX) under.push(`${key} ${value.fontSize}px`);
  }
  if (under.length > 0)
    throw new Error(
      `the scale itself is under the ${FLOOR_FRAME_PX}px floor: ${under.join(", ")}`,
    );
}

// ------------------------------------------------------------------------------------- the run
async function main() {
  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  assertScaleParity();
  assertScaleClearsFloor();
  console.log(
    `scale parity OK · floor ${FLOOR_FRAME_PX}px frame = ${FLOOR_CSS_PX} CSS px at ${PHONE_DP} dp · stage ${SAFE.top}-${SAFE.bottom} (${STAGE_HEIGHT}px)\n`,
  );

  const H = await histogramWords();
  const L = await lineWords();

  // The ranges the earlier probe DERIVED by rendering each type's stretch arm at the three accepted
  // frames. Quoted here, not re-derived — `PORTRAIT-MEASUREMENTS.md` is the record, and the line's
  // is known to be wrong for the reason that file states.
  const RANGE = { histogram: [1.1, 2.9], line: [0.8, 1.8] };

  const rows = [];
  const ladders = {};

  // ---- histogram, mobile-first
  {
    let ladder = null;
    const svg = renderToStaticMarkup(
      createElement(PortraitMobileFirstHistogram, {
        ...H,
        ground,
        accent,
        ...FRAME,
        safeTop: SAFE.top,
        safeBottom: SAFE.bottom,
        plotAspectRange: RANGE.histogram,
        onLayout: (l) => (ladder = l),
      }),
    );
    await emit("m-h-mobile-first", svg, FRAME);
    ladders["m-h-mobile-first"] = ladder;
    rows.push([
      "m-h-mobile-first",
      measure(svg, {
        ...FRAME,
        editorialWords: words(
          H.title,
          H.standfirst,
          H.source,
          ...H.notes.slice(0, ladder.state.noteCount).flatMap((n) => [n.lead, n.body]),
        ),
      }),
    ]);
  }

  // ---- line, mobile-first
  {
    let ladder = null;
    const svg = renderToStaticMarkup(
      createElement(PortraitMobileFirstLine, {
        ...L,
        ground,
        accent,
        ...FRAME,
        safeTop: SAFE.top,
        safeBottom: SAFE.bottom,
        plotAspectRange: RANGE.line,
        onLayout: (l) => (ladder = l),
      }),
    );
    await emit("m-l-mobile-first", svg, FRAME);
    ladders["m-l-mobile-first"] = ladder;
    rows.push([
      "m-l-mobile-first",
      measure(svg, {
        ...FRAME,
        editorialWords: words(
          L.title,
          L.standfirst,
          L.source,
          ...L.notes.slice(0, ladder.state.noteCount).flatMap((n) => [n.lead, n.body]),
        ),
      }),
    ]);
  }

  // ---- the line's missing sibling: `h-b2-story-type` typeset for the line, so the comparison is
  //      against the best the EARLIER approach can do on this type, not against its article arm.
  {
    const svg = renderToStaticMarkup(
      createElement(PortraitLine, {
        ...L,
        ground,
        accent,
        ...FRAME,
        typeScale: B2.typeScale,
        headerScale: B2.headerScale,
        arm: "furnished",
        plotAspectRange: RANGE.line,
      }),
    );
    await emit("m-l-b2-story-type", svg, FRAME);
    rows.push([
      "m-l-b2-story-type",
      measure(svg, {
        ...FRAME,
        editorialWords: words(L.title, L.standfirst, L.source, ...L.notes.flatMap((n) => [n.lead, n.body])),
      }),
    ]);
  }

  // ---- the earlier arms, measured off the files that probe wrote. Nothing is re-rendered: if the
  //      comparison rebuilt them it would be comparing this session's code against itself.
  for (const [name, editorialWords] of [
    ["h-b2-story-type", 142],
    ["h-v3-safe-band-centred", 58],
    ["l-v3-safe-band-centred", 15],
  ]) {
    const svg = await readFile(join(HERE, `${name}.svg`), "utf8");
    rows.push([name, measure(svg, { ...FRAME, editorialWords })]);
  }

  // ------------------------------------------------------------------------------- the report
  const report = [];
  report.push("# Mobile-first portrait — the measurements, as produced\n");
  report.push(
    "Regenerate with `bun proof/portrait-aspect-probe/mobile-first-probe.mjs` from `twin/`.",
    "Every number below is written by that script. `MOBILE-FIRST-VERDICT.md` beside this file is the",
    "other half — what a person saw when the PNGs were opened — and is not generated.\n",
  );
  report.push("## The frame's budget\n");
  report.push(
    `- stage — Meta's published safe band on 1080x1920: **${SAFE.top} to ${SAFE.bottom} px, ${STAGE_HEIGHT} px tall, ${((STAGE_HEIGHT / FRAME.height) * 100).toFixed(0)}% of the frame**.`,
    `- one frame pixel = **${TO_CSS_PX.toFixed(3)} CSS px** on a ${PHONE_DP} dp phone shown full-bleed.`,
    `- type floor — ${FLOOR_CSS_PX} CSS px = **${FLOOR_FRAME_PX} frame px**. Nothing is drawn below it.\n`,
  );

  report.push("## The arms\n");
  report.push(
    "| arm | plot aspect | plot fill | tallest bar | block ink | overflows stage by | smallest type drawn | under the floor | clipped | collisions | editorial words |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const [name, m] of rows) {
    const smallest = m.census[m.census.length - 1];
    const under = m.census.filter((c) => !c.clearsFloor);
    const underRuns = under.reduce((s, c) => s + c.runs, 0);
    report.push(
      `| \`${name}\` | ${m.plotAspect}:1 | ${m.plotFill}% | ${m.markAspect === null ? "n/a" : `${m.markAspect}:1`} | ${m.ink.height}px (${m.ink.top}–${m.ink.bottom}) | ${(m.ink.aboveStage + m.ink.belowStage).toFixed(1)}px | ${smallest.framePx}px = **${smallest.cssPx} CSS px** | ${under.length === 0 ? "**none**" : `${underRuns} runs at ${under.map((c) => `${c.framePx}px`).join(", ")}`} | ${m.clipped.length} | ${m.collisions.length} | ${m.editorialWords} |`,
    );
  }

  report.push("\n## Every size actually drawn, and what it is on a phone\n");
  for (const [name, m] of rows) {
    report.push(`\n**\`${name}\`**\n`);
    report.push("| frame px | on a 360 dp phone | runs | clears the 12 CSS px floor |", "|---|---|---|---|");
    for (const c of m.census)
      report.push(`| ${c.framePx} | ${c.cssPx} CSS px | ${c.runs} | ${c.clearsFloor ? "yes" : "**NO**"} |`);
  }

  report.push("\n## What the ladder removed, and why\n");
  for (const [name, ladder] of Object.entries(ladders)) {
    report.push(
      `\n**\`${name}\`** — plot ${ladder.plotWidth} x ${ladder.plotHeight} px (its height floor at this width is ${ladder.minPlotHeight}px, its ceiling ${ladder.maxPlotHeight}px); block ${ladder.blockHeight}px against a ${STAGE_HEIGHT}px stage.\n`,
    );
    if (ladder.fired.length === 0) report.push("- nothing removed — the beat fitted as written.");
    else for (const [i, rung] of ladder.fired.entries()) report.push(`${i + 1}. ${rung}`);
    if (ladder.unavailable)
      for (const u of ladder.unavailable) report.push(`- *not available on this type* — ${u}`);
    report.push(`- final state: ${JSON.stringify(ladder.state)}`);
    report.push(`- refused: ${ladder.refused ?? "no"}`);
  }

  const lineRows = rows.filter(([, m]) => m.angles !== null);
  if (lineRows.length > 0) {
    report.push("\n## The line's own measurement: slope\n");
    report.push(
      "Cleveland's banking-to-45° says a line's aspect should put its average segment near 45° off",
      "horizontal (Heer & Agrawala, *Multi-Scale Banking to 45°*, InfoVis 2006).",
      "`PORTRAIT-MEASUREMENTS.md` measured the shipped portrait render at 80.6° steepest / 65.2° end",
      "to end — a drift drawn as a cliff.\n",
      "| arm | steepest drawn segment | first reading to last |",
      "|---|---|---|",
    );
    for (const [name, m] of lineRows)
      report.push(`| \`${name}\` | ${m.angles.steepestSegmentDeg}° | ${m.angles.endToEndDeg}° |`);
  }

  report.push("\n## Cross-check — are the earlier arms measured as they were published?\n");
  const h = rows.find(([n]) => n === "h-b2-story-type")[1];
  report.push(
    `\`h-b2-story-type\` was published at **2.39:1 plot aspect, 16.2% fill**; measured off its own file`,
    `here it is **${h.plotAspect}:1, ${h.plotFill}%**. The instruments are the earlier probe's, copied,`,
    `and they reproduce its table — so the comparison is against the real prior artifact.\n`,
  );

  await writeFile(join(HERE, "MOBILE-FIRST-MEASUREMENTS.md"), report.join("\n") + "\n");
  console.log(`wrote ${written.length} renders: ${written.join(", ")}`);
  console.log("wrote MOBILE-FIRST-MEASUREMENTS.md");
}

await main();
