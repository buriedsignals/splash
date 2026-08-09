// Renders THIS skill's seed from THIS skill's sample data. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// Unlike the other genres' own preview scripts, which render their single frame, this one renders
// the LAST step (the fully-revealed chart, `STEPS[STEPS.length - 1]`) — the most informative single
// still to show a reader of this skill who never runs anything, the same way a static beat's own
// preview shows its one finished frame rather than an intermediate state.
//
// Furniture (`ink`/`muted`/`grid`) and `measure` are derived HERE, in node, exactly the division
// `scripts/render-scrolly.mjs`'s `renderScrolly` already uses for a real beat: the seed component
// itself never imports the rasteriser (see `ScrollySeed.tsx`'s own doc-comment) — this script is
// the one place per render that calls `deriveFurniture`/owns `measureText`, then threads the
// results in as props, once.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { ScrollyChartSeed, STEPS, FRAME } from "../assets/ScrollySeed.tsx";

const HERE = import.meta.dirname;

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");

const data = JSON.parse(
  await readFile(join(HERE, "..", "assets", "sample-data", "rainfall.json"), "utf8"),
);

const ground = "#FFFFFF";
const furniture = deriveFurniture(ground);
const lastStep = STEPS[STEPS.length - 1];

const svg = renderToStaticMarkup(
  createElement(ScrollyChartSeed, {
    data,
    step: lastStep,
    active: true,
    subject: "the sample basin",
    ground,
    accent: "#0B7A75",
    ...furniture,
    measure: measureText,
  }),
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: FRAME.width } })
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
  await mkdir(outDir, { recursive: true });
  await writeFile(TARGET, png);
  console.log(`wrote ${TARGET} (${png.length} bytes) — now open it and look at it.`);
}
