// The refusal a journalist meets when the source is missing now CARRIES the question.
//
// `sourceQuestion()` is the one targeted question issue #7 asks the flow to put to a journalist,
// and it had no caller at all (residual A20): the refusal named what was missing without ever
// asking for it. This is the HALF of A20 that is closable from inside the loop. The other half is
// an ORDERING problem — the question's proper place is before the run exists, at the CADRAGE beat
// that composes the `RunDeclaration` (`sources` is written once, by `initRun`, and no later step
// can add it) — and that place is in lib/host/**, outside this slice. See the register row.
//
// One question, never a form: `sourceQuestion` answers the kind first, then the first required
// field still missing, and answers `null` when nothing it can ask about is wrong. The third case
// below is that `null` — a refusal a question cannot help with is not padded with one.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "../loop/produce";
import { freezeInput } from "../loop/freeze";
import type { RunManifest } from "../loop/manifest";
import type { SourceLedger } from "./kinds";

function makeRun(runDir: string, sources?: SourceLedger): RunManifest {
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  return {
    runId: "question",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    ...(sources ? { sources } : {}),
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
        },
        proposal: {
          options: [
            { id: "slope", nativeType: "slope", why: "two points in time" },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
}

async function refusal(sources?: SourceLedger): Promise<string> {
  const runDir = mkdtempSync(join(tmpdir(), "source-question-"));
  const run = makeRun(runDir, sources);
  const result = await produce(run, run.elements[0]!, runDir);
  if (result.ok) throw new Error("produce was expected to refuse");
  return result.message;
}

test("the refusal of an undeclared source asks which class it is", async () => {
  const message = await refusal();
  expect(message).toContain("source-undeclared");
  expect(message).toContain("Where does this data come from");
});

test("the refusal of a public source with no URL asks for the exact page", async () => {
  const message = await refusal({
    mode: "real",
    data: { kind: "public", label: "Office fédéral de la statistique" },
  });
  expect(message).toContain("missing-url");
  expect(message).toContain("exact page or dataset URL");
});

test("a refusal no question can help with is not padded with one", async () => {
  // Demo data in a run that calls itself reporting: the declaration is complete, and the fix is
  // a decision about the run, not an answer to a question. sourceQuestion returns null here.
  const message = await refusal({
    mode: "real",
    data: { kind: "synthetic", label: "Demo figures" },
  });
  expect(message).toContain("synthetic-in-real-run");
  expect(message).not.toContain("Where does this data come from");
  expect(message).not.toContain("exact page or dataset URL");
});
