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
  it("should refuse an arcBeats plan on a type that cannot carry one", () => {
    const errors = scrollySpecErrors({
      type: "route",
      title: "T",
      altInsight: "alt",
      source: { name: "S" },
      arcBeats: [{ region: "FR", role: "context", text: "x" }],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toContain("arcBeats");
  });

  // Behavioural, not textual: spawns the REAL CLI as a subprocess. A `expect(cli).toContain(...)`
  // over the source text (the prior version of this test) proves a string is present in the
  // file — it stays green even if the call is commented out, since a comment still contains the
  // string. That's not a guard, it's a coincidence. This test only passes if the validator
  // actually ran and actually stopped the build: non-zero exit, the CLI's refusal marker on
  // stderr (not just "it crashed for some other reason"), and no artifact on disk.
  it("refuses to build when the CLI is invoked on an arcBeats plan the type cannot carry", () => {
    const workDir = mkdtempSync(join(tmpdir(), "scrolly-cli-validation-"));
    try {
      const configPath = join(workDir, "config.json");
      const outDir = join(workDir, "out");
      writeFileSync(
        configPath,
        JSON.stringify({
          type: "route",
          title: "T",
          altInsight: "alt",
          source: { name: "S" },
          arcBeats: [{ region: "FR", role: "context", text: "x" }],
        }),
      );

      const proc = Bun.spawnSync(
        ["bun", "scripts/produce.mjs", configPath, outDir],
        {
          cwd: scrollyRoot,
          stdout: "pipe",
          stderr: "pipe",
          // A refusal exits before any vite build work, so it returns in well under a
          // second. If validation is ever removed, the build would run for many seconds —
          // this bound turns "hangs for the length of a vite build" into a hard failure
          // instead of a slow test.
          timeout: 15_000,
        },
      );

      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toContain("INVALID CONFIG");

      // No artifact of any kind — a refusal must leave nothing behind. produce.mjs only
      // creates outDir AFTER validation passes, so a correctly-refusing CLI never even
      // creates the directory (the sharpest form of "no build output").
      expect(existsSync(outDir)).toBe(false);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
