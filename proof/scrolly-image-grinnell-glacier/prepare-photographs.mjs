// Fetches the four ORIGINAL photographs this beat is built from, verifies each one against the
// sha256 frozen in `photographs.csv`, and derives the delivered frames under `frames/`.
//
// **Run once. It is the only thing in this beat that touches the network, and `render.mjs` never
// calls it** — the derived frames are committed, so a warm render reads nothing but what is in this
// folder. It exists so that the delivery is REPRODUCIBLE and the transformation is written down as
// code rather than described in prose: anyone can re-run it and get the same four files, and if the
// upstream file ever changes, the sha256 check fails loudly instead of silently swapping a
// photograph under a caption.
//
// The transformation, in full, and nothing else is done to these images:
//   1. centre-CROP each original to the common aspect ratio 0.675 — the narrowest of the four, so
//      every crop takes pixels off the WIDTH and none off the height. The four originals were shot
//      across 71 years on four cameras and do not share a frame; normalising them to one box is
//      what makes the sequence comparable, and it is exactly what `skills/image-native` describes
//      as its own job ("normalizes the frames to one box").
//   2. resample to 820 px wide (1215 tall) and re-encode as JPEG.
// No rotation, no straightening, no colour or tone adjustment, no retouching. The crop is centred
// and its exact pixel width per image is recorded in `photographs.csv`.
//
// Usage:
//   bun proof/scrolly-image-grinnell-glacier/prepare-photographs.mjs

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPhotographs } from "./photograph-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const TARGET_ASPECT = 0.675;
const DELIVERED_WIDTH = 820;
const JPEG_QUALITY = 72;

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function sips(args) {
  const r = spawnSync("sips", args, { encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(`sips ${args.join(" ")} exited ${r.status}: ${r.stderr}`);
  return r.stdout;
}

const scratch = join(HERE, "frames", ".originals");
mkdirSync(scratch, { recursive: true });

const photographs = readPhotographs(
  readFileSync(join(HERE, "photographs.csv"), "utf8"),
);

for (const p of photographs) {
  const res = await fetch(p.fileUrl, {
    headers: { "user-agent": "splash beat/1.0 (repeat-photography scrolly)" },
  });
  if (!res.ok) throw new Error(`${p.fileUrl} → HTTP ${res.status}`);
  const original = Buffer.from(await res.arrayBuffer());
  const got = sha256(original);
  if (got !== p.originalSha256)
    throw new Error(
      `${p.fileUrl} no longer matches the frozen sha256.\n  expected ${p.originalSha256}\n  got      ${got}\n` +
        `The upstream file changed. Look at it before touching this line: a caption crediting ` +
        `${p.photographer} now sits over a photograph nobody in this repository has seen.`,
    );

  const originalPath = join(scratch, `original-${p.year}.jpg`);
  const croppedPath = join(scratch, `cropped-${p.year}.jpg`);
  writeFileSync(originalPath, original);

  const cropWidth = Math.floor(p.originalHeight * TARGET_ASPECT);
  if (cropWidth !== p.cropWidth)
    throw new Error(
      `crop width for ${p.year} recomputes to ${cropWidth}, but photographs.csv records ${p.cropWidth}`,
    );
  sips(["-c", String(p.originalHeight), String(cropWidth), originalPath, "--out", croppedPath]);
  sips([
    "--resampleWidth",
    String(DELIVERED_WIDTH),
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    String(JPEG_QUALITY),
    croppedPath,
    "--out",
    join(HERE, p.deliveredFile),
  ]);

  const delivered = readFileSync(join(HERE, p.deliveredFile));
  console.log(
    `${p.year}  ${p.originalWidth}x${p.originalHeight} → crop ${cropWidth}x${p.originalHeight} → ` +
      `${p.deliveredWidth}x${p.deliveredHeight}  ${(delivered.length / 1024).toFixed(0)} kB  ` +
      `sha256 ${sha256(delivered).slice(0, 16)}…`,
  );
}
