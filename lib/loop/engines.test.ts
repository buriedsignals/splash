import { test, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// This file deliberately does NOT import skills/splash/src/register-producers — that is the
// whole point. Every other loop test imports it at the top, which populated the registry
// for the code under test and hid a dead shipped module: produce() answered
// `unknown-engine` for chart-native when driven from anywhere that was not a test file.
//
// The proof has to run OUTSIDE this process (a sibling test file's import would already
// have registered the engines for the whole `bun test` run), so it spawns a plain script
// that imports lib/loop/produce.ts and nothing else, and renders a real PNG.
test("produce() reaches a real engine when the ONLY import is lib/loop/produce.ts", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-standalone-"));
  const runDir = join(dir, "run");
  const script = join(dir, "standalone.mjs");
  const produceUrl = pathToFileURL(join(import.meta.dir, "produce.ts")).href;
  const freezeUrl = pathToFileURL(join(import.meta.dir, "freeze.ts")).href;

  writeFileSync(
    script,
    [
      'import { mkdirSync, writeFileSync } from "node:fs";',
      'import { join } from "node:path";',
      `import { produce } from ${JSON.stringify(produceUrl)};`,
      `import { freezeInput } from ${JSON.stringify(freezeUrl)};`,
      "const runDir = process.argv[2];",
      "mkdirSync(runDir, { recursive: true });",
      'const src = join(runDir, "src.csv");',
      'writeFileSync(src, "canton,2015,2024\\nGeneve,449,583\\nVaud,412,531");',
      "const run = {",
      '  runId: "standalone",',
      "  schemaVersion: 2,",
      '  input: { data: freezeInput(runDir, src, "data") },',
      "  elements: [",
      "    {",
      '      id: "e1",',
      "      angle: {",
      '        confirmedTakeaway: "Premiums rose in both cantons",',
      '        altInsight: "Both cantons\' adult premium rose from 2015 to 2024.",',
      '        unit: "CHF",',
      "      },",
      "      proposal: {",
      '        options: [{ id: "slope", nativeType: "slope", why: "two points in time" }],',
      '        chosenId: "slope",',
      "      },",
      "    },",
      "  ],",
      "  events: [],",
      "};",
      "const r = await produce(run, run.elements[0], runDir);",
      "process.stdout.write(",
      "  JSON.stringify(r.ok ? { ok: true, path: r.value.artifact.path } : r),",
      ");",
    ].join("\n"),
  );

  const out = execFileSync("bun", [script, runDir], { encoding: "utf8" });
  expect(JSON.parse(out)).toEqual({
    ok: true,
    path: join("elements", "e1", "static.png"),
  });
}, 300_000);
