// Parity guard (feedback→système): the proportional-symbol SIZE legend must format its
// reference values through the single-sourced `formatLocaleNumber` (src/core/locale.ts),
// never a bare `${s.value}`. This is the same verified-bug class fixed for the choropleth
// legend — a French map shipped bare "17600" instead of the locale-grouped "17 600".
// The bin-legend parity guard (bin-legend-format-parity.test.ts) explicitly scopes OUT the
// symbol size legend ("Symbol/… have no bin legend"), so this test covers that gap.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatLocaleNumber } from "../src/core/locale";

const SRC = join(import.meta.dir, "..", "src", "SymbolMap.tsx");
const NBSP = " "; // U+202F narrow no-break space — the French thousands separator

// Extract the `renderLegend()` body: from its declaration through the end of the
// `el.innerHTML = ...;` statement it feeds. Value FORMATTING happens there (the
// `<text>…${s.value}…</text>` row builder), so scoping the scan here avoids false
// positives from unrelated numeric interpolation elsewhere in the component.
function extractLegendBlock(source: string): string {
  const startIdx = source.indexOf("function renderLegend()");
  if (startIdx === -1)
    throw new Error("no renderLegend() found in SymbolMap.tsx");
  const tail = source.slice(startIdx);
  const assign = tail.match(/innerHTML\s*=\s*(`[\s\S]*?`;|[^;]*;)/);
  if (!assign)
    throw new Error("no innerHTML assignment found in renderLegend()");
  return tail.slice(0, assign.index! + assign[0].length);
}

function usesLocaleFormatter(source: string): {
  ok: boolean;
  hasFormatter: boolean;
  hasBareValue: boolean;
} {
  const block = extractLegendBlock(source);
  const hasFormatter = /formatLocaleNumber\(\s*s\.value/.test(block);
  // A bare `${s.value}` (not wrapped in a formatter call) is the regression.
  const hasBareValue = /\$\{\s*s\.value\s*\}/.test(block);
  return { ok: hasFormatter && !hasBareValue, hasFormatter, hasBareValue };
}

describe("symbol size-legend format parity: reference values grouped via formatLocaleNumber", () => {
  it("SymbolMap legend formats s.value through formatLocaleNumber, never bare", () => {
    const source = readFileSync(SRC, "utf-8");
    const r = usesLocaleFormatter(source);
    expect(r.hasFormatter).toBe(true);
    expect(r.hasBareValue).toBe(false);
    expect(r.ok).toBe(true);
  });

  it("is non-vacuous: fails when the legend renders a bare ${s.value}", () => {
    const source = readFileSync(SRC, "utf-8");
    expect(usesLocaleFormatter(source).ok).toBe(true); // sanity: real source passes
    const regressed = source.replace(
      /formatLocaleNumber\(\s*s\.value,\s*config\.lang\s*\)/g,
      "s.value",
    );
    expect(usesLocaleFormatter(regressed).ok).toBe(false);
  });

  // Output contract: a value like 17600 groups to "17 600" (fr, U+202F) / "17,600" (en).
  it("groups a 17600-scale reference value (the reported bug's values)", () => {
    expect(formatLocaleNumber(17600, "fr")).toBe(`17${NBSP}600`);
    expect(formatLocaleNumber(41500, "fr")).toBe(`41${NBSP}500`);
    expect(formatLocaleNumber(17600, "en")).toBe("17,600");
  });
});
