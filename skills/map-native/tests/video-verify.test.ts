// Pure pixel math behind scripts/snap-video.mjs (the video snap guard). Synthetic
// in-memory RGB24 frames only — no rendering, no ffmpeg, no file IO. The e2e that
// runs the real script against real mp4s lives in tests/snap-video.test.ts.
import { describe, it, expect } from "bun:test";
import {
  meanAbsDiff,
  lumaVariance,
  diffRatio,
  verifyVideo,
  REVEAL_MIN_MEAN_DIFF,
  PROGRESSION_MIN_MEAN_DIFF,
  MIN_LUMA_VARIANCE,
  STILL_MATCH_CHANNEL_TOLERANCE,
  STILL_MATCH_MAX_DIFF_RATIO,
  DURATION_TOLERANCE_FRAMES,
  MIN_MP4_BYTES,
  type RawFrame,
} from "../src/core/video-verify";

const W = 16;
const H = 12;

function solid(
  r: number,
  g: number,
  b: number,
  width = W,
  height = H,
): RawFrame {
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < data.length; i += 3) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return { width, height, data };
}

// Deterministic patterned frame: a horizontal gradient shifted by `phase` — high
// variance, and two different phases differ a lot (stands in for an animating chart).
function gradient(phase: number, width = W, height = H): RawFrame {
  const data = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = (((x + phase) * 255) / (width - 1)) % 256;
      const i = (y * width + x) * 3;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
  }
  return { width, height, data };
}

// Copy of `f` with every channel nudged by `delta` (clamped) — stands in for
// uniform codec noise.
function nudged(f: RawFrame, delta: number): RawFrame {
  const data = new Uint8Array(f.data.length);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.max(0, Math.min(255, f.data[i] + delta));
  }
  return { width: f.width, height: f.height, data };
}

// Copy of `f` with only the first `nPixels` pixels shifted by `delta` on every
// channel — stands in for a SPARSE reveal (a thin line drawing over a static
// background: only the line's pixels move). meanAbsDiff(f, sparse(f, n, d))
// = n*d / (width*height), so target mean diffs can be dialed in exactly.
function sparse(f: RawFrame, nPixels: number, delta: number): RawFrame {
  const data = new Uint8Array(f.data);
  for (let i = 0; i < nPixels * 3; i++) {
    data[i] = Math.max(0, Math.min(255, data[i] + delta));
  }
  return { width: f.width, height: f.height, data };
}

describe("meanAbsDiff — mean absolute per-channel difference (0-255)", () => {
  it("should return 0 for identical frames", () => {
    const a = gradient(0);
    expect(meanAbsDiff(a, gradient(0))).toBe(0);
  });

  it("should return 255 for solid black vs solid white", () => {
    expect(meanAbsDiff(solid(0, 0, 0), solid(255, 255, 255))).toBe(255);
  });

  it("should return ~127.5 when half the pixels flip black-to-white", () => {
    const a = solid(0, 0, 0);
    const b = solid(0, 0, 0);
    const half = (b.data.length / 3 / 2) * 3;
    for (let i = 0; i < half; i++) b.data[i] = 255;
    expect(meanAbsDiff(a, b)).toBeCloseTo(127.5, 1);
  });

  it("should throw on mismatched dimensions", () => {
    expect(() =>
      meanAbsDiff(solid(0, 0, 0), solid(0, 0, 0, W + 2, H)),
    ).toThrow();
  });
});

describe("lumaVariance — BT.601 luma variance of one frame", () => {
  it("should return ~0 for a solid frame", () => {
    expect(lumaVariance(solid(90, 120, 33))).toBeCloseTo(0, 6);
  });

  it("should return 127.5^2 for a half-black half-white frame", () => {
    const f = solid(0, 0, 0);
    const half = (f.data.length / 3 / 2) * 3;
    for (let i = 0; i < half; i++) f.data[i] = 255;
    expect(lumaVariance(f)).toBeCloseTo(127.5 * 127.5, 0);
  });

  it("should sit above MIN_LUMA_VARIANCE for a patterned frame and below for near-flat noise", () => {
    expect(lumaVariance(gradient(0))).toBeGreaterThan(MIN_LUMA_VARIANCE);
    // flat + a single-unit ripple ≈ encode noise on a blank render — must stay "blank"
    const nearFlat = solid(200, 200, 200);
    for (let i = 0; i < nearFlat.data.length; i += 6) nearFlat.data[i] = 201;
    expect(lumaVariance(nearFlat)).toBeLessThan(MIN_LUMA_VARIANCE);
  });
});

