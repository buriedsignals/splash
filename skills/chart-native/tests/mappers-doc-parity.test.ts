// skills/chart-native/tests/mappers-doc-parity.test.ts
//
// suggest-chart/SKILL.md enumerates, TWICE and by hand, which native types the engine can
// actually produce — the "mapped native families" sentence and the "`nativeType` uses the
// chart-native keys (…)" list right below it. Both are prose copies of `Object.keys(MAPPERS)`
// (spec-to-config.ts), and until this file nothing compared them.
//
// That prose is not documentation: it is the ONLY thing the model reads when it decides which
// `nativeType` to emit. Drift is silently one-way lossy in both directions —
//   · a type in MAPPERS but missing from the prose is a BUILT, guarded capability never offered
//     (the engine computes it, the chain throws it away);
//   · a type in the prose but missing from MAPPERS is an offer the producer cannot keep — the
//     spec reaches `spec-to-config.ts`, throws `UnsupportedNativeType`, and the run exits
//     `FALLBACK_TO_DW` onto an engine that may not carry the type either.
//
// History that proves the hand-copy is fragile rather than merely theoretical: every type
// productionized since 2026-07 edited these two sentences by hand in the same commit as the
// mapper (`heatmap`, 1b9f2cc1; `dot-strip`, a1cee661; `violin`, 613885ed …). Nothing failed if
// the author forgot. They are in agreement today — 27/27, measured — and this test is what keeps
// that true rather than lucky.
//
// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed before
// results were read; `git checkout --` restored between them):
//   · deleting `, heatmap` from the families sentence → ONLY the families test red, naming
//     "heatmap" in the diff; 3 pass / 1 fail.
//   · adding `` `pictogram` `` to the keys list (an offer MAPPERS cannot keep) → ONLY the keys
//     test red, naming "pictogram"; 3 pass / 1 fail.
//   · rewording the anchor to "The supported native families are **…**" — the edit that would
//     make a naive version of this file pass vacuously forever → 3 fail, led by the non-vacuity
//     test, with the "update the regex, do not delete the guard" message.
//   · writing "bar" instead of "bar/column" in the prose → ONLY the alias test red; 3 pass / 1 fail.
//   · adding a `pictogram` mapper to MAPPERS (the defect note's proposed fix, applied WITHOUT
//     touching the prose) → both parity tests red, naming "pictogram" on the MAPPERS side.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAPPERS } from "../src/spec-to-config";

const SKILL_MD = join(import.meta.dir, "..", "..", "suggest-chart", "SKILL.md");

// The ONE deliberate difference between the two vocabularies: the families sentence writes the
// render key `bar` as "bar/column" (the FT vocabulary calls the vertical form a column chart;
// `orientation` is a spec field, not a second mapper). Asserted below to be genuinely needed, so
// this alias cannot quietly become a licence to swallow a real mismatch.
const PROSE_ALIAS: Record<string, string> = { "bar/column": "bar" };

const md = readFileSync(SKILL_MD, "utf8");

/** The bolded "The mapped native families are **…**" sentence, comma-split. */
function proseFamilies(): string[] {
  const m = md.match(/The mapped native families are \*\*([\s\S]*?)\*\*/);
  // A regex that stopped matching (the sentence reworded, the file moved) would make every
  // comparison below iterate an empty set and pass vacuously — the exact failure mode this
  // file exists to prevent one level up. Fail loudly instead.
  expect(
    m,
    "suggest-chart/SKILL.md no longer contains the 'The mapped native families are **…**' " +
      "sentence this guard reads. If it was reworded, update the regex — do not delete the guard.",
  ).not.toBeNull();
  return m![1]
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .map((s) => PROSE_ALIAS[s] ?? s);
}

/** The backticked ids in "`nativeType` uses the chart-native keys (`bar`, `line`, …);". */
function proseKeys(): string[] {
  const m = md.match(/`nativeType` uses the chart-native keys \(([\s\S]*?)\);/);
  expect(
    m,
    "suggest-chart/SKILL.md no longer contains the '`nativeType` uses the chart-native keys (…)' " +
      "list this guard reads. If it was reworded, update the regex — do not delete the guard.",
  ).not.toBeNull();
  return [...m![1].matchAll(/`([a-z-]+)`/g)].map((x) => x[1]);
}

const sorted = (a: readonly string[]) => [...a].sort();

describe("suggest-chart's prose list of native types == MAPPERS (both directions)", () => {
  const mappers = sorted(Object.keys(MAPPERS));

  it("scans a real, non-empty set on both sides (never passes vacuously)", () => {
    expect(mappers.length).toBeGreaterThan(0);
    expect(proseFamilies().length).toBeGreaterThan(0);
    expect(proseKeys().length).toBeGreaterThan(0);
  });

  it("the 'mapped native families' sentence names exactly the types MAPPERS carries", () => {
    // toEqual on two sorted arrays, not a per-item loop: the diff bun prints IS the answer to
    // "which type drifted, and which way".
    expect(sorted(proseFamilies())).toEqual(mappers);
  });

  it("the '`nativeType` uses the chart-native keys' list names exactly the types MAPPERS carries", () => {
    expect(sorted(proseKeys())).toEqual(mappers);
  });

  it("the bar/column alias is still earned (it never silently absorbs a real mismatch)", () => {
    // If the prose stops writing "bar/column", this alias becomes dead code that could later
    // paper over a genuine rename. Pin it to the fact it encodes.
    const raw = md.match(
      /The mapped native families are \*\*([\s\S]*?)\*\*/,
    )![1];
    for (const alias of Object.keys(PROSE_ALIAS)) {
      expect(
        raw.includes(alias),
        `PROSE_ALIAS maps "${alias}" but the prose no longer writes it — drop the alias entry ` +
          `rather than leaving a rule that can only ever hide a mismatch.`,
      ).toBe(true);
    }
  });
});

// HONEST CEILING: this compares the SET of type ids, nothing else. It cannot tell whether the
// prose DESCRIBES each type correctly (per-type CSV shapes live in
// knowledge/references/chart-selection.md's catalogue and are a separate surface), nor whether a
// type the KB models is a good editorial choice. Set parity is the mechanical half; the semantic
// half stays with review.
