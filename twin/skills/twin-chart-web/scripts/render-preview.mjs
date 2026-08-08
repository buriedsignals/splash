// Renders THIS skill's seed from THIS skill's sample data. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// Furniture (`ink`/`muted`/`grid`) and `measure` are derived HERE, in node, exactly the division
// `scripts/render-web.mjs`'s `renderWeb` already uses for a real beat: the seed component itself
// never imports the rasteriser (see `ChartWebSeed.tsx`'s own doc-comment) — this script is the one
// place per render that calls `deriveFurniture`/owns `measureText`, then threads the results in as
// props, once.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import {
  deriveFurniture,
  measureText,
} from "./render-still.mjs";
import { ChartWebSeed, SEED_LAYOUT } from "../assets/ChartWebSeed.tsx";

const HERE = import.meta.dirname;
const TARGET = join(HERE, "..", "assets", "preview.png");

const data = JSON.parse(
  await readFile(join(HERE, "..", "assets", "sample-data", "rainfall.json"), "utf8"),
);

const ground = "#FFFFFF";
const furniture = deriveFurniture(ground);

const svg = renderToStaticMarkup(
  createElement(ChartWebSeed, {
    data,
    title: "Rainfall over the sample town fell by a third",
    source: "Sample data — not a real measurement",
    alt: "A line falling from 912 to 604 across eleven readings.",
    ground,
    accent: "#0B7A75",
    subject: "the sample town",
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
    console.error("preview.png is stale — the seed changed and the preview did not. Re-run without --check.");
    process.exit(1);
  }
  console.log("preview.png matches a fresh render of the seed.");
} else {
  await writeFile(TARGET, png);
  console.log(`wrote ${TARGET} (${png.length} bytes) — now open it and look at it.`);
}
