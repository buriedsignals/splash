// Renders THIS skill's seed from THIS skill's sample data to a static PNG preview — the desktop
// `WebLayout` rasterised, so a reader of this skill sees the same picture the interactive HTML
// draws before ever opening a browser. Never a story's render: a story's artifact proves the
// story, not the mechanism this skill teaches.
//
// Furniture (`ink`/`muted`) and `measure` are derived HERE, in node, exactly the division
// `render-web.mjs`'s `renderMapWeb` already uses for a real beat: the seed component itself never
// imports the rasteriser (see `MapWebSeed.tsx`'s own doc-comment) — this script is the one place
// per preview that calls `deriveFurniture`, then threads the results in as props, once.
//
// Bakes the plate automatically if it is not already at `DEFAULT_PLATE_DIR` — the first run costs
// the bake (headless Chrome + a MapTiler capture); every run after that is instant.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { MapWebSeed, SEED_LAYOUT } from "../assets/MapWebSeed.tsx";
import {
  ensurePlate,
  loadPlate,
  SEED,
  DEFAULT_PLATE_DIR,
  DEFAULT_DATA_PATH,
} from "./render-web.mjs";

const HERE = import.meta.dirname;

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
if (!outDir.startsWith("/")) outDir = resolve(process.cwd(), outDir);
const TARGET = join(outDir, "preview.png");

await ensurePlate(DEFAULT_PLATE_DIR);
const { geometry, plate } = await loadPlate(DEFAULT_PLATE_DIR);

const points = JSON.parse(await readFile(DEFAULT_DATA_PATH, "utf8"));
const valueByKey = new Map(points.map((p) => [p.key, p.value]));
const merged = geometry.points.map((p) => ({ ...p, value: valueByKey.get(p.key) ?? p.value }));

const furniture = deriveFurniture(SEED.ground);

const svg = renderToStaticMarkup(
  createElement(MapWebSeed, {
    geometry: { ...geometry, points: merged },
    plate,
    title: SEED.title,
    source: SEED.source,
    basemapCredit: SEED.basemapCredit,
    legendCaption: SEED.legendCaption,
    caveat: SEED.caveat,
    alt: SEED.alt,
    ground: SEED.ground,
    accent: SEED.accent,
    ...furniture,
    measure: measureText,
    layout: SEED_LAYOUT,
  }),
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: SEED_LAYOUT.width } })
  .render()
  .asPng();

if (process.argv.includes("--check")) {
  const committed = await readFile(TARGET);
  if (!committed.equals(png)) {
    console.error(
      "preview.png is stale — the seed changed and the preview did not. Re-run without --check.",
    );
    process.exit(1);
  }
  console.log("preview.png matches a fresh render of the seed.");
} else {
  await mkdir(outDir, { recursive: true });
  await writeFile(TARGET, png);
  console.log(`wrote ${TARGET} (${png.length} bytes) — now open it and look at it.`);
}
