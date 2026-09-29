// Test support for the scaffold tests, which write a hidden probe beat into proof/ while they run
// (they carry `// LANE: serial`, see scripts/test-lanes.mjs) and run the generated tests.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { PROOF, ROOT } from "./proof.ts";

/** Remove a probe beat — only ever a `.scaffold-test-*` directory directly under proof/. */
export function removeProbe(beat: string) {
  if (
    dirname(beat) === PROOF &&
    basename(beat).startsWith(".scaffold-test-") &&
    existsSync(beat)
  )
    rmSync(beat, { recursive: true });
}

/** Every test case of a `bun test` run over `files`, read from its JUnit report. */
export function testCasesOf(files: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "scaffold-junit-"));
  try {
    const report = join(dir, "report.xml");
    const run = spawnSync(
      "bun",
      ["test", ...files, "--reporter=junit", `--reporter-outfile=${report}`],
      { cwd: ROOT, encoding: "utf8" },
    );
    const xml = readFileSync(report, "utf8");
    const cases = [
      ...xml.matchAll(
        /<testcase name="([^"]*)"[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g,
      ),
    ].map((m) => ({
      name: m[1]
        .replaceAll("&apos;", "'")
        .replaceAll("&quot;", '"')
        .replaceAll("&amp;", "&"),
      failed: /<failure/.test(m[2] ?? ""),
    }));
    const failures = Number(
      /<testsuites[^>]*\bfailures="(\d+)"/.exec(xml)?.[1],
    );
    return { cases, failures, output: run.stdout + run.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
