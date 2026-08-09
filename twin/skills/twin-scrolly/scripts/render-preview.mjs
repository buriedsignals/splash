// Renders THIS skill's seed from nothing but its own directory. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// Unlike `render-scrolly.mjs`'s own full page (which needs the seed's photograph embedded as a
// data URI to stay self-contained), this preview renders STEPS_META's LAST entry — this seed's own
// `DrawnGraphicFrame`, the "minimal graphic" that needs nothing else on disk — the same "one
// informative still" convention every other genre's own preview keeps. This is also the render
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
import { deriveFurniture } from "./render-still.mjs";
import { STEPS_META, FRAME, DrawnGraphicFrame } from "../assets/ScrollySeed.tsx";

const HERE = import.meta.dirname;

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");

const lastMeta = STEPS_META[STEPS_META.length - 1];
if (lastMeta.frameKind !== "drawn")
  throw new Error(
    `render-preview.mjs renders STEPS_META's own DrawnGraphicFrame standalone — the last entry must be frameKind "drawn", got "${lastMeta.frameKind}"`,
  );

const ground = "#FFFFFF";
const accent = "#0B7A75";
const furniture = deriveFurniture(ground);

const svg = renderToStaticMarkup(
  createElement(DrawnGraphicFrame, { ground, accent, ...furniture }),
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
