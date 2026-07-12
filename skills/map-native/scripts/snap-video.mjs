// skills/map-native/scripts/snap-video.mjs
// MIRROR of skills/chart-native/scripts/snap-video.mjs — keep the two in lockstep.
// Video snap guard: mechanical assertions on the ACTUAL rendered mp4 (not a
// re-render), wired fail-hard into produce.mjs right after the video render —
// mirror-pattern sibling of snap-contrast/snap-a11y. What it asserts:
//   1. CONTAINER SANITY — the mp4 exists, is non-trivial, its pixel dimensions equal
//      the registered composition size, and (when EXPECTED_FRAMES is known) its
//      duration matches the registered duration within one frame.
//   2. REVEAL — frames sampled at ~2%/~50%/~98% + the final frame must show a real
//      animation: first≠final (no frozen video), the midpoint ≠ both endpoints (no
//      two-state pop), and every sampled frame is non-blank.
//   3. MP4 == REVIEWED STILL — the mp4 frame at the review still's frame index must
//      match the separately-rendered still (video-<aspect>-still.png) within a codec-
//      noise tolerance. The still is what the Gate-3 review approves; this transfers
//      that approval to the artifact actually delivered (labels present in the still
//      ⟹ present in the video).
//   4. MP4 FINAL FRAME == RENDERED FINAL STILL (optional, FINAL_STILL) — the final
//      frame is the most-read frame of a chart video and check 3's mid-reveal still
//      never covers it; when the producer renders a separate final still
//      (video-<aspect>-final.png — chart-native does), the mp4's final frame must
//      match it within the same tolerance, or the "end-state value labels never
//      appear" bug class ships.
// All decoding is done by the ffmpeg/ffprobe Remotion already ships (scripts/lib/
// ffbin.mjs) — frames land as packed RGB24 buffers and the pure verdict lives in
// src/core/video-verify.ts (unit-tested without rendering). Writes video-verify.json
// (measurements + thresholds) next to the outputs, then exits 1 on any violation.
//
// Env: MP4, STILL, STILL_FRAME (required) · FPS (default 30) · EXPECTED_FRAMES,
//      EXPECTED_WIDTH, EXPECTED_HEIGHT, FINAL_STILL (optional) ·
//      OUTDIR (default dirname(MP4)).
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { resolveFfBinaries } from "./lib/ffbin.mjs";
import {
  verifyVideo,
  REVEAL_MIN_MEAN_DIFF,
  PROGRESSION_MIN_MEAN_DIFF,
  MIN_LUMA_VARIANCE,
  STILL_MATCH_CHANNEL_TOLERANCE,
  STILL_MATCH_MAX_DIFF_RATIO,
  DURATION_TOLERANCE_FRAMES,
  MIN_MP4_BYTES,
} from "../src/core/video-verify.ts";

function fail(message) {
  console.error(`SNAP-VIDEO FAILURE: ${message}`);
  process.exit(1);
}

const mp4Path = process.env.MP4 ? resolve(process.env.MP4) : null;
const stillPath = process.env.STILL ? resolve(process.env.STILL) : null;
const finalStillPath = process.env.FINAL_STILL ? resolve(process.env.FINAL_STILL) : null;
const stillFrame = Number(process.env.STILL_FRAME);
const fps = Number(process.env.FPS ?? "30");
const expectedFrames = process.env.EXPECTED_FRAMES ? Number(process.env.EXPECTED_FRAMES) : undefined;
const expectedWidth = process.env.EXPECTED_WIDTH ? Number(process.env.EXPECTED_WIDTH) : undefined;
const expectedHeight = process.env.EXPECTED_HEIGHT ? Number(process.env.EXPECTED_HEIGHT) : undefined;
if (!mp4Path || !stillPath || !Number.isInteger(stillFrame) || stillFrame < 0 || !Number.isFinite(fps) || fps <= 0) {
  fail("usage: MP4=<file.mp4> STILL=<still.png> STILL_FRAME=<int> [FPS=30] [EXPECTED_FRAMES=N] [EXPECTED_WIDTH=W EXPECTED_HEIGHT=H] [FINAL_STILL=final.png] [OUTDIR=dir] bun scripts/snap-video.mjs");
}
const outDir = process.env.OUTDIR ? resolve(process.env.OUTDIR) : dirname(mp4Path);

