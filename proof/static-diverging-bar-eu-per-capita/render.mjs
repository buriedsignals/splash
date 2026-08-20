// twin/proof/static-diverging-bar-eu-per-capita/render.mjs
//
// This beat's own render script — the render ladder's first rung. Reads the frozen CSV beside it,
// derives every claim from it, renders the still, and prints every derived figure to the console
// before it does.
//
// Usage, from `twin/`:  bun proof/static-diverging-bar-eu-per-capita/render.mjs
//
// EVERY CLAIM IS COMPUTED HERE: which country is the exception, that it is the ONLY one, how many
// rows sit on each side, the size of the rise, the two readings behind it, the mean of the falls
// and which fall is the largest. The headline says "the only", which is exactly the kind of claim
// that quietly stops being true with a data refresh — so it is ASSERTED, and this script throws
// rather than shipping a stale sentence over fresh numbers. Nothing in the rendered output is
// typed: 12 of 55 beats in this corpus carried a false claim and every one of them was a value
// typed by hand.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { TYPE, DivergingBarChange, en, rungsFor } from "./DivergingBarChange.tsx";

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

const FROM = 1990;
const TO = 2024;
/** The universe the headline names. A membership list, not a data choice: the EU has 27 member
 *  states, and the frozen file was fetched for exactly those 27 ISO codes. */
const MEMBERS = 27;

const SOURCE =
  "Source: Global Carbon Budget (2025); population based on various sources (2024) – " +
  "with major processing by Our World in Data · fossil fuels and industry only";

/**
 * OWID's `co-emissions-per-capita` export, filtered at fetch time to the 27 EU member states.
 *
 * Returns one row per country — its reading in each of the two years and the signed change —
 * sorted from the largest rise to the largest fall. A country missing either year is DROPPED here
 * and the count assertion below then fails, because a headline that says "the only EU country"
 * cannot be made from a partial field.
 */
export function changesBetween(csv, from, to) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(
      `csv has no Entity / Year / CO₂ per capita column, got: ${header}`,
    );

  const byCountry = new Map();
  for (const row of rows) {
    const cells = row;
    const year = Number(cells[yearAt]);
    if (year !== from && year !== to) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byCountry.has(cells[entityAt])) byCountry.set(cells[entityAt], {});
    byCountry.get(cells[entityAt])[year] = value;
  }

  return [...byCountry.entries()]
    .filter(([, years]) => years[from] !== undefined && years[to] !== undefined)
    .map(([country, years]) => ({
      country,
      from: years[from],
      to: years[to],
      change: years[to] - years[from],
    }))
    .sort((a, b) => b.change - a.change);
}

