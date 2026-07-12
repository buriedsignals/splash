// E2E of scripts/snap-video.mjs against REAL mp4s — built synthetically with the
// SAME bundled ffmpeg the snap uses (scripts/lib/ffbin.mjs), so no Remotion render
// is needed here and the suite stays fast + deterministic. The real-render path is
// covered by tests/produce-single-format.test.ts's video case, which now passes
// THROUGH this snap fail-hard inside produce.mjs (green there = thresholds hold on
// a real h264 Remotion encode). Adversarial cases: a deliberately WRONG still (an
// early frame passed off as the review still), a frozen video, a duration mismatch.
import { describe, it, expect, beforeAll } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFfBinaries } from "../scripts/lib/ffbin.mjs";
import { encodePng } from "./helpers/png.ts";
import {
  REVEAL_MIN_MEAN_DIFF,
  PROGRESSION_MIN_MEAN_DIFF,
} from "../src/core/video-verify";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SNAP = join(root, "scripts", "snap-video.mjs");

const W = 320;
const H = 180; // even dims — yuv420p needs them
const FPS = 30;
const FRAMES = 60; // 2s — enough for distinct 2%/50%/98% samples
const STILL_FRAME = 30;

const ff = resolveFfBinaries();
const runFf = (args: string[]) => {
  const res = spawnSync(ff.ffmpeg, args, {
    cwd: ff.cwd,
    env: ff.env as NodeJS.ProcessEnv,
    stdio: "pipe",
  });
  if (res.status !== 0)
    throw new Error(`ffmpeg failed: ${res.stderr?.toString()}`);
};

// One synthetic frame: dark horizontal gradient + a bright 50px square whose x
// position tracks `t` in [0,1] — every sampled frame is non-blank and any two
// distant frames differ a lot (a stand-in for a chart reveal).
function makeFrame(t: number): Uint8Array {
  const data = new Uint8Array(W * H * 3);
  const sq = 50;
  const sqX = Math.round(10 + t * (W - sq - 20));
  const sqY = Math.round((H - sq) / 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const inSquare = x >= sqX && x < sqX + sq && y >= sqY && y < sqY + sq;
      const v = inSquare ? 230 : Math.round((x / (W - 1)) * 80);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = inSquare ? 40 : v; // tint the square so chroma moves too
    }
  }
  return data;
}

// The bundled ffmpeg has no rawvideo demuxer (slim build), so the synthetic video
// is fed to it as a PNG sequence (image2 demuxer + png decoder, both enabled),
// written by the dependency-free encoder in helpers/png.ts.
function encodeMp4(outPath: string, frameAt: (n: number) => Uint8Array): void {
  const seqDir = mkdtempSync(join(tmpdir(), "snap-video-frames-"));
  for (let n = 0; n < FRAMES; n++) {
    writeFileSync(
      join(seqDir, `f-${String(n).padStart(3, "0")}.png`),
      encodePng(W, H, frameAt(n)),
    );
  }
  runFf([
    "-v",
    "error",
    "-framerate",
    String(FPS),
    "-i",
    join(seqDir, "f-%03d.png"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    "-y",
    outPath,
  ]);
}

// A SPARSE reveal (the LinePortrait class): a static gradient background where only
// a thin 2-row line strip draws in over time — the mid legs measure ~half of the
// full early-vs-final motion, landing between PROGRESSION_MIN_MEAN_DIFF and
// REVEAL_MIN_MEAN_DIFF exactly like the real LinePortrait render this guard
// false-failed (measured midVsEarly 0.383 there; ≈ 0.4 here).
function makeSparseFrame(t: number): Uint8Array {
  const data = new Uint8Array(W * H * 3);
  const lineEnd = 10 + Math.round(t * 288);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const v = Math.round((x / (W - 1)) * 80);
      const onLine = (y === 90 || y === 91) && x >= 10 && x < lineEnd;
      data[i] = onLine ? Math.min(255, v + 110) : v;
      data[i + 1] = onLine ? Math.min(255, v + 60) : v;
      data[i + 2] = onLine ? 40 : v;
    }
  }
  return data;
}

function writeStill(outPath: string, frame: Uint8Array): void {
  writeFileSync(outPath, encodePng(W, H, frame));
}

// Runs the snap for real; returns { status, stderr, stdout }.
function runSnap(env: Record<string, string>): {
  status: number;
  stderr: string;
  stdout: string;
} {
  try {
    const stdout = execFileSync("bun", [SNAP], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stderr: "", stdout: stdout.toString("utf8") };
  } catch (e) {
    const err = e as { status?: number; stderr?: Buffer; stdout?: Buffer };
    return {
      status: err.status ?? -1,
      stderr: err.stderr?.toString("utf8") ?? "",
      stdout: err.stdout?.toString("utf8") ?? "",
    };
  }
}

let dir: string;
let animatedMp4: string;
let frozenMp4: string;
let sparseMp4: string;
let correctStill: string;
let wrongStill: string;
let sparseStill: string;
let correctFinalStill: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "snap-video-e2e-"));
  animatedMp4 = join(dir, "animated.mp4");
  frozenMp4 = join(dir, "frozen.mp4");
  sparseMp4 = join(dir, "sparse.mp4");
  correctStill = join(dir, "still.png");
  wrongStill = join(dir, "wrong-still.png");
  sparseStill = join(dir, "sparse-still.png");
  encodeMp4(animatedMp4, (n) => makeFrame(n / (FRAMES - 1)));
  encodeMp4(frozenMp4, () => makeFrame(STILL_FRAME / (FRAMES - 1)));
  encodeMp4(sparseMp4, (n) => makeSparseFrame(n / (FRAMES - 1)));
  // the "reviewed" still = the frame the producer renders separately at STILL_FRAME
  writeStill(correctStill, makeFrame(STILL_FRAME / (FRAMES - 1)));
  // the adversarial still = an EARLY frame passed off as the review still
  writeStill(wrongStill, makeFrame(1 / (FRAMES - 1)));
  writeStill(sparseStill, makeSparseFrame(STILL_FRAME / (FRAMES - 1)));
  // the separately-rendered end state (what `remotion still --frame=-1` produces)
  correctFinalStill = join(dir, "final-still.png");
  writeStill(correctFinalStill, makeFrame(1));
});

