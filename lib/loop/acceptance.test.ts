import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  writeManifest,
  readManifest,
  gateStateOf,
  provenanceHash,
  type RunManifest,
} from "./manifest";
import { freezeInput } from "./freeze";
import { resumeReport } from "./resume";

function twoElementRun(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-accept-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const angle = { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" };
  const proposal = {
    options: [{ id: "slope", nativeType: "slope", why: "w" }],
    excluded: [],
    chosenId: "slope",
  };
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
      { id: "e1", angle, proposal }, // chosen, awaiting produce
      { id: "e2", angle }, // only angled
    ],
    events: [],
  };
  return { run, runDir };
}

test("elements advance independently — reviseing e1 leaves e2 untouched", () => {
  const { run } = twoElementRun();
  const e1ph = provenanceHash(run, run.elements[0]);
  run.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: e1ph,
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(gateStateOf(run, run.elements[0])).toBe("produced");
  expect(gateStateOf(run, run.elements[1])).toBe("angled"); // unaffected
});

test("close and reopen resumes at the same gate with the same next actions", () => {
  const { run, runDir } = twoElementRun();
  const p = join(runDir, "run.json");
  writeManifest(p, run);
  const before = resumeReport(run, runDir);
  const reopened = readManifest(p, runDir);
  const after = resumeReport(reopened, runDir);
  expect(after).toEqual(before);
});

test("the serialized manifest contains no input content and no secret-looking tokens", () => {
  const { run, runDir } = twoElementRun();
  const p = join(runDir, "run.json");
  writeManifest(p, run);
  const serialized = readFileSync(p, "utf8");
  expect(serialized).not.toContain("Genève,449,583"); // input rows never inlined
  expect(serialized).not.toMatch(/sk-[a-zA-Z0-9]{16,}/); // no API-key shapes
});