async function run() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = changesBetween(csv, FROM, TO);

  if (rows.length !== MEMBERS)
    throw new Error(
      `expected all ${MEMBERS} EU member states with a reading in both ${FROM} and ${TO}, got ${rows.length} — ` +
        `"the only EU country" cannot be claimed from a partial field`,
    );

  const rose = rows.filter((r) => r.change > 0);
  const fell = rows.filter((r) => r.change < 0);
  if (rose.length !== 1)
    throw new Error(
      `the headline says one country rose; the data says ${rose.length} (${rose.map((r) => r.country).join(", ")})`,
    );
  if (fell.length !== MEMBERS - 1)
    throw new Error(
      `${MEMBERS - rose.length - fell.length} countries are exactly flat — the sentence does not fit`,
    );

  const subject = rose[0];
  const averageFall = fell.reduce((sum, r) => sum + r.change, 0) / fell.length;
  const largest = fell.reduce((a, b) => (b.change < a.change ? b : a));
  const smallest = fell.reduce((a, b) => (b.change > a.change ? b : a));

  console.table(
    rows.map((r, i) => ({
      row: i + 1,
      country: r.country,
      [FROM]: r.from.toFixed(2),
      [TO]: r.to.toFixed(2),
      change: en(r.change),
    })),
  );
  console.log(
    `rose ${rose.length} · fell ${fell.length} · mean of the falls ${averageFall.toFixed(4)} · ` +
      `largest ${largest.country} ${largest.change.toFixed(4)} · smallest ${smallest.country} ${smallest.change.toFixed(4)}`,
  );

  // ONE OBJECT, not a run of `const`s, and the shape is load-bearing rather than tidy.
  // `claims-grounded-in-data.test.ts` reads a reader-facing string either as `prop:` inside an
  // object or as a `const` whose own name is a reader-facing prop — but its expression reader does
  // not treat `;` as a terminator, so a claim `const` declared immediately after another one is
  // swallowed by its predecessor's expression and never scanned. Measured on a copy of this tree:
  // with `title` and `subtitle` as consecutive consts, mutating a figure inside `subtitle` to a
  // value the frozen data cannot reproduce left the guard GREEN. Inside an object every entry ends
  // at its own comma, which the reader does terminate on, so all three are scanned — verified by
  // the same mutation going red afterwards.
  const words = {
    title: `${subject.country} is the only EU country emitting more CO₂ per person than in ${FROM}`,
    subtitle:
      `${subject.country}'s rise is ${en(subject.change)} tonnes per person — the only one, and a small one: ` +
      `${subject.from.toFixed(2)} in ${FROM} against ${subject.to.toFixed(2)} in ${TO}. ` +
      `The other ${fell.length} member states all emit less per person than they did, by ` +
      `${Math.abs(averageFall).toFixed(2)} tonnes on average — ${largest.country} by ` +
      `${Math.abs(largest.change).toFixed(2)}, the largest fall in the union.`,
    alt:
      `A diverging bar chart of the change in CO₂ emissions per person between ${FROM} and ${TO} for all ` +
      `${MEMBERS} EU member states, sorted from the largest rise to the largest fall. Exactly one bar ` +
      `points right of the zero line: ${subject.country}, at ${en(subject.change)} tonnes per person, ` +
      `drawn in the accent colour on a highlighted row. The other ${fell.length} point left, from ` +
      `${smallest.country} at ${en(smallest.change)} down to ${largest.country} at ${en(largest.change)}. ` +
      `A dashed rule marks the average of those falls, ${en(averageFall)}.`,
  };
  const subjectNote = `the only rise since ${FROM}`;
  const axisTitle = `Change in CO₂ emissions per person, ${FROM} to ${TO}, tonnes`;
  const averageFallLabel = `Average of the ${fell.length} falls: ${en(averageFall)}`;

  console.log(`title:    ${words.title}`);
  console.log(`subtitle: ${words.subtitle}`);
  console.log(`rule:     ${averageFallLabel}`);
  console.log(`alt:      ${words.alt}`);

  const {
    ground,
    accent,
    origin,
    source: paletteSource,
  } = readPalette(HERE, { stopAt: join(HERE, "..") });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );
  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this the size was two literals below and `renderStill` compared them
  // against each other, so they agreed by construction and the delivered PNG was a size nobody
  // chose.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name = flag === -1 ? "static-diverging-bar-eu-per-capita-still" : `static-diverging-bar-eu-per-capita-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all.
  const form = assertTypeMayEnter(TYPE, size, { what: "static-diverging-bar-eu-per-capita" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(DivergingBarChange, {
      rows: rows.map(({ country, change }) => ({ country, change })),
      ...words,
      source: SOURCE,
      ground,
      accent,
      subject: subject.country,
      subjectNote,
      axisTitle,
      averageFall,
      averageFallLabel,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });
  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  // The ladder the COMPONENT ran, read back out of the markup it wrote rather than recomputed here.
  console.log(`ladder in the artifact: ${/data-ladder="([^"]*)"/.exec(svg)?.[1] ?? "(absent)"}`);
  assertTypeFloor(svg, size, { what: "static-diverging-bar-eu-per-capita" });
  assertWithinStage(svg, size, { what: "static-diverging-bar-eu-per-capita" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

run();
