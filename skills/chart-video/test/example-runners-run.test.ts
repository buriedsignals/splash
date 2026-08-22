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
  flakyExampleRunners,
  exampleRunnersFor,
  runExampleRunners,
  swallowedExampleRunners,
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
    // A runner that failed in the crowd and passed alone is PRINTED, never swallowed. The sweep
    // re-asks a non-zero exit once with nothing else in flight, because several of these runners
    // start a browser or a rasteriser and one that loses that fight has not been left behind by a
    // format change. Reporting it is what keeps the retry from being "run until green".
    for (const flake of flakyExampleRunners(results)) console.log(`${SKILL}: ${flake}`);
    expect(deadExampleRunners(results)).toEqual([]);
    expect(swallowedExampleRunners(results)).toEqual([]);
  });
});

// THE SECOND DECISION, WALKED ON RESULTS BUILT BY HAND — because the sweep above cannot prove it
// fires. No runner in this tree swallows a failure today: the one that did
// (`stories/heat-pump-adoption-across-europe/beats/1-the-gap-that-persists/render-web.mjs`, fixed
// in `22857ece`) is the only `.catch(console.error)` there has ever been, and re-measured over the
// whole population on 2026-08-22 every one of the 67 runners that answered printed NOTHING at all
// on stderr. A decision whose only evidence is a clean population is a decision nobody has seen
// work, which is the shape of defect this sweep exists to refuse — so the cases are built here,
// out of the bytes the runtime this sweep spawns really prints.
const A_PRINTED_THROW = [
  "1 |   const out = await renderWeb({",
  "                            ^",
  "error: renderWeb: props.language is required",
  "      at renderWeb (/twin/skills/chart-web/scripts/render-web.mjs:88:11)",
  "      at /twin/stories/a-story/beats/1-a-beat/render-web.mjs:64:1",
  "      at loadAndEvaluateModule (2:1)",
].join("\n");

describe(`${SKILL} — a runner that fails without an exit code is still a dead runner`, () => {
  const answered = (runner: string, over: Record<string, unknown>) => ({
    runner,
    exitCode: 0,
    timedOut: false,
    stderr: "",
    refusal: "",
    ...over,
  });

  it("names a runner that exited 0 while printing a thrown error", () => {
    expect(
      swallowedExampleRunners([
        answered("stories/a-story/beats/1-a-beat/render-web.mjs", {
          stderr: A_PRINTED_THROW,
          refusal: "error: renderWeb: props.language is required",
        }),
      ]),
    ).toEqual([
      "stories/a-story/beats/1-a-beat/render-web.mjs exited 0 after printing a throw: " +
        "error: renderWeb: props.language is required",
    ]);
  });

  it("says nothing about a runner that exited 0 and printed no stack", () => {
    expect(
      swallowedExampleRunners([
        answered("proof/a-beat/render.mjs", {}),
        // Every word a shape rule must NOT decide on, in one line of legitimate output: this is
        // why the decision reads a frame and not the vocabulary of failure.
        answered("proof/b-beat/render.mjs", {
          stderr: "error: caught 3 rows with no value at 1:1 — see docs/errors.md:12",
        }),
      ]),
    ).toEqual([]);
  });

  it("leaves a runner that answered with an exit code to deadExampleRunners", () => {
    const results = [
      answered("proof/a-beat/render.mjs", {
        exitCode: 1,
        stderr: A_PRINTED_THROW,
        refusal: "error: renderWeb: props.language is required",
      }),
    ];
    expect(swallowedExampleRunners(results)).toEqual([]);
    expect(deadExampleRunners(results)).toEqual([
      "proof/a-beat/render.mjs exited 1: error: renderWeb: props.language is required",
    ]);
  });

  it("says nothing about a runner still working at its deadline", () => {
    // Same reason `deadExampleRunners` does not: a runner alive at the deadline reached its
    // format's entrypoint and went past it, and it was KILLED rather than allowed to answer.
    expect(
      swallowedExampleRunners([
        answered("proof/a-beat/render.mjs", {
          exitCode: null,
          timedOut: true,
          stderr: A_PRINTED_THROW,
        }),
      ]),
    ).toEqual([]);
  });
});
