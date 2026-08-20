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
import { deriveFurniture, readPalette } from "./render-still.mjs";
import { STEPS_META, FRAME, DrawnGraphicFrame } from "../assets/ScrollySeed.tsx";
import { comparePngBuffers } from "./compare-png.mjs";

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
const furniture = deriveFurniture(ground);

const svg = renderToStaticMarkup(
  createElement(DrawnGraphicFrame, { ground, accent, ...furniture }),
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: FRAME.width } })
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
  // No --out override: this IS the canonical regenerate, so the proof a reader opens is written from
  // the SAME buffer in the SAME run — never a second render (not byte-reproducible across launches,
  // see compare-png.mjs's own header) and never a second command (the step three regenerations in a
  // row forgot: bc308ab8, 97293519, and the state this branch found).
  let proofNote = "";
  if (outDirArg === -1) {
    const proofDir = join(HERE, "..", "output-proof");
    await mkdir(proofDir, { recursive: true });
    await writeFile(join(proofDir, "preview.png"), png);
    proofNote = ` and ${join(proofDir, "preview.png")}`;
  }
  console.log(`wrote ${TARGET}${proofNote} (${png.length} bytes) — now open it and look at it.`);
}
