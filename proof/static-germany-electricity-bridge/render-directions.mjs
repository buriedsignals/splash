// twin/proof/static-germany-electricity-bridge/render-directions.mjs
//
// The German electricity bridge, drawn once per filed direction, through the real engine.
//
// The second beat in this tree to go through the design base, and the first that is not a line.
// `co2-suisse/render-directions.mjs` is its model and this file deliberately follows it step for
// step: read the filed directions, derive the beat's own facts, ask which treatments the DATA
// admits, show the journalist what the composer offers and what it refused, resolve each register's
// family ladder against the text this beat actually sets, then render.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard — a defect this tree has already paid for once.
//
// Usage:  bun proof/static-germany-electricity-bridge/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedWaterfall } from "./DirectedWaterfall.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");

/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all. */
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const RENEWABLE = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL = ["Gas", "Oil", "Coal"];
const FIRST = 2015;
const LAST = 2024;
const EYEBROW = "Énergie · Allemagne";

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((row) => {
    const cells = row.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

const rows = parseCsv(await readFile(join(HERE, "data.csv"), "utf8"));
const at = (year) => rows.find((r) => Number(r.Year) === year);
const sum = (row, cols) => cols.reduce((t, c) => t + Number(row[c] ?? 0), 0);
const first = at(FIRST);
const last = at(LAST);

const opening = sum(first, [...RENEWABLE, ...FOSSIL, "Nuclear"]);
const closing = sum(last, [...RENEWABLE, ...FOSSIL, "Nuclear"]);
const steps = [
  { label: `${FIRST} total`, value: opening, kind: "total" },
  { label: "Renouvelables", value: sum(last, RENEWABLE) - sum(first, RENEWABLE), kind: "increase" },
  { label: "Nucléaire", value: Number(last.Nuclear) - Number(first.Nuclear), kind: "decrease" },
  { label: "Fossile", value: sum(last, FOSSIL) - sum(first, FOSSIL), kind: "decrease" },
  { label: `${LAST} total`, value: closing, kind: "total" },
];

// THE BRIDGE IS REPLAYED BEFORE IT IS DRAWN. A reader has no way to catch a bad running total by
// looking, because each bar shows only its own delta — the waterfall sheet's own warning.
const walked = steps
  .filter((s) => s.kind !== "total")
  .reduce((total, s) => total + s.value, opening);
if (Math.abs(walked - closing) > 0.05)
  throw new Error(`the bridge does not reconcile: ${walked} walked against ${closing} stated`);
console.log(`bridge balances: ${opening.toFixed(1)} + steps = ${closing.toFixed(1)}\n`);

// WHICH TREATMENTS THE DATA ADMITS. Five marks, so `value-on-the-mark` applies; there is no
// reference level, no comparison set and no supplied unit mark, so three others do not. The
// component draws what this list contains and nothing else.
const facts = beatFacts(
  steps.map((s) => ({ key: s.label, label: s.label, value: s.value })),
  {
    subject: "Allemagne",
    namedSeries: ["Allemagne"],
    // The absolute levels this bridge declares. Their difference is the number the headline rests
    // on, and `net-change-between-declared-levels` is what puts it on the plate.
    levels: steps.filter((s) => s.kind === "total").map((s) => s.value),
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const title = `L’Allemagne a produit ${Math.round(Math.abs(closing - opening))} TWh d’électricité de moins en ${LAST} qu’en ${FIRST}`;
const limits =
  "La sortie du nucléaire et le recul du fossile l’emportent ensemble sur la montée des renouvelables.";
const source =
  "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: "0 200 400 600 800",
  annot: steps.map((s) => s.label).join(" "),
  value: steps
    .map(
      (s) =>
        `${s.value > 0 ? "+" : "−"}${Math.abs(s.value).toLocaleString("fr-FR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}`,
    )
    .join(" "),
};

// WHAT THE JOURNALIST IS SHOWN, before anything is drawn.
const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  await renderStill({
    element: createElement(DirectedWaterfall, {
        frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
      steps,
      title,
      limits,
      source,
      alt: `Diagramme en cascade de la production électrique allemande, ${FIRST} à ${LAST}, en TWh.`,
      eyebrow: EYEBROW,
      direction,
      treatments: offered.map((t) => t.id),
    }),
    // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
    // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for.
    width: EXPORT_FRAME.width,
    height: EXPORT_FRAME.height,
    outDir: OUT,
    name: nameAtSize(id, SIZE),
    scale: EXPORT_FRAME.scale,
  });
  console.log(`  -> renders/${id}.png\n`);
}
