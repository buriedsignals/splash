// Renders THIS skill's seed from THIS skill's sample data. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// Furniture (`ink`/`muted`/`grid`) and `measure` are derived HERE, in node, exactly the division
// `scripts/render-still.mjs` already uses for a real beat: the seed component itself
// never imports the rasteriser (see `ChartSeed.tsx`'s own doc-comment) — this script is the one
// place per render that calls `deriveFurniture`/owns `measureText`, then threads the results in as
// props, once.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import {
  deriveFurniture,
  measureText,
  readPalette,
} from "./render-still.mjs";
import { ChartSeed } from "../assets/ChartSeed.tsx";
import { sizeFor } from "./sizes.mjs";

// The preview is a picture of the MECHANISM, so it is drawn at one size deliberately rather than
// at whatever a beat happens to choose. Landscape, because that is the size a reader of this
// skill's README is looking at it in. Pass `--size square|portrait` to look at the other two —
// which is how the seed's own three renders were produced and opened.
const sizeArg = process.argv.indexOf("--size");
const SIZE = sizeArg !== -1 ? process.argv[sizeArg + 1] : "landscape";

const HERE = import.meta.dirname;

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
// Make outDir absolute
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");

const data = JSON.parse(
  await readFile(join(HERE, "..", "assets", "sample-data", "rainfall.json"), "utf8"),
);

// The seed reads its colours the same way a beat does — `readPalette` walking up from `assets/`
// and stopping at this skill's own root, where `PALETTE.md` records the answer. It used to name
// `#FFFFFF` and `#0B7A75` as literals here, which put the exact defect the palette mechanism
// exists to remove inside the file a new beat is copied from.
const { ground, accent } = readPalette(join(HERE, "..", "assets"), {
  stopAt: join(HERE, ".."),
});
const furniture = deriveFurniture(ground);

const svg = renderToStaticMarkup(
  createElement(ChartSeed, {
    data,
    title: "Rainfall over the sample town fell by a third",
    source: "Sample data — not a real measurement",
    alt: "A line falling from 912 to 604 across eleven readings.",
    ground,
    accent,
    subject: "the sample town",
    ...furniture,
    measure: measureText,
    size: SIZE,
  }),
);

// 1:1, because the frame IS the delivered pixel size — see references/static-discipline.md,
// "Three export sizes, and the frame IS the delivered pixel size", for the measurement that
// settled it and for the option that lost.
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: sizeFor(SIZE).width },
})
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
