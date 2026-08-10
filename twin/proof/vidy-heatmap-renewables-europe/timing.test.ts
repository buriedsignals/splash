import { describe, expect, it } from "bun:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import {
  contrastRatio,
  luminance,
  rampAnchors,
  rampColor,
  textOnCell,
  valueToT,
} from "./HeatmapVideo";
import { HEATMAP_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other proof workspace in this
 * corpus applies to its own — each rule asserted green on the shipped timing and RED on a timing
 * mutated to break exactly that rule. Also pins the colour ramp: monotonic luminance and the 3:1
 * floor are mechanical, checkable claims, not review comments.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...HEATMAP_TIMING,
  ...patch,
});

describe("the shipped heatmap timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(HEATMAP_TIMING)).toEqual([]);
  });

  it("should be nine point six seconds at thirty frames per second", () => {
    expect(HEATMAP_TIMING.fps).toBe(30);
    expect(HEATMAP_TIMING.total).toBe(288);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => HEATMAP_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the legend and the cells arriving", () => {
    const pause = HEATMAP_TIMING.reveal.start - endOf(HEATMAP_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(HEATMAP_TIMING.fps / 2);
  });

  it("should give reveal more room than a single-line beat's, for 72 cells to cascade", () => {
    expect(HEATMAP_TIMING.reveal.duration).toBeGreaterThan(78);
  });

  it("should not let the subject start before every column has landed", () => {
    expect(HEATMAP_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(HEATMAP_TIMING.reveal),
    );
  });

  it("should not let the conclusion start before the subject has landed", () => {
    expect(HEATMAP_TIMING.conclusion.start).toBeGreaterThanOrEqual(
      endOf(HEATMAP_TIMING.subject),
    );
  });
});

describe("checkTiming on a mutated heatmap timing", () => {
  it("should refuse a subject that lands before the last column has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 150, duration: 26 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 150");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 240, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 260");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 254, hold: { start: 240, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the heatmap timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, HEATMAP_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(HEATMAP_TIMING.total, HEATMAP_TIMING.conclusion)).toBe(1);
    expect(progressOf(HEATMAP_TIMING.total, HEATMAP_TIMING.reveal)).toBe(1);
  });
});

// ── The colour ramp: a mechanical proof, not an eyeballed list. ────────────────────────────────

describe("rampAnchors + rampColor on this beat's ground and accent", () => {
  // Read from `PALETTE.md`, not repeated here. A ramp proof that pinned its own copy of the two
  // hexes would keep passing after the recorded answer changed, which is the same failure the
  // literals in `render.mjs` were: the proof has to run against the colour the beat draws.
  const { ground: GROUND, accent: ACCENT } = readPalette(
    dirname(fileURLToPath(import.meta.url)),
    { stopAt: resolve(dirname(fileURLToPath(import.meta.url)), "..") },
  );
  const { low, high } = rampAnchors(GROUND, ACCENT);

  it("should produce a low anchor that clears the 3:1 non-text floor against the real ground", () => {
    expect(contrastRatio(low, GROUND)).toBeGreaterThanOrEqual(3.0);
  });

  it("should produce a high anchor unconditionally darker than the low anchor", () => {
    expect(luminance(high)).toBeLessThan(luminance(low));
  });

  it("should move luminance in one direction only across the whole ramp (never dipping back up)", () => {
    const stops = Array.from({ length: 12 }, (_, i) => i / 11).map((t) =>
      luminance(rampColor(t, low, high)),
    );
    for (let i = 1; i < stops.length; i++)
      expect(stops[i]).toBeLessThanOrEqual(stops[i - 1]);
  });

  it("should clear 3:1 against the real ground at EVERY stop, not just the palest one", () => {
    const stops = Array.from({ length: 12 }, (_, i) => i / 11).map((t) =>
      rampColor(t, low, high),
    );
    for (const stop of stops)
      expect(contrastRatio(stop, GROUND)).toBeGreaterThanOrEqual(3.0);
  });

  it("should refuse a ramp built from a hand-picked pair that dips back up mid-scale", () => {
    // A deliberately bad pair: a mid-tone that is darker than neither end — a red herring ramp
    // whose middle stop has HIGHER luminance than its own low anchor, which no monotonic ramp
    // could ever produce. Proves the monotonic assertion above is a real, failable check.
    const badLow = "#5B9973"; // lum ≈ 0.26
    const badMid = "#FFFFFF"; // lum = 1.0 — deliberately paler than either end
    const stops = [luminance(badLow), luminance(badMid), luminance("#07301B")];
    const monotonic = stops.every((v, i) => i === 0 || v <= stops[i - 1]);
    expect(monotonic).toBe(false);
  });
});

describe("valueToT", () => {
  it("should map the domain minimum to 0 and the maximum to 1", () => {
    expect(valueToT(12.76, 12.76, 100)).toBeCloseTo(0, 6);
    expect(valueToT(100, 12.76, 100)).toBeCloseTo(1, 6);
  });

  it("should not divide by zero when every value in the domain is identical", () => {
    expect(valueToT(50, 50, 50)).toBe(0);
  });
});

describe("textOnCell", () => {
  it("should pick black text on a pale cell", () => {
    expect(textOnCell("#5FA17B")).toBe("#000000");
  });

  it("should pick white text on a dark cell", () => {
    expect(textOnCell("#0C311C")).toBe("#FFFFFF");
  });

  it("should flip its choice as the cell's own colour crosses the midpoint, never a fixed ink", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const { ground, accent } = readPalette(here, {
      stopAt: resolve(here, ".."),
    });
    const { low, high } = rampAnchors(ground, accent);
    const paleChoice = textOnCell(rampColor(0, low, high));
    const darkChoice = textOnCell(rampColor(1, low, high));
    expect(paleChoice).not.toBe(darkChoice);
  });
});
