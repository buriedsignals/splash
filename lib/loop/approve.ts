// The approval step — a HUMAN turn, and the last thing that stands between a produced visual
// and a published one.
//
// ── How this relates to the Ed25519 editorial sign-off ─────────────────────────────────────
// Splash already had one: skills/splash/src/editorial-signoff.ts, its two scripts, and
// `requiredSigners` on the newsroom profile, enforced by lib/loop/deliver.ts. There are NOT
// two approval concepts here. There is one, at two strengths:
//
//   · `el.approved` answers WHAT was approved — the mechanical ceremony is complete for THESE
//     bytes: a review of this provenance, a preview of these bytes, no blocking finding left
//     open, every warning acknowledged. approveElement (lib/loop/manifest.ts) is its only
//     sanctioned writer, and this module is its only production caller.
//   · The Ed25519 signature answers WHO approved it, unforgeably. It is not recorded beside
//     the approval: it is the identity proof carried INSIDE it, in the sign-off document
//     `approved.signoffPath` points at.
//
// So when a newsroom declares `requiredSigners`, no approval can be written at all without a
// verified signature from one of them over the exact artifact bytes. That is not a nicety: the
// gate in deliver.ts asks for `el.approved` when requiredSigners is set, so an unsigned
// approval written here would satisfy a cryptographic requirement with a formality. The
// existing verifier is IMPORTED rather than reimplemented — same payload string, same keys
// from NEWSROOM-PROFILE.md, so the editor keeps signing with the same script.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fail, ok, type VerbResult } from "../core/verbs";
import {
  verifyEditorialSignature,
  type EditorSigner,
} from "../../skills/splash/src/editorial-signoff";
import { approvalDecision } from "../verify/approval";
import type {
  Finding,
  Override,
  ReviewRecord,
  TasteRiskSignal,
} from "../verify/types";
import {
  approvalSubjectOf,
  approveElement,
  chosenOption,
  isHostedArtifact,
  provenanceHash,
  type RunElement,
  type RunManifest,
} from "./manifest";

/** What the journalist brings to the gate. Everything else — which bytes, which provenance,
 *  when — is the spine's to write, so an override can never claim to be about another
 *  artifact than the one in front of them. */
export type ApprovalCeremony = {
  actorLabel?: string;
  acknowledged?: string[];
  overrides?: { findingId: string; reason: string }[];
  signoff?: { signerId: string; signature: string };
};

/** The newsroom's signing policy, passed as DATA. Resolved by the caller from
 *  NEWSROOM-PROFILE.md, the same file deliver.ts's requiredSigners comes from — the same shape
 *  deliver() already takes its profile in, so neither reaches for ambient state. */
export type SigningPolicy = {
  signers: EditorSigner[];
  requiredSigners: string[];
};

/** Where the sign-off document lives: a SIBLING of elements/ and deliveries/, because
 *  elements/<id> is wiped on every re-produce and a signed record must outlive that. */
export function elementSignoffPath(runDir: string, id: string): string {
  return join(runDir, "signoffs", `${id}.json`);
}

// The durable evidence #11 asks for: what was approved, by whom, what was knowingly shipped
// past and why, and — the part that makes the needs-human-eye lane consequential — the risks
// no machine graded, written into the document the human puts their name to.
type SignoffDocument = {
  elementId: string;
  /** The SUBJECT: an owned artifact's sha256, or a published embed's hosted binding. */
  artifactSha256: string;
  /** The published address the binding is over — hosted deliveries only. */
  artifactUrl?: string;
  approvedProvenanceHash: string;
  actorLabel: string;
  at: string;
  acknowledged: string[];
  overrides: Override[];
  needsHumanEye: TasteRiskSignal[];
  independentSemanticReview: ReviewRecord["reviewer"]["independentSemanticReview"];
  signoff?: { signerId: string; signature: string };
};

function statusAfter(
  finding: Finding,
  acknowledged: string[],
  overridden: Set<string>,
): Finding["status"] {
  if (finding.status !== "open") return finding.status;
  if (overridden.has(finding.id)) return "overridden";
  if (acknowledged.includes(finding.id)) return "acknowledged";
  return "open";
}

