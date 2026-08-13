// twin/proof/web-co2-ranking/render-web.mjs
//
// This beat's own WEB runner — the same shape `proof/co2-suisse/render-web.mjs` has: the story's
// own constants, the story's own CSV reader, the story's own component, handed to the format's
// generic `renderWeb`. It lives here, beside the story, never inside the skill — a skill directory
// that imports a story workspace does not build once it is copied on its own into a journalist's
// root, the exact bug `proof/co2-suisse/render-web.mjs`'s own header note names.
//
// After the skill's `renderWeb` writes the self-contained HTML, this runner does two small,
// story-owned repairs to that file, in place, before anything is served or checked:
//
//   1. Appends this beat's OWN interaction script (`./bar-interaction.mjs`) as a second inline
//      `<script>` — see `RankingWeb.tsx`'s own header doc-comment for why this beat does not reuse
//      the skill's nearest-point `interaction.mjs` for its own hover/tap/keyboard wiring (that
//      script still runs first, finds no `.pt` circles in this beat's markup, and is a harmless
//      no-op).
//   2. Corrects `<html lang="fr">` to `<html lang="en">` — the skill's `renderWeb` hard-codes
//      `lang="fr"` because every web beat built against it so far (`co2-suisse`) wrote its title,
//      subtitle and source in French. This beat's own words (`BEAT` below, from `BRIEF.md`) are
//      English, so the shipped `lang` attribute has to say so — a screen reader picks its
//      pronunciation from that attribute, not from the words themselves. This is a per-story fix,
//      not a change to the skill: `renderWeb` takes no `lang` parameter to set correctly instead.
//
// Usage:  bun proof/web-co2-ranking/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { RankingWeb, FRAME } from "./RankingWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
export const BEAT = {
  subject: "Switzerland",
  // The two colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  title:
    "Switzerland's CO₂ emissions per capita are the second-lowest of ten major European economies",
  subtitle:
    "Essentially level with Sweden, and little more than half of Poland's, the highest of the group.",
  source: "Source: Global Carbon Budget (2025), via Our World in Data · 2024 data",
  alt: "Bar chart ranking ten European countries by 2024 CO₂ emissions per capita, from Poland (7.1 t) at the top down to Sweden (3.6 t) at the bottom. Switzerland, highlighted as this story's subject, sits second from the bottom at 3.6 t — essentially level with Sweden, and little more than half of Poland's, the group's highest.",
};

// The story's own frozen series, committed beside it: `data.csv` is the raw, unedited OWID export
// (2048 rows, 1807-2024, all ten countries), never re-fetched — the beat draws only the 2024 row
// per country (`BRIEF.md`, "Data"). No longer `/tmp` — a story folder only a previous run's scratch
// directory could reproduce is not the self-contained folder this project promises.
const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
// This beat's html is committed under `dist/`, so that is where its default lands.
const DEFAULT_OUT_DIR = join(HERE, "dist");
const OUTPUT_NAME = "co2-ranking.html";
const TARGET_YEAR = 2024;

/**
 * The frozen OWID series, one row per country's `TARGET_YEAR` reading, sorted descending by value
 * (`bar-and-column.md`: "for a ranking, sort by value"). Simple `split(",")` — not RFC4180-quoted,
 * which is fine for this file's own columns: no country name in this ten-country dataset carries a
 * comma (the same call `proof/co2-suisse/render-web.mjs`'s own `readingsFromCsv` makes).
 */
export function rowsFromCsv(csv, { year }) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / CO₂ emissions column, got: ${header}`);

  return rows
    .map((row) => row.split(","))
    .filter((cells) => Number(cells[yearAt]) === year)
    .map((cells) => ({
      name: cells[entityAt],
      value: Number(cells[valueAt]),
    }))
    .filter((r) => r.name && Number.isFinite(r.value))
    .sort((a, b) => b.value - a.value);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = rowsFromCsv(csv, { year: TARGET_YEAR });
  if (data.length < 1) throw new Error(`need at least one row, got ${data.length}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  const { outPath } = await renderWeb({
    component: RankingWeb,
    props: {
      data,
      frame: FRAME,
      title: BEAT.title,
      subtitle: BEAT.subtitle,
      source: BEAT.source,
      alt: BEAT.alt,
      subject: BEAT.subject,
      ground,
      accent,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, rows: data.length };
}

/** The two in-place repairs this runner owns — see this file's own header doc-comment for why each
 *  one is a story-level fix rather than a change to the skill's generic `renderWeb`. */
async function repair(outPath) {
  let html = await readFile(outPath, "utf8");

  html = html.replace('<html lang="fr">', '<html lang="en">');

  const interactionSource = await readFile(join(HERE, "bar-interaction.mjs"), "utf8");
  const ownScript = `<script>\n${interactionSource}\n</script>\n`;
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `${ownScript}</body>`);

  // This beat's own rules, after the format's shared stylesheet. A ranking chart labels BOTH sides of
  // its bars — the category on the left, the printed value at each bar's own end on the right — so
  // the format's `[y-gutter] [plot]` grid gains a third column here, both label tracks a fixed pixel
  // width measured from the real strings. And ten rows of names need a real number of CSS pixels
  // whatever the container's width, which is what `--min-plot-h` (derived in the component) buys.
  const ownCss = `
.chart-plot.ranking-plot {
  grid-template-columns: var(--y-gutter) 1fr var(--r-gutter);
  min-height: var(--min-plot-h);
}
.cat-label {
  position: absolute;
  right: 8px;
  transform: translateY(-50%);
  font-size: var(--category-size);
  font-weight: var(--category-weight);
  white-space: nowrap;
}
.value-label {
  position: absolute;
  transform: translateY(-50%) translateX(8px);
  font-size: var(--value-size);
  font-weight: var(--value-weight);
  white-space: nowrap;
}
.row-hit { cursor: pointer; }
/* The row band answers a pointer anywhere along it; this is the only sign a reader gets of WHICH
   row answered, so it is drawn rather than left to the tooltip alone — a tint, never an opaque
   fill, so nothing the row already states is hidden behind it. */
svg.chart rect.row-hit:hover, svg.chart rect.row-hit.row-active {
  fill: var(--muted);
  fill-opacity: 0.1;
}
.row-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
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

  const { outPath, rows } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${rows} rows]`);
}
