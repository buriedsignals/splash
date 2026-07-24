import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance } from "./driver";
import { revise } from "./revise";
import { nextActions, stalenessOf, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";

test("full loop: orient → (human) → propose → (human) → produce → revise → produce, state always coherent", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-e2e-run-"));
  const outDir = mkdtempSync(join(tmpdir(), "loop-e2e-out-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "e2e",
    schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };

  run = advance(run, runDir, outDir); // orient
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

  run = advance(run, runDir, outDir); // propose
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

  run = advance(run, runDir, outDir); // produce
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

  run = advance(run, runDir, outDir); // re-produce
  expect(stalenessOf(run, run.elements[0])).toBe(false);
  expect(nextActions(run)).toEqual(["show"]);
}, 90000);

test("advance() records a produce failure as a bounded event without advancing state", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-broken-run-"));
  const outDir = mkdtempSync(join(tmpdir(), "loop-driver-broken-out-"));
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

  const after = advance(run, runDir, outDir);

  expect(after.events.length).toBe(1);
  expect(after.events[0].kind).toBe("failure");
  expect(after.elements[0].artifact).toBeUndefined(); // state did not advance
  expect(nextActions(after)).toEqual(["produce"]);
}, 30000);