const baseEnv = () => ({
  MP4: animatedMp4,
  STILL: correctStill,
  STILL_FRAME: String(STILL_FRAME),
  FPS: String(FPS),
  EXPECTED_FRAMES: String(FRAMES),
  EXPECTED_WIDTH: String(W),
  EXPECTED_HEIGHT: String(H),
  OUTDIR: dir,
});

describe("snap-video.mjs — e2e on real (synthetic) mp4s", () => {
  it("should pass a healthy animated mp4 whose frame matches the reviewed still, and write video-verify.json", () => {
    const res = runSnap(baseEnv());
    expect(res.stderr).toBe("");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("[snap-video] OK");
    const report = JSON.parse(
      readFileSync(join(dir, "video-verify.json"), "utf8"),
    );
    expect(report.violations).toEqual([]);
    expect(report.measurements.revealMeanDiff).toBeGreaterThan(0);
  }, 120_000);

  it("should FAIL when fed a deliberately wrong still (an early frame passed off as the review)", () => {
    const res = runSnap({ ...baseEnv(), STILL: wrongStill });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("does not match the reviewed still");
  }, 120_000);

  it("should FAIL a frozen video (every frame identical) as not animating", () => {
    const res = runSnap({ ...baseEnv(), MP4: frozenMp4 });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("does not animate");
  }, 120_000);

  it("should PASS a sparse reveal whose mid legs measure under REVEAL_MIN_MEAN_DIFF (the LinePortrait false-positive regression)", () => {
    const res = runSnap({
      ...baseEnv(),
      MP4: sparseMp4,
      STILL: sparseStill,
      OUTDIR: dir,
    });
    expect(res.stderr).toBe("");
    expect(res.status).toBe(0);
    const report = JSON.parse(
      readFileSync(join(dir, "video-verify.json"), "utf8"),
    );
    // prove the case is REALLY in the contested band: it would have failed under the
    // old single-threshold logic (mid legs < REVEAL_MIN_MEAN_DIFF) but is healthy
    // (mid legs > PROGRESSION_MIN_MEAN_DIFF, full motion > REVEAL_MIN_MEAN_DIFF).
    const { midVsEarlyMeanDiff, revealMeanDiff } = report.measurements;
    expect(midVsEarlyMeanDiff).toBeGreaterThan(PROGRESSION_MIN_MEAN_DIFF);
    expect(midVsEarlyMeanDiff).toBeLessThan(REVEAL_MIN_MEAN_DIFF);
    expect(revealMeanDiff).toBeGreaterThan(REVEAL_MIN_MEAN_DIFF);
  }, 120_000);

  it("should PASS with a FINAL_STILL that matches the mp4's true end state, and record the measurement", () => {
    const res = runSnap({ ...baseEnv(), FINAL_STILL: correctFinalStill });
    expect(res.stderr).toBe("");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("final frame matches the rendered final still");
    const report = JSON.parse(
      readFileSync(join(dir, "video-verify.json"), "utf8"),
    );
    expect(report.measurements.finalStillDiffRatio).toBeDefined();
  }, 120_000);

  it("should FAIL when the mp4's final frame does not match the rendered final still (end state never reached)", () => {
    // an early frame passed off as the final still — the deterministic render's end
    // state and the delivered mp4's end state disagree
    const res = runSnap({ ...baseEnv(), FINAL_STILL: wrongStill });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("final frame does not match");
  }, 120_000);

  it("should FAIL when the duration does not match the registered composition", () => {
    const res = runSnap({ ...baseEnv(), EXPECTED_FRAMES: String(FRAMES + 30) });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("duration");
  }, 120_000);

  it("should FAIL when the pixel dimensions differ from the registered render size", () => {
    const res = runSnap({ ...baseEnv(), EXPECTED_WIDTH: String(W + 2) });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("registered composition size");
  }, 120_000);

  it("should FAIL clearly when the mp4 is missing", () => {
    const res = runSnap({ ...baseEnv(), MP4: join(dir, "nope.mp4") });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("mp4 not found");
  }, 120_000);

  it("should skip the duration check (with a note) when EXPECTED_FRAMES is not provided", () => {
    // empty string = unset for the script (map-native's real wiring omits it entirely)
    const res = runSnap({ ...baseEnv(), EXPECTED_FRAMES: "" });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain(
      "duration-vs-registered-composition check is skipped",
    );
  }, 120_000);

  it("should FAIL when the mp4 is too short to contain the reviewed still frame (truncation)", () => {
    const res = runSnap({
      ...baseEnv(),
      STILL_FRAME: String(FRAMES + 10),
      EXPECTED_FRAMES: "",
    });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("too short");
  }, 120_000);
});

describe("ffbin resolution", () => {
  it("should resolve Remotion's bundled ffmpeg/ffprobe (no system dependency)", () => {
    expect(existsSync(ff.ffprobe) || ff.ffprobe === "ffprobe").toBe(true);
  });
});
