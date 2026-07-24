import { test, expect } from "bun:test";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "./migrate";
import { parseManifest } from "./manifest";

const v1 = {
  runId: "r1",
  schemaVersion: 1,
  input: {
    dataCsv: "canton,2015,2024\nGenève,449,583",
    statedPoint: "premiums rose",
  },
  orient: {
    profile: {
      columns: ["canton", "2015", "2024"],
      numericColumns: ["2015", "2024"],
      rowCount: 1,
    },
    supportsPoint: true,
  },
  angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
  proposal: {
    options: [{ id: "slope", nativeType: "slope", why: "w" }],
    chosenId: "slope",
  },
  artifact: { path: "/old/static.png", provenanceHash: "old" },
};

test("migrate upgrades a v1 manifest to a valid v2 manifest", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(() => parseManifest(m)).not.toThrow();
  expect(m.schemaVersion).toBe(2);
});

test("migrate freezes the v1 inline dataCsv into the run dir", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(m.input.data).toBeDefined();
  expect(existsSync(join(runDir, m.input.data!.path))).toBe(true);
});

test("migrate wraps the single v1 element into elements[0]", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(m.elements).toHaveLength(1);
  expect(m.elements[0].angle?.confirmedTakeaway).toBe("t");
  expect(m.elements[0].proposal?.chosenId).toBe("slope");
});

test("migrate refuses an unknown / newer schema version", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  expect(() => migrate({ ...v1, schemaVersion: 99 }, runDir)).toThrow();
});
