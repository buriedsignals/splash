// feature-reach.test.ts leaves the limits registry as it found it (registry E15).
//
// Same debt, same instrument, different registry — deliberately mirroring
// publishers-isolation.test.ts rather than inventing a weaker source scan. The damage is only
// observable AFTER the offending file's last hook, which no test inside that file can reach, so
// the proof runs a child `bun test` sandwich: a file that loads the real engine declaration, the
// file under proof, and a file that inspects what survived.
//
// Measured before the fix: `feature-reach.test.ts` cleared the registry in `beforeEach` and
// never restored it. Production registers at IMPORT time (skills/map-native/src/feature-limits.ts
// top level) and an ES module body runs once per process, so the clear was not a slate — it was
// a demolition. `feature-reach.test.ts` + `lib/brain/offer.test.ts` each passed alone and failed
// together IN EITHER ORDER:
//   · reach first  ⇒ its fake `map-native` survived and the real registration threw
//     "already declared" — an import-time error that kills whole files;
//   · reach second ⇒ the real `map-native` was wiped and every test reading a declared limit
//     saw an empty registry.
// That was 5 of the 12 red tests in `lib`, all green in isolation.
//
// WHY THIS IS WORSE THAN AN EMPTY REGISTRY, and why "just re-register" is not the cure here:
// `registerFeatureLimits` THROWS on a second declaration — it has no first-wins escape hatch,
// unlike registerAllPublishers(). A later file therefore cannot recover by re-registering; it
// can only crash. The way back has to be the snapshot.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");
const FEATURE_REACH = join(REPO, "lib", "core", "feature-reach.ts");
/** The file under proof: the one that clears the registry. */
const FEATURE_REACH_TEST = join(REPO, "lib", "core", "feature-reach.test.ts");
/** The real declaration, made as an import-time side effect — the thing that cannot re-run. */
const MAP_NATIVE_LIMITS = join(
  REPO,
  "skills",
  "map-native",
  "src",
  "feature-limits.ts",
);

const LOADS_ENGINE = `
import { it, expect } from "bun:test";
import { featureLimits } from ${JSON.stringify(FEATURE_REACH)};
import ${JSON.stringify(MAP_NATIVE_LIMITS)};

it("loads the engine's real declaration first, as a real run does", () => {
  expect(featureLimits("map-native", "symbol", "interactive").length).toBeGreaterThan(0);
});
`;

// Imports the engine module a SECOND time on purpose. Under Bun's module cache that is a no-op,
// which is exactly the point: a later file cannot re-create a registration the previous file
// destroyed, so if this assertion passes it is because the registry was handed back.
const INSPECTS_AFTER = `
import { it, expect } from "bun:test";
import { featureLimits } from ${JSON.stringify(FEATURE_REACH)};
import ${JSON.stringify(MAP_NATIVE_LIMITS)};

it("still sees the engine's real limits, not a fake left behind by the previous file", () => {
  const limits = featureLimits("map-native", "symbol", "interactive");
  expect(limits.length).toBeGreaterThan(0);
  // Every surviving limit must carry the engine's own measurement, not a test fixture's.
  for (const l of limits) {
    expect(l.measuredBy).not.toContain("zero tabIndex");
    expect(l.measuredBy.trim().length).toBeGreaterThan(0);
  }
});
`;

describe("feature-reach.test.ts leaves the limits registry as it found it", () => {
  it("should let a later file in the same process see the engine's real limits", async () => {
    const dir = mkdtempSync(join(tmpdir(), "feature-reach-isolation-"));
    const loads = join(dir, "a-loads-engine.test.ts");
    const inspects = join(dir, "z-inspects-after.test.ts");
    writeFileSync(loads, LOADS_ENGINE);
    writeFileSync(inspects, INSPECTS_AFTER);

    // Explicit paths, in this order — `bun test` runs the files it is handed in the order it is
    // handed them, which is what makes the sandwich deterministic instead of alphabetical.
    const child = Bun.spawn(
      ["bun", "test", loads, FEATURE_REACH_TEST, inspects],
      { cwd: REPO, stdout: "pipe", stderr: "pipe" },
    );
    try {
      const [code, stderr] = await Promise.all([
        child.exited,
        new Response(child.stderr).text(),
      ]);
      expect(stderr).not.toContain("(fail)");
      expect(code).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
