// The proof that a newsroom's recorded colours actually reach a rendered chart.
//
// Before `twin-palette`, every beat named its colours as hex literals with a `// from NEWSROOM.md`
// comment beside them — an instruction to copy by eye. `NEWSROOM.md` was validated at preflight and
// then never threaded anywhere. This file names NO hex. Both colours come from `readPalette`, and
// the second render proves the same source file drives a completely different pair.
//
// Run: bun proof/palette-proof/render.mjs        (from `twin/`)
//      bun proof/palette-proof/render.mjs --alt  (renders the alternative recorded answer)
//      bun proof/palette-proof/render.mjs --no-palette  (proves the refusal)

import { readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import {
  deriveFurniture,
  measureText,
  readPalette,
} from "../../skills/twin-chart-beat/scripts/render-still.mjs";
import { ChartSeed } from "../../skills/twin-chart-beat/assets/ChartSeed.tsx";

const HERE = import.meta.dirname;

if (process.argv.includes("--no-palette")) {
  // Move the recorded answer aside, render, and show what happens. The point is that this is a
  // THROW naming every directory searched — not a chart in a default colour.
  const stashed = join(HERE, "PALETTE.md.stashed");
  await rename(join(HERE, "PALETTE.md"), stashed);
  try {
    readPalette(HERE, { stopAt: join(HERE, "..", "..") });
    console.error("DEFECT: readPalette returned a palette with no PALETTE.md on disk.");
    process.exit(1);
  } catch (e) {
    console.log("Refused, as it must:\n");
    console.log(e.message);
  } finally {
    await rename(stashed, join(HERE, "PALETTE.md"));
  }
  process.exit(0);
}

const alt = process.argv.includes("--alt");
const paletteDir = alt ? join(HERE, "alt-answer") : HERE;
const { ground, accent, origin, source } = readPalette(paletteDir, { stopAt: join(HERE, "..", "..") });
console.log(`palette read from ${source} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

const data = JSON.parse(await readFile(join(HERE, "data.json"), "utf8"));

const svg = renderToStaticMarkup(
  createElement(ChartSeed, {
    data,
    title: "Rainfall over the sample town fell by a third",
    source: "Sample data — not a real measurement",
    alt: "A line falling from 912 to 604 across eleven readings.",
    ground,
    accent,
    subject: "the sample town",
    ...deriveFurniture(ground),
    measure: measureText,
  }),
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: 900 } }).render().asPng();
await mkdir(join(HERE, "renders"), { recursive: true });
const target = join(HERE, "renders", alt ? "alt-answer.png" : "house.png");
await writeFile(target, png);
console.log(`wrote ${target} (${png.length} bytes) — now open it and look at it.`);
