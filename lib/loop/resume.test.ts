import { test, expect, it } from "bun:test";
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
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
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
          excluded: [],
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

it("names the destination and shape of every deliverable in the run", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-resume-deliv-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const angle = { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" };
  const run: RunManifest = {
    runId: "r-deliv",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
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
      { id: "e1", angle, deliverable: { destination: "article-web" } },
      {
        id: "e1-d2",
        deliverableOf: "e1",
        angle,
        deliverable: { destination: "social" },
      },
      { id: "e1-d3", deliverableOf: "e1", angle, deliverable: { destination: "print" } },
    ],
    events: [],
  };
  const report = resumeReport(run, runDir);
  expect(report.elements.map((e) => e.destination)).toEqual([
    "article-web",
    "social",
    "print",
  ]);
  expect(report.elements[0]!.channel).toBe("article-web");
  // The social row still owes its aspect: reported as unresolved, never guessed.
  expect(report.elements[1]!.channel).toBeUndefined();
  expect(report.elements[1]!.nextActions).toEqual(["propose"]);
  expect(report.elements[2]!.channel).toBe("print-page");
  rmSync(runDir, { recursive: true, force: true });
});

// --- the offer (host-journey slice) --------------------------------------------------------
// `state` told a host "choose-form" and showed it no forms: resumeReport carried id, gateState,
// nextActions, validation, destination, aspect and channel, and never the proposal. A host that
// cannot see the offer cannot show it, cannot phrase it, and cannot name an id — so the one
// command it was being told to run was the one it could not build.

test("resumeReport carries no proposal key for an element that has none", () => {
  const { run, runDir } = seed();
  const bare: RunManifest = {
    ...run,
    elements: [{ id: "e1", angle: run.elements[0]!.angle }],
  };
  expect("proposal" in resumeReport(bare, runDir).elements[0]!).toBe(false);
});

test("resumeReport carries the offer exactly as the manifest persisted it", () => {
  const { run, runDir } = seed();
  const offered: RunManifest = {
    ...run,
    elements: [
      {
        ...run.elements[0]!,
        proposal: {
          options: [
            {
              id: "bar",
              nativeType: "bar",
              engine: "chart-native",
              format: "static",
              intent: ["magnitude"],
              why: "",
              whySource: {
                sheet: "knowledge/references/chart/types/bar.md",
                fragments: ["comparing magnitudes across categories"],
                facts: { rows: "2" },
              },
              requires: ["chart-native"],
            },
          ],
          excluded: [{ id: "treemap", reason: "needs at least 6 rows" }],
          refusal: "scrolly is not carried by article-web",
        },
      },
    ],
  };
  // Compared against the manifest's own value, not retyped: this is a PROJECTION, so a test
  // that restated the offer could pass while the projection dropped a field.
  expect(resumeReport(offered, runDir).elements[0]!.proposal).toEqual(
    offered.elements[0]!.proposal,
  );
});

// The grounding is the load-bearing half: `phrase` requires that every number in the prose come
// from THIS option's whySource. A host that could not read it from `state` would have to open
// run.json itself — which is the same "the façade does not know what the loop knows" disease,
// one level down.
test("resumeReport carries the grounding a phrasing has to be written from", () => {
  const { run, runDir } = seed();
  const offered: RunManifest = {
    ...run,
    elements: [
      {
        ...run.elements[0]!,
        proposal: {
          options: [
            {
              id: "bar",
              nativeType: "bar",
              why: "",
              whySource: { sheet: "s.md", fragments: ["f"], facts: { rows: "2" } },
            },
          ],
          excluded: [],
        },
      },
    ],
  };
  const reported = resumeReport(offered, runDir).elements[0]!.proposal!;
  expect(reported.options[0]!.whySource!.facts).toEqual({ rows: "2" });
  expect(reported.chosenId).toBeUndefined();
});
