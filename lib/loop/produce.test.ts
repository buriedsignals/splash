import { test, expect } from "bun:test";
import { existsSync, statSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "./produce";
import { provenanceHash, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";

test("produce renders a real static PNG through the chart-native seam", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  const run: RunManifest = {
    runId: "t",
    schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight:
            "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.",
          unit: "Monthly adult premium (CHF)",
          emphasis: "Genève",
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
  const outDir = mkdtempSync(join(tmpdir(), "loop-produce-out-"));
  const after = produce(run, run.elements[0], runDir, outDir);
  expect(existsSync(after.artifact!.path)).toBe(true);
  expect(statSync(after.artifact!.path).size).toBeGreaterThan(5000);
  expect(after.artifact!.provenanceHash).toBe(
    provenanceHash(run, run.elements[0]),
  );
}, 60000);