const ff = resolveFfBinaries();
const runFf = (bin, args, what) => {
  const res = spawnSync(bin, args, { cwd: ff.cwd, env: ff.env, stdio: ["ignore", "pipe", "pipe"] });
  if (res.status !== 0) {
    fail(`${what} failed (${bin} exited ${res.status}): ${res.stderr?.toString("utf8").trim()}`);
  }
  return res.stdout;
};

// --- 1. probe the container -----------------------------------------------------
let sizeBytes;
try {
  sizeBytes = statSync(mp4Path).size;
} catch {
  fail(`mp4 not found: ${mp4Path}`);
}
try {
  statSync(stillPath);
} catch {
  fail(`review still not found: ${stillPath}`);
}
if (finalStillPath) {
  try {
    statSync(finalStillPath);
  } catch {
    fail(`final still not found: ${finalStillPath}`);
  }
}

const probeOut = runFf(
  ff.ffprobe,
  ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames,duration", "-of", "json", mp4Path],
  "ffprobe",
);
const stream = JSON.parse(probeOut.toString("utf8")).streams?.[0];
if (!stream) fail(`ffprobe found no video stream in ${mp4Path}`);
const width = Number(stream.width);
const height = Number(stream.height);
const durationSeconds = Number(stream.duration);
const nbFrames = Number.isFinite(Number(stream.nb_frames))
  ? Number(stream.nb_frames)
  : Math.round(durationSeconds * fps);
if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(durationSeconds) || nbFrames < 2) {
  fail(`ffprobe returned an unusable stream for ${mp4Path}: ${JSON.stringify(stream)}`);
}

// The truncation guard for the load-bearing still-match: the reviewed frame must
// exist inside the delivered mp4 at all.
if (stillFrame >= nbFrames) {
  fail(`mp4 is too short to contain the reviewed still frame ${stillFrame} (only ${nbFrames} frames) — truncated render`);
}

// --- 2. extract sampled frames as raw RGB24 -------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "snap-video-"));
const rawBytes = width * height * 3;

// Seek to the midpoint before frame N: ffmpeg's accurate seek outputs the first
// frame with pts >= t, so (N - 0.5)/fps always lands exactly on frame N.
const frameTime = (n) => Math.max(0, (n - 0.5) / fps);

// NOTE on the output format: Remotion's bundled ffmpeg has no `rawvideo` muxer
// (slim build), but its `image2pipe` muxer + `rawvideo` codec write a single frame
// as exactly width*height*3 packed RGB24 bytes — verified byte-exact.
function extractFrame(label, timeSeconds) {
  const out = join(tmp, `${label}.raw`);
  runFf(
    ff.ffmpeg,
    ["-v", "error", "-ss", timeSeconds.toFixed(4), "-i", mp4Path, "-frames:v", "1", "-c:v", "rawvideo", "-pix_fmt", "rgb24", "-f", "image2pipe", "-y", out],
    `frame extraction (${label} @ ${timeSeconds.toFixed(2)}s)`,
  );
  let data;
  try {
    data = readFileSync(out);
  } catch {
    fail(`frame extraction (${label} @ ${timeSeconds.toFixed(2)}s) produced no output — mp4 shorter than probed?`);
  }
  if (data.length !== rawBytes) {
    fail(`frame extraction (${label} @ ${timeSeconds.toFixed(2)}s) produced ${data.length} bytes, expected ${rawBytes} — mp4 shorter than probed?`);
  }
  return { width, height, data: new Uint8Array(data) };
}

