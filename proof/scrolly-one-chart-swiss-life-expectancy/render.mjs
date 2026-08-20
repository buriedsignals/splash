// The runner for the ONE-CHART scrolly beat: a single line — life expectancy at birth in
// Switzerland, one reading per year — and four successive READINGS of it, driven by the scroll.
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly`
// (the media-agnostic scaffold above its CONFIG marker) and hands it steps. Nothing under
// `scrolly/` is edited by it.
//
// WHY THIS EARNS THE SCROLL, and why it is a different argument from the sibling
// `scrolly-chart-eu-carbon`. That beat shows ONE subject through FOUR encodings, and the comparison
// between them is its argument. This one is the classic form the vehicle was named for: **one
// picture, and the steps are successive readings of it.** The four readings are:
//
//   1. the shape of 148 years;
//   2. one year inside it, called out;
//   3. how long that one year took to undo, as a band;
//   4. the same line with its axes narrowed to the last twelve years.
//
// A SINGLE FRAME CANNOT HOLD THEM, and this beat can say so with a number rather than an opinion:
// on the axis of reading 1 — 40 to 84 years of life expectancy — the fall this beat's last reading
// is about is 1.4% of the plot's own height. Drawn at reading 1's scale it is a thickness, not an
// event. Drawn at reading 4's scale it is the largest single-year fall since 1944. Those are the
// SAME nine data points; no one axis shows both, and a chart that tried would be a chart with two
// y axes, which is the cluttered frame the beat exists to avoid. Nor is this a video: the reader
// has to be able to sit on reading 3 and count the years back to the pre-1918 level, and a cut
// takes that pace away from them.
//
// Usage:
//   bun proof/scrolly-one-chart-swiss-life-expectancy/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { ChartFrame } from "./ChartFrame.tsx";
import {
  BAND_FILL,
  PLOT,
  PROSE_LANE,
  assertNumericStates,
  chartGeometry,
  VIEWBOX,
} from "./chart-drive.mjs";
import { deriveFacts, parseReadings, t1, t2 } from "./life-data.ts";

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

// The colours come from the answer recorded in PALETTE.md beside this beat — never a hex written
// here. `stopAt` is an input SEARCH BOUNDARY, not an output path: it stops the walk at proof/ so a
// beat with no recorded answer throws instead of quietly inheriting a neighbour's.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: join(HERE, ".."),
});
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
// The default writes BESIDE THE BEAT. A `/tmp` default is how a render prints a path, exits zero,
// and leaves the committed artifact stale.
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"));

/**
 * The four states the scroll drives between. Every number is derived from the frozen file; the two
 * paddings are the only shape decisions, and they are stated as fractions of the range they pad.
 *
 * A state is a flat record of NUMBERS, because the driver interpolates it field by field. The two
 * marks keep FIXED years and move only in opacity — a mark whose year interpolated would slide
 * through six decades of meaningless positions on its way from 1918 to 2020.
 */
function buildStates(facts) {
  const fullPad = (facts.fullHi - facts.fullLo) * 0.08;
  const decadePad = (facts.decadeHi - facts.decadeLo) * 0.22;
  const full = {
    x0: facts.firstYear,
    x1: facts.lastYear,
    y0: facts.fullLo - fullPad,
    y1: facts.fullHi + fullPad,
  };
  const decade = {
    x0: facts.decadeFrom,
    x1: facts.lastYear,
    y0: facts.decadeLo - decadePad,
    y1: facts.decadeHi + decadePad,
  };
  // Reading 1's accent is a run of ZERO LENGTH, collapsed onto the year reading 2 is about, and
  // fully transparent. Two things follow, and the second is the point. It is invisible at reading 1,
  // exactly as before. And on the way to reading 2 its start travels back a year while its opacity
  // comes up, so the accent DRAWS ITSELF along the segment the sentence names instead of switching
  // on where it already was. The first frame of that transition and the last differ in the
  // polyline's own points, not only in an alpha — which is the difference between a picture that
  // evolves as the reader scrolls and four stills cross-fading.
  const off = { hiFrom: facts.worst.year, hiTo: facts.worst.year, hiOpacity: 0 };
  return assertNumericStates([
    // 1 — the shape. No accent anywhere: this is the picture before any reading is asked of it.
    { ...full, ...off, bandFrom: facts.worst.year - 1, bandTo: facts.worst.year, bandOpacity: 0, markA: 0, markB: 0 },
    // 2 — one year called out. The accent appears on a single segment; the dot and its annotation
    //     arrive with it.
    {
      ...full,
      hiFrom: facts.worst.year - 1,
      hiTo: facts.worst.year,
      hiOpacity: 1,
      bandFrom: facts.worst.year - 1,
      bandTo: facts.worst.year,
      bandOpacity: 0,
      markA: 1,
      markB: 0,
    },
    // 3 — the recovery. The SAME accent run GROWS forward to the year the line regains its
    //     pre-fall level, and the band grows under it. Nothing else on the frame moves.
    {
      ...full,
      hiFrom: facts.worst.year,
      hiTo: facts.recoveryYear,
      hiOpacity: 1,
      bandFrom: facts.worst.year,
      bandTo: facts.recoveryYear,
      bandOpacity: BAND_FILL,
      markA: 1,
      markB: 0,
    },
    // 4 — the axes travel. Both domains interpolate, so the reader watches the frame close in on
    //     the last twelve years rather than being cut to a second chart.
    {
      ...decade,
      hiFrom: facts.covid.year - 1,
      hiTo: facts.covid.year,
      hiOpacity: 1,
      bandFrom: facts.covid.year - 1,
      bandTo: facts.covid.year,
      bandOpacity: 0,
      markA: 0,
      markB: 1,
    },
  ]);
}

/**
 * How tall the fall of the last step is on the FIRST step's own axis, as a percentage of the plot's
 * own height. Derived from the state the beat actually renders, so narrowing the first axis would
 * change this sentence — the figure is about the picture, and it is computed from the picture.
 */
function fallHeightPercent(facts, states) {
  const first = states[0];
  return (facts.covid.drop / (first.y1 - first.y0)) * 100;
}

/**
 * The four steps. Each `prose` is built from the derived facts — never a string with a number typed
 * into it.
 */
function buildSteps(facts, states) {
  const heightPercent = fallHeightPercent(facts, states);
  return [
    {
      id: "shape",
      prose: [
        `Life expectancy at birth in ${facts.entity}, one reading a year, ${facts.firstYear} to ` +
          `${facts.lastYear}: ${t1(facts.firstValue)} years to ${t1(facts.lastValue)}. Scroll — the line will not ` +
          `move; what you are asked to see in it will.`,
      ],
    },
    {
      id: "worst",
      prose: [
        `One year breaks the climb. ${facts.worst.year}: ${t1(facts.worst.from)} down to ${t1(facts.worst.to)} — ` +
          `${t1(facts.worst.drop)} years gone in twelve months, ${t1(facts.worstRatio)} times the next-steepest ` +
          `fall in the whole record.`,
      ],
    },
    {
      id: "recovery",
      prose: [
        `How long to undo it? Not until ${facts.recoveryYear} does the line pass its ${facts.worst.year - 1} level ` +
          `again — ${facts.recoveryYears} years, shaded here.`,
      ],
    },
    {
      id: "decade",
      prose: [
        `Now the axes close in on the last ${facts.lastYear - facts.decadeFrom + 1} years. At the scale you have ` +
          `been reading, ${facts.covid.year}'s fall of ${t2(facts.covid.drop)} years is ${t1(heightPercent)}% of ` +
          `the plot's height. At this one it is the steepest since ${facts.lastFallAsSteepAsCovid.year}.`,
      ],
    },
  ];
}

