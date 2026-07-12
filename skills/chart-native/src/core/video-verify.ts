// Pure pixel math for the video snap guard (scripts/snap-video.mjs): the delivered
// mp4 must actually animate, hold intermediate states, contain no blank frames, keep
// the registered size/duration, and match the SEPARATELY-rendered review still at the
// still's frame index — the still is what the Gate-3 human review approves, so
// still ≈ mp4 transfers that approval to the artifact actually delivered (labels
// present in the still ⟹ present in the video). Frames are packed RGB24 buffers
// (decoded by ffmpeg in the snap script) — this module does no IO and no rendering,
// so it is unit-testable with synthetic in-memory frames (tests/video-verify.test.ts).
// Mirrored in skills/map-native/src/core/video-verify.ts (same producer discipline,
// mirror-pattern like snap-a11y/snap-proof).

/** One decoded frame: packed RGB24, data.length === width * height * 3. */
export interface RawFrame {
  width: number;
  height: number;
  data: Uint8Array;
}

// ---------------------------------------------------------------------------------
// Tuning knobs (each = one number; see repo convention). Calibrated against a real
// chart-native BarReveal render (landscape 840x480, h264 yuv420p): a frozen
// re-encode measures < 0.5 mean diff; real reveal endpoints measure > 10; flat
// frames measure < 3 luma variance vs hundreds for any frame with furniture text.
// ---------------------------------------------------------------------------------

/** Mean |Δ| per channel (0-255) below which the early and final sampled frames count
 * as "the same image" — the FULL-motion leg only. A frozen h264 re-encode measures
 * ≈ 0.04 even on a busy frame (measured with the bundled ffmpeg at crf 18), while the
 * sparsest real reveal (small scatter dots popping in) moves ≥ 1 and a bar reveal
 * measures ≈ 4-24. 0.5 sits ~14x above the noise and ~2x under the sparsest
 * legitimate motion. The mid legs use PROGRESSION_MIN_MEAN_DIFF below — they
 * intrinsically measure only part of this motion. */
export const REVEAL_MIN_MEAN_DIFF = 0.5;

/** Mean |Δ| per channel (0-255) below which the 50% frame counts as "stuck on an
 * endpoint". The mid legs (mid-vs-early / mid-vs-final) measure ~half or less of the
 * full early-vs-final motion BY DESIGN on sparse comps — a line chart's first
 * timeline half is mostly the light-gray axes wipe (the line's ease window is
 * [0.30, 0.95]) — so reusing REVEAL_MIN_MEAN_DIFF here false-failed healthy videos.
 * Calibrated on real renders (2026-07-11, bundled ffmpeg, crf 18): frozen noise
 * measures ≤ 0.04 (a dense BarReveal frozen re-encode ≈ 0.04; a LinePortrait
 * frame-140 still-loop ≈ 0.0003, its second-generation re-encode ≈ 0.0007), while
 * the weakest healthy sparse mids are LinePortrait midVsEarly ≈ 0.383, LineSquare
 * midVsEarly ≈ 0.485, SlopePortrait midVsFinal ≈ 0.661. 0.15 sits ~3.7x above the
 * worst measured noise and ~2.5x under the weakest healthy mid. */
export const PROGRESSION_MIN_MEAN_DIFF = 0.15;

/** BT.601 luma variance below which a frame counts as blank: a flat background is
 * ≈ 0-2 even with encode noise; any frame carrying furniture text or marks measures
 * in the hundreds (sparse 13px text alone contributes ≈ 1000). */
export const MIN_LUMA_VARIANCE = 10;

/** Per-channel |Δ| (0-255) forgiven per pixel when diffing the mp4 frame against the
 * review still: h264 4:2:0 chroma subsampling + quantization shift edge pixels by up
 * to ~30-40, while a label missing against its background differs by ≫ 100. */
export const STILL_MATCH_CHANNEL_TOLERANCE = 40;

/** Max fraction of pixels allowed beyond STILL_MATCH_CHANNEL_TOLERANCE: antialiased
 * text/mark edges ring under encoding (measured ≪ 0.5% on real renders), while a
 * wrong reveal state flips whole mark areas (percent-scale). */
export const STILL_MATCH_MAX_DIFF_RATIO = 0.01;

