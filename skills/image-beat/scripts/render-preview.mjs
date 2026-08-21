// twin/skills/image-beat/scripts/render-preview.mjs
//
// Renders THIS skill's seed from THIS skill's sample data — nothing else on disk is needed. Never
// a story's render: a story's artifact proves the story, not the mechanism this skill teaches.
//
// This is the ONE place per render that turns a photo FILE into a photo PROP: reads the bytes,
// reads its real size (`readImageMeta`), refuses a JPEG an image viewer would silently rotate
// (`checkOrientation`), refuses the set if it is too heavy combined (`checkWeight`), and encodes
// it as a `data:` URI (`toDataUri`) — the seed component itself never touches a file or a byte, the
// same division `render-preview.mjs` in `chart-beat` keeps between node-side I/O and the pure
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
import { comparePngBuffers } from "./compare-png.mjs";
import { duplicatedPayload } from "./verify-image.mjs";
import {
  FLOOR_FRACTION,
  frameFillFraction,
  graphicFillsItsFrame,
} from "./detect-fills-its-frame.mjs";
import { photosDeclareAltAndCredit } from "./detect-every-photo-says-what-it-shows.mjs";
import { CEILING_BYTES, weightAgainstCeiling } from "./detect-weight-has-a-ceiling.mjs";

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
// caller rasterises at" contract `chart-beat/scripts/render-still.mjs`'s own `renderStill`
// enforces by throwing when the two disagree.
const layout = imageBeatLayout(photos, title);

const svg = renderToStaticMarkup(
  createElement(ImageBeatSeed, { photos, title, ground }),
);

// WEIGHT THAT IS NOT CARRYING ANYTHING, refused here beside `checkWeight` which refuses weight that
// is simply too much. The same photograph embedded twice is bytes no reader benefits from, and this
// format gets there by writing exactly what a journalist would expect to write — one image shown at
// two sizes, or repeated in a before/after. A scrolly earned this guard at 1.33 MB inlined five
// times into one file.
const duplicated = duplicatedPayload(svg);
if (duplicated.length) {
  const mb = (n) => (n / (1024 * 1024)).toFixed(2);
  throw new Error(
    `this beat embeds the same photograph more than once: ` +
      duplicated
        .map((d) => `${d.copies} copies of one ${mb(d.bytes)} MB asset, ${mb(d.wastedBytes)} MB wasted`)
        .join("; ") +
      `. Embed it once and reference it, or draw it once — see references/image-discipline.md.`,
  );
}

// ROUND SIX: this format's two OWN guards — the one that says a photograph must say what it shows
// and who took it, and the one that puts a ceiling on what a reader downloads — were declared,
// unit-tested against synthetic markup, and called by nothing that draws. A photograph beat's whole
// discipline is "required alt and credit, and a weight ceiling", and neither was ever asked of a
// render. They are asked here, of the SVG this run just laid out, before anything is rasterised.
const said = photosDeclareAltAndCredit(svg);
if (said.photos === 0)
  throw new Error(
    "the seed drew no `<g role=\"img\">` at all — a photograph beat with no photograph in it would " +
      "pass every alt-and-credit check vacuously, which is how this guard would stop meaning anything",
  );
if (said.missingAlt || said.missingCredit)
  throw new Error(
    `${said.missingAlt} of ${said.photos} photograph(s) say nothing about what they show, and ` +
      `${said.missingCredit} name no source` +
      (said.creditRecordedAbsent
        ? ` (${said.creditRecordedAbsent} of those record an ABSENT source, which is an answer and not a credit)`
        : "") +
      ". A photograph a reader cannot hear described, or trace to whoever took it, is not deliverable " +
      "— references/image-discipline.md.",
  );

const png = new Resvg(svg, { fitTo: { mode: "width", value: layout.width } })
  .render()
  .asPng();

// ROUND-SIX FINDING AC1: `fills-its-frame` reached all eight producing skills and was called by
// none of them — the rule landed in the catalogue and not in the code, and every format stayed
// exactly as weak as it had been. This is the call, on the bytes that are about to be written and
// before the write, the same order `assertExportedSize` runs in for a delegated export.
//
// A photograph beat's floor is the second highest of the eight (66.40%) because a letterboxed
// picture fills nearly all of its frame by construction: the box is the picture, and a reading far
// under this one means the frame was sized for something the beat is not drawing.
const heavy = weightAgainstCeiling(Buffer.byteLength(svg, "utf8"), CEILING_BYTES);
if (heavy.over)
  throw new Error(
    `the delivered file is ${heavy.bytes} bytes against this format's ${heavy.ceiling}-byte ceiling ` +
      `— a photograph inlined at a weight a reader on a phone pays for. Re-encode the photograph, ` +
      `do not raise the ceiling: scripts/detect-weight-has-a-ceiling.mjs names what it was measured from.`,
  );

const filled = graphicFillsItsFrame(frameFillFraction(png).fraction, FLOOR_FRACTION);
if (filled.under)
  throw new Error(
    `the seed's drawing covers ${(filled.fraction * 100).toFixed(2)}% of its own frame, under this ` +
      `format's measured ${(FLOOR_FRACTION * 100).toFixed(2)}% floor — a picture stranded in a ` +
      `corner of a frame nothing reserved. Widening the floor is not the fix: ` +
      `scripts/detect-fills-its-frame.mjs names the population it was measured from.`,
  );

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
  console.log(`wrote ${TARGET}${proofNote} (${png.length} bytes, ${layout.width}x${layout.height}) — now open it and look at it.`);
}
