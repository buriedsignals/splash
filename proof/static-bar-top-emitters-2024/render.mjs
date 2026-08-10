// twin/proof/static-bar-top-emitters-2024/render.mjs
//
// Reads the frozen CSV (every entity's 2024 annual CO2 emissions) and renders the ranking.
// Usage, from `twin/`:  bun proof/static-bar-top-emitters-2024/render.mjs
//
// Everything the rendered chart asserts — the ten members of the ranking, their order, the
// headline's "more than the next five combined", the share-of-world figure in the subtitle and
// every number in the alt text — is COMPUTED here from the frozen file and printed to the console
// before the render. Nothing is typed. That is the one defect class this project measured: 12 of
// 55 beats carried a false claim and every one of them was a value typed by hand.

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
import {
  TYPE,
  TopEmittersColumns,
  formatValue,
  rungsFor,
} from "./TopEmittersColumns.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOP_N = 10;
const YEAR = 2024;

/** OWID ships country rows and its own aggregates (World, continents, income groups, trade
 *  blocs) in the same file. A country carries a bare ISO-3166 alpha-3 code; every aggregate
 *  either carries an `OWID_`-prefixed code or none at all. Ranking without this filter puts
 *  "Asia" at the top of a list of countries — the single most obvious way this beat could have
 *  shipped a lie. */
const ISO3 = /^[A-Z]{3}$/;
const WORLD_CODE = "OWID_WRL";

/** RFC4180-lite: this file's only quoted field would be an entity name containing a comma, and
 *  the frozen data has none — asserted below rather than assumed. */
function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
      if (row.includes('"')) throw new Error(`quoted field in frozen data, parser is too simple: ${row}`);
      const cells = row.split(",");
      if (cells.length !== cols.length)
        throw new Error(`row has ${cells.length} cells, header has ${cols.length}: ${row}`);
      const rec = {};
      cols.forEach((c, i) => (rec[c] = cells[i]));
      return rec;
    });
}

function main() {
  return run();
}

async function run() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  const valueColumn = "Annual CO₂ emissions";
  console.log(`read ${rows.length} rows from data.csv`);

  const years = [...new Set(rows.map((r) => Number(r.Year)))];
  if (years.length !== 1 || years[0] !== YEAR)
    throw new Error(`frozen data should hold ${YEAR} only, holds: ${years.join(", ")}`);

  const countries = rows.filter((r) => ISO3.test(r.Code));
  const world = rows.find((r) => r.Code === WORLD_CODE);
  if (!world) throw new Error(`no ${WORLD_CODE} row in the frozen data — the world total is claimed in the subtitle`);
  console.log(
    `${countries.length} country rows, ${rows.length - countries.length} aggregate rows excluded from the ranking`,
  );

  const ranked = countries
    .map((r) => ({ country: r.Entity, tonnes: Number(r[valueColumn]) }))
    .sort((a, b) => b.tonnes - a.tonnes);
  for (const r of ranked.slice(0, 20)) {
    if (!Number.isFinite(r.tonnes)) throw new Error(`${r.country} has a non-numeric value`);
  }

  const top = ranked.slice(0, TOP_N).map((r) => ({ country: r.country, value: r.tonnes / 1e9 }));
  console.table(top.map((r, i) => ({ rank: i + 1, country: r.country, "bn t": formatValue(r.value) })));

  const subject = top[0].country;
  const subjectValue = top[0].value;

  // How many of the countries BELOW the subject can be added together before their sum passes
  // the subject's own total. This is the headline, and it is a search, not an assertion — if the
  // data moved so that the answer were three, the headline would say three.
  let combined = 0;
  let beatenCount = 0;
  for (const row of top.slice(1)) {
    if (combined + row.value > subjectValue) break;
    combined += row.value;
    beatenCount += 1;
  }
  const beaten = top.slice(1, beatenCount + 1);
  console.log(
    `${subject} ${formatValue(subjectValue)} bn t > the next ${beatenCount} combined ` +
      `(${beaten.map((r) => r.country).join(" + ")} = ${formatValue(combined)} bn t)`,
  );
  if (beatenCount < 2)
    throw new Error("the headline comparison needs at least two countries to add together");

  const worldTonnes = Number(world[valueColumn]);
  const topShare = (top.reduce((s, r) => s + r.value, 0) * 1e9) / worldTonnes;
  console.log(
    `the ten together are ${(topShare * 100).toFixed(1)}% of the ${WORLD_CODE} total ` +
      `(${formatValue(worldTonnes / 1e9)} bn t)`,
  );

  const lastPlace = top[TOP_N - 1];
  const ratioToSecond = subjectValue / top[1].value;
  console.log(
    `${subject} is ${ratioToSecond.toFixed(1)}x ${top[1].country}; rank ${TOP_N} is ` +
      `${lastPlace.country} at ${formatValue(lastPlace.value)} bn t`,
  );

  const spelled = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  // English furniture, not decoration: "more than United States, India added together" and
  // "United States's" both read as machine output. `static-discipline.md`'s Language rule counts
  // a furniture leak as a defect even when every number is right.
  const NEEDS_THE = new Set(["United States", "United Kingdom", "Netherlands", "Philippines"]);
  const named = (c) => (NEEDS_THE.has(c) ? `the ${c}` : c);
  const possessive = (c) => `${named(c)}${c.endsWith("s") ? "'" : "'s"}`;
  const listOf = (cs) => {
    const names = cs.map(named);
    return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  };
  const title =
    `${subject} emitted more CO₂ in ${YEAR} than the next ${spelled[beatenCount]} countries put together`;
  const subtitle =
    `Annual territorial CO₂ from fossil fuels and industry, billion tonnes. These ten countries ` +
    `account for ${(topShare * 100).toFixed(0)}% of the world total; emissions embodied in imported ` +
    `goods are counted where the goods are made, not where they are used.`;
  const callout = {
    value: subjectValue,
    text: `more than ${listOf(beaten.map((r) => r.country))} added together (${formatValue(combined)} bn t)`,
  };
  const alt =
    `Column chart ranking the ten countries with the highest CO₂ emissions in ${YEAR}. ` +
    `${named(subject)} is far ahead at ${formatValue(subjectValue)} billion tonnes, ` +
    `${ratioToSecond.toFixed(1)} times ${possessive(top[1].country)} ${formatValue(top[1].value)} billion ` +
    `tonnes, and more than ${listOf(beaten.map((r) => r.country))} added together. ` +
    `The remaining columns fall from ${formatValue(top[2].value)} billion tonnes ` +
    `(${named(top[2].country)}) to ${formatValue(lastPlace.value)} billion tonnes (${named(lastPlace.country)}).`;
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`callout:  ${callout.text}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter. Before this the size was two literals below and
  // `renderStill` compared them against each other, so `size: portrait` on the slot would have
  // produced an 1800x1120 PNG in silence.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name =
    flag === -1
      ? "static-bar-top-emitters-2024-still"
      : `static-bar-top-emitters-2024-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  const form = assertTypeMayEnter(TYPE, size, {
    what: "static-bar-top-emitters-2024",
  });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(TopEmittersColumns, {
      rows: top,
      title,
      subtitle,
      source:
        "Source: Global Carbon Budget 2025, via Our World in Data · 2024 data, extracted 9 August 2026",
      alt,
      ground,
      accent,
      subject,
      callout,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "static-bar-top-emitters-2024" });
  assertWithinStage(svg, size, { what: "static-bar-top-emitters-2024" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
