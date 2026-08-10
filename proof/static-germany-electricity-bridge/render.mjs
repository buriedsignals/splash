// twin/proof/static-germany-electricity-bridge/render.mjs
//
// Reads the frozen CSV (Germany's 2015 and 2024 electricity generation by source, TWh), computes
// the three-step bridge (renewables, nuclear, fossil fuel change), REPLAYS the arithmetic before
// rendering — the waterfall sheet's own rule — and renders. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  seriesInks,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import {
  TYPE,
  ElectricityBridgeWaterfall,
  rungsFor,
} from "./ElectricityBridgeWaterfall.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL_COLUMNS = ["Gas", "Oil", "Coal"];

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((row) => {
    const cells = row.split(",");
    const rec = {};
    cols.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
}

function totals(row) {
  const renewables = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const fossil = FOSSIL_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const nuclear = Number(row.Nuclear);
  return { renewables, nuclear, fossil, total: renewables + nuclear + fossil };
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length !== 2) throw new Error(`expected 2 rows (Germany 2015 and 2024), got ${rows.length}`);

  // Entity and both years are read off the file rather than retyped, so a re-export covering
  // different years cannot leave the labels and the sentences pointing at the old ones.
  const entity = rows[0].Entity;
  const years = [...new Set(rows.map((r) => r.Year))].sort();
  if (years.length !== 2) throw new Error(`expected exactly two years in data.csv, got ${years.join(", ")}`);
  const [FIRST_YEAR, LAST_YEAR] = years;

  const y2015 = totals(rows.find((r) => r.Year === FIRST_YEAR));
  const y2024 = totals(rows.find((r) => r.Year === LAST_YEAR));

  const steps = [
    { label: `${FIRST_YEAR} total generation`, value: Math.round(y2015.total * 10) / 10, kind: "total" },
    { label: "Renewables", value: Math.round((y2024.renewables - y2015.renewables) * 10) / 10, kind: "increase" },
    { label: "Nuclear", value: Math.round((y2024.nuclear - y2015.nuclear) * 10) / 10, kind: "decrease" },
    { label: "Fossil fuel", value: Math.round((y2024.fossil - y2015.fossil) * 10) / 10, kind: "decrease" },
    { label: `${LAST_YEAR} total generation`, value: Math.round(y2024.total * 10) / 10, kind: "total" },
  ];
  console.table(steps);

  // Replay the arithmetic: the waterfall sheet's one non-negotiable check. Rounding each step to
  // one decimal (TWh) before summing, so the check matches exactly what the chart draws.
  let running = steps[0].value;
  for (const s of steps.slice(1, -1)) running += s.value;
  running = Math.round(running * 10) / 10;
  const closing = steps[steps.length - 1].value;
  console.log(`opening ${steps[0].value} + steps = ${running}, closing total states ${closing}`);
  if (Math.abs(running - closing) > 0.05) throw new Error(`bridge does not balance: computed ${running}, closing total says ${closing}`);
  console.log("bridge balances exactly.");

  const netChange = closing - steps[0].value;
  console.log(`net change ${FIRST_YEAR}->${LAST_YEAR}: ${netChange.toFixed(1)} TWh`);

  // The bridge's own five figures were typed into the alt text and the title, beside the very
  // computation that produces them. They are correct today; nothing turned red if a row moved.
  // They now come from `steps` and `netChange` — one arithmetic, read twice.
  const [opening, renewablesStep, nuclearStep, fossilStep, closingStep] = steps;
  if (!(renewablesStep.value > 0)) throw new Error(`the alt says renewables GREW, got ${renewablesStep.value}`);
  if (!(nuclearStep.value < 0)) throw new Error(`the alt says nuclear FELL, got ${nuclearStep.value}`);
  if (!(fossilStep.value < 0)) throw new Error(`the alt says the fossil share FELL, got ${fossilStep.value}`);
  if (!(netChange < 0)) throw new Error(`the title says generation FELL, got a net change of ${netChange}`);
  // ONE DECIMAL, the same precision the chart prints. It used to be `Math.round`, so the alt read
  // "639 TWh ... plus 103 ... minus 92 ... minus 154 ... arriving at 496" under a picture labelled
  // 639.2 / +102.7 / −91.8 / −154.1 — a screen-reader user handed a strictly coarser chart than a
  // sighted one, and a set of deltas that no longer sums to the arrival it names (639 + 103 − 92 −
  // 154 = 496 only by luck; at these roundings it is 496 against a true 495.99). The web sibling
  // (`proof/webx-germany-bridge`) already reads one decimal; this is the static half catching up.
  const twh = (v) => `${Math.abs(v).toFixed(1)} TWh`;
  const alt =
    `Waterfall chart of ${entity}'s electricity generation, ${FIRST_YEAR} to ${LAST_YEAR}, in ` +
    `terawatt-hours: ${twh(opening.value)} in ${FIRST_YEAR}, plus ${twh(renewablesStep.value)} from ` +
    `renewables growth, minus ${twh(nuclearStep.value)} from the nuclear phase-out, minus ` +
    `${twh(fossilStep.value)} from a falling fossil share, arriving at ${twh(closingStep.value)} in ` +
    `${LAST_YEAR} — a net drop of ${twh(netChange)}.`;
  console.log(`alt: ${alt}`);

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // One fill per direction of change, in the order the accents were recorded.
  const [increaseFill, decreaseFill] = seriesInks(palette, 2);
  console.log(`bar fills — increase ${increaseFill}, decrease ${decreaseFill}`);
  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this the size was two literals below and `renderStill` compared them
  // against each other, so they agreed by construction and the delivered PNG was a size nobody
  // chose.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name = flag === -1 ? "static-germany-electricity-bridge-still" : `static-germany-electricity-bridge-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all.
  const form = assertTypeMayEnter(TYPE, size, { what: "static-germany-electricity-bridge" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(ElectricityBridgeWaterfall, {
      steps,
      title: `${entity} generated ${Math.round(Math.abs(netChange))} fewer terawatt-hours of electricity in ${LAST_YEAR} than in ${FIRST_YEAR}`,
      limits: "The nuclear phase-out and a falling fossil share together outweighed the renewables build-out — renewables alone grew, but not enough to offset the other two.",
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · extracted 8 August 2026",
      alt,
      ground,
      increaseFill,
      decreaseFill,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });
  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  console.log(`ladder in the artifact: ${/data-ladder="([^"]*)"/.exec(svg)?.[1] ?? "(absent)"}`);
  assertTypeFloor(svg, size, { what: "static-germany-electricity-bridge" });
  assertWithinStage(svg, size, { what: "static-germany-electricity-bridge" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
