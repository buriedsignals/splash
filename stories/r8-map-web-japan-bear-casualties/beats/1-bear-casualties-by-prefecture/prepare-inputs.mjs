// Turns the story's frozen source into this beat's own two inputs: one point per prefecture the
// ministry reports, and a declared account of every silence in the join.
//
// The join is between two authorities that do not spell a prefecture the same way. The ministry's
// table writes 秋田; Natural Earth's admin-1 file writes 秋田県. Neither is wrong and neither can be
// changed, so the alias rule is written down here, applied once, and the result is REFUSED unless
// every name on both sides is either matched or declared.
//
// Usage: bun stories/<slug>/beats/<beat>/prepare-inputs.mjs --shapes /tmp/ne10_adm1.geojson
//
// The shapes are not in this repository and are not acquired by it. Get them with:
//   curl -sSo /tmp/ne10_adm1.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const shapesPath = flag("--shapes", null);
if (!shapesPath) {
  throw new Error(
    "--shapes is required and has no default: this beat needs Japan's 47 admin-1 label points and " +
      "nothing in this repository ships them. curl the Natural Earth 1:10m admin-1 file first — the " +
      "1:50m one carries nine countries and Japan is not among them (measured 2026-08-23: 294 " +
      "features, all Australia/Brazil/Canada/USA/China/India/Indonesia/Russia/South Africa).",
  );
}
if (!existsSync(shapesPath)) throw new Error(`no shapes at ${shapesPath}`);

// THE MEASURE. The ministry publishes three per month and three for the year; this beat draws one.
// 被害者数 (people hurt) rather than 人身被害件数 (incidents), because the takeaway counts people,
// and rather than 死亡者数 (deaths), because the ministry's own note says the casualty count
// already contains the deaths and the two must never be added.
const VALUE_COLUMN = "計_被害者数";
const KEY_COLUMN = "区分";

// THE ROW THAT IS NOT A PREFECTURE. The ministry prints its national total as the last row of the
// same table, under the same 区分 column. It is declared here and excluded, rather than silently
// filtered by "the largest one": a total that walks into a symbol map draws one circle bigger than
// the whole country and nothing says why.
const AGGREGATE_ROWS = ["計"];

// THE ALIAS RULE. Natural Earth writes every prefecture with its administrative suffix; the
// ministry writes none of them. 北海道 keeps its 道 — it is part of the name, not a suffix — which
// is why this is a rule about 県/府/都 and not a rule about "the last character".
const SUFFIXES = ["県", "府", "都"];
function ministryNameOf(natural) {
  if (natural === "北海道") return "北海道";
  for (const suffix of SUFFIXES) {
    if (natural.endsWith(suffix) && natural.length > 1) return natural.slice(0, -1);
  }
  return natural;
}

// THE REGIONS, as Japan's own statistical offices group its prefectures (八地方区分). The filter's
// own dimension, and the only field in this file the ministry's table does not supply.
const REGION_OF = {
  北海道: "Hokkaido",
  青森: "Tohoku", 岩手: "Tohoku", 宮城: "Tohoku", 秋田: "Tohoku", 山形: "Tohoku", 福島: "Tohoku",
  茨城: "Kanto", 栃木: "Kanto", 群馬: "Kanto", 埼玉: "Kanto", 千葉: "Kanto", 東京: "Kanto", 神奈川: "Kanto",
  新潟: "Chubu", 富山: "Chubu", 石川: "Chubu", 福井: "Chubu", 山梨: "Chubu", 長野: "Chubu",
  岐阜: "Chubu", 静岡: "Chubu", 愛知: "Chubu",
  三重: "Kansai", 滋賀: "Kansai", 京都: "Kansai", 大阪: "Kansai", 兵庫: "Kansai", 奈良: "Kansai", 和歌山: "Kansai",
  鳥取: "Chugoku", 島根: "Chugoku", 岡山: "Chugoku", 広島: "Chugoku", 山口: "Chugoku",
  徳島: "Shikoku", 香川: "Shikoku", 愛媛: "Shikoku", 高知: "Shikoku",
  福岡: "Kyushu", 佐賀: "Kyushu", 長崎: "Kyushu", 熊本: "Kyushu", 大分: "Kyushu",
  宮崎: "Kyushu", 鹿児島: "Kyushu", 沖縄: "Kyushu",
};

