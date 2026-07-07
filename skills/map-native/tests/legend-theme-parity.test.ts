// Parity guard (feedback→système): every STATIC/INTERACTIVE map renderer that draws a
// legend panel MUST consume the single-sourced `legendTheme` (src/theme/legend-theme.ts)
// — never re-derive/inline the legend panel's ink/sub/bg/stroke colours locally. RouteMap
// was the one legend-bearing component the original legend-theme migration skipped (its
// inlined values happened to be byte-identical to legendTheme(dark) at the time, but that
// is a coincidence that can silently drift on the next edit). This test mechanically
// catches that drift class for ALL 7 static/interactive legend-bearing renderers, for
// good.
//
// Scope: ONLY the 7 `*Map.tsx` components (static/interactive) — mirrors
// resolve-map-style-parity.test.ts. The video/scrolly components under `src/components/`
// (*Story/*Reveal/*Scrolly) are a known, separate, deferred dark-video follow-up and are
// out of scope here.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");

// All 7 static/interactive renderers render an on-map legend panel (swatch + label list).
const LEGEND_BEARING_RENDERERS: Record<string, string> = {
  ChoroplethMap: join(SRC_DIR, "ChoroplethMap.tsx"),
  SymbolMap: join(SRC_DIR, "SymbolMap.tsx"),
  RouteMap: join(SRC_DIR, "RouteMap.tsx"),
  LocatorMap: join(SRC_DIR, "LocatorMap.tsx"),
  DotDensityMap: join(SRC_DIR, "DotDensityMap.tsx"),
  HexGridMap: join(SRC_DIR, "HexGridMap.tsx"),
  CartogramMap: join(SRC_DIR, "CartogramMap.tsx"),
};

// A genuine consumption: imports legendTheme from the single source AND actually calls
// it (not just an unused import) to derive the legend panel colours — the same shape a
// component would have if it inlined `rgba(24,24,27,0.88)` / `#444` literals instead.
function consumesLegendTheme(source: string): boolean {
  return (
    /import\s*\{[^}]*\blegendTheme\b[^}]*\}\s*from\s*["']\.\/theme\/legend-theme["']/.test(
      source,
    ) && /legendTheme\(\s*dark\s*\)/.test(source)
  );
}

describe("legendTheme-consumption parity: every legend-bearing map renderer honors the legend theme via the single source", () => {
  for (const [name, path] of Object.entries(LEGEND_BEARING_RENDERERS)) {
    it(`${name} imports and calls legendTheme(dark)`, () => {
      const source = readFileSync(path, "utf-8");
      expect(consumesLegendTheme(source)).toBe(true);
    });
  }

  // Non-vacuity: prove the assertion actually discriminates. Simulate a renderer that
  // dropped legendTheme and re-inlined the legend-panel literal (the exact pre-fix shape
  // of RouteMap before this lot — see .superpowers/sdd/cleanup-report.md), on a real,
  // currently-passing source file.
  it("is non-vacuous: fails when a renderer drops legendTheme and re-inlines the legend-panel literal", () => {
    const source = readFileSync(LEGEND_BEARING_RENDERERS.RouteMap, "utf-8");
    expect(consumesLegendTheme(source)).toBe(true); // sanity: real source passes

    const importStripped = source.replace(
      /import\s*\{[^}]*\blegendTheme\b[^}]*\}\s*from\s*["']\.\/theme\/legend-theme["'];?\n?/,
      "",
    );
    expect(consumesLegendTheme(importStripped)).toBe(false);

    // Drop the `const theme = legendTheme(dark);` call and re-inline the literal values
    // it replaced (the exact pre-fix RouteMap shape) — must still be caught.
    const reinlined = source
      .replace(/const theme = legendTheme\(\s*dark\s*\);\n/, "")
      .replace(/theme\.ink/g, '(dark ? "#f4f4f5" : "#444")')
      .replace(/theme\.sub/g, '(dark ? "#c8c8cf" : "#555")')
      .replace(/theme\.stroke/g, '"rgba(0,0,0,.15)"')
      .replace(
        /theme\.bg/g,
        '(dark ? "rgba(24,24,27,0.88)" : "rgba(255,255,255,0.92)")',
      );
    expect(consumesLegendTheme(reinlined)).toBe(false);
  });
});
