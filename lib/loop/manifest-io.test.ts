import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readManifest, writeManifest, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";

function freshRun(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-io-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const run: RunManifest = {
    runId: "r1",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  return { run, runDir };
}

test("writeManifest then readManifest round-trips", () => {
  const { run } = freshRun();
  const p = join(mkdtempSync(join(tmpdir(), "loop-io-out-")), "run.json");
  writeManifest(p, run);
  expect(readManifest(p)).toEqual(run);
});