/** A REAL RFC 4180 READER, not a line-and-comma split. The first version of this file cut every
 *  row on a bare comma, which is silent corruption against real data — a thousands separator
 *  ("1,234"), or any field carrying its own comma, tears into two and every column after it is one
 *  off from there. `skills/splash/test/csv-hand-split.test.ts` walks the whole tree for exactly that
 *  pair of signals and named this file. This is `stories/real-owid-life-expectancy`'s own reader,
 *  character by character, carried here rather than imported: a beat directory has to stand on its
 *  own. */
function parseCsv(text) {
  const out = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); out.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); out.push(row); }
  return out;
}


const storyDir = resolve(HERE, "..", "..");
const rows = parseCsv(await readFile(join(storyDir, "source", "data.csv"), "utf8"));
const header = rows[0];
const valueAt = header.indexOf(VALUE_COLUMN);
const keyAt = header.indexOf(KEY_COLUMN);
if (valueAt < 0 || keyAt < 0) throw new Error(`the frozen table has no ${KEY_COLUMN}/${VALUE_COLUMN} column`);

const declaredAggregates = [];
const readings = new Map();
for (const row of rows.slice(1)) {
  const name = row[keyAt];
  if (AGGREGATE_ROWS.includes(name)) {
    declaredAggregates.push({ name, value: Number(row[valueAt]) });
    continue;
  }
  readings.set(name, Number(row[valueAt]));
}

const shapes = JSON.parse(await readFile(shapesPath, "utf8"));
const japan = shapes.features.filter((f) => f.properties.adm0_a3 === "JPN");
if (japan.length !== 47) throw new Error(`expected Japan's 47 prefectures in the shapes, got ${japan.length}`);

const aliases = [];
const shapesWithNoReading = [];
const points = [];
const seen = new Set();
for (const feature of japan) {
  const props = feature.properties;
  const natural = props.name_ja;
  const key = ministryNameOf(natural);
  if (key !== natural) aliases.push(`${natural} → ${key}`);
  if (!readings.has(key)) {
    shapesWithNoReading.push({ ja: natural, en: props.name, iso: props.iso_3166_2 });
    continue;
  }
  seen.add(key);
  const region = REGION_OF[key];
  if (!region) throw new Error(`no region recorded for ${key} — the filter's own dimension is incomplete`);
  points.push({
    key: props.iso_3166_2.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: props.name,
    nameJa: natural,
    lon: Number(props.longitude),
    lat: Number(props.latitude),
    value: readings.get(key),
    group: region,
  });
}

const readingsWithNoShape = [...readings.keys()].filter((k) => !seen.has(k));
if (readingsWithNoShape.length > 0) {
  throw new Error(
    `${readingsWithNoShape.length} reading(s) in the ministry's table land on no shape: ` +
      `${readingsWithNoShape.join(", ")}. A reading with no shape leaves no mark anywhere to be wrong, ` +
      `so it is refused here rather than dropped.`,
  );
}

points.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

const silences = {
  measure: VALUE_COLUMN,
  aggregateRowsExcluded: declaredAggregates,
  aliasesApplied: aliases.length,
  aliasRule: "Natural Earth's name_ja less a trailing 県/府/都; 北海道 keeps its 道",
  shapesWithNoReading,
  readingsWithNoShape,
  drawn: points.length,
  reportedZero: points.filter((p) => p.value === 0).map((p) => p.name),
  total: points.reduce((sum, p) => sum + p.value, 0),
};

await writeFile(join(HERE, "bear-casualties-fy2025.json"), JSON.stringify(points, null, 2) + "\n");
await writeFile(join(HERE, "JOIN.json"), JSON.stringify(silences, null, 2) + "\n");
console.log(JSON.stringify(silences, null, 2));
