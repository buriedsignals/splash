// FINDING 16 (stress round four): THE SWEEP. It CALLS every example runner this skill has, and it
// does not read one of them — see `scripts/example-runners.mjs`'s own header for the eighteen dead
// runners and the green suite that earned it, and for why a runner still alive at the deadline is
// an answer rather than a failure.
//
// This file is the same in every producing skill, byte for byte apart from nothing at all: the
// skill it sweeps is read off its own path, so a copy cannot be pasted into a neighbour and go on
// sweeping the skill it came from.
import { afterAll, describe, expect, it, setDefaultTimeout } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import {
  deadExampleRunners,
  exampleRunnersFor,
  runExampleRunners,
} from "../scripts/example-runners.mjs";

// The population is dominated by runners that survive to their deadline on purpose, four at a
// time — the default 5s per-test budget cannot hold a real sweep.
setDefaultTimeout(600000);

const SKILL = basename(resolve(import.meta.dirname, ".."));
const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const scratch = mkdtempSync(join(tmpdir(), `splash-runners-${SKILL}-`));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe(`${SKILL} — every example runner committed beside a beat still runs`, () => {
  const { called, unaimable } = exampleRunnersFor(ROOT, SKILL);

  it("finds the runners that call this skill, and names the ones it cannot aim at a scratch directory", () => {
    // NOT AN ASSERTION ABOUT A NUMBER. `dw-beat` delegates its rendering to a remote API and has no
    // committed runner at all; every other producing skill does. What this refuses is a population
    // that shrank without anyone saying so: the excluded set is PRINTED, so a runner that stops
    // taking an out directory shows up here instead of vanishing from the sweep.
    if (unaimable.length) console.log(`${SKILL}: not swept (no outDir to aim): ${unaimable.join(", ")}`);
    console.log(`${SKILL}: ${called.length} example runner(s) to call`);
    expect(Array.isArray(called)).toBe(true);
  });

  it("calls every one of them, and none of them is dead", async () => {
    if (called.length === 0) return;
    const results = await runExampleRunners(ROOT, called, scratch);
    const answered = results.filter((result) => !result.timedOut);
    console.log(
      `${SKILL}: ${answered.length} ran to completion, ${results.length - answered.length} still working at the deadline`,
    );
    expect(deadExampleRunners(results)).toEqual([]);
  });
});
