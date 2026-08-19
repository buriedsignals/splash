// Renders THIS skill's seed from THIS skill's sample data. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// Uses `ChartWebPreviewSvg`, NOT `ChartWebSeed` — see that component's own doc-comment in
// `assets/ChartWebSeed.tsx`. `ChartWebSeed` now draws geometry-only SVG plus HTML/CSS furniture,
// which is exactly what makes the shipped beat genuinely fluid; a static PNG documentation
// thumbnail still needs one flat, fully-baked SVG for `@resvg/resvg-js` (SVG-only, no HTML layout
// engine) to rasterise, so this script reaches for the sibling SVG-only renderer instead. The two
// share the same data, the same geometry function and the same editorial words — they draw the
// same chart — only the TEXT-RENDERING TECHNIQUE differs, and only because a PNG has no browser to
// lay HTML text out in.
//
// Furniture (`ink`/`muted`/`grid`) and `measure` are derived HERE, in node, exactly the division
// `scripts/render-web.mjs`'s `renderWeb` already uses for a real beat: neither seed component
// imports the rasteriser (see `ChartWebSeed.tsx`'s own doc-comment) — this script is the one
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
import { ChartWebPreviewSvg } from "../assets/ChartWebSeed.tsx";
import { comparePngBuffers } from "./compare-png.mjs";

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

// Read, not typed — see `PALETTE.md` at this skill's own root for why the seed reads its colours
// the same way a beat does.
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
  createElement(ChartWebPreviewSvg, {
    data,
    title: "Rainfall over the sample town fell by a third",
    source: "Sample data — not a real measurement",
    alt: "A line falling from 912 to 604 across eleven readings.",
    ground,
    accent,
    subject: "the sample town",
    ...furniture,
    measure: measureText,
  }),
);
// Nothing renders in a typeface nobody chose: if the element declared a family other
// than the one in force, every gutter in it was measured against a font nobody is
// looking at, and it would clip in the PNG rather than say so.
assertDrawnInActiveTypeface(svg, { where: "the seed" });

const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
const previewWidth = widthMatch ? Number(widthMatch[1]) : 900;

const png = new Resvg(svg, { fitTo: { mode: "width", value: previewWidth } })
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
