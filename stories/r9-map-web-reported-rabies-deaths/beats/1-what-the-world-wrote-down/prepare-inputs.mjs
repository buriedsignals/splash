// Builds this beat's two inputs from the FROZEN source and from Natural Earth, and writes down every
// silence on the way. Nothing here edits `source/` — it reads it.
//
//   in : ../../source/data.csv                        (WHO GHO NTD_RAB2, frozen, 2 919 country-years)
//        ../../source/who-country-names.json          (WHO's own COUNTRY dimension, frozen beside it)
//        /tmp/r9rab/ne50.geojson                      (Natural Earth 1:50m admin 0, acquired per SKILL.md)
//   out: rabies-deaths-2024.csv                       (Code,Entity,Year,value — one row per READING)
//        countries.geojson                            (only the shapes this beat draws, ADM0_A3-keyed)
//        JOIN.json                                    (the three silences, declared)
//
// Usage: bun stories/.../prepare-inputs.mjs --shapes /tmp/r9rab/ne50.geojson

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const YEAR = "2024";

/** RFC 4180 enough for this file: no embedded newlines, but quoted fields and doubled quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } quoted = false; i += 1; continue; }
      field += c; i += 1; continue;
    }
    if (c === '"') { quoted = true; i += 1; continue; }
    if (c === ",") { row.push(field); field = ""; i += 1; continue; }
    if (c === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += text[i + 1] === "\n" ? 2 : 1; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += c; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ── The frozen table, read as the publisher wrote it ────────────────────────────────────────────
const source = join(HERE, "..", "..", "source");
const [header, ...lines] = parseCsv(readFileSync(join(source, "data.csv"), "utf8").trim());
const at = Object.fromEntries(header.map((h, i) => [h, i]));
const year = lines.filter((l) => l[at.TimeDim] === YEAR);
if (year.length === 0) throw new Error(`no ${YEAR} rows in the frozen table`);

// WHO writes THREE states into one column and only one of them is a number. "No data" is the
// literal string the publisher uses for a country that filed nothing; it is NOT a zero, and the
// difference is what this beat is about. The profiler already refused to type this column for
// exactly this reason ("looked numeric but \"No data\" is not").
const filed = [], silent = [];
for (const row of year) {
  const raw = row[at.Value];
  if (raw === "No data") { silent.push(row[at.SpatialDim]); continue; }
  if (!/^\d+$/.test(raw)) throw new Error(`unrecognised state in Value for ${row[at.SpatialDim]}: ${JSON.stringify(raw)}`);
  filed.push({ code: row[at.SpatialDim], value: Number(raw) });
}

const names = new Map(
  JSON.parse(readFileSync(join(source, "who-country-names.json"), "utf8")).value.map((d) => [d.Code, d.Title]),
);
const unnamed = [...filed.map((f) => f.code), ...silent].filter((c) => !names.has(c));
if (unnamed.length > 0) throw new Error(`WHO's own dimension table names no country for: ${unnamed.join(", ")}`);

// ── The shapes ──────────────────────────────────────────────────────────────────────────────────
const shapesPath = flag("--shapes", "/tmp/r9rab/ne50.geojson");
const collection = JSON.parse(readFileSync(shapesPath, "utf8"));
const byKey = new Map(collection.features.map((f) => [f.properties.ADM0_A3, f]));

// ADM0_A3, never ISO_A3 (geo-discipline rule 5). The one alias this join needs, declared rather
// than applied silently: Natural Earth keys South Sudan `SDS`, WHO keys it `SSD`. Unaliased, the
// country that reported the fourth-highest count in the file renders as no-data and looks entirely
// legitimate.
const ALIAS = { SSD: "SDS" };
const shapeKey = (whoCode) => ALIAS[whoCode] ?? whoCode;

const readingsWithNoShape = [], silentWithNoShape = [];
for (const f of filed) if (!byKey.has(shapeKey(f.code))) readingsWithNoShape.push(f);
for (const c of silent) if (!byKey.has(shapeKey(c))) silentWithNoShape.push(c);

const drawnFiled = filed.filter((f) => byKey.has(shapeKey(f.code)));
const drawnSilent = silent.filter((c) => byKey.has(shapeKey(c)));
const study = [...drawnFiled.map((f) => shapeKey(f.code)), ...drawnSilent.map(shapeKey)].sort();

// ── Write ───────────────────────────────────────────────────────────────────────────────────────
// One row per READING. A country that filed nothing gets NO row: it is `expectedNoData` in the join,
// painted with the surface that means "no reading", and named in the caveat.
const csv = ["Code,Entity,Year,value"];
for (const f of drawnFiled.sort((a, b) => b.value - a.value || a.code.localeCompare(b.code)))
  csv.push(`${shapeKey(f.code)},"${names.get(f.code).replace(/"/g, '""')}",${YEAR},${f.value}`);
writeFileSync(join(HERE, "rabies-deaths-2024.csv"), csv.join("\n") + "\n");

const trimmed = {
  type: "FeatureCollection",
  features: study.map((k) => {
    const f = byKey.get(k);
    // Every other property is stripped on the way in, so the ISO_A3 trap cannot be fallen into later.
    return { type: "Feature", properties: { ADM0_A3: k, NAME: f.properties.NAME }, geometry: f.geometry };
  }),
};
writeFileSync(join(HERE, "countries.geojson"), JSON.stringify(trimmed));

const join_ = {
  indicator: "WHO GHO NTD_RAB2 — Reported number of human rabies deaths",
  year: YEAR,
  shapes: "Natural Earth 1:50m Admin 0 Countries, joined on ADM0_A3",
  countriesInTheWhoRowForThisYear: year.length,
  reportedANumber: filed.length,
  reportedZero: filed.filter((f) => f.value === 0).length,
  filedNothing: silent.length,
  // TWO totals, because they are two different true numbers and conflating them is how a map comes
  // to claim a figure it does not draw. `totalReported` is what the register holds; `totalDrawn` is
  // what this map can put on a shape. The difference is `readingsThatLandOnNoShape`.
  totalReported: filed.reduce((s, f) => s + f.value, 0),
  totalDrawn: drawnFiled.reduce((s, f) => s + f.value, 0),
  aliases: Object.entries(ALIAS).map(([who, ne]) => ({ who, naturalEarth: ne, name: names.get(who) })),
  readingsThatLandOnNoShape: readingsWithNoShape.map((f) => ({ code: f.code, name: names.get(f.code), value: f.value })),
  silencesThatLandOnNoShape: silentWithNoShape.map((c) => ({ code: c, name: names.get(c) })),
  drawn: study.length,
};
writeFileSync(join(HERE, "JOIN.json"), JSON.stringify(join_, null, 2) + "\n");

// EVERY reader-facing name, for the shapes with a reading AND for the shapes without one — the
// no-data countries are half this beat's argument and a reader hovers them too. WHO's own COUNTRY
// dimension is the spelling, never Natural Earth's `NAME` (a cartographic abbreviation sized to fit
// inside a polygon: "Dem. Rep. Congo", "Central African Rep.").
const whoCodeOf = new Map(Object.entries(ALIAS).map(([who, ne]) => [ne, who]));
const regionNames = Object.fromEntries(
  study.map((k) => [k, names.get(whoCodeOf.get(k) ?? k)]),
);
const unspelled = Object.entries(regionNames).filter(([, n]) => !n).map(([k]) => k);
if (unspelled.length > 0) throw new Error(`no WHO spelling for: ${unspelled.join(", ")}`);
writeFileSync(join(HERE, "region-names.json"), JSON.stringify(regionNames, null, 1) + "\n");

console.log(JSON.stringify(join_, null, 1));
