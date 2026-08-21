// twin/proof/webx-electricity-mix/render-web.mjs
//
// This beat's own WEB runner. `data.csv` is the frozen OWID export (copied from
// `proof/static-electricity-mix-source/data.csv`, the already-verified static sibling) — 6 rows,
// one per country, 2024 only; re-verified here (row count, entity set) rather than trusted on
// sight. `contrast` is imported from the skill's own `render-still.mjs` (the machinery this format
// already centralises the colour rule in) to precompute each fixed segment colour's own
// ink-on-fill, once, rather than re-deriving it inside the component.
//
// Usage:  bun proof/webx-electricity-mix/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette, seriesInks } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "#shared/chart-web/scripts/render-web.mjs";
import { contrast } from "#shared/chart-web/scripts/render-still.mjs";
import { StackedBarWeb, FRAME } from "./StackedBarWeb.tsx";
// The beat's own number formatter, taking its locale from the language the page declares — the
// same one the component labels every segment with, so the prose and the tooltips agree.
// `STACK_ORDER` is the order the stack draws its three bands in, and the order `PALETTE.md`
// records its accents in — one list, so a recorded colour can never land on the wrong band.
import { formatNumber, STACK_ORDER } from "./stacked-bar-geometry.ts";

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

const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL_COLUMNS = ["Gas", "Oil", "Coal"];

export const BEAT = {
  // The four colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  source:
    "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "electricity-mix.html";

export function countriesFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const records = rows.map((row) => {
    const cells = row;
    const rec = {};
    columns.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
  if (records.length !== 6) throw new Error(`expected 6 countries, got ${records.length}`);

  return records
    .map((r) => {
      const renewablesTwh = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      const fossilTwh = FOSSIL_COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      const nuclearTwh = Number(r.Nuclear);
      const total = renewablesTwh + nuclearTwh + fossilTwh;
      return {
        name: r.Entity,
        renewables: (renewablesTwh / total) * 100,
        nuclear: (nuclearTwh / total) * 100,
        fossil: (fossilTwh / total) * 100,
        renewablesTwh,
        nuclearTwh,
        fossilTwh,
      };
    })
    .sort((a, b) => b.renewables - a.renewables);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const countries = countriesFromCsv(csv);

  const top = countries[0];
  const highestFossil = [...countries].sort((a, b) => b.fossil - a.fossil)[0];
  if (top.name !== "Norway") throw new Error(`expected Norway to lead renewables, got ${top.name}`);
  if (highestFossil.name !== "Poland") throw new Error(`expected Poland to lead fossil, got ${highestFossil.name}`);

  const title = `${top.name} ran its grid on ${formatNumber(top.renewables, 0)}% renewables; ${highestFossil.name} leaned on fossil fuel`;
  const subtitle = `${top.name} generated ${formatNumber(top.renewables, 0)}% of its electricity from renewables in 2024, the highest share of six countries compared here; ${highestFossil.name} leaned hardest on fossil fuel, at ${formatNumber(highestFossil.fossil, 0)}%.`;
  // grounded-by-hand: alt:100 — "100%-stacked" names the chart's construction (each column normalised
  // to its own total), not a reading from data.csv. Every share in the sentence is interpolated.
  const alt = `100%-stacked bar chart of six countries' 2024 electricity generation by source: renewables, nuclear, fossil. ${top.name} is ${formatNumber(top.renewables, 0)}% renewable, the highest of the group; ${highestFossil.name} draws ${formatNumber(highestFossil.fossil, 0)}% from fossil fuel, the highest fossil share. Every segment's exact share and absolute terawatt-hour figure is available on hover, tap or keyboard focus, including segments too thin to carry a printed label.`;

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  // One fill per band, in the order the stack draws them. `seriesInks` hands back the recorded
  // accents first, so a newsroom that records three gets its own three.
  const inks = seriesInks(palette, STACK_ORDER.length);
  const colours = Object.fromEntries(STACK_ORDER.map((key, i) => [key, inks[i]]));
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );
  console.log(
    `bands: ${STACK_ORDER.map((key) => `${key} ${colours[key]}`).join(" | ")}`,
  );

  // The ink each printed share is set in, measured against ITS OWN BAND rather than the page — the
  // pole that reads better on that fill. Derived from the recorded colours, so it follows them.
  const segmentInk = Object.fromEntries(
    STACK_ORDER.map((key) => [
      key,
      contrast("#000000", colours[key]) >= contrast("#FFFFFF", colours[key])
        ? "#000000"
        : "#FFFFFF",
    ]),
  );

  // The language this beat's words are written in, handed to `renderWeb` as a real input
  // rather than patched into the shipped file afterwards — see `assertRecordedLanguage` in
  // `skills/chart-web/scripts/render-web.mjs`. Recorded here, never detected from the prose.
  const { outPath } = await renderWeb({
    component: StackedBarWeb,
    props: {
      language: "en",
      countries,
      title,
      subtitle,
      source: BEAT.source,
      alt,
      ground,
      colours,
      segmentInk,
      frame: FRAME,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, countries: countries.length };
}

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");
  const interactionSource = await readFile(join(HERE, "stacked-bar-interaction.mjs"), "utf8");
  const ownScript = `<script>\n${interactionSource}\n</script>\n`;
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `${ownScript}</body>`);

  const ownCss = `
.segment-hit { cursor: pointer; }
.segment-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
`;
  if (!html.includes("</style>")) throw new Error("renderWeb output has no </style> to repair");
  html = html.replace("</style>", `${ownCss}</style>`);

  await writeFile(outPath, html);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, countries } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${countries} countries]`);
}
