import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  localeReachViolations,
  staleExemptions,
  type SourceFile,
} from "../../../lib/core/locale-reach";

const SRC = join(import.meta.dir, "..", "src");

/** Diagnostic-only: these strings go into a conformance violation/concern message, never to a
 *  reader. Measured, not assumed — three sites, three exact calls:
 *  core/conformance.ts:211 is `concerns.push(...)` (the local array `checkMarkContrastOnBg`
 *  returns — a downgraded a11y concern, the same shape as `BrandReconciliation.concerns`,
 *  conformance.ts:105-107, distinct from that type's `.violations`); core/conformance.ts:1562
 *  and :1897 are `v.push(...)` onto the violations array `checkGlobalConformance` returns, inside
 *  `checkDivergingStackedConformance` and the heatmap dark-ground ramp check respectively. */
const DIAGNOSTIC_ONLY = ["core/conformance.ts"];

/** THE DEBT. Every entry here paints a number a reader sees, in whatever language the browser's
 *  default happens to be. Task 8 of docs/superpowers/plans/2026-07-29-family-b-what-reaches-the-reader.md
 *  emptied it: all eleven files now route their value labels through `localizeValueLabel`
 *  (lib/core/locale.ts) — ten via a per-function `fmt`/`fmtVal` closure that binds their own
 *  config's `lang`, LorenzChart's Gini legend directly via `localizeNumberString`. An entry that
 *  no longer applies fails `staleExemptions`, so the list cannot rot either. */
const KNOWN_BLIND: string[] = [];

function walk(dir: string, prefix = ""): SourceFile[] {
  const out: SourceFile[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      out.push({ path: rel, source: readFileSync(full, "utf8") });
  }
  return out;
}

const exempt = [...DIAGNOSTIC_ONLY, ...KNOWN_BLIND];

test("no NEW chart-native file paints a number without a locale helper", () => {
  expect(localeReachViolations(walk(SRC), { exempt })).toEqual([]);
});

test("the debt list carries no entry that is already fixed", () => {
  expect(staleExemptions(walk(SRC), { exempt })).toEqual([]);
});
