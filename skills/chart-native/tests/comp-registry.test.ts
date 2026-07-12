// scripts/lib/comp-registry.mjs — the produce-time reader of a <Composition>'s
// registered literals. Two jobs: (1) DRIFT — the parsed numbers must match the real
// Root.tsx registration produce.mjs relies on; (2) BOUNDING — the scan must never
// walk past the matched comp's own tag into a LATER registration (the previous
// non-greedy [\s\S]*? scan silently returned another comp's numbers whenever the
// matched comp lacked or reordered an attribute).
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

describe("comp-registry — drift against the real Root.tsx", () => {
  it("should parse LinePortrait's registered timing (240 @ 30) and dims (1080x1920)", () => {
    expect(readCompTiming(rootTsx, "LinePortrait")).toEqual({
      frames: 240,
      fps: 30,
    });
    expect(readCompDims(rootTsx, "LinePortrait")).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it("should return null for an unknown comp id", () => {
    expect(readCompTiming(rootTsx, "NoSuchComp")).toBeNull();
    expect(readCompDims(rootTsx, "NoSuchComp")).toBeNull();
  });
});

describe("comp-registry — the scan is bounded to the matched comp's own tag", () => {
  // Comp A registers its duration through a computed constant (non-literal), comp B
  // right after it registers literals — the old scan walked from A's id into B's
  // attributes and returned B's numbers for A.
  const twoComps = `
    <Composition
      id="CompA"
      component={A}
      durationInFrames={COMPUTED_FRAMES}
      fps={30}
      width={COMPUTED_W}
      height={1080}
    />
    <Composition
      id="CompB"
      component={B}
      durationInFrames={300}
      fps={25}
      width={640}
      height={360}
    />
  `;

  it("should return null for a comp with a non-literal registration instead of a LATER comp's numbers", () => {
    expect(readCompTiming(twoComps, "CompA")).toBeNull();
    expect(readCompDims(twoComps, "CompA")).toBeNull();
    expect(readCompTiming(twoComps, "CompB")).toEqual({ frames: 300, fps: 25 });
    expect(readCompDims(twoComps, "CompB")).toEqual({ width: 640, height: 360 });
  });

  it("should parse a tag regardless of attribute order", () => {
    const reordered = `
      <Composition
        fps={24}
        height={480}
        id="Reordered"
        width={840}
        durationInFrames={120}
      />
    `;
    expect(readCompTiming(reordered, "Reordered")).toEqual({
      frames: 120,
      fps: 24,
    });
    expect(readCompDims(reordered, "Reordered")).toEqual({
      width: 840,
      height: 480,
    });
  });
});
