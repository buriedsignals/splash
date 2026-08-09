// twin/proof/webx-germany-bridge/render-web.mjs
//
// This beat's own WEB runner. `data.csv` is the frozen OWID export (copied from
// `proof/static-germany-electricity-bridge/data.csv`, the already-verified static sibling) — 2
// rows, Germany 2015 and 2024; re-verified here (row count) rather than trusted on sight. The
// bridge's arithmetic is REPLAYED before rendering — `references/types/waterfall.md`'s own
// non-negotiable check, and the same one the static sibling's own `render.mjs` runs.
//
// Usage:  bun proof/webx-germany-bridge/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { WaterfallWeb, LAYOUTS } from "./WaterfallWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL_COLUMNS = ["Gas", "Oil", "Coal"];

export const BEAT = {
  ground: "#FFFFFF",
  source:
    "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = "/tmp/webx-germany-bridge";
const OUTPUT_NAME = "germany-bridge.html";

function totals(row) {
  const renewables = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const fossil = FOSSIL_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const nuclear = Number(row.Nuclear);
  return { renewables, nuclear, fossil, total: renewables + nuclear + fossil };
}

export function stepsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const records = rows.map((row) => {
    const cells = row.split(",");
    const rec = {};
    columns.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
  if (records.length !== 2)
    throw new Error(`expected 2 rows (Germany 2015 and 2024), got ${records.length}`);

  const y2015 = totals(records.find((r) => r.Year === "2015"));
  const y2024 = totals(records.find((r) => r.Year === "2024"));

  const steps = [
    { label: "2015 total generation", value: Math.round(y2015.total * 10) / 10, kind: "total" },
    { label: "Renewables", value: Math.round((y2024.renewables - y2015.renewables) * 10) / 10, kind: "increase" },
    { label: "Nuclear", value: Math.round((y2024.nuclear - y2015.nuclear) * 10) / 10, kind: "decrease" },
    { label: "Fossil fuel", value: Math.round((y2024.fossil - y2015.fossil) * 10) / 10, kind: "decrease" },
    { label: "2024 total generation", value: Math.round(y2024.total * 10) / 10, kind: "total" },
  ];

  // Replay the arithmetic — the waterfall sheet's one non-negotiable check.
  let running = steps[0].value;
  for (const s of steps.slice(1, -1)) running += s.value;
  running = Math.round(running * 10) / 10;
  const closing = steps[steps.length - 1].value;
  if (Math.abs(running - closing) > 0.05)
    throw new Error(`bridge does not balance: computed ${running}, closing total says ${closing}`);

  return steps;
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const steps = stepsFromCsv(csv);

  const opening = steps[0].value;
  const closing = steps[steps.length - 1].value;
  const netChange = closing - opening;

  const title = `Germany generated ${Math.abs(netChange).toFixed(0)} fewer terawatt-hours in 2024 than in 2015`;
  const subtitle =
    "The nuclear phase-out and a falling fossil share together outweighed the renewables build-out — renewables alone grew, but not enough to offset the other two.";
  const alt = `Waterfall chart of Germany's electricity generation, 2015 to 2024, in terawatt-hours: ${opening} TWh in 2015, ${steps[1].value > 0 ? "plus" : "minus"} ${Math.abs(steps[1].value)} TWh from renewables, ${steps[2].value > 0 ? "plus" : "minus"} ${Math.abs(steps[2].value)} TWh from the nuclear phase-out, ${steps[3].value > 0 ? "plus" : "minus"} ${Math.abs(steps[3].value)} TWh from a falling fossil share, arriving at ${closing} TWh in 2024. Each of the three delta bars reveals, on hover, tap or keyboard focus, the exact running total Germany's generation reached immediately after that step.`;

  const { outPath } = await renderWeb({
    component: WaterfallWeb,
    layouts: LAYOUTS,
    props: {
      steps,
      title,
      subtitle,
      source: BEAT.source,
      alt,
      ground: BEAT.ground,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, steps: steps.length, netChange };
}

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");
  html = html.replace('<html lang="fr">', '<html lang="en">');

  const interactionSource = await readFile(join(HERE, "waterfall-interaction.mjs"), "utf8");
  const ownScript = `<script>\n${interactionSource}\n</script>\n`;
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `${ownScript}</body>`);

  const ownCss = `
.step-hit { cursor: pointer; }
.step-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
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

  const { outPath, steps, netChange } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${steps} steps, net ${netChange.toFixed(1)} TWh]`);
}
