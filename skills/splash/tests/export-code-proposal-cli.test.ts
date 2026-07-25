import { describe, it, expect, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { canonicalJson } from "../src/canonical-json.ts";
import { resolveLanguage } from "../../../lib/newsroom/language";
import { exportProposalCopy } from "../../../lib/newsroom/ui-copy";
import { readNewsroomState } from "../../../lib/newsroom/state";

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

// S1 strict production seam: assertChainProvenance (skills/splash/src/render-provenance.ts)
// resolves accepted.json/candidates.json beside report.json (dirname(reportPath)). Every
// legitimate report here needs a matching sanctioned chain, or the new export gate refuses it —
// this is the "behaviour-preserving happy path" requirement, not new test surface for its own sake.
function writeChainFixture(
  dir: string,
  id: string,
  producer: string,
  spec: unknown,
): string {
  writeFileSync(
    join(dir, "accepted.json"),
    JSON.stringify([
      {
        id,
        producer,
        format: "static",
        spec,
        confirmedTakeaway: "Test takeaway for " + id,
      },
    ]),
  );
  writeFileSync(
    join(dir, "candidates.json"),
    JSON.stringify({ candidates: [{ type: "bar", producer }] }),
  );
  return createHash("sha256").update(canonicalJson(spec)).digest("hex");
}

function writeReport(dir: string, result: Record<string, unknown>): string {
  const reportPath = join(dir, "report.json");
  const producer = (result.producer as string | undefined) ?? "chart-native";
  const id = result.id as string;
  const spec = { nativeType: "bar", title: "Test", id };
  const acceptedConfigHash = writeChainFixture(dir, id, producer, spec);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results: [{ acceptedConfigHash, ...result }],
      },
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

// Set to EMPTY rather than deleted: preflight falls back to the repo-root .env by design
// (so the gate sees the same truth as the producers), and process.env wins over that file —
// an empty value is the only way to emulate "not configured" on a machine that has real keys.
function envWithoutEmbedCredentials(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CLOUDFLARE_API_TOKEN: "",
    CLOUDFLARE_ACCOUNT_ID: "",
    SPLASH_EMBED_PROJECT: "",
  };
}

// The instruction must be PRESENT and verbatim — in whatever language this install resolves
// to. Pinning the French wording here would re-introduce exactly the defect issue #6 reports.
function resolvedUi(overrideUi?: string): string {
  const root = join(import.meta.dir, "../../..");
  return resolveLanguage({
    override: { ui: overrideUi },
    uiLang: readNewsroomState(root).uiLang,
  }).ui;
}

function expectedWaitInstruction(overrideUi?: string): string {
  return exportProposalCopy(resolvedUi(overrideUi)).waitInstruction;
}

