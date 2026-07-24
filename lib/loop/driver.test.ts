import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance } from "./driver";
import { revise } from "./revise";
import { nextActions, stalenessOf, type RunManifest } from "./manifest";

test("full loop: orient → (human) → propose → (human) → produce → revise → produce, state always coherent", () => {
  const outDir = mkdtempSync(join(tmpdir(), "loop-e2e-"));
  let m: RunManifest = {
    runId: "e2e",
    schemaVersion: 1,
    input: {
      dataCsv: "canton,2015,2024\nGenève,449,583\nVaud,412,531",
      statedPoint: "premiums rose",
    },
  };

  m = advance(m, outDir); // orient
  expect(m.orient!.supportsPoint).toBe(true);
  expect(nextActions(m)).toEqual(["confirm-angle"]);

  // human turn: author the angle
  m = {
    ...m,
    angle: {
      confirmedTakeaway: "Premiums rose in both cantons",
      altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
      unit: "CHF",
    },
  };
  expect(nextActions(m)).toEqual(["propose"]);

  m = advance(m, outDir); // propose
  expect(m.proposal!.options.length).toBeGreaterThan(0);
  expect(nextActions(m)).toEqual(["choose-form"]);

  // human turn: choose a form
  m = { ...m, proposal: { ...m.proposal!, chosenId: "slope" } };
  expect(nextActions(m)).toEqual(["produce"]);

  m = advance(m, outDir); // produce
  expect(stalenessOf(m)).toBe(false);
  expect(nextActions(m)).toEqual(["show"]);

  // back-edge: seeing the visual, the journalist changes the emphasis
  m = revise(m, { kind: "emphasis", emphasis: "Genève" });
  expect(stalenessOf(m)).toBe(true); // never shown as current while stale
  expect(nextActions(m)).toEqual(["produce"]);

  m = advance(m, outDir); // re-produce
  expect(stalenessOf(m)).toBe(false);
  expect(nextActions(m)).toEqual(["show"]);
}, 90000);
