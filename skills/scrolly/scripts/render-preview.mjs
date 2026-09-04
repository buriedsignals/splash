// Renders THIS skill's seed from nothing but its own directory. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// Unlike `render-scrolly.mjs`'s own full page (which needs the seed's photograph embedded as a
// data URI to stay self-contained), this preview renders STEPS_META's LAST entry — this seed's own
// `DrawnGraphicFrame`, the "minimal graphic" that needs nothing else on disk — the same "one
// informative still" convention every other format's own preview keeps. This is also the render
// `test/canon.test.ts` runs with `--check` to prove the skill still renders standalone with nothing
// else on disk: it reads only `assets/ScrollySeed.tsx` and this script, nothing outside this skill.
//
// Furniture (`ink`/`muted`/`grid`) is derived HERE, in node, exactly the division
// `scripts/render-scrolly.mjs` already uses for a real beat: neither frame component imports the
// rasteriser (see `ScrollySeed.tsx`'s own doc-comment) — this script is the one place per render
// that calls `deriveFurniture`, then threads the results in as props, once.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { deriveFurniture, readPalette, readTypeface, useTypeface, assertDrawnInActiveTypeface } from "./render-still.mjs";
import { STEPS_META, FRAME, DrawnGraphicFrame } from "../assets/ScrollySeed.tsx";

const HERE = import.meta.dirname;

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");

// The DRAWN step is the one frame under this skill that renders with nothing else on disk: the
// image, map and chart tracks each need a frozen file from `assets/sample-data/`. Found by KIND,
// never by position — the seed's own step order is editorial and has already changed once.
const drawnMeta = STEPS_META.find((meta) => meta.frameKind === "drawn");
if (!drawnMeta)
  throw new Error(
    `render-preview.mjs renders STEPS_META's own DrawnGraphicFrame standalone — no step carries frameKind "drawn"`,
  );

// Read, not typed — see `PALETTE.md` at this skill's own root for why the seed reads its
// colours the same way a beat does.
const { ground, accent } = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });
// The typeface is a RECORDED ANSWER, read the same way the palette is and put in force before
// anything is laid out; a face that does not resolve on this machine refuses here rather than
// being silently substituted.
useTypeface(readTypeface(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") }));

const furniture = deriveFurniture(ground);

const svg = renderToStaticMarkup(
  createElement(DrawnGraphicFrame, { ground, accent, ...furniture }),
);
assertDrawnInActiveTypeface(svg, { where: "the seed" });

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
