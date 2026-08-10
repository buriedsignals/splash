// twin/proof/vidz-diverging-bar-eu-per-capita/probe/size-budget.mjs
//
// CAN 27 EU MEMBER STATES BE DRAWN IN ANY FRAME THIS TOOLCHAIN EXPORTS?
//
// This beat is the last chart beat owing a size pin, and it is a DECISION rather than a migration:
// the ledger records that "27 EU rows clear no size against the type floor without dropping member
// states, which would change what the beat states". Two arms were offered, and this file is how
// both were answered with numbers instead of with an opinion:
//
//   A. a TWO-COLUMN REDRAW at landscape — what `proof/static-diverging-bar-eu-per-capita` does,
//      packing the same 27 rows into two columns on one shared domain and one panel width;
//   B. a TALLER FRAME for a video that is not a story — portrait's 1080 x 1920 read WITHOUT Meta's
//      safe band, on the argument that the band exists for Stories and Reels and this beat is an
//      article/YouTube video.
//
// Usage, from the repository root:  bun proof/vidz-diverging-bar-eu-per-capita/probe/size-budget.mjs
//
// ── WHAT THIS INSTRUMENT IS, AND WHAT IT IS NOT ───────────────────────────────────────────────
//
// It REPRODUCES the component's layout arithmetic at each candidate frame; it does not render it.
// That limit is stated because it matters, and it is bounded in the one direction that keeps a
// refusal honest: the reproduction is DELIBERATELY GENEROUS. It leaves out the right-hand ring
// clearance and two small offsets the component really reserves, so it reports MORE room than the
// component has. An instrument that over-states the room can only make a refusal more conservative;
// it cannot manufacture one.
//
// And it is calibrated rather than trusted. The last row it prints is the beat's own shipped frame,
// 1080 x 1350 at the tuning actually committed, where it reports 850px of plot and a 31.5px row
// pitch against the ~806px / 29.9px the shipped component lays out — 5% generous, in the stated
// direction. `diverging-final-frame.png` beside this folder is the picture those numbers describe.
//
// Text is measured with resvg (`#shared/chart-beat/render-still.mjs`), not with a character count:
// the whole question is how many lines a claim-length headline takes at a video legibility floor.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { SIZES } from "#shared/chart-video/sizes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BEAT = join(HERE, "..");
const FROM = 1990;
const TO = 2024;

/** The beat's own reader, duplicated rather than imported: `render.mjs` runs Remotion at module
 *  scope, so importing it would start an mp4 render just to read a CSV. */
function changesBetween(csv, from, to) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  const byCountry = new Map();
  for (const row of rows) {
    const cells = row.split(",");
    const year = Number(cells[yearAt]);
    if (year !== from && year !== to) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byCountry.has(cells[entityAt])) byCountry.set(cells[entityAt], {});
    byCountry.get(cells[entityAt])[year] = value;
  }
  return [...byCountry.entries()]
    .filter(([, y]) => y[from] !== undefined && y[to] !== undefined)
    .map(([country, y]) => ({
      country,
      from: y[from],
      to: y[to],
      change: y[to] - y[from],
    }))
    .sort((a, b) => b.change - a.change);
}

