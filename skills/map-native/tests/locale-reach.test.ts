import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  localeReachViolations,
  staleExemptions,
  type SourceFile,
} from "../../../lib/core/locale-reach";

const SRC = join(import.meta.dir, "..", "src");

/** Diagnostic-only: this string goes into a conformance violation message, never to a reader.
 *  Measured, not assumed — conformance.ts:256 is `v.push(...)` onto the violations array
 *  `checkGlobalMapConformance` returns, inside the symbol-map conformance check. */
const DIAGNOSTIC_ONLY = ["conformance.ts"];

/** THE DEBT. Every entry here paints a number a reader sees, in whatever language the browser's
 *  default happens to be. It must shrink to [] — task 8 of
 *  docs/superpowers/plans/2026-07-29-family-b-what-reaches-the-reader.md empties it. An entry
 *  that no longer applies fails `staleExemptions`, so the list cannot rot either. */
const KNOWN_BLIND: string[] = [
  "cartogram-story.ts",
  "hex-grid-story.ts",
  "dot-density-story.ts",
  "components/CartogramStory.tsx",
  "components/CartogramScrolly.tsx",
  "components/CartogramReveal.tsx",
  "components/HexGridStory.tsx",
  "components/HexGridScrolly.tsx",
  "components/HexGridReveal.tsx",
];

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

test("no NEW map-native file paints a number without a locale helper", () => {
  expect(localeReachViolations(walk(SRC), { exempt })).toEqual([]);
});

test("the debt list carries no entry that is already fixed", () => {
  expect(staleExemptions(walk(SRC), { exempt })).toEqual([]);
});
