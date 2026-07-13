import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Drift-guard: pins closed the class of hang the seismes symbol-video exposed.
// Every *Story / *Reveal / *Scrolly composition renders each video frame by
// continuing a `delayRender` handle when the MapLibre map settles. The RAW pattern
//   map.once("idle", () => continueRender(h))
// can hang forever — MapLibre's `idle` fires only once EVERY requested tile has
// loaded, so a single stalled/never-arriving tile leaves the handle un-continued.
// `continueWhenMapSettles` (core/frame-ready.ts) continues on `idle` OR after a
// bounded settle, so a stalled tile yields a slightly-less-tiled frame, never a hang.
// This test makes the bounded-readiness invariant universal: no component may
// re-introduce a raw idle-gated render-continue, and any component that continues a
// delayRender MUST route it through the bounded helper. A future map type inherits
// the rule automatically.

const COMPONENTS_DIR = join(import.meta.dir, "..", "src", "components");

const componentFiles = readdirSync(COMPONENTS_DIR)
  .filter((f) => f.endsWith(".tsx"))
  .sort();

// Interactive `*Map.tsx` renderers (src root, NOT src/components/) legitimately use
// `map.on/once("idle", …)` for label-anchor recompute — they never call delayRender/
// continueRender, so they cannot hang a render and are intentionally out of scope here.
const rawIdleListener = /\.(once|on)\(\s*["']idle["']/;
const framesRender = /\bcontinueRender\(/;
const boundedHelper = /\bcontinueWhenMapSettles\(/;

describe("map-native components: bounded frame-readiness invariant", () => {
  it("is non-vacuous: scans the full components/ directory", () => {
    // If the glob ever returns nothing (moved dir, bad path) the per-file loops below
    // would pass vacuously — assert we actually see the video compositions.
    expect(componentFiles.length).toBeGreaterThan(15);
    for (const known of [
      "ChoroplethStory.tsx",
      "DotDensityStory.tsx",
      "SymbolStory.tsx",
      "LocatorReveal.tsx",
      "RouteScrolly.tsx",
      "HarnessCheck.tsx",
    ]) {
      expect(componentFiles).toContain(known);
    }
  });

  it("HARD: no component uses the raw idle-gated render-continue pattern", () => {
    const offenders = componentFiles.filter((f) => {
      const src = readFileSync(join(COMPONENTS_DIR, f), "utf8");
      return rawIdleListener.test(src);
    });
    // Any hit is a frame that can hang on a stalled tile — must go through the helper.
    expect(offenders).toEqual([]);
  });

  it("HARD: every component that continues a delayRender routes it through continueWhenMapSettles", () => {
    // The load-bearing signal that a file gates a video frame on the map is that it
    // continues a delayRender handle. Each such file must import + use the bounded
    // helper — this catches a reverted or re-introduced idle-continue by a NEW name.
    const rendersFrames = componentFiles.filter((f) =>
      framesRender.test(readFileSync(join(COMPONENTS_DIR, f), "utf8")),
    );
    // Non-vacuity: the whole map-native video family renders frames this way.
    expect(rendersFrames.length).toBeGreaterThan(15);
    for (const f of rendersFrames) {
      const src = readFileSync(join(COMPONENTS_DIR, f), "utf8");
      expect(boundedHelper.test(src)).toBe(true);
    }
  });
});