const signed = (v, d = 2) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`;

/**
 * The shipped 1080-frame tokens divided by that frame's own 1.20 over the 900-wide convention every
 * craft skill's base is written at — the same re-basing `vidz-bar-column-top-emitters` records.
 */
const B = {
  TITLE: { fontSize: 32, fontWeight: 700, lead: 40 },
  SOURCE: { fontSize: 17, fontWeight: 400 },
  CAVEAT: { fontSize: 15, fontWeight: 400, lead: 20 },
  AXIS_TICK: { fontSize: 14, fontWeight: 500 },
  ROW_LABEL: { fontSize: 15, fontWeight: 500 },
  VALUE_LABEL: { fontSize: 14, fontWeight: 600 },
  CONCLUSION: { fontSize: 18, fontWeight: 600, lead: 23 },
  TITLE_TO_CAVEAT: 27,
  CAVEAT_TO_AXIS_TITLE: 32,
  AXIS_TITLE_TO_TICKS: 25,
  TICKS_TO_PLOT: 40,
  LABEL_GUTTER_AIR: 13,
  VALUE_GUTTER_AIR: 12,
  CONCLUSION_GAP: 25,
  SOURCE_AIR: 8,
};

/** The lane a row label needs, as a multiple of its own type — the ratio the static sibling packs
 *  to, and the one `type-at-size.mjs` brackets with the pyramid's measured break at ~1.1. */
const ROW_AIR = 1.2;

function wrap(text, max, font) {
  const out = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > max) {
      out.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...out, line] : out;
}

const rows = changesBetween(await readFile(join(BEAT, "data.csv"), "utf8"), FROM, TO);
const fell = rows.filter((r) => r.change < 0);
const subject = rows.filter((r) => r.change > 0)[0];
const averageFall = fell.reduce((s, r) => s + r.change, 0) / fell.length;
const largest = fell.reduce((a, b) => (b.change < a.change ? b : a));

// The beat's real words. Retyped here rather than imported for the reason given above; every number
// in them is derived from the frozen file, so a data refresh cannot make this probe stale silently.
const title = `${subject.country} is the only EU country emitting more CO₂ per person than in ${FROM}`;
const caveat =
  `${subject.country}'s rise is ${signed(subject.change)} tonnes per person — the only one, and a small one: ` +
  `${subject.from.toFixed(2)} in ${FROM} against ${subject.to.toFixed(2)} in ${TO}. ` +
  `The other ${fell.length} member states all emit less per person than they did.`;
const source =
  "Source: Global Carbon Budget (2025); population based on various sources (2024) – " +
  "with major processing by Our World in Data · fossil fuels and industry only";
const conclusion =
  `The other ${fell.length} cut theirs by ${Math.abs(averageFall).toFixed(2)} tonnes per person on ` +
  `average — ${largest.country} by ${Math.abs(largest.change).toFixed(2)}, the largest fall in the EU.`;

/**
 * The candidate frames. The three the table exports, plus the two arms this probe exists to answer:
 * portrait without the story band (arm B), and landscape at the tuning the beat actually ships —
 * the most generous reading that still clears landscape's 30px floor, kept so the verdict does not
 * depend on agreeing with the table's own `typeScale`.
 */
const CANDIDATES = {
  ...SIZES,
  "portrait, no story band": { ...SIZES.portrait, stage: null },
  "landscape, shipped tuning": {
    ...SIZES.landscape,
    typeScale: 1.2 * (1920 / 1080),
  },
  "CALIBRATION — the shipped frame": {
    width: 1080,
    height: 1350,
    typeScale: 1.2,
    minTypePx: 12,
    stage: null,
  },
};

/** The removal ladder, in `type-at-size.mjs`'s own order: R1 is free, then R3, then R7. */
const LADDER = [
  { name: "keep everything", axisTitle: true, caveat: "full" },
  { name: "R1 (axis title)", axisTitle: false, caveat: "full" },
  { name: "R1+R3 (caveat's first sentence)", axisTitle: false, caveat: "first" },
  { name: "R1+R7 (no caveat)", axisTitle: false, caveat: "none" },
];

