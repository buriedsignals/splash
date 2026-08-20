// twin/proof/co2-suisse/render-web.mjs
//
// The CO₂ beat's own WEB runner — the same shape `../life-expectancy/render.mjs` and
// `../migration/render.mjs` have for the video format: the story's own constants, the story's own
// data reader, the story's own component, handed to the format's generic machinery.
//
// It lives here, beside the story, and not inside `skills/chart-web/scripts/render-web.mjs`,
// because that file used to import this story's component out of the skill — and a skill directory
// that imports a story workspace does not build once it is copied on its own into a journalist's
// root, which is the premise the whole twin rests on. The skill's own script now runs the skill's
// own seed; this file runs the story.
//
// `renderWeb` is imported from the skill's script directly rather than through `#shared/*`: it reads
// its own sibling `assets/interaction.mjs` at render time, so a flat vendored copy under `shared/`
// would resolve that path to nothing. In a real installed root the skill is copied whole and this
// import points at the copy — the same "no vendoring path exists for this one, so state the
// dependency plainly" reasoning `ChartWebSeed.tsx` already gives for its `WebLayout` type.
//
// Usage:  bun proof/co2-suisse/render-web.mjs [outDir] [--data <csv>]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { EmissionsWeb, FRAME } from "./EmissionsWeb.tsx";

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

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: join(HERE, ".."),
});
console.log(
  "palette from " + paletteSource + " — ground " + ground + ", accent " + accent + ", chosen by " + origin,
);

/** The story's own constants — the journalist's words, from `BRIEF.md` and `STORYBOARD.md`. The same
 *  words the video runner uses for the same beat, so the formats never disagree about what the chart
 *  says. `ground` and `accent` are not among them: they are the newsroom's recorded answer, read
 *  from `PALETTE.md` beside this file. */
export const BEAT = {
  entity: "Switzerland",
  firstYear: 1950,
  reference: 32.5,
  ground,
  accent,
  title: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
  source:
    "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  referenceLabel: "Niveau de 1967",
  peakLabel: "pic de 1973",
  limits:
    "Émissions territoriales seulement, hors biens importés et aviation internationale.",
  alt: "Courbe des émissions territoriales suisses de CO₂, 1950 à 2024 : une montée jusqu'à un pic en 1973, puis une baisse qui repasse sous le niveau de 1967 en 2024.",
};

// The story's own frozen series, committed beside it — fetched from the OWID grapher endpoint
// with `&csvType=filtered&country=~CHE` (see `intake/references/ourworldindata-csv-filter-trap.md`
// for why that parameter is not optional), verified to contain only Switzerland before being
// trusted. No longer `/tmp` — a story folder that only a previous run's scratch directory can
// reproduce is not the self-contained folder this project promises.
const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "co2.html";

/**
 * The frozen OWID series, tonnes to megatonnes, one country picked out of the multi-country CSV
 * the grapher endpoint actually returns. Simple `split(",")` — not RFC4180-quoted, which is fine for
 * this file's own columns (no country name in this dataset carries a comma).
 */
export function readingsFromCsv(csv, { entity, firstYear }) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Annual CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(
      `csv has no Entity / Year / Annual CO₂ emissions column, got: ${header}`,
    );

  return rows
    .map((row) => row)
    .filter((cells) => cells[entityAt] === entity)
    .map((cells) => ({
      year: Number(cells[yearAt]),
      mt: Number(cells[valueAt]) / 1e6,
    }))
    .filter(
      (r) => Number.isFinite(r.year) && Number.isFinite(r.mt) && r.year >= firstYear,
    )
    .sort((a, b) => a.year - b.year);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = readingsFromCsv(csv, {
    entity: BEAT.entity,
    firstYear: BEAT.firstYear,
  });
  if (data.length < 2)
    throw new Error(`need at least two readings, got ${data.length}`);

  const { outPath } = await renderWeb({
    component: EmissionsWeb,
    props: {
      data,
      frame: FRAME,
      title: BEAT.title,
      source: BEAT.source,
      alt: BEAT.alt,
      limits: BEAT.limits,
      ground: BEAT.ground,
      accent: BEAT.accent,
      reference: BEAT.reference,
      referenceLabel: BEAT.referenceLabel,
      peakLabel: BEAT.peakLabel,
    },
    outDir,
    name,
  });
  return { outPath, readings: data.length };
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

  const { outPath, readings } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings]`);
}
