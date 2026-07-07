import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MAP_TYPES } from "../src/map-types";
import { MAP_PRODUCE_GUARDED_TYPES } from "../src/core/map-produce-conformance";

const KB_DIR = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "knowledge",
  "references",
  "map",
  "types",
);

// KB files use display names; `symbol` renders as "proportional-symbol" — all
// other 6 render ids match their filename 1:1.
const KB_FILENAME: Record<string, string> = {
  symbol: "proportional-symbol.md",
};
const kbFile = (id: string) => KB_FILENAME[id] ?? `${id}.md`;

describe("map-native completeness invariant (reachable ⟹ guarded ∧ KB ref)", () => {
  it("HARD: every reachable MAP_TYPES entry is produce-guarded (no reachable-but-unguarded)", () => {
    for (const id of MAP_TYPES) {
      expect(MAP_PRODUCE_GUARDED_TYPES).toContain(id);
    }
  });

  it("FULL: every reachable MAP_TYPES entry has a KB ref file at repo-root knowledge/references/map/types/", () => {
    for (const id of MAP_TYPES) {
      expect(existsSync(join(KB_DIR, kbFile(id)))).toBe(true);
    }
  });

  // Non-vacuity: all 7 MAP_TYPES are reachable and 0 are deferred (contour is not
  // in MAP_TYPES at all — see map-types.ts), so both loops above run 7 real
  // assertions, not zero. Proven by temporarily filtering MAP_PRODUCE_GUARDED_TYPES
  // down to 6 entries in a throwaway check (not committed) — the HARD assertion
  // failed on the 7th id, confirming the loop actually catches an unguarded type.
  it("is non-vacuous: MAP_TYPES has all 7 reachable types, none deferred", () => {
    expect(MAP_TYPES.length).toBe(7);
    expect([...MAP_TYPES].sort()).toEqual(
      [
        "cartogram",
        "choropleth",
        "dot-density",
        "hex-grid",
        "locator",
        "route",
        "symbol",
      ].sort(),
    );
  });
});