async function render() {
  const csv = await readFile(join(HERE, "swiss-life-expectancy.csv"), "utf8");
  const readings = parseReadings(csv);
  const entity = parseCsvRows(csv.trim())[1][0];
  const facts = deriveFacts(readings, entity);

  // The two claims this beat's own steps rest on, asserted against the data rather than trusted:
  // the steepest fall in the record is the one the second step names, and the fall the last step
  // names is the steepest of the recent quarter-century. If a re-export moved either, the run
  // stops here rather than shipping a sentence the chart contradicts.
  if (facts.worst.year !== facts.falls[0].year)
    throw new Error("the steepest fall is not the one this beat's second step is built on");
  if (facts.covid.year >= facts.worst.year && facts.covid.drop >= facts.worst.drop)
    throw new Error("the recent fall is not smaller than the record fall; step 4's comparison would be false");

  const states = buildStates(facts);
  const steps = buildSteps(facts, states);

  const marks = [
    { year: facts.worst.year, label: `${facts.worst.year}: ${t1(facts.worst.to)}` },
    { year: facts.covid.year, label: `${facts.covid.year}: ${t1(facts.covid.to)}` },
  ];

  // Short on purpose: it sits at the bottom of the DRAWING, above the prose lane, and at 375px a
  // credit that wraps to a third line reaches down into the panel. The full provenance — which
  // sources Our World in Data combines, and who chose the colours — is in the page's bottom source
  // row, which under the fixed-page model never scrolls away.
  const shortCredit =
    `Life expectancy at birth, ${facts.entity} ${facts.firstYear}–${facts.lastYear} · Our World in Data`;

  const visual = createElement(ChartFrame, {
    readings,
    state: states[0],
    marks,
    bandLabel: `${facts.worst.year}–${facts.recoveryYear}`,
    unit: "years of life expectancy at birth",
    credit: shortCredit,
    ground,
    ink: furniture.ink,
    muted: furniture.muted,
    accent,
  });

  // The driver, inlined verbatim from the SAME module `ChartFrame.tsx` imported to SSR the first
  // state. `export` is stripped so it runs as a classic script — no `type="module"`, so it keeps
  // working inside a CMS iframe that restricts module scripts, the same trick the scaffold uses for
  // its own interaction file.
  const driverSource = await readFile(join(HERE, "chart-drive.mjs"), "utf8");
  const boot =
    driverSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__oneChartStarted) return;\n` +
    `  window.__oneChartStarted = true;\n` +
    // The script is inside the GRAPHIC, which the scaffold emits BEFORE the prose column, so at the
    // moment this tag is parsed not one prose panel exists yet. The first build booted here and
    // `findPanels` returned nothing: the driver exited on its own guard, silently, and the page
    // looked exactly like a page whose script had never been inlined. Waiting for the parse to
    // finish is the fix, and the guard above keeps it running exactly once either way.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="one-chart"]');\n` +
    `    if (!root) return;\n` +
    `    initChartScrolly(root, ${JSON.stringify(readings)}, ${JSON.stringify(states)}, ${JSON.stringify(marks)});\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  const script = createElement("script", { dangerouslySetInnerHTML: { __html: boot } });

  // Step 1 carries the ONE picture and the driver; the other steps carry an empty wrapper. The
  // driver moves the picture out of the wrapper on load so the scaffold's own swap can never
  // un-paint it, and with JavaScript off the picture stays inside the wrapper the scaffold marks
  // active by default — so a no-JS reader gets the whole of the first reading, and every step's
  // prose, and nothing half-drawn.
  const stepsWithFrames = steps.map((step, i) => ({
    ...step,
    frame: i === 0 ? createElement(Fragment, null, visual, script) : createElement("div"),
  }));

  const title =
    `One line, four readings: life expectancy in ${facts.entity}, ${facts.firstYear}–${facts.lastYear}`;
  // The header never scrolls away under the fixed-page model, so every word in it costs the
  // graphic height at every scroll position — measured at 375x812, where the first draft's credit
  // ran to nine lines. Kept to provenance: what the indicator is, which sources it combines, the
  // span, the frozen file, and who chose the colours.
  const source =
    `Life expectancy at birth (period): Our World in Data, indicator life-expectancy — Human Mortality Database ` +
    `with Zijdeman et al. (2015) before 1950, UN World Population Prospects after. ${facts.entity}, ` +
    `${facts.firstYear}–${facts.lastYear}, ${readings.length} annual readings, frozen as swiss-life-expectancy.csv. ` +
    `Colours: ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)}, chosen by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps: stepsWithFrames,
    title,
    source,
    ground,
    outDir,
    name: "one-line-four-readings.html",
    proseLane: PROSE_LANE,
  });

  // What the reader is told about the picture, recomputed here so a change to PLOT or to the first
  // state shows up in the console beside the claim it feeds.
  const plotUnits = chartGeometry(readings, states[0], marks);
  console.log(
    `one-chart scrolly → ${outPath}\n` +
      `  ${readings.length} readings ${facts.firstYear}-${facts.lastYear}, panel contrast ${panelContrast.toFixed(2)}:1\n` +
      `  steepest fall ${facts.worst.year} ${t1(facts.worst.drop)}y (${t1(facts.worstRatio)}x the next, ${facts.secondWorst.year})\n` +
      `  back to the ${facts.worst.year - 1} level in ${facts.recoveryYear} (${facts.recoveryYears} years)\n` +
      `  recent steepest ${facts.covid.year} ${t2(facts.covid.drop)}y = ${t1(fallHeightPercent(facts, states))}% of the plot at state 1; ` +
      `steepest since ${facts.lastFallAsSteepAsCovid.year}\n` +
      `  plot box ${PLOT.left}-${PLOT.right} x ${PLOT.top}-${PLOT.bottom} of the frame, viewBox ${VIEWBOX.width}x${VIEWBOX.height}, ` +
      `${plotUnits.yTicks.filter((t) => t.visible).length} y ticks visible at state 1`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