/** Container duration may differ from the registered composition by encoder rounding
 * of at most one frame. */
export const DURATION_TOLERANCE_FRAMES = 1;

/** A real mp4 (even a short, tiny, well-compressed one) is bigger than this; a
 * truncated/empty encode is not. A floor, not a quality bar. */
export const MIN_MP4_BYTES = 2048;

function assertSameDims(a: RawFrame, b: RawFrame, what: string): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `${what}: frame dimensions differ (${a.width}x${a.height} vs ${b.width}x${b.height})`,
    );
  }
  if (
    a.data.length !== a.width * a.height * 3 ||
    b.data.length !== b.width * b.height * 3
  ) {
    throw new Error(
      `${what}: RGB24 buffer length does not match width*height*3`,
    );
  }
}

/** Mean absolute per-channel difference between two same-sized RGB24 frames (0-255). */
export function meanAbsDiff(a: RawFrame, b: RawFrame): number {
  assertSameDims(a, b, "meanAbsDiff");
  let sum = 0;
  for (let i = 0; i < a.data.length; i++)
    sum += Math.abs(a.data[i] - b.data[i]);
  return sum / a.data.length;
}

/** Variance of the BT.601 luma (0.299R + 0.587G + 0.114B) over one frame. */
export function lumaVariance(frame: RawFrame): number {
  const n = frame.width * frame.height;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < frame.data.length; i += 3) {
    const y =
      0.299 * frame.data[i] +
      0.587 * frame.data[i + 1] +
      0.114 * frame.data[i + 2];
    sum += y;
    sumSq += y * y;
  }
  const mean = sum / n;
  // clamp the tiny negative FP residue a solid frame can produce
  return Math.max(0, sumSq / n - mean * mean);
}

/** Fraction of pixels where ANY channel differs by MORE than `channelTolerance`. */
export function diffRatio(
  a: RawFrame,
  b: RawFrame,
  channelTolerance: number,
): number {
  assertSameDims(a, b, "diffRatio");
  const n = a.width * a.height;
  let differing = 0;
  for (let i = 0; i < a.data.length; i += 3) {
    if (
      Math.abs(a.data[i] - b.data[i]) > channelTolerance ||
      Math.abs(a.data[i + 1] - b.data[i + 1]) > channelTolerance ||
      Math.abs(a.data[i + 2] - b.data[i + 2]) > channelTolerance
    ) {
      differing++;
    }
  }
  return differing / n;
}

export interface VideoVerifyInput {
  /** Container facts probed from the ACTUAL mp4 (ffprobe + fs.stat). */
  probe: {
    sizeBytes: number;
    width: number;
    height: number;
    durationSeconds: number;
    nbFrames: number;
  };
  /** What the composition registered. `width`/`height`/`frames` are optional —
   * omitted checks are skipped (map-native story durations are bundle-time computed
   * constants, not re-derivable here). */
  expected: { fps: number; width?: number; height?: number; frames?: number };
  /** Frames sampled at ~2% / ~50% / ~98% of the duration plus the final frame. */
  samples: { early: RawFrame; mid: RawFrame; late: RawFrame; final: RawFrame };
  /** The mp4 frame at the review still's frame index vs the still itself. */
  still?: { frame: RawFrame; mp4Frame: RawFrame; frameIndex: number };
}

export interface VideoVerifyResult {
  violations: string[];
  /** The raw numbers behind every verdict — written to video-verify.json so a
   * review (or a threshold recalibration) can see what was actually measured. */
  measurements: Record<string, number>;
}

