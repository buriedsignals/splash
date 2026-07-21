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
} from "./video-verify";
// The current authoritative implementation we must stay byte-equal to:
import {
  meanAbsDiff as cnMeanAbsDiff,
  lumaVariance as cnLumaVariance,
  diffRatio as cnDiffRatio,
  verifyVideo as cnVerifyVideo,
  REVEAL_MIN_MEAN_DIFF as cnRevealMinMeanDiff,
  PROGRESSION_MIN_MEAN_DIFF as cnProgressionMinMeanDiff,
  MIN_LUMA_VARIANCE as cnMinLumaVariance,
  STILL_MATCH_CHANNEL_TOLERANCE as cnStillMatchChannelTolerance,
  STILL_MATCH_MAX_DIFF_RATIO as cnStillMatchMaxDiffRatio,
  DURATION_TOLERANCE_FRAMES as cnDurationToleranceFrames,
  MIN_MP4_BYTES as cnMinMp4Bytes,
} from "../../skills/chart-native/src/core/video-verify";

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

function noisy(seed: number, width = W, height = H): RawFrame {
  const data = new Uint8Array(width * height * 3);
  let s = seed;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = s % 256;
  }
  return { width, height, data };
}

describe("core/video-verify parity with chart-native/core/video-verify", () => {
  it("tuning knobs match", () => {
    expect(REVEAL_MIN_MEAN_DIFF).toBe(cnRevealMinMeanDiff);
    expect(PROGRESSION_MIN_MEAN_DIFF).toBe(cnProgressionMinMeanDiff);
    expect(MIN_LUMA_VARIANCE).toBe(cnMinLumaVariance);
    expect(STILL_MATCH_CHANNEL_TOLERANCE).toBe(cnStillMatchChannelTolerance);
    expect(STILL_MATCH_MAX_DIFF_RATIO).toBe(cnStillMatchMaxDiffRatio);
    expect(DURATION_TOLERANCE_FRAMES).toBe(cnDurationToleranceFrames);
    expect(MIN_MP4_BYTES).toBe(cnMinMp4Bytes);
  });

  it("meanAbsDiff matches on representative frame pairs", () => {
    const a = solid(10, 20, 30);
    const b = solid(200, 100, 50);
    const n = noisy(7);
    expect(meanAbsDiff(a, b)).toBeCloseTo(cnMeanAbsDiff(a, b), 12);
    expect(meanAbsDiff(a, n)).toBeCloseTo(cnMeanAbsDiff(a, n), 12);
    expect(meanAbsDiff(a, a)).toBeCloseTo(cnMeanAbsDiff(a, a), 12);
  });

  it("lumaVariance matches on representative frames", () => {
    for (const f of [
      solid(0, 0, 0),
      solid(255, 255, 255),
      noisy(3),
      noisy(99),
    ]) {
      expect(lumaVariance(f)).toBeCloseTo(cnLumaVariance(f), 12);
    }
  });

  it("diffRatio matches across tolerances", () => {
    const a = noisy(1);
    const b = noisy(2);
    for (const tol of [0, 10, 40, 100]) {
      expect(diffRatio(a, b, tol)).toBeCloseTo(cnDiffRatio(a, b, tol), 12);
    }
  });

  it("verifyVideo matches on a healthy synthetic reveal", () => {
    const early = solid(20, 20, 20);
    const mid = solid(120, 60, 30);
    const late = solid(200, 100, 40);
    const final = solid(220, 110, 50);
    const still = solid(220, 110, 50);
    const finalStill = solid(220, 110, 50);
    const input = {
      probe: {
        sizeBytes: 500_000,
        width: 840,
        height: 480,
        durationSeconds: 5,
        nbFrames: 150,
      },
      expected: { fps: 30, width: 840, height: 480, frames: 150 },
      samples: { early, mid, late, final },
      still: { frame: still, mp4Frame: final, frameIndex: 149 },
      finalStill: { frame: finalStill },
    };
    expect(verifyVideo(input)).toEqual(cnVerifyVideo(input));
  });

  it("verifyVideo matches on a broken synthetic case (frozen, undersized, blank)", () => {
    const blank = solid(0, 0, 0);
    const input = {
      probe: {
        sizeBytes: 100,
        width: 640,
        height: 360,
        durationSeconds: 5,
        nbFrames: 150,
      },
      expected: { fps: 30, width: 840, height: 480, frames: 150 },
      samples: { early: blank, mid: blank, late: blank, final: blank },
    };
    expect(verifyVideo(input)).toEqual(cnVerifyVideo(input));
  });
});
