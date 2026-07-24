import { test, expect } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resumeReport } from "./resume";
import { writeManifest, provenanceHash, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";

function seed(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-resume-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const run: RunManifest = {
    runId: "r1",
    schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 1,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
        proposal: {
          options: [{ id: "slope", nativeType: "slope", why: "w" }],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  return { run, runDir };
}

test("resumeReport reports the element gate state and next actions", () => {
  const { run, runDir } = seed();
  const report = resumeReport(run, runDir);
  expect(report.elements[0].gateState).toBe("chosen");
  expect(report.elements[0].nextActions).toEqual(["produce"]);
});

test("resumeReport flags a tampered frozen input", () => {
  const { run, runDir } = seed();
  appendFileSync(join(runDir, run.input.data!.path), "\nZurich,600,700"); // change bytes after freeze
  const report = resumeReport(run, runDir);
  expect(report.inputValidation[0].status).toBe("tampered");
});

test("resumeReport flags a missing input file", () => {
  const { run, runDir } = seed();
  rmSync(join(runDir, run.input.data!.path));
  const report = resumeReport(run, runDir);
  expect(report.inputValidation[0].status).toBe("missing");
});

test("resumeReport flags a missing artifact file", () => {
  const { run, runDir } = seed();
  const ph = provenanceHash(run, run.elements[0]);
  run.elements[0].artifact = {
    path: join("elements", "e1", "static.png"),
    sha256: "a".repeat(64),
    provenanceHash: ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  const report = resumeReport(run, runDir);
  expect(report.elements[0].validation.artifact).toBe("missing");
});

test("resumeReport flags a tampered artifact file", () => {
  const { run, runDir } = seed();
  const ph = provenanceHash(run, run.elements[0]);
  const relPath = join("elements", "e1", "static.png");
  mkdirSync(join(runDir, "elements", "e1"), { recursive: true });
  writeFileSync(join(runDir, relPath), "real-artifact-bytes");
  run.elements[0].artifact = {
    path: relPath,
    sha256: "0".repeat(64), // deliberately wrong — bytes on disk don't hash to this
    provenanceHash: ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  const report = resumeReport(run, runDir);
  expect(report.elements[0].validation.artifact).toBe("tampered");
});

test("resumeReport never mutates the manifest file", () => {
  const { run, runDir } = seed();
  const p = join(runDir, "run.json");
  writeManifest(p, run);
  const before = readFileSync(p, "utf8");
  resumeReport(run, runDir);
  expect(readFileSync(p, "utf8")).toBe(before);
});
