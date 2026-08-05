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
  // UPDATED (Fix E1 — map-track type refusal reaches this validator now): the fixture used
  // to be a "route" config, which was arc-capable at map-native's own gate (see map-arc.ts's
  // ARC_CAPABLE_MAP_TYPES) so it proved the arc's STRUCTURAL validation ran (an unrecognised
  // role). But scrollySpecErrors now refuses "route" BY NAME before any content validation —
  // scrolly has no branch to walk it (MAP_SCROLLY_TYPES has six entries, not seven; see
  // scrolly-types.ts's unsupportedMapScrollyType) — so a route fixture no longer reaches the
  // role check at all. Switched to a hosted type ("choropleth") so this test still proves
  // what it names: an arcBeats plan's role is validated through this CLI's validator.
  it("should refuse an arcBeats plan whose role the arc cannot carry", () => {
    const errors = scrollySpecErrors({
      type: "choropleth",
      title: "Renewables share across Europe",
      basemap: "world",
      regionKey: "code",
      valueField: "value",
      rows: [
        { code: "FRA", value: 10 },
        { code: "DEU", value: 20 },
      ],
      source: { name: "S" },
      arcBeats: [{ region: "FRA", role: "context", text: "x" }],
    });
    expect(errors.length).toBeGreaterThan(0);
    // Not just "an error happened somewhere" — the refusal must name the actual fault this
    // fixture carries: an unrecognised role.
    expect(errors.join(" ")).toContain(
      'role "context" is not one of establish/build/turn/payoff',
    );
  });

  // Fix E1: scrollySpecErrors used to fall straight through to mapNativeConfigErrors for
  // ANY map `type`, never checking whether scrolly itself hosts it. A well-formed "route"
  // config validates fine at map-native's own gate (arc-capable, structurally valid arcBeats)
  // — so this returned ZERO errors for a spec the editorial gate (validate-gate.ts) and the
  // V2 assembler (lib/loop/assemble/scrolly.ts) both already refuse, contradicting this
  // file's own produce.mjs comment that "the CLI and the spine refuse identically". Measured
  // before the fix: this exact well-formed route+arcBeats object produced zero errors here.
  // ★ INVERTED 2026-08-04 — these two tests pinned the ABSENCE of a route scrolly, and they were
  // right to: `scrollySpecErrors` had to refuse the type outright, because nothing downstream
  // could walk it. ScrollyRouteMap.tsx is that renderer, so the refusal is gone and what has to
  // be pinned now is the opposite: a well-formed route spec VALIDATES, and the walk it carries
  // is not silently ignored.
  it('accepts a "route" map track — ScrollyRouteMap walks it', () => {
    const errors = scrollySpecErrors({
      type: "route",
      title: "Refugee route across three borders",
      altInsight: "alt",
      source: { name: "S" },
      basemap: "world",
      route: [
        [2.35, 48.85],
        [13.4, 52.52],
      ],
    });
    expect(errors.join(" ")).not.toContain("does not exist yet");
  });

  // Behavioural, not textual: spawns the REAL CLI as a subprocess. A `expect(cli).toContain(...)`
  // over the source text (the prior version of this test) proves a string is present in the
  // file — it stays green even if the call is commented out, since a comment still contains the
  // string. That's not a guard, it's a coincidence. This test only passes if the validator
  // actually ran and actually stopped the build: non-zero exit, the CLI's refusal marker on
  // stderr (not just "it crashed for some other reason"), and no artifact on disk.
  //
  // UPDATED (Fix E1 — see the sibling test above): switched from "route" to a hosted type
  // ("choropleth") for the same reason — scrollySpecErrors now refuses "route" BY NAME
  // before arcBeats content validation ever runs, so a route fixture no longer proves
  // anything about the role check.
  it("refuses to build when the CLI is invoked on an arcBeats plan whose role the arc cannot carry", () => {
    const workDir = mkdtempSync(join(tmpdir(), "scrolly-cli-validation-"));
    try {
      const configPath = join(workDir, "config.json");
      const outDir = join(workDir, "out");
      // Otherwise-VALID choropleth config — measured: without `arcBeats` this exact object
      // produces zero errors. arcBeats is therefore the SOLE fault; a fixture with unrelated
      // holes (a 1-char title, a missing basemap, no rows) would still refuse with arcBeats
      // deleted entirely, and this test would stay green while proving nothing about arcBeats.
      writeFileSync(
        configPath,
        JSON.stringify({
          type: "choropleth",
          title: "Renewables share across Europe",
          basemap: "world",
          regionKey: "code",
          valueField: "value",
          rows: [
            { code: "FRA", value: 10 },
            { code: "DEU", value: 20 },
          ],
          source: { name: "S" },
          arcBeats: [{ region: "FRA", role: "context", text: "x" }],
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
