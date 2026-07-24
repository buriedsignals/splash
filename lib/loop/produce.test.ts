import { test, expect } from "bun:test";
import { existsSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "./produce";
import { provenanceHash, type RunManifest } from "./manifest";

test("produce renders a real static PNG through the chart-native seam", () => {
  const m: RunManifest = {
    runId: "t",
    schemaVersion: 1,
    input: {
      dataCsv:
        "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
      statedPoint: "premiums rose",
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
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
  };
  const outDir = mkdtempSync(join(tmpdir(), "loop-produce-"));
  const after = produce(m, outDir);
  expect(existsSync(after.artifact!.path)).toBe(true);
  expect(statSync(after.artifact!.path).size).toBeGreaterThan(5000);
  expect(after.artifact!.provenanceHash).toBe(provenanceHash(m));
}, 60000);
