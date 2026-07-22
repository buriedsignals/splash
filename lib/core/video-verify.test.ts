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

/** Top half rows colour A, bottom half rows colour B — an exact 50/50 pixel split
 * (H must be even) so the luma variance across the frame is analytically derivable. */
function twoToneRows(
  colorA: [number, number, number],
  colorB: [number, number, number],
  width = W,
  height = H,
): RawFrame {
  if (height % 2 !== 0) throw new Error("twoToneRows requires an even height");
  const data = new Uint8Array(width * height * 3);
  const half = height / 2;
  for (let y = 0; y < height; y++) {
    const [r, g, b] = y < half ? colorA : colorB;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return { width, height, data };
}

/** Copy of `base` with the first `n` pixels' RED channel bumped by `deltaR` —
 * gives a frame pair with a KNOWN count of pixels differing by a known amount,
 * so diffRatio's output is analytically derivable. */
function withDifferingPixels(
  base: RawFrame,
  n: number,
  deltaR: number,
): RawFrame {
  const data = new Uint8Array(base.data);
  for (let p = 0; p < n; p++) {
    const i = p * 3;
    data[i] = Math.min(255, data[i] + deltaR);
  }
  return { width: base.width, height: base.height, data };
}

describe("core/video-verify", () => {
  it("tuning knobs match their documented literal values", () => {
    // Pins each knob to the number written (and commented) in video-verify.ts —
    // a drift here is a deliberate change to a golden, not an accident.
    expect(REVEAL_MIN_MEAN_DIFF).toBe(0.5);
    expect(PROGRESSION_MIN_MEAN_DIFF).toBe(0.15);
    expect(MIN_LUMA_VARIANCE).toBe(10);
    expect(STILL_MATCH_CHANNEL_TOLERANCE).toBe(40);
    expect(STILL_MATCH_MAX_DIFF_RATIO).toBe(0.01);
    expect(DURATION_TOLERANCE_FRAMES).toBe(1);
    expect(MIN_MP4_BYTES).toBe(2048);
  });

  it("meanAbsDiff equals the hand-computed mean |Δ| per channel", () => {
    // meanAbsDiff sums |Δ| over every byte in the buffer and divides by the total
    // byte count — for two SOLID frames that collapses to
    // (|Δr| + |Δg| + |Δb|) / 3, independent of width/height.
    const a = solid(10, 20, 30);
    const b = solid(200, 100, 50);
    const expectedAB =
      (Math.abs(10 - 200) + Math.abs(20 - 100) + Math.abs(30 - 50)) / 3; // (190+80+20)/3 = 96.6666...
    expect(meanAbsDiff(a, b)).toBeCloseTo(expectedAB, 6);

    const white = solid(255, 255, 255);
    const black = solid(0, 0, 0);
    expect(meanAbsDiff(white, black)).toBeCloseTo(255, 6); // (255+255+255)/3

    expect(meanAbsDiff(a, a)).toBe(0); // identical frame vs itself: zero diff
  });

  it("lumaVariance equals the hand-computed BT.601 variance", () => {
    // A solid frame has one luma value everywhere → variance is mathematically 0
    // (some colours leave a sub-epsilon FP residue in sumSq/n - mean^2, so we
    // compare with tolerance rather than exact equality).
    expect(lumaVariance(solid(0, 0, 0))).toBeCloseTo(0, 6);
    expect(lumaVariance(solid(255, 255, 255))).toBeCloseTo(0, 6);
    expect(lumaVariance(solid(128, 64, 200))).toBeCloseTo(0, 6);

    // A frame split exactly 50/50 between two solid colours has a binary luma
    // distribution: variance of a two-point equal-probability distribution is
    // ((y1 - y2) / 2)^2, where y = 0.299R + 0.587G + 0.114B (BT.601 coefficients).
    const y1 = 0.299 * 255 + 0.587 * 0 + 0.114 * 0; // red half   = 76.245
    const y2 = 0.299 * 0 + 0.587 * 255 + 0.114 * 0; // green half = 149.685
    const expectedVariance = Math.pow((y1 - y2) / 2, 2); // 1348.3584
    const frame = twoToneRows([255, 0, 0], [0, 255, 0]);
    expect(lumaVariance(frame)).toBeCloseTo(expectedVariance, 4);
  });

  it("diffRatio equals the known fraction of pixels beyond tolerance", () => {
    const base = solid(100, 100, 100);
    const n = W * H; // 192 pixels total
    const differingPixels = 48;
    const other = withDifferingPixels(base, differingPixels, 50); // first 48 pixels: R 100->150 (Δ=50)

    // tol=10: Δ=50 > 10 for the first 48 pixels, 0 for the rest.
    expect(diffRatio(base, other, 10)).toBeCloseTo(differingPixels / n, 6); // 48/192 = 0.25
    // tol=60: Δ=50 is NOT > 60 anywhere — no pixel counts as differing.
    expect(diffRatio(base, other, 60)).toBeCloseTo(0, 6);
    // identical frames never differ, regardless of tolerance.
    expect(diffRatio(base, base, 0)).toBe(0);
  });

  it("verifyVideo pins the verdict for a synthetic reveal-shaped input", () => {
    // Endpoints differ enough to pass the "does it animate" check (early vs final
    // mean diff = 106.67 > REVEAL_MIN_MEAN_DIFF) and the midpoint differs from both
    // endpoints enough to pass "progression" — but every sample is a SOLID colour,
    // so each one is individually flagged blank (luma variance 0 < MIN_LUMA_VARIANCE):
    // solid synthetic frames can prove motion/progression but never "has content".
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
    expect(verifyVideo(input)).toEqual({
      violations: [
        // container sanity (size/dims/duration) and reveal/progression all pass —
        // only the per-sample blank check fires, once per sample:
        'sampled frame "early" is blank (luma variance 0.00 < 10) — all-background render',
        'sampled frame "mid" is blank (luma variance 0.00 < 10) — all-background render',
        'sampled frame "late" is blank (luma variance 0.00 < 10) — all-background render',
        'sampled frame "final" is blank (luma variance 0.00 < 10) — all-background render',
      ],
      measurements: {
        mp4Bytes: 500_000, // == probe.sizeBytes
        durationFrames: 150, // probe.durationSeconds(5) * expected.fps(30)
        variance_early: 0,
        variance_mid: 0,
        variance_late: 0,
        // solid(220,110,50) accumulates a sub-epsilon FP residue in sumSq/n - mean^2
        // (clamped by Math.max(0, ...) from going negative, but not all the way to 0)
        variance_final: 1.5643308870494366e-10,
        revealMeanDiff: 106.66666666666667, // meanAbsDiff(early, final)
        midVsEarlyMeanDiff: 50, // meanAbsDiff(mid, early)
        midVsFinalMeanDiff: 56.666666666666664, // meanAbsDiff(mid, final)
        stillDiffRatio: 0, // still.mp4Frame(final) vs still.frame(still): identical
        finalStillDiffRatio: 0, // samples.final vs finalStill.frame: identical
      },
    });
  });

  it("verifyVideo pins the verdict for a broken synthetic case (frozen, undersized, blank)", () => {
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
    expect(verifyVideo(input)).toEqual({
      violations: [
        "mp4 is trivially small (100 bytes < 2048) — truncated or empty encode",
        "mp4 pixel dimensions 640x360 do not match the registered composition size 840x480",
        'sampled frame "early" is blank (luma variance 0.00 < 10) — all-background render',
        'sampled frame "mid" is blank (luma variance 0.00 < 10) — all-background render',
        'sampled frame "late" is blank (luma variance 0.00 < 10) — all-background render',
        'sampled frame "final" is blank (luma variance 0.00 < 10) — all-background render',
        "video does not animate: first and final sampled frames differ by 0.00 mean abs diff (<= 0.5) — frozen/static render",
      ],
      measurements: {
        mp4Bytes: 100,
        durationFrames: 150,
        variance_early: 0,
        variance_mid: 0,
        variance_late: 0,
        variance_final: 0,
        revealMeanDiff: 0, // all frames are the identical blank colour
        // no midVsEarly/midVsFinal, stillDiffRatio or finalStillDiffRatio: the
        // reveal-animates check short-circuits progression, and no still/finalStill
        // were passed in this input.
      },
    });
  });
});
