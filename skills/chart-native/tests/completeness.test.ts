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

  it("legacy backfill list only holds reachable+guarded types and never grows past four", () => {
    expect(LEGACY_KB_FAMILY_BACKFILL.length).toBeLessThanOrEqual(4);
    for (const id of LEGACY_KB_FAMILY_BACKFILL) {
      expect(Object.keys(MAPPERS)).toContain(id);
      expect(PRODUCE_GUARDED_TYPES).toContain(id);
    }
  });
});
