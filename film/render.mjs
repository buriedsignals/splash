// The film's own render script — the same ladder every beat in this repo climbs
// (`proof/life-expectancy/render.mjs`): a still first, then the mp4, and the delivered
// file measured from its own bytes rather than from the arguments it was asked for.
//
// The still is rendered BEFORE the mp4 and it is the LAST frame: if the film does not
// end on the mark, cleanly, nothing below is worth the four minutes of encoding.
//
// The picture must exist first: `bun film/capture.mjs` records the real page into
// `film/public/stage.mp4`. This script only lays the type over it.
//
// Usage:  bun film/render.mjs [--still-only] [--frame <n>] [--out <dir>] [--crf <n>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const ENTRY = join(HERE, "index.ts");
// The recording lives beside the film, not at the repository root — Remotion's default
// `public/` would put a 25 MB mp4 in the way of everything else in here.
const PUBLIC_DIR = join(HERE, "public");
const COMPOSITION = "splash-launch";
const WIDTH = 1920;
const HEIGHT = 1080;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const outDir = flag("--out", HERE);
// 21 rather than Remotion's own 18. The picture has already been through one encode
// (the screencast, at crf 16), so this pass is re-encoding an image that is not
// pristine; spending 18 on it buys detail that is no longer in the source.
const crf = flag("--crf", "21");
// The still is the last frame by default — the mark, finished. `--frame` looks at any
// other one without touching what is delivered.
const frame = flag("--frame", "-1");
const stillOnly = argv.includes("--still-only");

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

/** A PNG's dimensions, out of its IHDR — the one reading the code that wrote the file
 *  cannot make agree with itself. */
function readPngSize(bytes) {
  if (bytes.readUInt32BE(0) !== 0x89504e47)
    throw new Error("not a png");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertSize({ width, height }, what) {
  if (width !== WIDTH || height !== HEIGHT)
    throw new Error(
      `${what} is ${width}×${height}; the film is delivered at ${WIDTH}×${HEIGHT}`,
    );
}

await mkdir(outDir, { recursive: true });

const stillPath = join(outDir, "splash-launch-final-frame.png");
const stillSeconds = remotion([
  "still",
  ENTRY,
  COMPOSITION,
  stillPath,
  `--frame=${frame}`,
  `--public-dir=${PUBLIC_DIR}`,
  "--timeout=180000",
]);
assertSize(readPngSize(await readFile(stillPath)), stillPath);
console.log(`still (--frame=${frame}) → ${stillPath}  [${stillSeconds}s], verified from the file`);

if (stillOnly) process.exit(0);

const videoPath = join(outDir, "splash-launch.mp4");
const videoSeconds = remotion([
  "render",
  ENTRY,
  COMPOSITION,
  videoPath,
  // ONE at a time. Every frame of this film pulls a frame out of `stage.mp4`, and
  // several ffmpeg extractions racing on the same file is how a render ends up with a
  // frame from the wrong second in it.
  "--concurrency=1",
  `--crf=${crf}`,
  `--public-dir=${PUBLIC_DIR}`,
  "--timeout=180000",
]);

const probed = spawnSync(
  "ffprobe",
  [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,nb_frames",
    "-of", "csv=p=0",
    videoPath,
  ],
  { encoding: "utf8" },
);
if (probed.status !== 0)
  throw new Error(`ffprobe could not read ${videoPath}: ${probed.stderr ?? ""}`);
const [probedWidth, probedHeight, frames] = probed.stdout.trim().split(",").map(Number);
assertSize({ width: probedWidth, height: probedHeight }, videoPath);
console.log(
  `video → ${videoPath}  [${videoSeconds}s], ${probedWidth}×${probedHeight}, ` +
    `${frames} frames from ffprobe`,
);
