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
  readTypeface,
  useTypeface,
  assertDrawnInActiveTypeface,
} from "./render-still.mjs";
import { ChartSeed } from "../assets/ChartSeed.tsx";
import { sizeFor } from "./sizes.mjs";
import { comparePngBuffers } from "./compare-png.mjs";

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

// The typeface is a RECORDED ANSWER, read the same way the palette is and put in force
// before anything is laid out — `FONT_FAMILY` is a live binding, so the seed draws in
// whatever this resolves, and `measureText` measures in the same thing. A face that does
// not resolve on this machine refuses here rather than being silently substituted.
useTypeface(readTypeface(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") }));
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
// Nothing renders in a typeface nobody chose: if the element declared a family other
// than the one in force, every gutter in it was measured against a font nobody is
// looking at, and it would clip in the PNG rather than say so.
assertDrawnInActiveTypeface(svg, { where: "the seed" });

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
  // THE SAME PICTURE, not the same bytes. `chart-video`'s preview flipped 78611 -> 78605 between two
  // machines and back again; `scrolly`'s own check went red rendering 6543 where 6609 was committed.
  // 0,002 % and 0,065 % of pixels apart, text rasterised through the SYSTEM fonts in both cases.
  // Byte equality was asserting that this PNG is reproducible on any machine, which neither resvg
  // nor Chrome promises — see `scripts/compare-png.mjs`.
  const diff = comparePngBuffers(committed, png);
  if (!diff.same) {
    console.error(
      `preview.png is stale — the seed changed and the preview did not (${diff.reason}). Re-run without --check.`,
    );
    process.exit(1);
  }
  console.log(
    `preview.png matches a fresh render of the seed (${diff.diffPixels}/${diff.totalPixels} pixels differ).`,
  );
} else {
  await mkdir(outDir, { recursive: true });
  await writeFile(TARGET, png);
  console.log(`wrote ${TARGET} (${png.length} bytes) — now open it and look at it.`);
}
