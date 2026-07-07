// Parity guard (feedback→système, Task 8): every bin-legend renderer must format its
// breakpoints through the single-sourced `fmtBin` (src/core/legend-format.ts) — never
// `Math.round`, which collapses fractional bins to indistinct integers (e.g. boundaries
// 0, 0.02, 0.04 all print "0"). This is the exact class Task 1/2 fixed by extracting
// `fmtBin` out of the previously-duplicated inline `fmt` in HexGridMap/CartogramMap and
// threading it (with `minGap`) into ChoroplethMap + its 3 video/scrolly siblings.
//
// Scope: the 6 renderers that build a bin-scale legend — ChoroplethMap, HexGridMap,
// CartogramMap (static/interactive) + ChoroplethStory/Reveal/Scrolly (video/scrolly,
// which now render the legend per Task 5). Symbol/Locator/DotDensity/Route have no bin
// legend (size legend or none) and are out of scope for this check.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");

const BIN_LEGEND_RENDERERS: Record<string, string> = {
  ChoroplethMap: join(SRC_DIR, "ChoroplethMap.tsx"),
  HexGridMap: join(SRC_DIR, "HexGridMap.tsx"),
  CartogramMap: join(SRC_DIR, "CartogramMap.tsx"),
  ChoroplethStory: join(SRC_DIR, "components", "ChoroplethStory.tsx"),
  ChoroplethReveal: join(SRC_DIR, "components", "ChoroplethReveal.tsx"),
  ChoroplethScrolly: join(SRC_DIR, "components", "ChoroplethScrolly.tsx"),
};

// Extract the legend-building block: from the "Legend —" comment marker through the end
// of the `innerHTML = ...;` assignment statement it feeds. This is where breakpoint
// FORMATTING happens (the bins.map(...) that stringifies b.min/b.max) — scoping the scan
// here (rather than the whole file) avoids false positives from unrelated Math.round use
// elsewhere in the same file (e.g. video timing frames, frame gutters).
function extractLegendBlock(source: string): string {
  const startIdx = source.indexOf("Legend —");
  if (startIdx === -1) {
    throw new Error("no 'Legend —' marker found in source");
  }
  const tail = source.slice(startIdx);
  const assign = tail.match(/innerHTML\s*=\s*(`[\s\S]*?`;|[^;]*;)/);
  if (!assign) {
    throw new Error("no innerHTML assignment found after the Legend marker");
  }
  return tail.slice(0, assign.index! + assign[0].length);
}

function usesFmtBinNotMathRound(source: string): {
  ok: boolean;
  hasFmtBin: boolean;
  hasMathRound: boolean;
} {
  const block = extractLegendBlock(source);
  const hasFmtBin = /fmtBin\(/.test(block);
  const hasMathRound = /Math\.round\(/.test(block);
  return { ok: hasFmtBin && !hasMathRound, hasFmtBin, hasMathRound };
}

describe("bin-legend format parity: every bin legend formats breakpoints via fmtBin, never Math.round", () => {
  for (const [name, path] of Object.entries(BIN_LEGEND_RENDERERS)) {
    it(`${name} legend block uses fmtBin and never Math.round on breakpoints`, () => {
      const source = readFileSync(path, "utf-8");
      const result = usesFmtBinNotMathRound(source);
      expect(result.hasFmtBin).toBe(true);
      expect(result.hasMathRound).toBe(false);
      expect(result.ok).toBe(true);
    });
  }

  // Non-vacuity: prove the assertion actually discriminates. Simulate the pre-fix inline
  // `fmt` (the duplicated Math.round-based formatter that HexGridMap/CartogramMap had
  // before Task 1 extracted fmtBin) by swapping fmtBin(...) calls for Math.round(...) in
  // a real, currently-passing source file.
  it("is non-vacuous: fails when a legend block swaps fmtBin for Math.round", () => {
    const source = readFileSync(BIN_LEGEND_RENDERERS.ChoroplethMap, "utf-8");
    expect(usesFmtBinNotMathRound(source).ok).toBe(true); // sanity: real source passes

    const regressed = source.replace(
      /fmtBin\(b\.min, \{ minGap \}\)/g,
      "Math.round(b.min)",
    );
    expect(usesFmtBinNotMathRound(regressed).ok).toBe(false);
  });
});
