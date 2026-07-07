import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MAP_TYPES } from "../src/map-types";
import {
  runProduceMapConformance,
  RAMP_TYPES,
} from "../src/core/map-produce-conformance";

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

// Clean, furniture-only config shared across all 7 types by the HARD test below. No
// `palette`/`scaleType` field: for the 3 ramp types (choropleth/hex-grid/cartogram) this
// exercises `resolvePalette(scaleType, undefined)` → the default vetted ramp, which is
// itself CVD-safe — so a furniture-only config is expected to pass for every type.
const cleanFurniture = {
  title: "A perfectly legitimate descriptive map title",
  description: "A one-line description of what the map shows.",
  source: { name: "Some Agency", url: "https://example.org/data" },
};

describe("map-native completeness invariant (reachable ⟹ guarded ∧ KB ref)", () => {
  // NOTE: `MAP_PRODUCE_GUARDED_TYPES` is currently defined as `= MAP_TYPES` (the same
  // array reference, see map-produce-conformance.ts:35) — asserting `MAP_TYPES ⊆
  // MAP_PRODUCE_GUARDED_TYPES` would be `A ⊆ A`, a tautology that can never fail even if a
  // type were added to MAP_TYPES without ever wiring its guard. Instead this test calls
  // the guard's actual dispatch (`runProduceMapConformance`) per type: a type is genuinely
  // "guarded" iff a clean config passes (checked:true, no violations) AND a broken config
  // is caught (checked:true, ≥1 violation). This is non-vacuous — a type that fell through
  // to `{checked:false}` (no guard wired), or a no-op guard that never flags anything,
  // both fail here. See the RED/GREEN proof in task-5-report.md.
  it("HARD: every reachable MAP_TYPES entry is genuinely produce-guarded (clean passes, broken fails)", () => {
    for (const id of MAP_TYPES) {
      const clean = runProduceMapConformance(id, { ...cleanFurniture });
      expect(clean.checked).toBe(true);
      expect(clean.violations).toEqual([]);

      const broken = runProduceMapConformance(id, {
        ...cleanFurniture,
        source: undefined,
      });
      expect(broken.checked).toBe(true);
      expect(broken.violations.length).toBeGreaterThan(0);
    }
  });

  it("FULL: every reachable MAP_TYPES entry has a KB ref file at repo-root knowledge/references/map/types/", () => {
    for (const id of MAP_TYPES) {
      expect(existsSync(join(KB_DIR, kbFile(id)))).toBe(true);
    }
  });

  // Non-vacuity: all 7 MAP_TYPES are reachable and 0 are deferred (contour is not
  // in MAP_TYPES at all — see map-types.ts), so both loops above run 7 real
  // assertions, not zero. Proven by temporarily breaking the HARD test in ways the old
  // array-identity assertion couldn't catch (e.g. dropping `source` from `cleanFurniture`
  // so the "clean" branch fails, or stubbing `runProduceMapConformance` to always return
  // `{checked:false}` for one type) — both turned the HARD test RED; reverted before
  // commit. See task-5-report.md for the transcript.
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

  // Sibling to the HARD test above, scoped to the ramp-driven subset: guarantees a
  // future ramp type added to RAMP_TYPES without CVD wiring would fail here — the
  // invariant the plain furniture HARD test doesn't cover (a clean, palette-less
  // config passes CVD trivially by resolving the vetted default ramp; it never
  // exercises the custom-palette branch of `checkPaletteConformance`).
  it("HARD: every RAMP_TYPES entry is reachable and rejects a non-CVD-safe custom palette", () => {
    for (const id of RAMP_TYPES) {
      expect((MAP_TYPES as readonly string[]).includes(id)).toBe(true);

      const result = runProduceMapConformance(id, {
        ...cleanFurniture,
        palette: ["#ff0000", "#00ff00", "#0000ff"],
      });
      expect(result.checked).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some((v) => /palette/i.test(v))).toBe(true);
    }
  });
});
