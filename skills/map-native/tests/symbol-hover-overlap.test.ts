// Regression guard (feedback→système) for the proportional-symbol OVERLAP HOVER bug:
// on a symbol map where circles overlap, only the front (largest) circle used to be
// hoverable — smaller circles nested behind it were unreachable (their popup was
// occluded). Two coupled invariants in SymbolMap.tsx fix and must never silently
// regress; a browser can't run in `bun run check`, so this source-scan locks both:
//
//   1. Z-ORDER — smaller circles draw ON TOP via a `circle-sort-key` that negates the
//      radius (source-array order does NOT control a MapLibre circle layer's z-order),
//      so a nested small circle stays visible AND hoverable.
//   2. HOVER HIT-TEST — the popup handler uses `mousemove` (re-picks as the pointer
//      sweeps the cluster) and `nearestSymbolIndex` (picks the feature whose CENTRE is
//      nearest the pointer), NOT the old `mouseenter` + `e.features[0]` that returned
//      the topmost/front feature and never re-picked within the layer.
//
// Verified live with Playwright at fix time: before = 2/6 delta cities reachable, after
// = 6/6 (every overlapping city surfaces its own popup). See symbol-geo.test.ts for the
// pure `nearestSymbolIndex` behavioural coverage.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SYMBOL_MAP = join(import.meta.dir, "..", "src", "SymbolMap.tsx");
const source = readFileSync(SYMBOL_MAP, "utf-8");

// Small-on-top: a circle-sort-key that negates the radius (small radius → higher key →
// drawn above). Tolerant of whitespace; the negation must reference the radius property.
const SORT_KEY_SMALL_ON_TOP =
  /"circle-sort-key"\s*:\s*\[\s*"\*"\s*,\s*-1\s*,\s*\[\s*"get"\s*,\s*"radius"\s*\]\s*\]/;

// Overlap-robust hover: mousemove on the symbol layer + nearest-centre pick.
const MOUSEMOVE_ON_SYMBOLS = /map\.on\(\s*"mousemove"\s*,\s*"symbol-circles"/;
const USES_NEAREST_CENTRE = /nearestSymbolIndex\s*\(/;

describe("symbol overlap hover: SymbolMap keeps every overlapping circle reachable", () => {
  it("draws smaller circles on top via a radius-negating circle-sort-key", () => {
    expect(SORT_KEY_SMALL_ON_TOP.test(source)).toBe(true);
  });

  it("hovers via mousemove (re-picks within the cluster), not mouseenter", () => {
    expect(MOUSEMOVE_ON_SYMBOLS.test(source)).toBe(true);
    // The old occluding pattern must be gone: a mouseenter handler on symbol-circles.
    expect(/map\.on\(\s*"mouseenter"\s*,\s*"symbol-circles"/.test(source)).toBe(
      false,
    );
  });

  it("picks the nearest-centre feature under the pointer, not features[0]", () => {
    expect(USES_NEAREST_CENTRE.test(source)).toBe(true);
  });

  // Non-vacuity: prove each assertion discriminates against the exact pre-fix shape.
  it("is non-vacuous: fails if the sort-key is dropped (largest occludes again)", () => {
    expect(SORT_KEY_SMALL_ON_TOP.test(source)).toBe(true); // sanity: real source passes
    const noSortKey = source.replace(
      SORT_KEY_SMALL_ON_TOP,
      '"circle-sort-key": 0',
    );
    expect(SORT_KEY_SMALL_ON_TOP.test(noSortKey)).toBe(false);
  });

  it("is non-vacuous: fails if the hover reverts to mouseenter + features[0]", () => {
    const reverted = source
      .replace(MOUSEMOVE_ON_SYMBOLS, 'map.on("mouseenter", "symbol-circles"')
      .replace(USES_NEAREST_CENTRE, "pickFirst(");
    expect(MOUSEMOVE_ON_SYMBOLS.test(reverted)).toBe(false);
    expect(USES_NEAREST_CENTRE.test(reverted)).toBe(false);
  });
});