// Decode a rendered still (png) to raw RGB24 at the mp4's pixel size (scales when
// the still was rendered at a different size, per the tolerant-diff contract).
function decodeStill(pngPath, what) {
  const out = join(tmp, `${what}.raw`);
  runFf(
    ff.ffmpeg,
    ["-v", "error", "-i", pngPath, "-vf", `scale=${width}:${height}`, "-frames:v", "1", "-c:v", "rawvideo", "-pix_fmt", "rgb24", "-f", "image2pipe", "-y", out],
    `${what} decode`,
  );
  const data = readFileSync(out);
  if (data.length !== rawBytes) {
    fail(`${what} decode produced ${data.length} bytes, expected ${rawBytes}`);
  }
  return { width, height, data: new Uint8Array(data) };
}

let result;
try {
  const lastFrame = nbFrames - 1;
  const samples = {
    early: extractFrame("early", frameTime(Math.round(lastFrame * 0.02))),
    mid: extractFrame("mid", frameTime(Math.round(lastFrame * 0.5))),
    late: extractFrame("late", frameTime(Math.round(lastFrame * 0.98))),
    final: extractFrame("final", frameTime(lastFrame)),
  };
  const still = {
    frame: decodeStill(stillPath, "review-still"),
    mp4Frame: extractFrame("at-still", frameTime(stillFrame)),
    frameIndex: stillFrame,
  };
  // The final still (when the producer renders one) is compared against the mp4's
  // final sampled frame — already extracted above as samples.final.
  const finalStill = finalStillPath
    ? { frame: decodeStill(finalStillPath, "final-still") }
    : undefined;

  // --- 3. the pure verdict ------------------------------------------------------
  result = verifyVideo({
    probe: { sizeBytes, width, height, durationSeconds, nbFrames },
    expected: { fps, width: expectedWidth, height: expectedHeight, frames: expectedFrames },
    samples,
    still,
    finalStill,
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (expectedFrames === undefined) {
  console.log(
    "[snap-video] note: no EXPECTED_FRAMES provided — the duration-vs-registered-composition check is skipped " +
      "(map-native story durations are bundle-time computed constants; the still-frame containment check above still bounds truncation).",
  );
}

const report = {
  mp4: mp4Path,
  still: stillPath,
  finalStill: finalStillPath,
  stillFrame,
  probe: { sizeBytes, width, height, durationSeconds, nbFrames, fps },
  expected: { frames: expectedFrames ?? null, width: expectedWidth ?? null, height: expectedHeight ?? null },
  thresholds: {
    REVEAL_MIN_MEAN_DIFF,
    PROGRESSION_MIN_MEAN_DIFF,
    MIN_LUMA_VARIANCE,
    STILL_MATCH_CHANNEL_TOLERANCE,
    STILL_MATCH_MAX_DIFF_RATIO,
    DURATION_TOLERANCE_FRAMES,
    MIN_MP4_BYTES,
  },
  measurements: result.measurements,
  violations: result.violations,
};
writeFileSync(join(outDir, "video-verify.json"), JSON.stringify(report, null, 2) + "\n");

if (result.violations.length > 0) {
  console.error("SNAP-VIDEO FAILURES (the delivered mp4 does not hold the reveal contract):");
  for (const v of result.violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}
console.log(
  `[snap-video] OK — mp4 animates (reveal ${result.measurements.revealMeanDiff.toFixed(1)} mean diff), ` +
    `all sampled frames non-blank, frame ${stillFrame} matches the reviewed still ` +
    `(${((result.measurements.stillDiffRatio ?? 0) * 100).toFixed(2)}% pixels beyond tolerance)` +
    (finalStillPath
      ? `, final frame matches the rendered final still (${((result.measurements.finalStillDiffRatio ?? 0) * 100).toFixed(2)}%).`
      : "."),
);
