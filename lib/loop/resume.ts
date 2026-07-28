import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  readManifest,
  chosenOption,
  deliverableForElement,
  gateStateOf,
  nextActionsForElement,
  fileArtifact,
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
  /** "hosted" is the answer for a delivery the run does not OWN — a published Datawrapper embed,
   *  recorded as a URL with no bytes on disk (see ArtifactRecordSchema). It is a fresh, real
   *  artifact; what it is not is one this report can re-hash, so it says which it is instead of
   *  reporting a "missing" file that was never supposed to be there. */
  artifact: "none" | "ok" | "missing" | "tampered" | "stale" | "hosted";
};
export type ResumeReport = {
  runId: string;
  /** WHAT THE RUN DECLARED IT IS — an embeddable element, or the visual article itself.
   *
   *  REPORTED, and deliberately nothing more. `route` had two writers (init, from the
   *  journalist's declaration; the v3 migration) and no reader at all, and a field written and
   *  never read is eventually read as live configuration that mysteriously changes nothing.
   *
   *  Giving it a reader is not the same as giving it authority, and the authority is refused on
   *  purpose: lib/brain/eligibility.ts took `route` out of its input because whether the
   *  whole-article branch EXISTS is a fact about this build, never about what a run asked for —
   *  a manifest declaring route:"article" used to get the narrative forms offered clean,
   *  buildable by nobody. lib/loop/propose.ts repeats the refusal at its call site. So this is
   *  the declaration handed back to the desk that made it, and nothing routes on it. */
  route: RunManifest["route"];
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
    /** THE ANGLE, present exactly when the element carries one.
     *
     *  A host resuming a run cold was told `gateState: "angled"` and shown nothing of the angle —
     *  so the first thing the journalist decided, the point the whole visual is making, could
     *  only be re-read by opening run.json by hand. That is the one thing this layer exists to
     *  make unnecessary, and it is the same omission the offer once was, one gate earlier.
     *
     *  Carried WHOLE, for the reason the offer is: which of the four parts a host "deserves" is a
     *  decision that drifts, every part is one the desk wrote itself, and a host has real work
     *  for each (restate the takeaway, show the alt text, label the unit, name the emphasis).
     *  `intent` rides along as persisted state; lib/host/state.ts's `intent` is a different
     *  answer — where the OFFER'S ordering came from, which is a derivation, not this record. */
    angle?: RunElement["angle"];
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
    // "" for a hosted delivery, which has no bytes — the same value an element with no artifact
    // at all gets. approvalDecision reads it only to check the preview covers THESE bytes, and a
    // hosted artifact is never previewable (previewStep refuses it), so the decision it reaches
    // is "not previewed", which is the true one.
    artifactSha256: fileArtifact(el.artifact)?.sha256 ?? "",
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
      const file = fileArtifact(el.artifact);
      if (stalenessOf(run, el)) artifact = "stale";
      // Staleness is checked FIRST for a hosted delivery too — a re-angled run's published embed
      // is as stale as a re-angled run's PNG, and that is the answer a journalist has to act on.
      else if (!file) artifact = "hosted";
      else if (!existsSync(join(runDir, file.path))) artifact = "missing";
      else
        artifact =
          hashFile(join(runDir, file.path)) === file.sha256 ? "ok" : "tampered";
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
      ...(el.angle ? { angle: el.angle } : {}),
      ...(el.proposal ? { proposal: el.proposal } : {}),
      ...(el.review ? { verification: verificationOf(run, el) } : {}),
    };
  });

  return { runId: run.runId, route: run.route, inputValidation, elements };
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
