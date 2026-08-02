import { describe, it, expect } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scrollySpecErrors } from "./manifest";

const scrollyRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("the scrolly CLI does not bypass the validator", () => {
  // Measured twice (spec C §5 D27-d and the chore/motion-narrative-grid grid pass): an
  // `arcBeats` pushed through `bun scripts/produce.mjs` was accepted and then silently
  // dropped — none of the three authored sentences reached the page, the salience walk
  // shipped instead. The rule was never missing: mapNativeConfigErrors validates arcBeats
  // (validate-config.ts:216, :352) and the five incapable types refuse it BY NAME (:411,
  // :499, :623, :742, :875). Only this entry point never asked.
  //
  // UPDATED (map-storyboard-and-video-geography, Task 5 — hex-grid, the last map type to
  // gain arc support): "route" is arc-capable now (see map-arc.ts's ARC_CAPABLE_MAP_TYPES),
  // so this fixture's `role: "context"` no longer trips the by-name capability refusal — it
  // trips the arc's own STRUCTURAL validation instead (an unrecognised role, which also
  // means the plan neither opens on establish nor closes on payoff). The fixture is
  // unchanged; only what it proves is renamed to match what the validator now says.
  it("should refuse an arcBeats plan whose role the arc cannot carry", () => {
    const errors = scrollySpecErrors({
      type: "route",
      title: "T",
      altInsight: "alt",
      source: { name: "S" },
      arcBeats: [{ region: "FR", role: "context", text: "x" }],
    });
    expect(errors.length).toBeGreaterThan(0);
    // Not just "an error happened somewhere" — the refusal must name the actual fault this
    // fixture carries: an unrecognised role.
    expect(errors.join(" ")).toContain(
      'role "context" is not one of establish/build/turn/payoff',
    );
  });

  // Behavioural, not textual: spawns the REAL CLI as a subprocess. A `expect(cli).toContain(...)`
  // over the source text (the prior version of this test) proves a string is present in the
  // file — it stays green even if the call is commented out, since a comment still contains the
  // string. That's not a guard, it's a coincidence. This test only passes if the validator
  // actually ran and actually stopped the build: non-zero exit, the CLI's refusal marker on
  // stderr (not just "it crashed for some other reason"), and no artifact on disk.
  //
  // UPDATED (Task 5 — see the sibling test above): the fault this fixture carries is a
  // malformed role, not an incapable type — "route" honours a claim-arc now.
  it("refuses to build when the CLI is invoked on an arcBeats plan whose role the arc cannot carry", () => {
    const workDir = mkdtempSync(join(tmpdir(), "scrolly-cli-validation-"));
    try {
      const configPath = join(workDir, "config.json");
      const outDir = join(workDir, "out");
      // Otherwise-VALID route config (real basemap, a 2-point route, an insight-length
      // title) — measured: without `arcBeats` this exact object produces zero errors.
      // arcBeats is therefore the SOLE fault; a fixture with unrelated holes (a 1-char
      // title, a missing basemap, no route) would still refuse with arcBeats deleted
      // entirely, and this test would stay green while proving nothing about arcBeats.
      writeFileSync(
        configPath,
        JSON.stringify({
          type: "route",
          title: "Refugee route across three borders",
          altInsight: "alt",
          source: { name: "S" },
          basemap: "world",
          route: [
            [2.35, 48.85],
            [13.4, 52.52],
          ],
          arcBeats: [{ region: "FR", role: "context", text: "x" }],
        }),
      );

      const proc = Bun.spawnSync(
        ["bun", "scripts/produce.mjs", configPath, outDir],
        {
          cwd: scrollyRoot,
          stdout: "pipe",
          stderr: "pipe",
          // Measured: a real refusal returns in 31-37ms (validation runs before any vite
          // work). This bound must stay below bun:test's own per-test timeout (the third
          // `it()` argument below) so IT fires first if validation is ever removed —
          // otherwise the test framework kills the test before the spawn bound does, and
          // the failure reads as a generic test timeout rather than a clean assertion.
          timeout: 4_000,
        },
      );

      expect(proc.exitCode).not.toBe(0);
      const stderr = proc.stderr.toString();
      expect(stderr).toContain("INVALID CONFIG");
      // Not just "the CLI refused something" — the refusal must name the fault this
      // fixture actually carries: an unrecognised role.
      expect(stderr).toContain(
        'role "context" is not one of establish/build/turn/payoff',
      );

      // No artifact of any kind — a refusal must leave nothing behind. produce.mjs only
      // creates outDir AFTER validation passes, so a correctly-refusing CLI never even
      // creates the directory (the sharpest form of "no build output").
      expect(existsSync(outDir)).toBe(false);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  }, 10_000);
});