/**
 * Approve an element, and write the sign-off document the approval points at.
 *
 * Refusals carry EVERY reason at once — a gate that reports one blocker at a time teaches
 * people to re-run it rather than to read it. Nothing is written on a refusal.
 */
export function approve(
  run: RunManifest,
  el: RunElement,
  runDir: string,
  ceremony: ApprovalCeremony,
  policy: SigningPolicy,
): VerbResult<RunElement> {
  if (!el.artifact)
    return fail("invalid-request", "approve: nothing produced to approve yet");
  // THE WHOLE CEREMONY IS OVER ONE SUBJECT. Every record this step writes binds to
  // `artifactSha256` — the override, the sign-off document, and the Ed25519 signature an editor
  // makes with sign-artifact.mjs — and for a file that subject is its own bytes.
  //
  // A HOSTED delivery has no bytes, so its subject is the HOSTED BINDING: the address the capture
  // landed on, hashed together with the still it took there (lib/verify/hosted.ts). That module
  // records why the address alone would not do, and the measured Datawrapper property that makes
  // the address leg load-bearing — a re-publish returns a NEW versioned URL and the recorded one
  // keeps serving what it served, so an approval of .../1/ can never come to cover .../2/.
  //
  // Resolved through approvalSubjectOf, the same resolver previewCovers and approveElement use:
  // an approval that bound to one subject while the gate cleared on another is the single failure
  // this whole chain exists to make impossible.
  const subject = approvalSubjectOf(el);
  if (!subject.sha256)
    return fail(
      "invalid-request",
      isHostedArtifact(el.artifact)
        ? `approve: this element was delivered as a HOSTED embed (${el.artifact.url}) and nothing has been captured of it — ` +
          `an approval binds to the live embed as it was measured, so capture and review it first`
        : "approve: this element's artifact records no subject to bind an approval to",
    );
  const review = el.review as ReviewRecord | undefined;
  const overrides = ceremony.overrides ?? [];
  const acknowledged = ceremony.acknowledged ?? [];
  const actorLabel = (ceremony.actorLabel ?? "").trim();

  // A ceremony that names findings the review does not carry is refused BEFORE anything is
  // computed from it: the manifest's own invariant would throw on such a record, and a refusal
  // that names the id is what a journalist can act on.
  if (review) {
    const known = new Set(review.findings.map((f) => f.id));
    const unknown = [
      ...overrides.map((o) => o.findingId),
      ...acknowledged,
    ].filter((id) => !known.has(id));
    if (unknown.length)
      return fail(
        "invalid-request",
        `approve: this review carries no finding called ${unknown.map((id) => `"${id}"`).join(", ")} — read the findings from state --run <dir>`,
      );
  }
  for (const o of overrides) {
    if (!o.reason.trim())
      return fail(
        "invalid-request",
        `approve: the override of "${o.findingId}" records no reason — an override with nothing recorded in it is not a record`,
      );
    if (!actorLabel)
      return fail(
        "invalid-request",
        "approve: an override needs an actor — say who is knowingly shipping past this finding (actorLabel)",
      );
  }

  const current = provenanceHash(run, el);
  const signoff = verifySignoff(el, subject.sha256, ceremony, policy);
  if (!signoff.ok) return signoff;

  // The override records, completed by the spine. #11 asks for "finding ID, reason, timestamp,
  // actor label, and the exact artifact hash being overridden": the host brings the first two,
  // and the last three are read off the run so that a re-production lapses them mechanically.
  const at = new Date().toISOString();
  const recorded: Override[] = overrides.map((o) => ({
    findingId: o.findingId,
    reason: o.reason.trim(),
    actorLabel,
    at,
    artifactSha256: subject.sha256,
    provenanceHash: current,
  }));
  const overriddenIds = new Set(recorded.map((o) => o.findingId));

  const candidate: RunElement = review
    ? {
        ...el,
        review: {
          ...review,
          findings: review.findings.map((f) => ({
            ...f,
            status: statusAfter(f, acknowledged, overriddenIds),
          })),
          overrides: [...review.overrides, ...recorded],
          acknowledged: [...new Set([...review.acknowledged, ...acknowledged])],
        },
      }
    : el;

  const outcome = approveElement(run, candidate, {
    signoffPath: relative(runDir, elementSignoffPath(runDir, el.id)),
  });
  if (!outcome.ok)
    return fail(
      "invalid-request",
      `approve: this visual cannot be approved yet — ${outcome.decision.reasons
        .map(
          (r) =>
            `${r.code}: ${r.detail}${r.findingIds?.length ? ` (${r.findingIds.join(", ")})` : ""}`,
        )
        .join("; ")}`,
    );

  // The document is written only once the decision is YES: a refusal leaves the run
  // byte-identical, which is what makes it safe to retry.
  const decision = approvalDecision(
    outcome.element.review as ReviewRecord | undefined,
    {
      format: chosenOption(el)?.format ?? "static",
      artifactSha256: subject.sha256,
      provenanceHash: current,
    },
  );
  const document: SignoffDocument = {
    elementId: el.id,
    artifactSha256: subject.sha256,
    // WHICH published version was signed for, when the subject is a hosted binding. The digest
    // above cannot be re-derived by a reader (it is over a still nobody kept), so without the
    // address the document would name a signed thing nobody could identify.
    ...(subject.url ? { artifactUrl: subject.url } : {}),
    approvedProvenanceHash: current,
    actorLabel: actorLabel || "unnamed",
    at,
    acknowledged:
      (outcome.element.review as ReviewRecord | undefined)?.acknowledged ?? [],
    overrides:
      (outcome.element.review as ReviewRecord | undefined)?.overrides ?? [],
    // The lane no machine grades, carried into the document a human signs — rather than left
    // in a field nobody reads back.
    needsHumanEye: decision.needsHumanEye,
    independentSemanticReview: decision.independentSemanticReview,
    ...(ceremony.signoff ? { signoff: ceremony.signoff } : {}),
  };
  const path = elementSignoffPath(runDir, el.id);
  try {
    mkdirSync(join(runDir, "signoffs"), { recursive: true });
    writeFileSync(path, JSON.stringify(document, null, 2));
  } catch (e) {
    return fail(
      "engine-failed",
      `approve: the sign-off document could not be written to ${path}: ${(e as Error).message}`,
    );
  }
  return ok(outcome.element);
}

