// skills/chart-native/tests/completeness.test.ts
import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NATIVE_TYPES, LEGACY_KB_FAMILY_BACKFILL } from "../src/native-types";
import { MAPPERS } from "../src/spec-to-config";
import { PRODUCE_GUARDED_TYPES } from "../src/core/produce-conformance";

const KB_DIR = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "knowledge",
  "references",
  "chart",
  "types",
);

// KB files use display names; render ids differ for a few types.
const KB_FILENAME: Record<string, string> = {
  grouped: "grouped-bar.md",
  stacked: "stacked-bar.md",
  diverging: "diverging-bar.md",
  pyramid: "population-pyramid.md",
};
const kbFile = (id: string) => KB_FILENAME[id] ?? `${id}.md`;

describe("native engine completeness invariant (chart-native local half)", () => {
  it("HARD: every reachable type is conformance-guarded (no reachable-but-unguarded)", () => {
    for (const id of Object.keys(MAPPERS)) {
      expect(PRODUCE_GUARDED_TYPES).toContain(id);
    }
  });

  it("FULL(local): a non-deferred, non-legacy type has a mapper, a guard, and a KB ref", () => {
    for (const e of NATIVE_TYPES) {
      if (e.deferred || LEGACY_KB_FAMILY_BACKFILL.includes(e.id)) continue;
      expect(Object.keys(MAPPERS)).toContain(e.id);
      expect(PRODUCE_GUARDED_TYPES).toContain(e.id);
      expect(existsSync(join(KB_DIR, kbFile(e.id)))).toBe(true);
    }
  });

  // The INVERSE of the test above, which was missing: that one reads "non-deferred ⇒ has a
  // mapper" and says nothing about a DEFERRED type that has one anyway. Both halves are
  // journalist-visible defects, and they are visible in opposite places:
  //   · non-deferred with no mapper → the splash gate ACCEPTS the proposal (validate-gate.ts's
  //     deferredTypeError only refuses declared-deferred ids), the spec reaches
  //     spec-to-config.ts, throws UnsupportedNativeType, and the run exits FALLBACK_TO_DW;
  //   · deferred WITH a mapper → the reverse: the engine can render it (and, by the HARD test
  //     at the top of this file, is conformance-guarded for it), but validateAccepted refuses
  //     the proposal by name — "is not an offerable chart-native type: <reason>". A built,
  //     guarded, invisible capability. The honest repair for that state is to UN-DEFER the type
  //     (it has earned reachability), not to delete its mapper.
  // This is not an invented rule: native-types.ts:7-8 defines `deferred` as "a type NOT expected
  // to be reachable+guarded yet", and MAPPERS-key ⇒ guarded is already asserted above — so a
  // deferred key in MAPPERS contradicts the registry's own stated semantics.
  // Scoped to chart-native ON PURPOSE: dw-chart's and map-dw's manifests use the word `deferred`
  // for a DIFFERENT fact ("the KB does not curate this engine surface, but it stays producible
  // if asked for by name" — dw-chart/src/manifest.ts:18-20), so this invariant must not be
  // generalized across engines.
  // MUTATION-VERIFIED: adding `pictogram(parsed, spec) { return MAPPERS.waffle(...) }` to
  // MAPPERS — precisely the fix docs/splash/defect-2026-08-07-…md proposed as its option 1 —
  // reddened this test alone with the type named and the reason quoted back; reverting restored
  // green. (The pre-existing HARD test also fires, because that mapper is not in
  // PRODUCE_GUARDED_TYPES; adding the guard entry too silences HARD and leaves this one red,
  // which is the state that matters.)
  it("no DEFERRED type carries a mapper (a built, guarded type the gate refuses by name)", () => {
    const mapped = new Set(Object.keys(MAPPERS));
    for (const e of NATIVE_TYPES) {
      if (!e.deferred) continue;
      expect(
        mapped.has(e.id),
        `"${e.id}" is declared deferred ("${e.deferred}") yet MAPPERS carries it: the engine ` +
          `renders it (and, per the HARD invariant above, must be conformance-guarded for it), ` +
          `but skills/splash's gate refuses any proposal naming it, so no journalist can ever ` +
          `reach it. Drop the \`deferred\` reason ` +
          `if the type is ready (and give it a KB ref + native-family entry), or drop the mapper.`,
      ).toBe(false);
    }
  });

  // MUTATION-VERIFIED, and this is the mutation that shows the test is not redundant with the
  // two above: adding an EXTRA alias mapper (`violinchart` delegating to `violin`) plus its
  // PRODUCE_GUARDED_TYPES entry, while leaving the real `violin` intact, left HARD and FULL
  // green — 4 pass — and reddened only this test, naming "violinchart". (The cruder mutation,
  // RENAMING `violin` to `violinplot`, also trips FULL, since the registry then has a type with
  // no mapper; that one does not prove uniqueness, the alias one does.)
  it("every MAPPERS key is a declared NATIVE_TYPES id", () => {
    // A mapper for an id the registry never declares is unreachable a third way: the offer
    // surface (suggest-chart's eval, score.ts:204) filters candidates through NATIVE_TYPES, and
    // REMOTION_PREFIX/mount.tsx are keyed off it too — an id known only to MAPPERS is a mapper
    // nothing can name.
    const declared = new Set(NATIVE_TYPES.map((e) => e.id));
    for (const id of Object.keys(MAPPERS)) {
      expect(
        declared.has(id),
        `MAPPERS has a key "${id}" that no NATIVE_TYPES entry declares`,
      ).toBe(true);
    }
  });

  it("legacy backfill list only holds reachable+guarded types and never grows past four", () => {
    expect(LEGACY_KB_FAMILY_BACKFILL.length).toBeLessThanOrEqual(4);
    for (const id of LEGACY_KB_FAMILY_BACKFILL) {
      expect(Object.keys(MAPPERS)).toContain(id);
      expect(PRODUCE_GUARDED_TYPES).toContain(id);
    }
  });
});
