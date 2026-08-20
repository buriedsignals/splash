// stories/stress-k-flat-inspections/beats/1-flat-inspections/render-web.mjs
//
// This beat's own WEB runner — the shape `proof/web-co2-ranking/render-web.mjs` teaches: the
// story's own constants, the story's own CSV reader, the story's own component, handed to the
// format's generic `renderWeb`. Two in-place repairs after that, in place, before anything is
// served or checked (same shape `proof/web-co2-ranking/render-web.mjs` uses, for the same reason —
// see its own header): append this beat's own interaction script, and correct `lang` — this beat's
// words are English, not the skill's own French seed default.
//
// Usage: bun stories/stress-k-flat-inspections/beats/1-flat-inspections/render-web.mjs [outDir]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette, framingMeasurement } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../../../skills/chart-web/scripts/render-web.mjs";
import { FlatInspectionsWeb, FRAME } from "./FlatInspectionsWeb.tsx";
import { scaleLinear } from "d3-scale";

const HERE = dirname(fileURLToPath(import.meta.url));

export const BEAT = {
  title: "Every region reported exactly the same number of failed inspections",
  subtitle:
    "Six regions, six identical counts — 7 failed inspections each. The office calls this a coincidence of its rounding threshold, not a quota.",
  source: "Source: story intake, source/data.csv (frozen) · stress test fixture",
  alt:
    "Bar chart of six regions — North, South, East, West, Central, Islands — each reporting exactly 7 failed inspections. Every bar is the same length.",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "flat-inspections.html";

export function rowsFromCsv(csv) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const cols = header.split(",");
  const nameAt = cols.indexOf("region");
  const valueAt = cols.indexOf("failed_inspections");
  if (nameAt < 0 || valueAt < 0) throw new Error(`csv has no region / failed_inspections column, got: ${header}`);
  return lines
    .map((line) => line.split(","))
    .map((cells) => ({ name: cells[nameAt], value: Number(cells[valueAt]) }))
    .filter((r) => r.name && Number.isFinite(r.value));
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = rowsFromCsv(csv);
  if (data.length < 1) throw new Error(`need at least one row, got ${data.length}`);

  // FINDING, printed before anything is drawn (chart-beat/references/static-discipline.md,
  // "framing-serves-the-point"): this series has ZERO spread. Printed here rather than assumed.
  const framing = framingMeasurement(data.map((r) => r.value));
  console.log(
    `framing: the takeaway's own spread is ${(framing.spreadAgainstExtent * 100).toFixed(1)}% of ` +
      `the plot's own 0-${framing.max} extent; the largest reading is ` +
      `${framing.largestAgainstMedian.toFixed(2)}x the group's median (${framing.median}) — ` +
      `see BRIEF.md, "The decision", for the treatment kept and why`,
  );

  // FINDING, also printed before anything is drawn: what this beat's OWN geometry does with a flat
  // series (domain [0, max], never degenerate here) versus what the alternative, fitted-scale
  // domain [min, max] would do if this beat had chosen a line/dot treatment instead. Both probed
  // for real, not asserted.
  const usedScale = scaleLinear().domain([0, framing.max]).range([0, FRAME.width]);
  console.log(
    `zero-range probe: this beat's own domain [0, ${framing.max}] maps its one value to ` +
      `${usedScale(framing.max)} of ${FRAME.width} user units — an ordinary scale, not degenerate. ` +
      `The alternative a fitted line/dot treatment would have chosen, domain [${framing.min}, ${framing.max}] ` +
      `(min === max here), maps EVERY input to ${scaleLinear().domain([framing.min, framing.max]).range([0, FRAME.width])(framing.max)} ` +
      `(the range's own midpoint, not NaN — d3-scale's own guard) and its .ticks(5) collapses to ` +
      `[${scaleLinear().domain([framing.min, framing.max]).nice().ticks(5).join(", ")}] — a single tick, ` +
      `never thrown.`,
  );

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const { outPath } = await renderWeb({
    component: FlatInspectionsWeb,
    props: {
      data,
      frame: FRAME,
      title: BEAT.title,
      subtitle: BEAT.subtitle,
      source: BEAT.source,
      alt: BEAT.alt,
      ground,
      accent,
      language: "en",
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, rows: data.length, framing };
}

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");

  const interactionSource = await readFile(join(HERE, "bar-interaction.mjs"), "utf8");
  const ownScript = `<script>\n${interactionSource}\n</script>\n`;
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `${ownScript}</body>`);

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
  const positional = argv.find((a) => !a.startsWith("--"));
  const outDir = resolve(positional ?? DEFAULT_OUT_DIR);
  const dataPath = resolve(DEFAULT_DATA_PATH);

  const { outPath, rows, framing } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${rows} rows]`);
}
