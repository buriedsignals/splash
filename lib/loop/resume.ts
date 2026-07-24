import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  readManifest,
  gateStateOf,
  nextActionsForElement,
  stalenessOf,
  type RunManifest,
  type RunElement,
  type GateState,
  type NextAction,
} from "./manifest";

export type HashCheck = { ref: string; status: "ok" | "missing" | "tampered" };
export type ElementValidation = {
  artifact: "none" | "ok" | "missing" | "tampered" | "stale";
};
export type ResumeReport = {
  runId: string;
  inputValidation: HashCheck[];
  elements: {
    id: string;
    gateState: GateState;
    nextActions: NextAction[];
    validation: ElementValidation;
  }[];
};

function hashFile(path: string): string {
  return Buffer.from(sha256(readFileSync(path))).toString("hex");
}

function checkRef(
  runDir: string,
  ref: { path: string; sha256: string } | undefined,
  label: string,
): HashCheck | null {
  if (!ref) return null;
  const abs = join(runDir, ref.path);
  if (!existsSync(abs)) return { ref: label, status: "missing" };
  return {
    ref: label,
    status: hashFile(abs) === ref.sha256 ? "ok" : "tampered",
  };
}

// Run-level gates mirrored from manifest.nextActions() — an element's routing is only
// reachable once orient has run and the data supports a visual at all.
function elementNextActions(run: RunManifest, el: RunElement): NextAction[] {
  if (!run.orient) return ["orient"];
  if (!run.orient.supportsPoint) return [];
  return nextActionsForElement(run, el);
}

// Read-only: validates hashes, derives state + next actions. NEVER writes. Completion is
// derived from the manifest + hashes only, never inferred from conversation.
export function resumeReport(run: RunManifest, runDir: string): ResumeReport {
  const inputValidation = [
    checkRef(runDir, run.input.data, "data"),
    checkRef(runDir, run.input.article, "article"),
  ].filter((c): c is HashCheck => c !== null);

  const elements = run.elements.map((el) => {
    let artifact: ElementValidation["artifact"] = "none";
    if (el.artifact) {
      if (stalenessOf(run, el)) artifact = "stale";
      else if (!existsSync(el.artifact.path)) artifact = "missing";
      else
        artifact =
          hashFile(el.artifact.path) === el.artifact.sha256 ? "ok" : "tampered";
    }
    return {
      id: el.id,
      gateState: gateStateOf(run, el),
      nextActions: elementNextActions(run, el),
      validation: { artifact },
    };
  });

  return { runId: run.runId, inputValidation, elements };
}

function printReport(r: ResumeReport): void {
  // Journalist-facing status + the exact next action(s) + validation. English scaffold;
  // the orchestrating agent restates it in the journalist's language.
  console.log(`Run ${r.runId}`);
  for (const iv of r.inputValidation)
    console.log(`  input:${iv.ref} — ${iv.status}`);
  for (const el of r.elements) {
    console.log(
      `  element ${el.id}: ${el.gateState}  (artifact: ${el.validation.artifact})`,
    );
    console.log(
      `    next: ${el.nextActions.length ? el.nextActions.join(", ") : "— nothing valid (off-ramp)"}`,
    );
  }
}

if (import.meta.main) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: bun lib/loop/resume.ts <runDir | manifestPath>");
    process.exit(2);
  }
  const manifestPath = target.endsWith(".json")
    ? target
    : join(target, "run.json");
  const runDir = target.endsWith(".json") ? join(target, "..") : target;
  let run: RunManifest;
  try {
    run = readManifest(manifestPath, runDir);
  } catch (e) {
    console.error(
      `resume: cannot read a valid manifest at ${manifestPath}: ${(e as Error).message}`,
    );
    process.exit(1);
  }
  const report = resumeReport(run, runDir);
  printReport(report);
}
