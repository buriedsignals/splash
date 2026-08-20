// stories/stress-a-energy-bills/beats/energy-bills-by-country/render.mjs
//
// Reads the frozen intake CSV (source/data.csv, copied byte-for-byte into this beat's own
// data.csv) and renders the bar comparison. Usage: bun render.mjs
//
// THE CSV IS DELIBERATELY MESSY, AND NOTHING BELOW PRETENDS OTHERWISE. See BRIEF.md for the full
// account of every defect this script has to work around by hand, and exactly what — if
// anything — in the toolchain noticed each one before this script went looking.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { EnergyBillsBar } from "./EnergyBillsBar.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * A real CSV parser, not `split(",")`. The frozen source has two conditions the naive one-liner
 * in the Swiss life-expectancy pattern beat never had to survive: a thousands-separated number in
 * quotes (`"1,234.5"`) and a country name with a literal comma in quotes (`"Netherlands, the"`).
 * Naive splitting on every comma would cut both of those into extra fields and silently misalign
 * every column after them — checked by hand, since nothing in the profiler or the toolchain warns
 * that a sample CSV needs anything more than a comma split (see BRIEF.md finding 1).
 */
function parseCsv(text) {
  const body = text.replace(/^﻿/, ""); // strip the UTF-8 BOM before it can leak into a header name
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inQuotes) {
      if (c === '"' && body[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.trim());
  return dataRows
    .filter((r) => r.length === headers.length && r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

/** `"1,234.5"` / `" 987.25 "` -> 1234.5 / 987.25. Blank -> null. The header the CSV actually
 *  carries is `" price_eur "` (leading and trailing spaces) and the profiler typed this whole
 *  column `text`, not `number` — see BRIEF.md finding 2 for what that meant to draw from. */
function parsePrice(raw) {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new Error(`could not parse price ${JSON.stringify(raw)}`);
  return n;
}

function formatEUR(value) {
  return (
    "€" +
    value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rawRows = parseCsv(csv);
  console.log(`parsed: ${rawRows.length} data rows from data.csv`);

  // The BOM lands on the FIRST header, not on "country" — checked by looking at the actual key,
  // not assumed from the visible column name (BRIEF.md finding 3).
  const countryKey = Object.keys(rawRows[0]).find((k) => k.replace(/^﻿/, "") === "country");
  if (!countryKey) throw new Error(`expected a "country" column (BOM or not), got keys: ${Object.keys(rawRows[0]).join(", ")}`);
  console.log(`country column key, as actually parsed: ${JSON.stringify(countryKey)}`);

  const cleaned = rawRows.map((r) => ({
    country: r[countryKey],
    price: parsePrice(r["price_eur"]),
    refCode: r["ref_code"],
    period: r["period"],
    households: Number(r["households"]),
  }));

  // The exact-duplicate Spain row. Nothing upstream (the profiler, the CSV reader) flagged it —
  // `profile.json`'s `distinct: 7` on `country` is the only trace, and it reads as "seven distinct
  // VALUES", not "one row repeated", unless you already know to subtract it from `rowCount: 8`
  // (BRIEF.md finding 4). Dropped here by comparing every field, not just the country name, so a
  // country that legitimately reports twice (two periods) would not be silently collapsed.
  const seen = new Set();
  const deduped = [];
  let duplicatesDropped = 0;
  for (const r of cleaned) {
    const key = JSON.stringify(r);
    if (seen.has(key)) {
      duplicatesDropped++;
      console.log(`dropped exact-duplicate row: ${r.country}`);
      continue;
    }
    seen.add(key);
    deduped.push(r);
  }
  if (duplicatesDropped !== 1)
    throw new Error(`expected exactly 1 duplicate row (Spain), dropped ${duplicatesDropped}`);
  console.log(`rows after de-duplication: ${deduped.length}`);

  // The period column carries two formats for the same nominal month ("2023-01" and "01/2023") —
  // checked here so a real mismatch would be visible in the console, not silently averaged over.
  const periods = new Set(deduped.map((r) => r.period));
  console.log(`period values seen: ${[...periods].join(", ")}`);

  const withPrice = deduped.filter((r) => r.price !== null);
  const withoutPrice = deduped.filter((r) => r.price === null);
  console.log(
    `${withPrice.length} countries report a price, ${withoutPrice.length} do not (${withoutPrice.map((r) => r.country).join(", ")})`,
  );

  const ordered = [...withPrice].sort((a, b) => b.price - a.price);
  // Countries with no price cannot be ranked, so they are appended after the ranking rather than
  // sorted among it — the doctrine's rule ("for a ranking, sort by value") only applies to values
  // that exist (`bar-and-column.md`).
  const rows = [
    ...ordered.map((r) => ({ country: r.country, value: r.price })),
    ...withoutPrice.map((r) => ({ country: r.country, value: null })),
  ];

  const denmark = deduped.find((r) => r.country === "Denmark");
  const germany = deduped.find((r) => r.country === "Germany");
  const spain = deduped.find((r) => r.country === "Spain");
  const ratioToGermany = denmark.price / germany.price;
  const ratioToSpain = denmark.price / spain.price;
  console.log(
    `Denmark ${denmark.price} vs Germany ${germany.price}: ${ratioToGermany.toFixed(1)}x; ` +
      `vs Spain ${spain.price}: ${ratioToSpain.toFixed(1)}x`,
  );

  // THE TAKEAWAY. The article states none, and hedges its only comparison ("roughly forty times
  // what a Spanish household pays") as disputed with an unclear methodology. That number does not
  // even match the two clean rows it could be checked against: Denmark is 39.1x Germany and 67.7x
  // Spain here, not a single "roughly forty" either way. So the title below asserts nothing the
  // article did not already hedge — it states the shape the reported data itself shows, not a
  // multiplier, and the subtitle carries the caveat and the missing countries rather than folding
  // them into a headline claim nobody confirmed. See BRIEF.md, "The takeaway," for the reasoning.
  const title = `Denmark's reported energy price dwarfs every other country in this snapshot`;
  const subtitle =
    `Reported for one period in 2023; Italy and Poland reported no price. The article's own ` +
    `comparison to other countries is disputed, with an unclear methodology — this chart shows ` +
    `only the reported figures themselves.`;
  const alt =
    `Bar chart of reported household energy prices in seven European countries. Denmark's ` +
    `reported price, ${formatEUR(denmark.price)}, is far higher than every other country shown ` +
    `— ${ratioToGermany.toFixed(1)} times Germany's ${formatEUR(germany.price)} and ` +
    `${ratioToSpain.toFixed(1)} times Spain's ${formatEUR(spain.price)}. France and the ` +
    `Netherlands report prices in the same rough range as Germany and Spain. Italy and Poland ` +
    `report no price for this period.`;

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name = flag === -1 ? "energy-bills-by-country-still" : `energy-bills-by-country-${size}`;
  if (flag !== -1) console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);

  const form = assertTypeMayEnter("bar", size, { what: "energy-bills-by-country" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(EnergyBillsBar, {
      rows,
      title,
      subtitle,
      source: "Source: stress-a-energy-bills intake data (source/data.csv), as frozen at intake",
      alt,
      ground,
      accent,
      subject: "Denmark",
      valueLabel: formatEUR,
      size,
    }),
    width,
    height,
    scale: 1,
    outDir,
    name,
  });

  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "energy-bills-by-country" });
  assertWithinStage(svg, size, { what: "energy-bills-by-country" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file`);
}

main();
