// twin/proof/webx-wind-vs-solar/render-web.mjs
//
// This beat's own WEB runner. `data.csv` is the frozen OWID export (copied from
// `proof/static-wind-vs-solar/data.csv`, the already-verified static sibling) — 12 rows, six
// countries x two years (2015, 2024); re-verified here (row count, 2024 slice = 6 countries)
// rather than trusted on sight. Only the 2024 rows feed the beat, same as the static sibling.
//
// SECOND BUILD: migrated to the format's FLUID FRAME — `renderWeb` no longer takes a `layouts`
// array (the two-rung design was overturned; see `GroupedBarWeb.tsx`'s own doc-comment).
//
// After the skill's `renderWeb` writes the self-contained HTML, this runner appends this beat's
// own interaction script (`./grouped-bar-interaction.mjs` — the skill's own nearest-point
// `interaction.mjs` still runs first and is a harmless no-op, no `.pt` circles here) and patches
// `lang="fr"` to `lang="en"` (this beat's words are English throughout).
//
// Usage:  bun proof/webx-wind-vs-solar/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette, seriesInks } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { GroupedBarWeb, FRAME } from "./GroupedBarWeb.tsx";
// The beat's own number formatter, taking its locale from the language the page declares — the
// same one the component labels every bar with, so the prose and the bars agree.
import { formatNumber } from "./grouped-bar-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const COLUMNS = [
  "Other renewables",
  "Bioenergy",
  "Solar",
  "Wind",
  "Hydropower",
  "Nuclear",
  "Gas",
  "Oil",
  "Coal",
];

export const BEAT = {
  // The three colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  calloutSubject: "Switzerland",
  calloutText: "Solar leads wind here — the only reversal in this group",
  source:
    "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "wind-vs-solar.html";
const TARGET_YEAR = "2024";

export function groupsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const records = rows.map((row) => {
    const cells = row.split(",");
    const rec = {};
    columns.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
  if (records.length !== 12)
    throw new Error(`expected 12 rows (6 countries x 2 years), got ${records.length}`);

  const y2024 = records.filter((r) => r.Year === TARGET_YEAR);
  if (y2024.length !== 6)
    throw new Error(`expected 6 countries for ${TARGET_YEAR}, got ${y2024.length}`);

  return y2024
    .map((r) => {
      const total = COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      return {
        name: r.Entity,
        wind: (Number(r.Wind) / total) * 100,
        solar: (Number(r.Solar) / total) * 100,
        windTwh: Number(r.Wind),
        solarTwh: Number(r.Solar),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const groups = groupsFromCsv(csv);

  const reversed = groups.find((g) => g.solar > g.wind);
  if (!reversed || reversed.name !== BEAT.calloutSubject)
    throw new Error(
      `expected ${BEAT.calloutSubject} to be the sole solar>wind reversal, got: ${groups
        .filter((g) => g.solar > g.wind)
        .map((g) => g.name)
        .join(", ") || "none"}`,
    );
  const otherReversals = groups.filter((g) => g.solar > g.wind && g.name !== BEAT.calloutSubject);
  if (otherReversals.length > 0)
    throw new Error(`expected only ${BEAT.calloutSubject} to reverse, also found: ${otherReversals.map((g) => g.name).join(", ")}`);

  const title = "Switzerland is the outlier: everywhere else here, wind beats solar";
  const subtitle =
    "Share of each country's total electricity generation in 2024, from generation by source in terawatt-hours.";
  const alt = `Grouped bar chart of wind and solar shares of 2024 electricity generation for six countries. In France, Germany, Norway, Poland and Sweden, wind's share is larger than solar's. Switzerland is the reverse: solar ${formatNumber(groups.find((g) => g.name === "Switzerland").solar)}%, wind ${formatNumber(groups.find((g) => g.name === "Switzerland").wind)}%. Every bar's exact share and absolute terawatt-hour figure is available on hover, tap or keyboard focus.`;

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  // The two series hues, in the order `PALETTE.md` records them: wind first, then solar.
  const [wind, solar] = seriesInks(palette, 2);
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );
  console.log(`series: wind ${wind} | solar ${solar}`);

  const { outPath } = await renderWeb({
    component: GroupedBarWeb,
    props: {
      groups,
      title,
      subtitle,
      source: BEAT.source,
      alt,
      calloutSubject: BEAT.calloutSubject,
      calloutText: BEAT.calloutText,
      ground,
      colours: { wind, solar },
      frame: FRAME,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, groups: groups.length };
}

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");
  html = html.replace('<html lang="fr">', '<html lang="en">');

  const interactionSource = await readFile(join(HERE, "grouped-bar-interaction.mjs"), "utf8");
  const ownScript = `<script>\n${interactionSource}\n</script>\n`;
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `${ownScript}</body>`);

  const ownCss = `
.bar-hit { cursor: pointer; }
.bar-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
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

  const { outPath, groups } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${groups} groups]`);
}