const findings = [];
for (const [name, row] of Object.entries(CANDIDATES)) {
  const { width, height, typeScale, minTypePx, stage } = row;
  const sp = (v) => Math.round(v * typeScale);
  const f = (t) => ({
    ...t,
    fontSize: sp(t.fontSize),
    ...(t.lead === undefined ? {} : { lead: sp(t.lead) }),
  });
  const T = {
    TITLE: f(B.TITLE),
    SOURCE: f(B.SOURCE),
    CAVEAT: f(B.CAVEAT),
    ROW_LABEL: f(B.ROW_LABEL),
    VALUE_LABEL: f(B.VALUE_LABEL),
    CONCLUSION: f(B.CONCLUSION),
  };
  if (T.ROW_LABEL.fontSize < minTypePx) {
    console.log(
      `${name.padEnd(31)} REFUSED before layout: the row label is ${T.ROW_LABEL.fontSize}px against ` +
        `this frame's ${minTypePx}px floor`,
    );
    continue;
  }
  const PAD = Math.max(Math.round((40 / 900) * width), minTypePx * 2);
  const top = stage ? stage.top : PAD;
  const bottom = stage ? stage.bottom : height - PAD;
  const measure = width - PAD * 2;

  const nameGutter =
    Math.max(...rows.map((r) => measureText(r.country, T.ROW_LABEL))) +
    sp(B.LABEL_GUTTER_AIR);
  const valueGutter =
    Math.max(...rows.map((r) => measureText(signed(r.change), T.VALUE_LABEL))) +
    sp(B.VALUE_GUTTER_AIR);
  // A column costs its own name gutter and a value gutter on EACH side of its zero line, before one
  // pixel of bar is drawn. This is the arithmetic that refuses the static sibling's third column.
  const gutterPerColumn = nameGutter + valueGutter * 2;
  const laneNeeded = Math.round(T.ROW_LABEL.fontSize * ROW_AIR);

  for (const rung of LADDER) {
    const titleLines = wrap(title, measure, T.TITLE);
    let y = top + T.TITLE.fontSize + (titleLines.length - 1) * T.TITLE.lead;
    if (rung.caveat !== "none") {
      const text =
        rung.caveat === "first" ? caveat.slice(0, caveat.indexOf(". ") + 1) : caveat;
      y += sp(B.TITLE_TO_CAVEAT) + (wrap(text, measure, T.CAVEAT).length - 1) * T.CAVEAT.lead;
    }
    if (rung.axisTitle) y += sp(B.CAVEAT_TO_AXIS_TITLE);
    y += sp(B.AXIS_TITLE_TO_TICKS);
    const plotTop = y + sp(B.TICKS_TO_PLOT);
    const sourceLines = wrap(source, measure, T.SOURCE);
    const sourceLead = Math.round(T.SOURCE.fontSize * 1.5);
    const conclusionLines = wrap(conclusion, measure, T.CONCLUSION);
    const plotBottom =
      bottom -
      (sourceLines.length - 1) * sourceLead -
      T.SOURCE.fontSize -
      sp(B.SOURCE_AIR) -
      conclusionLines.length * T.CONCLUSION.lead -
      sp(B.CONCLUSION_GAP);
    const plotHeight = plotBottom - plotTop;

    const arms = [1, 2, 3].map((columns) => {
      const perColumn = Math.ceil(rows.length / columns);
      const pitch = plotHeight / perColumn;
      const panel = (measure - gutterPerColumn * columns) / columns;
      const fits = pitch >= laneNeeded && panel >= gutterPerColumn;
      if (fits) findings.push(`${name} · ${rung.name} · ${columns} column(s)`);
      return `${columns}col pitch ${pitch.toFixed(1)} panel ${panel.toFixed(0)} ${fits ? "FITS" : "no"}`;
    });
    console.log(
      `${name.padEnd(31)} ${rung.name.padEnd(31)} plot ${plotHeight.toFixed(0).padStart(5)}px  ` +
        `lane ${String(laneNeeded).padStart(3)}px  gutters/col ${gutterPerColumn.toFixed(0).padStart(4)}  | ${arms.join(" · ")}`,
    );
  }
  console.log("");
}

console.log(
  findings.length
    ? `CANDIDATES THAT FIT:\n  ${findings.join("\n  ")}`
    : `NO CANDIDATE FITS. 27 member states do not go into any frame this toolchain exports, at any ` +
        `column count, with or without the story band — and the ladder is spent before the rows are ` +
        `reached, because the binding constraint is the CLAIM in the headline at a video type floor.`,
);