/** The full verdict. Pure: probe/frames in, violations + measurements out. */
export function verifyVideo(input: VideoVerifyInput): VideoVerifyResult {
  const { probe, expected, samples, still } = input;
  const violations: string[] = [];
  const measurements: Record<string, number> = { mp4Bytes: probe.sizeBytes };

  // 1 — container sanity
  if (probe.sizeBytes < MIN_MP4_BYTES) {
    violations.push(
      `mp4 is trivially small (${probe.sizeBytes} bytes < ${MIN_MP4_BYTES}) — truncated or empty encode`,
    );
  }
  if (expected.width !== undefined && expected.height !== undefined) {
    if (probe.width !== expected.width || probe.height !== expected.height) {
      violations.push(
        `mp4 pixel dimensions ${probe.width}x${probe.height} do not match the registered composition size ${expected.width}x${expected.height}`,
      );
    }
  }
  if (expected.frames !== undefined) {
    const actualFrames = probe.durationSeconds * expected.fps;
    measurements.durationFrames = actualFrames;
    if (
      Math.abs(actualFrames - expected.frames) >
      DURATION_TOLERANCE_FRAMES + 1e-9
    ) {
      violations.push(
        `mp4 duration ${probe.durationSeconds.toFixed(3)}s (${actualFrames.toFixed(1)} frames @ ${expected.fps}fps) is more than ${DURATION_TOLERANCE_FRAMES} frame(s) away from the registered ${expected.frames} frames`,
      );
    }
  }

  // 2 — non-blank: every sampled frame must carry actual content
  for (const [name, frame] of Object.entries(samples) as [string, RawFrame][]) {
    const variance = lumaVariance(frame);
    measurements[`variance_${name}`] = variance;
    if (variance < MIN_LUMA_VARIANCE) {
      violations.push(
        `sampled frame "${name}" is blank (luma variance ${variance.toFixed(2)} < ${MIN_LUMA_VARIANCE}) — all-background render`,
      );
    }
  }

  // 3 — reveal animates: first and final frames must actually differ
  const revealMeanDiff = meanAbsDiff(samples.early, samples.final);
  measurements.revealMeanDiff = revealMeanDiff;
  if (revealMeanDiff <= REVEAL_MIN_MEAN_DIFF) {
    violations.push(
      `video does not animate: first and final sampled frames differ by ${revealMeanDiff.toFixed(2)} mean abs diff (<= ${REVEAL_MIN_MEAN_DIFF}) — frozen/static render`,
    );
  } else {
    // 4 — progression: the midpoint must differ from BOTH endpoints (catches a
    // two-state pop where nothing animates in between). Only meaningful when the
    // endpoints themselves differ — a frozen video is already flagged above. The
    // mid legs get their OWN lower threshold (see PROGRESSION_MIN_MEAN_DIFF): they
    // measure ~half or less of the full motion, so the full-motion threshold
    // false-failed healthy sparse reveals (LinePortrait midVsEarly ≈ 0.38).
    const midVsEarly = meanAbsDiff(samples.mid, samples.early);
    const midVsFinal = meanAbsDiff(samples.mid, samples.final);
    measurements.midVsEarlyMeanDiff = midVsEarly;
    measurements.midVsFinalMeanDiff = midVsFinal;
    if (
      midVsEarly <= PROGRESSION_MIN_MEAN_DIFF ||
      midVsFinal <= PROGRESSION_MIN_MEAN_DIFF
    ) {
      violations.push(
        `video has no progression: the 50% frame matches an endpoint (vs first ${midVsEarly.toFixed(2)}, vs final ${midVsFinal.toFixed(2)}, threshold ${PROGRESSION_MIN_MEAN_DIFF}) — two-state pop, nothing animates in between`,
      );
    }
  }

  // 5 — mp4 == reviewed still (the load-bearing check: transfers the Gate-3
  // approval of the still to the delivered artifact)
  if (still) {
    if (
      still.frame.width !== still.mp4Frame.width ||
      still.frame.height !== still.mp4Frame.height
    ) {
      violations.push(
        `review still dimensions ${still.frame.width}x${still.frame.height} do not match the mp4 frame ${still.mp4Frame.width}x${still.mp4Frame.height} — scale before diffing`,
      );
    } else {
      const ratio = diffRatio(
        still.mp4Frame,
        still.frame,
        STILL_MATCH_CHANNEL_TOLERANCE,
      );
      measurements.stillDiffRatio = ratio;
      if (ratio > STILL_MATCH_MAX_DIFF_RATIO) {
        violations.push(
          `mp4 frame ${still.frameIndex} does not match the reviewed still: ${(ratio * 100).toFixed(2)}% of pixels differ beyond ±${STILL_MATCH_CHANNEL_TOLERANCE} (allowed ${(STILL_MATCH_MAX_DIFF_RATIO * 100).toFixed(2)}%) — the delivered video is not the frame the review approved`,
        );
      }
    }
  }

  return { violations, measurements };
}
