// prep-images.mjs — the deterministic image-prep layer (spec §8). ZERO vision, ZERO
// generated text: it consumes the (journalist-gated) ImageStory manifest plus the raw
// images and normalizes every frame to ONE box so a crossfade never "jumps".
//
//   bun scripts/prep-images.mjs <image-story.json> <outDir>
//     → <outDir>/frames/<id>.jpg    one per frame, story order, all EXACTLY the target box
//     → <outDir>/prep-report.json   { frames: [{ id, src, width, height, bytes }] }
//
// Fit semantics (spec §8 — canvas-frame is the safe editorial DEFAULT):
//   canvas-frame → sharp fit:"contain" on a matte canvas derived from the story theme
//                  (zero content loss — a blind crop distorts editorial meaning);
//   crop         → sharp fit:"cover", geometric centre (explicit per-frame opt-in; a crop
//                  discarding more than CROP_DISCARD_THRESHOLD of the frame warns loud).
// The per-frame `fit` override wins over story.fit.
//
// Correctness floor: .rotate() bakes EXIF orientation, output is sRGB, metadata is
// STRIPPED (sharp strips by default — no .withMetadata()), JPEG q=82 (grounded default
// for photographic web content; v1 target is the article-web 1200×675 box — the only
// channel a scrolly can live on, so no channel taxonomy is re-invented here).
// Deterministic: same input → same output bytes. No Date.now(), no randomness.
//
// A frameRef that does not resolve to a file on disk halts with the FILENAME on stderr
// (an editorial prompt — the journalist must know WHICH image is missing), exit 1.
import { mkdirSync, statSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import sharp from "sharp";

// ---- tuning knobs (spec §12 — each one a number) --------------------------------
const TARGET_WIDTH = 1200; // article-web media box (skills/splash/src/channel.ts)
const TARGET_HEIGHT = 675;
const JPEG_QUALITY = 82; // grounded photographic-web default (spec §15)
const MAX_INPUT_DIMENSION = 12000; // px — fail-hard guard against absurd inputs
const CROP_DISCARD_THRESHOLD = 0.3; // a cover-crop discarding more than this warns loud

const storyPath = process.argv[2];
const outDir = process.argv[3];
if (!storyPath || !outDir) {
  console.error("usage: prep-images.mjs <image-story.json> <outDir>");
  process.exit(1);
}

const story = JSON.parse(readFileSync(storyPath, "utf8"));
if (!Array.isArray(story.frames) || story.frames.length === 0) {
  console.error("image story has no frames — nothing to prep");
  process.exit(1);
}

// Matte for canvas-frame letterboxing: the story's theme ground when present (an
// arbitrary #rrggbb, same model as chart-native's themeBg), else plain white — the
// light default. Derived, never a second theme taxonomy.
function matteBackground(themeBg) {
  if (typeof themeBg === "string" && /^#[0-9a-fA-F]{6}$/.test(themeBg)) {
    return {
      r: parseInt(themeBg.slice(1, 3), 16),
      g: parseInt(themeBg.slice(3, 5), 16),
      b: parseInt(themeBg.slice(5, 7), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

// frameRefs resolve relative to imageDir (itself resolved against the manifest's own
// directory when relative, so a bundle moved as a whole keeps working).
const manifestDir = resolve(storyPath, "..");
const imageRoot = isAbsolute(story.imageDir ?? "")
  ? story.imageDir
  : resolve(manifestDir, story.imageDir ?? ".");

const framesDir = join(outDir, "frames");
mkdirSync(framesDir, { recursive: true });

const background = matteBackground(story.themeBg);
const reportFrames = [];

for (const frame of story.frames) {
  const src = resolve(imageRoot, frame.frameRef);
  if (!existsSync(src)) {
    console.error(
      `frame "${frame.id}": image not found — ${frame.frameRef} (looked in ${imageRoot}). ` +
        `Check the file name, or update the manifest's imageDir.`,
    );
    process.exit(1);
  }

  const meta = await sharp(src).metadata();
  if (
    (meta.width ?? 0) > MAX_INPUT_DIMENSION ||
    (meta.height ?? 0) > MAX_INPUT_DIMENSION
  ) {
    console.error(
      `frame "${frame.id}": ${frame.frameRef} is ${meta.width}×${meta.height} — ` +
        `larger than the ${MAX_INPUT_DIMENSION}px input guard. Downsize it first.`,
    );
    process.exit(1);
  }

  const fit = frame.fit ?? story.fit ?? "canvas-frame";

  // Crop-discard tripwire (spec §8): a centre cover-crop keeps min(scaledW, targetW) ×
  // min(scaledH, targetH) of the scaled image — warn loud when the discarded share of
  // the ORIGINAL frame exceeds the threshold (the journalist opted into crop; they must
  // know how much content it throws away).
  if (fit === "crop" && meta.width && meta.height) {
    const scale = Math.max(TARGET_WIDTH / meta.width, TARGET_HEIGHT / meta.height);
    const keptShare =
      (TARGET_WIDTH * TARGET_HEIGHT) /
      (meta.width * scale * (meta.height * scale));
    const discarded = 1 - keptShare;
    if (discarded > CROP_DISCARD_THRESHOLD) {
      console.error(
        `warning: frame "${frame.id}": crop discards ${(discarded * 100).toFixed(0)}% ` +
          `of the image (threshold ${CROP_DISCARD_THRESHOLD * 100}%) — consider ` +
          `fit:"canvas-frame" to keep the full frame`,
      );
    }
  }

  const outPath = join(framesDir, `${frame.id}.jpg`);
  await sharp(src)
    .rotate() // bake EXIF orientation, then strip (no .withMetadata())
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: fit === "crop" ? "cover" : "contain",
      position: "centre",
      background,
    })
    .flatten({ background }) // alpha over the matte — JPEG has no alpha channel
    .toColorspace("srgb")
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(outPath);

  const written = await sharp(outPath).metadata();
  reportFrames.push({
    id: frame.id,
    src: join("frames", `${frame.id}.jpg`),
    width: written.width,
    height: written.height,
    bytes: statSync(outPath).size,
  });
}

writeFileSync(
  join(outDir, "prep-report.json"),
  JSON.stringify({ frames: reportFrames }, null, 2) + "\n",
);
console.log(
  "PREP_RESULT " +
    JSON.stringify({ framesDir, frames: reportFrames.length }),
);
