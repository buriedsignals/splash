// scripts/lib/comp-registry.mjs (MIRROR of chart-native's) — the produce-time reader
// of a <Composition>'s registered literals. Drift-checked against THIS skill's real
// Root.tsx: dims are literal and must parse; story durations are bundle-time computed
// constants (durationInFrames={STORY_FRAMES}) and must yield null — NOT a later
// comp's numbers (the previous non-greedy scan could walk past the matched tag).
// The synthetic bounding/reorder cases live in chart-native's comp-registry.test.ts.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readCompDims,
  readCompTiming,
} from "../scripts/lib/comp-registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const rootTsx = readFileSync(
  join(here, "..", "remotion", "src", "Root.tsx"),
  "utf8",
);

describe("comp-registry — drift against the real map-native Root.tsx", () => {
  it("should parse ChoroplethStorySquare's registered dims (1080x1080)", () => {
    expect(readCompDims(rootTsx, "ChoroplethStorySquare")).toEqual({
      width: 1080,
      height: 1080,
    });
  });

  it("should return null for a story comp's computed (non-literal) timing instead of another comp's numbers", () => {
    // durationInFrames={STORY_FRAMES} — produce.mjs skips the duration check here;
    // the old unbounded scan could have returned a LATER comp's literal instead.
    expect(readCompTiming(rootTsx, "ChoroplethStory")).toBeNull();
  });

  it("should return null for an unknown comp id", () => {
    expect(readCompDims(rootTsx, "NoSuchComp")).toBeNull();
  });
});
