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
    schemaVersion: 5,
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
    schemaVersion: 5,
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

// --- the verification a host has to act on -------------------------------------------------
//
// `state` telling a host `nextActions: ["approve"]` and showing it no findings would be the
// same hole the missing offer once was: asked to decide, shown nothing to decide about. The
// projection below is persisted state plus ONE pure call (approvalDecision), so what the report
// says the gate will ask for is what the gate asks for.
function reviewed(): { run: RunManifest; runDir: string } {
  const { run, runDir } = seed();
  const el = run.elements[0]!;
  const provenance = provenanceHash(run, el);
  mkdirSync(join(runDir, "elements", "e1"), { recursive: true });
  writeFileSync(join(runDir, "elements", "e1", "static.png"), "bytes");
  return {
    runDir,
    run: {
      ...run,
      elements: [
        {
          ...el,
          artifact: {
            path: "elements/e1/static.png",
            sha256: "sha-of-the-artifact",
            provenanceHash: provenance,
            producedAt: "2026-07-27T09:00:00.000Z",
          },
          capture: {
            images: [],
            checks: [],
            capturedProvenanceHash: provenance,
          },
          review: {
            findings: [
              {
                id: "unit-missing",
                criterion: "craft" as const,
                severity: "warning" as const,
                status: "open" as const,
                summary: "the visual states no unit for its numbers",
                evidence: [],
                provenance: "mechanical" as const,
              },
            ],
            reviewedProvenanceHash: provenance,
            reviewer: {
              mode: "mechanical" as const,
              name: "lib/verify/mechanical",
              version: "1.0.0",
              inputsHash: "in",
              outputHash: "out",
              independentSemanticReview: "unavailable" as const,
            },
            captures: [],
            checks: [],
            tasteRisk: [
              {
                dimension: "density" as const,
                detector: "marks per 100px > 8",
                evidence: ["[primary] 40 marks across 300px"],
                routedTo: "human-signoff" as const,
              },
            ],
            overrides: [],
            acknowledged: [],
            preview: {
              deliverablePath: "/tmp/x/elements/e1/static.png",
              deliverableSha256: "sha-of-the-artifact",
              presentedAs: "path-printed" as const,
              presentedAt: "2026-07-27T09:05:00.000Z",
              fallbackReason: "the host presented it itself",
            },
          },
        },
      ],
    },
  };
}

it("carries the review a host has to act on at the approval gate", () => {
  const { run, runDir } = reviewed();
  const el = resumeReport(run, runDir).elements[0]!;
  expect(el.verification).toBeDefined();
  const v = el.verification!;
  expect(v.findings).toHaveLength(1);
  expect(v.findings[0]).toMatchObject({
    id: "unit-missing",
    severity: "warning",
    status: "open",
  });
  // The lane no machine grades, shown rather than buried.
  expect(v.tasteRisk[0]!.dimension).toBe("density");
  expect(v.preview!.presentedAs).toBe("path-printed");
  // Never dressed up as a pass.
  expect(v.independentSemanticReview).toBe("unavailable");
  // And exactly what the gate will demand: an unacknowledged warning.
  expect(v.approval.approvable).toBe(false);
  expect(v.approval.reasons.map((r) => r.code)).toEqual([
    "warnings-unacknowledged",
  ]);
});

it("says nothing about verification for an element nobody has reviewed", () => {
  const { run, runDir } = seed();
  expect(resumeReport(run, runDir).elements[0]!.verification).toBeUndefined();
});

// THE ANGLE, READABLE FROM THE REPORT.
//
// A host that resumes a run cold was told `gateState: "angled"` and shown nothing of the angle:
// the confirmed takeaway, the alt text, the unit. So the one thing the journalist decided first —
// the point the whole visual is making — could only be re-read by opening run.json by hand, which
// is the exact thing this whole layer exists to make unnecessary (the same omission the offer once
// was, one gate earlier).
//
// Carried WHOLE, as a pure projection, for the reason `proposal` is: choosing which of the four
// parts a host "deserves" is a decision that drifts, and every part is one the desk wrote itself.
test("resumeReport carries the confirmed angle exactly as the manifest persisted it", () => {
  const { run, runDir } = seed();
  const angled: RunManifest = {
    ...run,
    elements: [
      {
        ...run.elements[0]!,
        angle: {
          confirmedTakeaway: "Genève est le canton le plus cher",
          emphasis: "Genève",
          altInsight: "La prime adulte a augmenté dans les deux cantons.",
          unit: "CHF",
          intent: "ranking",
        },
      },
    ],
  };
  const report = resumeReport(angled, runDir);
  expect(report.elements[0]!.angle).toEqual(angled.elements[0]!.angle!);
  rmSync(runDir, { recursive: true, force: true });
});

test("resumeReport carries no angle key for an element that has none", () => {
  const { run, runDir } = seed();
  const unangled: RunManifest = {
    ...run,
    elements: [{ id: "e1" }],
  };
  expect("angle" in resumeReport(unangled, runDir).elements[0]!).toBe(false);
  rmSync(runDir, { recursive: true, force: true });
});

// THE DECLARED ROUTE, REPORTED AS A DECLARATION.
//
// `run.route` was schematised, written by `init` from the journalist's declaration and by the v3
// migration, and read by NOBODY: a field written and never read is eventually read as live
// configuration that mysteriously changes nothing. Wiring it into the brain is not the closure —
// lib/brain/eligibility.ts REMOVED it on purpose (whether the whole-article branch exists is a
// fact about this build, never about what a run asked for), and propose.ts says so at its call
// site. What was missing is a reader that reports it for what it is.
test("resumeReport reports the route the run declared", () => {
  const { run, runDir } = seed();
  expect(resumeReport(run, runDir).route).toBe("embed");
  expect(resumeReport({ ...run, route: "article" }, runDir).route).toBe(
    "article",
  );
  rmSync(runDir, { recursive: true, force: true });
});
