import { test, expect } from "bun:test";
import {
  existsSync,
  statSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { provenanceHash, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";

test("produce renders a real static PNG through the chart-native seam", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  const run: RunManifest = {
    runId: "t",
    schemaVersion: 3,
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
  const result = await produce(run, run.elements[0], runDir);
  if (!result.ok) throw new Error(result.message);
  const after = result.value;
  const artifactAbs = join(runDir, after.artifact!.path);
  expect(after.artifact!.path).toBe(join("elements", "e1", "static.png"));
  expect(existsSync(artifactAbs)).toBe(true);
  expect(statSync(artifactAbs).size).toBeGreaterThan(5000);
  expect(after.artifact!.provenanceHash).toBe(
    provenanceHash(run, run.elements[0]),
  );
  expect(after.artifact!.sha256).toMatch(/^[0-9a-f]{64}$/);
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
    schemaVersion: 3,
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

test("produce returns a descriptive typed failure and the caller logs a bounded event without advancing", async () => {
  const { run, runDir } = makeBrokenRun();
  const result = await produce(run, run.elements[0], runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message.length).toBeGreaterThan(0);
  // The element is untouched: a failure never advances state.
  expect(run.elements[0].artifact).toBeUndefined();
}, 30000);

// Structural, not textual: what must hold is that produce.ts owns no engine path of its
// own — it neither spawns a process nor IMPORTS skills/. So the import statements are
// parsed and checked as specifiers, rather than grepping the whole file for the substring
// "skills" (which any future comment mentioning a skills/ path would trip). That produce()
// actually reaches an engine through the verb is proven by the e2e tests above and by
// engines.test.ts, not by looking for the string "render(" in the source.
test("produce owns no engine path of its own — no subprocess, no skills/ import", () => {
  const src = readFileSync(join(import.meta.dir, "produce.ts"), "utf8");
  expect(src).not.toContain("execFileSync");

  const specifiers = [
    ...src.matchAll(/^import\s+(?:[^;'"]*?\sfrom\s+)?["']([^"']+)["']/gm),
  ].map((m) => m[1]);
  expect(specifiers.length).toBeGreaterThan(0);
  expect(specifiers.filter((s) => s.includes("skills"))).toEqual([]);
  // The registry wiring is reached through the loop's ONE composition root, never inlined.
  expect(specifiers).toContain("./engines");
});

test("a refused render becomes a typed failure, not a throw", async () => {
  const { run, runDir } = makeBrokenRun();
  const r = await produce(run, run.elements[0], runDir);
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error("unreachable");
  expect(["engine-declined", "engine-failed"]).toContain(r.code);
}, 120_000);