// The identity half. Silent when the newsroom asks for none — the gate is opt-in, and a
// newsroom that has not declared signers approves by name alone.
function verifySignoff(
  el: RunElement,
  // The SUBJECT, resolved by the caller: an owned artifact's sha256, or a published embed's
  // hosted binding. Both are a hex sha256 and both go through the SAME payload and the same
  // verifier — nothing about how an editor signs changes, only what the hash is of.
  subjectSha256: string,
  ceremony: ApprovalCeremony,
  policy: SigningPolicy,
): VerbResult<null> {
  const required = policy.requiredSigners ?? [];
  if (required.length === 0) return ok(null);
  const given = ceremony.signoff;
  if (!given)
    return fail(
      "invalid-request",
      `approve: this newsroom requires an editorial sign-off (${required.join(", ")}) — sign the artifact with skills/splash/scripts/sign-artifact.mjs and pass {"signoff": {"signerId", "signature"}}`,
    );
  if (!required.includes(given.signerId))
    return fail(
      "invalid-request",
      `approve: "${given.signerId}" is not one of the signers this newsroom requires (${required.join(", ")})`,
    );
  const signer = policy.signers.find((s) => s.id === given.signerId);
  if (!signer)
    return fail(
      "invalid-request",
      `approve: "${given.signerId}" is required but has no registered public key in this newsroom's profile`,
    );
  // Over the SUBJECT, through the existing verifier: the same payload the editor's own signing
  // script produces, so nothing about how an editor signs has to change. For a published embed
  // the editor signs the binding the gate printed (`sign-artifact.mjs --digest`), and a
  // substituted digest simply fails here — the verifier is handed the run's own subject, never
  // the operator's.
  const valid = verifyEditorialSignature({
    proposalId: el.id,
    sha256hex: subjectSha256,
    signature: given.signature,
    signer,
  });
  if (!valid)
    return fail(
      "invalid-request",
      `approve: the signature from "${given.signerId}" does not verify against this artifact — it may have been made for another artifact, or for an earlier version of this one`,
    );
  return ok(null);
}
