// Parity guard (feedback→système, Task 8): every on-map direct label (symbol/locator,
// static+interactive+video+scrolly) MUST derive its text size from the single-sourced
// `labelTextSize(width)` (src/core/map-format.ts) — never a hardcoded `13`/`18` literal.
// This is bug #8: SymbolMap/LocatorMap used to hardcode `text-size: 13` regardless of
// canvas width, while the video/scrolly siblings already had the narrow-canvas bump
// inline; Task 1 single-sourced it into `labelTextSize` and threaded it into ALL 8
// renderers (2 static/interactive + 6 video/scrolly for symbol+locator).
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");

const LABEL_SIZE_RENDERERS: Record<string, string> = {
  "SymbolMap (static, !interactive)": join(SRC_DIR, "SymbolMap.tsx"),
  "LocatorMap (static, !interactive)": join(SRC_DIR, "LocatorMap.tsx"),
  "SymbolReveal (video, simple-reveal)": join(
    SRC_DIR,
    "components",
    "SymbolReveal.tsx",
  ),
  "SymbolStory (video, guided-tour)": join(
    SRC_DIR,
    "components",
    "SymbolStory.tsx",
  ),
  "SymbolScrolly (scrolly-as-video)": join(
    SRC_DIR,
    "components",
    "SymbolScrolly.tsx",
  ),
  "LocatorReveal (video, simple-reveal)": join(
    SRC_DIR,
    "components",
    "LocatorReveal.tsx",
  ),
  "LocatorStory (video, guided-tour)": join(
    SRC_DIR,
    "components",
    "LocatorStory.tsx",
  ),
  "LocatorScrolly (scrolly-as-video)": join(
    SRC_DIR,
    "components",
    "LocatorScrolly.tsx",
  ),
};

// Genuine consumption: imports labelTextSize from the single source, calls it to derive
// the on-map text size, and feeds that derived value (not a numeric literal) into the
// MapLibre "text-size" paint property.
function consumesLabelTextSize(source: string): boolean {
  const importsIt =
    /import\s*\{[^}]*\blabelTextSize\b[^}]*\}\s*from\s*["'][^"']*core\/map-format["']/.test(
      source,
    );
  const callMatch = source.match(/const\s+(\w+)\s*=\s*labelTextSize\(/);
  if (!importsIt || !callMatch) return false;
  const varName = callMatch[1];
  // "text-size" must read the derived variable, not a hardcoded literal like 13 or 18.
  const textSizeUse = new RegExp(`"text-size":\\s*${varName}\\b`);
  return textSizeUse.test(source);
}

describe("labelTextSize parity: every symbol/locator renderer derives on-map label size from labelTextSize, not a hardcoded literal", () => {
  for (const [name, path] of Object.entries(LABEL_SIZE_RENDERERS)) {
    it(`${name} feeds "text-size" from labelTextSize(width)`, () => {
      const source = readFileSync(path, "utf-8");
      expect(consumesLabelTextSize(source)).toBe(true);
    });
  }

  // Non-vacuity: prove the assertion actually discriminates. Simulate the pre-fix
  // SymbolMap/LocatorMap shape (bug #8 — hardcoded `"text-size": 13` regardless of
  // canvas width) by replacing the derived-variable use with a numeric literal in a
  // real, currently-passing source file.
  it("is non-vacuous: fails when text-size is hardcoded instead of derived", () => {
    const source = readFileSync(
      LABEL_SIZE_RENDERERS["SymbolMap (static, !interactive)"],
      "utf-8",
    );
    expect(consumesLabelTextSize(source)).toBe(true); // sanity: real source passes

    const hardcoded = source.replace(
      /"text-size":\s*textSize\b/,
      '"text-size": 13',
    );
    expect(consumesLabelTextSize(hardcoded)).toBe(false);

    const importStripped = source.replace(
      /import\s*\{[^}]*\blabelTextSize\b[^}]*\}\s*from\s*["'][^"']*core\/map-format["'];?\n?/,
      "",
    );
    expect(consumesLabelTextSize(importStripped)).toBe(false);
  });
});
