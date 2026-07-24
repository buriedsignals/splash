import { test, expect } from "bun:test";
import { existsSync, statSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "./produce";
import {
  appendEvent,
  provenanceHash,
  type RunManifest,
  type RunEvent,
} from "./manifest";
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

// A run whose chosen option's nativeType chart-native does not map. specToNativeConfig
// throws UnsupportedNativeType, produce-from-spec.mjs falls back with a distinct non-zero
// exit code — deterministic real subprocess rejection, not a stub.
function makeBrokenRun(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-broken-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "t-broken",
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
  return { run, runDir };
}

test("produce throws a descriptive error and the caller can log a bounded failure event without advancing", () => {
  // A spec that chart-native will reject (no numeric data / bad type) makes produce throw.
  const { run, runDir } = makeBrokenRun();
  let caught: Error | null = null;
  let manifest = run;
  try {
    produce(run, run.elements[0], runDir, join(runDir, "out"));
  } catch (e) {
    caught = e as Error;
    const ev: RunEvent = {
      at: "2026-01-01T00:00:00.000Z",
      kind: "failure",
      action: "produce",
      message: caught.message.slice(0, 200),
    };
    manifest = appendEvent(manifest, ev);
  }
  expect(caught).not.toBeNull();
  expect(manifest.events.length).toBe(1);
  expect(manifest.elements[0].artifact).toBeUndefined(); // state did not advance
}, 30000);
