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

function writeReport(dir: string, result: Record<string, unknown>): string {
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
function runPhase1(
  outDir: string,
  exportDir: string,
  reportPath: string,
  id: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
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
    { cwd: CWD, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env },
  );
}

/** Pulls the machine-relayable EXPORT_FORMS_JSON payload out of phase-1 stdout. */
function parseFormsJson(stdout: string): {
  forms: Record<string, Record<string, unknown>>;
  [k: string]: unknown;
} {
  const marker = "EXPORT_FORMS_JSON ";
  const line = stdout.split("\n").find((l) => l.startsWith(marker));
  if (!line) throw new Error("no EXPORT_FORMS_JSON in stdout:\n" + stdout);
  return JSON.parse(line.slice(marker.length));
}

function envWithoutFlyToken(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.FLY_API_TOKEN;
  return env;
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

// Lever 3 of the embed-delivery-integrity fix: a SELF-HOSTED interactive/scrolly (no live DW
// publicUrl) can only ship form c (embed) by deploying to fly.io — which needs FLY_API_TOKEN.
// When the token is unconfigured, the a/b/c proposal must FLAG form c unavailable and steer the
// journalist to the standalone-HTML form (b), rather than offering a form that cannot deliver.
describe("export-code phase 1 — embed availability reflects fly.io configuration", () => {
  function writeNativeInteractive(name: string): {
    outDir: string;
    exportDir: string;
    reportPath: string;
  } {
    const outDir = join(WORK, name, "el");
    const exportDir = join(WORK, name, "el-export");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "interactive.html"), "<html></html>");
    const reportPath = writeReport(join(WORK, name), {
      id: "el",
      producer: "chart-native",
      format: "interactive",
      status: "produced",
      reviewed: true,
      renderApproved: true,
    });
    return { outDir, exportDir, reportPath };
  }

  it("flags form c (embed) UNAVAILABLE for a self-hosted interactive when FLY_API_TOKEN is unset, steering to b", () => {
    const { outDir, exportDir, reportPath } =
      writeNativeInteractive("no-token");
    const stdout = runPhase1(
      outDir,
      exportDir,
      reportPath,
      "el",
      envWithoutFlyToken(),
    );
    const payload = parseFormsJson(stdout);
    expect(payload.forms.c.available).toBe(false);
    expect(String(payload.forms.c.reason)).toMatch(/FLY_API_TOKEN|fly/i);
    // form b (standalone HTML) is still offered as the deliverable alternative
    expect(payload.forms.b).toBeDefined();
    // the human relay block warns and points to b
    const block = stdout.slice(
      stdout.indexOf("EXPORT_FORMS_PROPOSAL"),
      stdout.indexOf("END_EXPORT_FORMS_PROPOSAL"),
    );
    expect(block).toMatch(/indisponible/i);
    expect(block).toMatch(/\bb\)/);
  });

  it("keeps form c (embed) available for a self-hosted interactive when FLY_API_TOKEN is configured", () => {
    const { outDir, exportDir, reportPath } =
      writeNativeInteractive("with-token");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      FLY_API_TOKEN: "dummy-token-not-real",
    });
    const payload = parseFormsJson(stdout);
    expect(payload.forms.c.available).toBe(true);
    expect(payload.forms.c.reason).toBeUndefined();
  });

  it("leaves a hosted-DW embed (already-live publicUrl) available with no FLY_API_TOKEN — no fly deploy needed", () => {
    const outDir = join(WORK, "hosted-dw", "el");
    const exportDir = join(WORK, "hosted-dw", "el-export");
    mkdirSync(outDir, { recursive: true });
    const reportPath = writeReport(join(WORK, "hosted-dw"), {
      id: "el",
      producer: "dw-chart",
      format: "interactive",
      status: "produced",
      reviewed: true,
      renderApproved: true,
      publicUrl: "https://datawrapper.dwcdn.net/XXXXX/1/",
    });
    const stdout = runPhase1(
      outDir,
      exportDir,
      reportPath,
      "el",
      envWithoutFlyToken(),
    );
    const payload = parseFormsJson(stdout);
    expect(payload.forms.c.url).toBe("https://datawrapper.dwcdn.net/XXXXX/1/");
    // a live hosted embed is fly-independent — never flagged unavailable
    expect(payload.forms.c.available).not.toBe(false);
  });
});
