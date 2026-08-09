// twin/skills/twin-image-beat/scripts/render-preview.mjs
//
// Renders THIS skill's seed from THIS skill's sample data — nothing else on disk is needed. Never
// a story's render: a story's artifact proves the story, not the mechanism this skill teaches.
//
// This is the ONE place per render that turns a photo FILE into a photo PROP: reads the bytes,
// reads its real size (`readImageMeta`), refuses a JPEG an image viewer would silently rotate
// (`checkOrientation`), refuses the set if it is too heavy combined (`checkWeight`), and encodes
// it as a `data:` URI (`toDataUri`) — the seed component itself never touches a file or a byte, the
// same division `render-preview.mjs` in `twin-chart-beat` keeps between node-side I/O and the pure
// component it hands finished props to.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import {
  readImageMeta,
  checkOrientation,
  checkWeight,
  readPalette,
  toDataUri,
} from "./render-still.mjs";
import { ImageBeatSeed, imageBeatLayout } from "../assets/ImageBeatSeed.tsx";

const HERE = import.meta.dirname;
const SAMPLE_DIR = join(HERE, "..", "assets", "sample-data");

const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");

const MANIFEST = JSON.parse(await readFile(join(SAMPLE_DIR, "manifest.json"), "utf8"));

// Read, not typed — see `PALETTE.md` at this skill's own root for why the seed reads its
// colours the same way a beat does.
const { ground } = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });
const title = MANIFEST.title;

const photos = await Promise.all(
  MANIFEST.photos.map(async (entry) => {
    const bytes = await readFile(join(SAMPLE_DIR, entry.file));
    const meta = readImageMeta(bytes);
    checkOrientation(bytes, entry.file);
    return {
      label: entry.file,
      bytes,
      dataUri: toDataUri(bytes, meta.mime),
      intrinsicWidth: meta.width,
      intrinsicHeight: meta.height,
      alt: entry.alt,
      credit: entry.credit,
      caption: entry.caption,
    };
  }),
);

checkWeight(photos);

// `imageBeatLayout` is the same pure function the component calls internally — calling it here
// too, before constructing the element, is what lets this script tell `Resvg` the exact width and
// height the component is about to draw, the same "the frame the component draws is the frame the
// caller rasterises at" contract `twin-chart-beat/scripts/render-still.mjs`'s own `renderStill`
// enforces by throwing when the two disagree.
const layout = imageBeatLayout(photos, title);

const svg = renderToStaticMarkup(
  createElement(ImageBeatSeed, { photos, title, ground }),
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: layout.width } })
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
  console.log(`wrote ${TARGET} (${png.length} bytes, ${layout.width}x${layout.height}) — now open it and look at it.`);
}
