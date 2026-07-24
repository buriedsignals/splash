import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { advance } from "./driver";
import { revise } from "./revise";
import {
  nextActions,
  stalenessOf,
  writeManifest,
  readManifest,
  type RunManifest,
} from "./manifest";
import { freezeInput } from "./freeze";
import { resumeReport } from "./resume";

test("full loop: orient → (human) → propose → (human) → produce → revise → produce, state always coherent", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-e2e-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "e2e",
    schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };

  run = await advance(run, runDir); // orient
  expect(run.orient!.supportsPoint).toBe(true);
  expect(nextActions(run)).toEqual(["confirm-angle"]);

  // human turn: author the angle
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
      },
    ],
  };
  expect(nextActions(run)).toEqual(["propose"]);

  run = await advance(run, runDir); // propose
  expect(run.elements[0].proposal!.options.length).toBeGreaterThan(0);
  expect(nextActions(run)).toEqual(["choose-form"]);

  // human turn: choose a form
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        proposal: { ...run.elements[0].proposal!, chosenId: "slope" },
      },
    ],
  };
  expect(nextActions(run)).toEqual(["produce"]);

  run = await advance(run, runDir); // produce
  expect(stalenessOf(run, run.elements[0])).toBe(false);
  expect(nextActions(run)).toEqual(["show"]);

  // back-edge: seeing the visual, the journalist changes the emphasis
  run = {
    ...run,
    elements: [
      revise(run.elements[0], { kind: "emphasis", emphasis: "Genève" }),
    ],
  };
  expect(stalenessOf(run, run.elements[0])).toBe(true); // never shown as current while stale
  expect(nextActions(run)).toEqual(["produce"]);

  run = await advance(run, runDir); // re-produce
  expect(stalenessOf(run, run.elements[0])).toBe(false);
  expect(nextActions(run)).toEqual(["show"]);
}, 90000);

// Issue #8: the run dir must travel entire at handoff. Produce an artifact, copy the WHOLE
// run dir to an unrelated path (as a journalist reopening on another machine would), and
// confirm the artifact still resolves — proving the stored path is run-dir-relative, not
// absolute.
test("run dir handoff: copying the entire run dir elsewhere still resolves the artifact", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-handoff-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "handoff",
    schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };

  run = await advance(run, runDir); // orient
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
      },
    ],
  };
  run = await advance(run, runDir); // propose
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        proposal: { ...run.elements[0].proposal!, chosenId: "slope" },
      },
    ],
  };
  run = await advance(run, runDir); // produce
  expect(stalenessOf(run, run.elements[0])).toBe(false);

  writeManifest(join(runDir, "run.json"), run);

  const newRunDir = mkdtempSync(join(tmpdir(), "loop-handoff-copy-"));
  cpSync(runDir, newRunDir, { recursive: true });

  const reopened = readManifest(join(newRunDir, "run.json"), newRunDir);
  const report = resumeReport(reopened, newRunDir);
  expect(report.elements[0].validation.artifact).toBe("ok");
}, 90000);

test("advance() records a produce failure as a bounded event without advancing state", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-broken-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "broken",
    schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose",
          altInsight: "Between 2015 and 2024 the adult premium rose.",
          unit: "Monthly adult premium (CHF)",
        },
        proposal: {
          options: [
            {
              id: "bogus",
              nativeType: "not-a-real-native-type",
              why: "unsupported by design",
            },
          ],
          chosenId: "bogus",
        },
      },
    ],
    events: [],
  };
  expect(nextActions(run)).toEqual(["produce"]);

  const after = await advance(run, runDir);

  expect(after.events.length).toBe(1);
  expect(after.events[0].kind).toBe("failure");
  expect(after.elements[0].artifact).toBeUndefined(); // state did not advance
  expect(nextActions(after)).toEqual(["produce"]);
}, 30000);

// Regression: an unreadable FROZEN INPUT is a bounded failure, not an exception. produce()
// read the frozen CSV with an unguarded readFileSync, so a run dir missing its input threw
// ENOENT straight out of advance() — past the driver, which no longer catches anything
// because the verb contract promises never to throw. The failure event is the contract.
test("advance() records a MISSING FROZEN INPUT as a bounded failure, never a throw", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-missing-input-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const frozen = freezeInput(runDir, src, "data");
  const run: RunManifest = {
    runId: "missing-input",
    schemaVersion: 2,
    input: { data: frozen },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
        proposal: {
          options: [
            { id: "slope", nativeType: "slope", why: "two points in time" },
          ],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  expect(nextActions(run)).toEqual(["produce"]);

  // The run dir travelled without its frozen input (a partial copy, a cleaned temp dir).
  rmSync(join(runDir, frozen.path));

  const after = await advance(run, runDir);

  expect(after.events.length).toBe(1);
  expect(after.events[0].kind).toBe("failure");
  expect(after.events[0].action).toBe("produce");
  expect(after.events[0].message).toContain("frozen input");
  expect(after.elements[0].artifact).toBeUndefined(); // state did not advance
  expect(nextActions(after)).toEqual(["produce"]);
}, 30000);