function expectWaitInstruction(stdout: string, overrideUi?: string): void {
  const block = stdout.slice(
    stdout.indexOf("EXPORT_FORMS_PROPOSAL"),
    stdout.indexOf("END_EXPORT_FORMS_PROPOSAL"),
  );
  expect(block).toContain(expectedWaitInstruction(overrideUi));
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
// publicUrl) can only ship form c (embed) by deploying to the newsroom's Cloudflare Pages
// project. When those credentials are unconfigured, the a/b/c proposal must FLAG form c
// unavailable and steer the journalist to the standalone-HTML form (b), rather than offering a
// form that cannot deliver.
describe("export-code phase 1 — embed availability reflects Cloudflare configuration", () => {
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

  it("flags form c (embed) UNAVAILABLE for a self-hosted interactive when the Cloudflare credentials are unset, steering to b", () => {
    const { outDir, exportDir, reportPath } =
      writeNativeInteractive("no-token");
    const stdout = runPhase1(
      outDir,
      exportDir,
      reportPath,
      "el",
      envWithoutEmbedCredentials(),
    );
    const payload = parseFormsJson(stdout);
    expect(payload.forms.c.available).toBe(false);
    expect(String(payload.forms.c.reason)).toMatch(
      /CLOUDFLARE_API_TOKEN|cloudflare/i,
    );
    // form b (standalone HTML) is still offered as the deliverable alternative
    expect(payload.forms.b).toBeDefined();
    // the human relay block warns and points to b
    const block = stdout.slice(
      stdout.indexOf("EXPORT_FORMS_PROPOSAL"),
      stdout.indexOf("END_EXPORT_FORMS_PROPOSAL"),
    );
    // A missing embed key is COLLECTABLE, not a dead end: the relay must name the missing
    // credentials and offer to collect them, while still leaving b) as the alternative if the
    // journalist declines. (Before 2026-07-19 this said "INDISPONIBLE" and steered to b —
    // a silent downgrade of the delivery the journalist actually asked for.) Checked against
    // the resolved copy layer, not pinned wording — same trap as the WAIT instruction.
    expect(block).toMatch(/CLOUDFLARE_API_TOKEN/);
    expect(block).toContain(
      exportProposalCopy(resolvedUi()).formEmbedMissingKeys(
        (payload.forms.c.missingKeys as string[]).join(", "),
      ),
    );
    expect(block).toMatch(/\bb\)/);
  });

  it("keeps form c (embed) available for a self-hosted interactive when Cloudflare is configured", () => {
    const { outDir, exportDir, reportPath } =
      writeNativeInteractive("with-token");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      CLOUDFLARE_API_TOKEN: "dummy-token-not-real",
      CLOUDFLARE_ACCOUNT_ID: "dummy-account-not-real",
      SPLASH_EMBED_PROJECT: "test-newsroom-splash",
    });
    const payload = parseFormsJson(stdout);
    expect(payload.forms.c.available).toBe(true);
    expect(payload.forms.c.reason).toBeUndefined();
  });

  it("leaves a hosted-DW embed (already-live publicUrl) available with no Cloudflare credentials — no deploy needed", () => {
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
      envWithoutEmbedCredentials(),
    );
    const payload = parseFormsJson(stdout);
    expect(payload.forms.c.url).toBe("https://datawrapper.dwcdn.net/XXXXX/1/");
    // a live hosted embed needs no deploy of ours — never flagged unavailable
    expect(payload.forms.c.available).not.toBe(false);
  });
});

// The defect this locks (issue #6): an English conversation reached a French export menu,
// because emitProposal printed French string literals. The block now follows the resolved
// interface language — English on a fresh install, and a per-run SPLASH_UI_LANG override.
describe("export-code phase 1 — the proposal follows the newsroom's language", () => {
  function nativeInteractive(name: string): {
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

  it("speaks English when no preference is saved and none is overridden", () => {
    const { outDir, exportDir, reportPath } = nativeInteractive("lang-default");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      SPLASH_UI_LANG: "",
    });
    expect(stdout).toContain(exportProposalCopy("en").intro);
    expect(stdout).not.toContain(exportProposalCopy("fr").intro);
  });

  it("honours a per-run override without touching what is saved", () => {
    const root = join(import.meta.dir, "../../..");
    const before = existsSync(join(root, "newsroom.json"))
      ? readFileSync(join(root, "newsroom.json"), "utf8")
      : null;
    const { outDir, exportDir, reportPath } = nativeInteractive("lang-fr");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      SPLASH_UI_LANG: "fr",
    });
    expect(stdout).toContain(exportProposalCopy("fr").intro);
    expectWaitInstruction(stdout, "fr");
    // The override is per-run: the saved preference is byte-identical afterwards (and an
    // install that had none still has none).
    const after = existsSync(join(root, "newsroom.json"))
      ? readFileSync(join(root, "newsroom.json"), "utf8")
      : null;
    expect(after).toBe(before);
  });

  it("keeps the machine markers out of the locale layer", () => {
    const { outDir, exportDir, reportPath } = nativeInteractive("lang-markers");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      SPLASH_UI_LANG: "fr",
    });
    for (const marker of [
      "EXPORT_FORMS_JSON",
      "EXPORT_FORMS_PROPOSAL",
      "END_EXPORT_FORMS_PROPOSAL",
    ])
      expect(stdout).toContain(marker);
  });
});