describe("diffRatio — fraction of pixels whose any channel differs beyond a tolerance", () => {
  it("should return 0 for identical frames", () => {
    expect(diffRatio(gradient(3), gradient(3), 10)).toBe(0);
  });

  it("should return 0 when every pixel differs by exactly the tolerance (noise forgiven)", () => {
    const a = solid(100, 100, 100);
    expect(diffRatio(a, nudged(a, 10), 10)).toBe(0);
  });

  it("should return 0.5 when half the pixels differ far beyond the tolerance", () => {
    const a = solid(0, 0, 0);
    const b = solid(0, 0, 0);
    const half = (b.data.length / 3 / 2) * 3;
    for (let i = 0; i < half; i++) b.data[i] = 255;
    expect(diffRatio(a, b, 10)).toBeCloseTo(0.5, 5);
  });

  it("should count a pixel whose single channel exceeds the tolerance", () => {
    const a = solid(10, 10, 10);
    const b = solid(10, 10, 10);
    b.data[1] = 200; // one green channel of one pixel
    expect(diffRatio(a, b, 40)).toBeCloseTo(1 / (W * H), 6);
  });
});

describe("verifyVideo — the full verdict over probe + sampled frames + still", () => {
  // A healthy synthetic render: distinct animated frames, matching still.
  function goodInput() {
    const early = gradient(0);
    const mid = gradient(5);
    const late = gradient(10);
    const final = gradient(11);
    return {
      probe: {
        sizeBytes: 500_000,
        width: W,
        height: H,
        durationSeconds: 8,
        nbFrames: 240,
      },
      expected: { fps: 30, width: W, height: H, frames: 240 },
      samples: { early, mid, late, final },
      still: {
        frame: gradient(7),
        mp4Frame: nudged(gradient(7), 4),
        frameIndex: 140,
      },
    };
  }

  it("should pass a healthy animated video (no violations)", () => {
    const { violations, measurements } = verifyVideo(goodInput());
    expect(violations).toEqual([]);
    expect(measurements.revealMeanDiff).toBeGreaterThan(REVEAL_MIN_MEAN_DIFF);
    expect(measurements.stillDiffRatio).toBeLessThanOrEqual(
      STILL_MATCH_MAX_DIFF_RATIO,
    );
  });

  it("should flag a frozen video (first == final) as not animating", () => {
    const input = goodInput();
    const f = gradient(0);
    input.samples = {
      early: f,
      mid: gradient(0),
      late: gradient(0),
      final: gradient(0),
    };
    input.still = {
      frame: gradient(0),
      mp4Frame: gradient(0),
      frameIndex: 140,
    };
    const { violations } = verifyVideo(input);
    expect(violations.some((v) => v.includes("does not animate"))).toBe(true);
  });

  it("should flag a two-state pop (mid == first, final differs) as missing progression", () => {
    const input = goodInput();
    input.samples = {
      early: gradient(0),
      mid: gradient(0),
      late: gradient(11),
      final: gradient(11),
    };
    const { violations } = verifyVideo(input);
    expect(violations.some((v) => v.includes("progression"))).toBe(true);
    expect(violations.some((v) => v.includes("does not animate"))).toBe(false);
  });

  // Regression for the LinePortrait/LineSquare false positive: a sparse line reveal's
  // mid legs (mid-vs-early / mid-vs-final) intrinsically measure ~half or less of the
  // full early-vs-final motion — a real LinePortrait render measured midVsEarly 0.38
  // (< the 0.5 full-motion threshold) while genuinely animating (reveal 1.39). The
  // synthetic frames below reproduce that measured shape: mids ≈ 0.375, reveal ≈ 0.75.
  it("should pass a healthy SPARSE reveal whose mid legs sit between PROGRESSION_MIN_MEAN_DIFF and REVEAL_MIN_MEAN_DIFF (LinePortrait-class)", () => {
    const input = goodInput();
    const early = gradient(0);
    const mid = sparse(early, 2, 36); // 2*36/192 = 0.375 vs early
    const late = sparse(early, 3, 36);
    const final = sparse(early, 4, 36); // 4*36/192 = 0.75 vs early; 0.375 vs mid
    input.samples = { early, mid, late, final };
    input.still = { frame: mid, mp4Frame: mid, frameIndex: 140 };
    const { violations, measurements } = verifyVideo(input);
    // the contested band: this exact input FAILED under the old single-threshold logic
    expect(measurements.midVsEarlyMeanDiff).toBeGreaterThan(
      PROGRESSION_MIN_MEAN_DIFF,
    );
    expect(measurements.midVsEarlyMeanDiff).toBeLessThan(REVEAL_MIN_MEAN_DIFF);
    expect(measurements.midVsFinalMeanDiff).toBeLessThan(REVEAL_MIN_MEAN_DIFF);
    expect(violations).toEqual([]);
  });

  it("should still flag a stalled mid whose motion is at frozen-noise level (~0.04) even when the endpoints animate", () => {
    const input = goodInput();
    const early = gradient(0);
    const mid = sparse(early, 8, 1); // 8*1/192 ≈ 0.042 — the measured h264 noise scale
    const final = sparse(early, 4, 36); // endpoints genuinely differ (0.75)
    input.samples = { early, mid, late: final, final };
    input.still = { frame: mid, mp4Frame: mid, frameIndex: 140 };
    const { violations } = verifyVideo(input);
    expect(violations.some((v) => v.includes("progression"))).toBe(true);
  });

  it("should flag a blank sampled frame", () => {
    const input = goodInput();
    input.samples.mid = solid(255, 255, 255);
    const { violations } = verifyVideo(input);
    expect(
      violations.some((v) => v.includes("blank") && v.includes("mid")),
    ).toBe(true);
  });

  it("should flag a trivially small container", () => {
    const input = goodInput();
    input.probe.sizeBytes = MIN_MP4_BYTES - 1;
    const { violations } = verifyVideo(input);
    expect(violations.some((v) => v.includes(`${MIN_MP4_BYTES}`))).toBe(true);
  });

  it("should flag pixel dimensions that differ from the expected render size", () => {
    const input = goodInput();
    input.probe.width = W + 2;
    const { violations } = verifyVideo(input);
    expect(violations.some((v) => v.includes(`${W + 2}`))).toBe(true);
  });

  it("should flag a duration off by more than one frame, and tolerate exactly one frame", () => {
    const off = goodInput();
    off.probe.durationSeconds = (240 + DURATION_TOLERANCE_FRAMES + 1) / 30;
    expect(
      verifyVideo(off).violations.some((v) => v.includes("duration")),
    ).toBe(true);

    const ok = goodInput();
    ok.probe.durationSeconds = (240 + DURATION_TOLERANCE_FRAMES) / 30;
    expect(verifyVideo(ok).violations).toEqual([]);
  });

  it("should skip the duration check when no expected frame count is provided", () => {
    const input = goodInput();
    input.expected = { fps: 30, width: W, height: H }; // no `frames`
    input.probe.durationSeconds = 42; // would violate if the check ran
    expect(verifyVideo(input).violations).toEqual([]);
  });

  it("should flag an mp4 frame that does not match the reviewed still", () => {
    const input = goodInput();
    // the reviewed still shows a different reveal state than the delivered mp4
    input.still = {
      frame: gradient(0),
      mp4Frame: gradient(7),
      frameIndex: 140,
    };
    const { violations } = verifyVideo(input);
    expect(violations.some((v) => v.includes("still"))).toBe(true);
  });

  it("should forgive codec-level noise between the still and the mp4 frame", () => {
    const input = goodInput();
    const f = gradient(7);
    input.still = {
      frame: f,
      mp4Frame: nudged(f, STILL_MATCH_CHANNEL_TOLERANCE - 5),
      frameIndex: 140,
    };
    expect(verifyVideo(input).violations).toEqual([]);
  });

  it("should flag mismatched still/mp4-frame dimensions instead of comparing garbage", () => {
    const input = goodInput();
    input.still = {
      frame: gradient(0, W + 4, H),
      mp4Frame: gradient(0),
      frameIndex: 140,
    };
    const { violations } = verifyVideo(input);
    expect(violations.some((v) => v.includes("dimensions"))).toBe(true);
  });
});
