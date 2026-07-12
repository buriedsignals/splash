import { describe, it, expect, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Phase 1 (no --form) of export-code.mjs emits the a/b/c delivery-form proposal. The emitted
// EXPORT_FORMS_PROPOSAL block MUST carry an explicit WAIT instruction — the mechanical nudge at
// the point of temptation. Observed violation (QA wave 10, run w9-double-opportunite-energie):
// the orchestrator emitted the proposal for two hosted-DW elements, then AUTO-DECIDED ("Je
// finalise la livraison sous cette forme pour les deux") and ran `--form embed` for both without
// a single journalist turn in between. The a/b/c choice is a non-skippable explicit gate — the
// journalist chooses, even when only one form is offered.

const CWD = join(import.meta.dir, "..");
// NOT under tmp/scratchpad/var/folders — export-code refuses ephemeral export paths.
const WORK = join(import.meta.dir, ".export-code-proposal-cli-work");

afterEach(() => rmSync(WORK, { recursive: true, force: true }));

function writeReport(
  dir: string,
  result: Record<string, unknown>,
): string {
  const reportPath = join(dir, "report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), results: [result] },
      null,
      2,
    ),
  );
  return reportPath;
}

/** Runs the REAL export-code CLI in phase 1 (no --form); returns captured stdout. */
function runPhase1(outDir: string, exportDir: string, reportPath: string, id: string): string {
  return execFileSync(
    "bun",
    [
      "scripts/export-code.mjs",
      outDir,
      exportDir,
      "--results",
      reportPath,
      "--id",
      id,
    ],
    { cwd: CWD, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

/** The wait instruction the emitted block must carry, split into its load-bearing parts. */
const WAIT_LINE_PARTS = [
  /ATTENDRE la réponse du journaliste/,
  /ne jamais choisir à sa place/,
  /pour les deux » présumé/,
];

function expectWaitInstruction(stdout: string): void {
  const block = stdout.slice(
    stdout.indexOf("EXPORT_FORMS_PROPOSAL"),
    stdout.indexOf("END_EXPORT_FORMS_PROPOSAL"),
  );
  for (const part of WAIT_LINE_PARTS) expect(block).toMatch(part);
}

describe("export-code phase 1 — emitted proposal carries the WAIT instruction", () => {
  it("hosted-DW interactive (single offered form c) still instructs to wait for the journalist's choice", () => {
    const outDir = join(WORK, "hosted", "el1");
    const exportDir = join(WORK, "hosted", "el1-export");
    mkdirSync(outDir, { recursive: true });
    const reportPath = writeReport(join(WORK, "hosted"), {
      id: "el1",
      producer: "dw-chart",
      format: "interactive",
      status: "produced",
      reviewed: true,
      renderApproved: true,
      publicUrl: "https://datawrapper.dwcdn.net/XXXXX/1/",
    });
    const stdout = runPhase1(outDir, exportDir, reportPath, "el1");
    expect(stdout).toContain("EXPORT_FORMS_PROPOSAL");
    expectWaitInstruction(stdout);
  });

  it("native interactive (three offered forms) instructs to wait for the journalist's choice", () => {
    const outDir = join(WORK, "native", "el2");
    const exportDir = join(WORK, "native", "el2-export");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "interactive.html"), "<html></html>");
    const reportPath = writeReport(join(WORK, "native"), {
      id: "el2",
      producer: "chart-native",
      format: "interactive",
      status: "produced",
      reviewed: true,
      renderApproved: true,
    });
    const stdout = runPhase1(outDir, exportDir, reportPath, "el2");
    expect(stdout).toContain("EXPORT_FORMS_PROPOSAL");
    expectWaitInstruction(stdout);
  });
});
