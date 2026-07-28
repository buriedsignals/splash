import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  readManifest,
  chosenOption,
  deliverableForElement,
  gateStateOf,
  nextActionsForElement,
  provenanceHash,
  resolvedChannelForElement,
  stalenessOf,
  type RunManifest,
  type RunElement,
  type GateState,
  type NextAction,
  type FormOption,
} from "./manifest";
import { approvalDecision, type ApprovalDecision } from "../verify/approval";
import type {
  Finding,
  PreviewRecord,
  ReviewRecord,
  TasteRiskSignal,
} from "../verify/types";
import type { Channel, Destination, MediaAspect } from "../core/vocabulary";

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
    // WHERE this element goes — issue #1's "every requested deliverable appears in the final
    // report". Always answered, even for an element that declares none: a run written before
    // deliverables existed still HAS a destination, it is the run's own channel.
    destination: Destination;
    /** The shape, once it is known. Absent while the branch still owes the answer. */
    aspect?: MediaAspect;
    /** The render channel it resolves to. Absent for the same reason — never guessed. */
    channel?: Channel;
    /** The master this deliverable shares its takeaway with, when it is a sibling. */
    deliverableOf?: string;
    /** THE OFFER, present exactly when the element carries one.
     *
     *  It was the omission of this report: an element said `nextActions: ["choose-form"]` and
     *  carried no forms, so the host was told to make a decision it could not see the terms of.
     *  Carried WHOLE — options with their `whySource`, the discards with their reasons, the
     *  chosen id, the brain's refusal — because a host has three things to do with it: show it,
     *  PHRASE it (and the phrasing must be written from `whySource` alone, guarded number by
     *  number), and name an id. Amputating the grounding would leave `phrase` undriveable from
     *  `state` and send the host back to reading run.json itself.
     *
     *  A pure projection of persisted state, never a derivation, so it cannot drift from what
     *  the loop reads. */
    proposal?: {
      options: FormOption[];
      excluded: { id: string; reason: string }[];
      chosenId?: string;
      refusal?: string;
    };
    /** WHAT THE APPROVAL GATE WILL ASK FOR, present exactly when a review exists.
     *
     *  Without it a host is told `nextActions: ["approve"]` and shown nothing: which findings
     *  block, which warnings need acknowledging, whether the deliverable has been presented at
     *  all. That is the same omission the missing offer once was, one gate further along.
     *
     *  Persisted state plus ONE pure call (approvalDecision, lib/verify) — the same function
     *  approveElement runs — so the report cannot promise something the gate then refuses.
     *  Journalist-facing by construction: findings, risks and the preview record carry no
     *  orchestration plumbing (#9). */
    verification?: {
      findings: Finding[];
      tasteRisk: TasteRiskSignal[];
      preview?: PreviewRecord;
      /** Never inferred from an absence of findings — the record's own word. */
      independentSemanticReview: ApprovalDecision["independentSemanticReview"];
      approval: {
        approvable: boolean;
        reasons: ApprovalDecision["reasons"];
        overridden: string[];
        staleOverrides: string[];
      };
    };
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

// The gate's own answer, reported rather than re-derived: approvalDecision is the function
// approveElement runs, called here with the same three facts. A second, "reporting" copy of
// the rule is exactly how a report starts promising what the gate then refuses.
function verificationOf(
  run: RunManifest,
  el: RunElement,
): NonNullable<ResumeReport["elements"][number]["verification"]> {
  const review = el.review as ReviewRecord;
  const decision = approvalDecision(review, {
    format: chosenOption(el)?.format ?? "static",
    artifactSha256: el.artifact?.sha256 ?? "",
    provenanceHash: provenanceHash(run, el),
  });
  return {
    findings: review.findings ?? [],
    tasteRisk: decision.needsHumanEye,
    ...(review.preview ? { preview: review.preview } : {}),
    independentSemanticReview: decision.independentSemanticReview,
    approval: {
      approvable: decision.approvable,
      reasons: decision.reasons,
      overridden: decision.overridden,
      staleOverrides: decision.staleOverrides,
    },
  };
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
      const abs = join(runDir, el.artifact.path);
      if (stalenessOf(run, el)) artifact = "stale";
      else if (!existsSync(abs)) artifact = "missing";
      else artifact = hashFile(abs) === el.artifact.sha256 ? "ok" : "tampered";
    }
    // One resolver for both axes AND for the channel they compose into — deliverableForElement is
    // where the run's default is unpacked, so this report cannot name a destination derived by one
    // rule beside a channel derived by another.
    const { destination, aspect } = deliverableForElement(run, el);
    const channel = resolvedChannelForElement(run, el);
    return {
      id: el.id,
      gateState: gateStateOf(run, el),
      nextActions: elementNextActions(run, el),
      validation: { artifact },
      destination,
      ...(aspect ? { aspect } : {}),
      ...(channel ? { channel } : {}),
      ...(el.deliverableOf ? { deliverableOf: el.deliverableOf } : {}),
      ...(el.proposal ? { proposal: el.proposal } : {}),
      ...(el.review ? { verification: verificationOf(run, el) } : {}),
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
    const shape = el.channel ?? `${el.aspect ?? "shape"} not confirmed`;
    console.log(
      `  element ${el.id}: ${el.gateState}  (artifact: ${el.validation.artifact})`,
    );
    console.log(`    deliverable: ${el.destination} — ${shape}`);
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

