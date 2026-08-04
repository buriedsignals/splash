// THE ATTESTATION, CONFRONTED WITH THE RUN DIRECTORY.
//
// GUARD 5 (validate-gate.ts) reads `skillsInvoked` — a list the model writes about itself — and
// checks it against ITSELF ("you declared guided, so you must also declare suggest-chart"). A run
// that never touched a sub-skill can satisfy it by typing the sub-skill's name. That was finding
// S1 of docs/splash/host-gates-audit-2026-08-02.md; it stopped being a risk and became an
// observation on 2026-08-03, when a host run called `suggest_article` as if it were a TOOL, got
// `Tool not found`, enabled a chat-side charting extension instead, drew a bar in the chat and
// announced « Le visuel est prêt » — with no exports/, no producer, no gate, no owned file
// (docs/installer/goose-desktop-proof.md, backlog E11).
//
// The pattern this follows already exists, one directory over: produce-all.mjs records
// `suggest-chart-invoked` by SEEING candidates.json rather than by believing the orchestrator
// (flow-decisions.ts's `autoRecordAtSpine` — "the spine SEES the artifact, so this record is a
// confirmation, not a self-report"). Same idea, opposite direction: there, the disk SUPPLIES a
// record nobody wrote; here, the disk is asked to BACK a record somebody wrote.
//
// WHAT IS AND IS NOT PROVABLE FROM A DIRECTORY LISTING. Presence proves the step ran (only its
// own sanctioned writer leaves the file). Absence does NOT disprove a single claim: there are
// legitimate paths where a skill runs and persists nothing — a bare topic hands suggest-article
// no ProposalSet to save, and the DIRECT branch may consult suggest-chart for reachability
// without a menu ever being written. So an individual absence is a WARNING, never a verdict.
//
// What IS a verdict is the TOTAL absence: an attestation that claims sub-skills and has nothing
// whatsoever on disk behind ANY of them. No legitimate run reaches production in that state — a
// guided run always wrote candidates.json (`productionPrecondition` already demands it), an
// article run always wrote opportunities.json, and a journalist-named bare-topic run claims no
// sub-skill in the first place, so it never enters this check at all. That is the E11 shape, and
// it is the one this refuses.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AcceptedProposal } from "./producer-spec";
import { routed, type RoutedRefusal } from "../../../lib/core/routed-refusal";

/** One corroborable claim: a skill token that may appear in `skillsInvoked`, and the artifact its
 *  own sanctioned writer leaves in the run directory when it really ran. A skill with no such
 *  artifact simply has no row — it is then not corroborable, and this module says so by silence
 *  rather than by inventing evidence for it. */
export interface AttestationEvidence {
  /** The token exactly as the orchestrator writes it in `skillsInvoked` (§5b). */
  skill: string;
  /** The file, relative to the run directory (where accepted.json sits). */
  artifact: string;
  /** WHO leaves it — quoted in the refusal so the fix is an act, not a puzzle. */
  writes: string;
}

export const ATTESTATION_EVIDENCE: AttestationEvidence[] = [
  {
    skill: "suggest-article",
    artifact: "opportunities.json",
    // suggest-article/SKILL.md step 6: "Then PERSIST the set — the analysis must leave a record
    // on disk, not only in this conversation."
    writes:
      "bun skills/suggest-article/scripts/save-opportunities.mjs <runDir> --payload '<the ProposalSet JSON>'",
  },
  {
    skill: "suggest-chart",
    artifact: "candidates.json",
    // splash/SKILL.md §4 Stage 1: "Write the raw Stage-1 payload to exports/<slug>/candidates.json
    // BEFORE presenting" — the mechanical trace that the menu existed.
    writes:
      "write suggest-chart's Stage-1 payload to <runDir>/candidates.json before presenting it",
  },
];

export interface Corroboration {
  /** The corroborable skills this run's attestation claims — pooled over every proposal, deduped,
   *  sorted. Claims are a RUN-level fact: candidates.json / opportunities.json sit beside
   *  accepted.json, not beside one proposal. */
  claimed: string[];
  /** Those whose artifact the run directory actually holds. */
  corroborated: string[];
  /** Those whose artifact is absent. */
  uncorroborated: string[];
}

/** Read the attestation, read the directory, and report the two side by side. Pure apart from the
 *  injected `exists` (defaulted to the real filesystem) — the fake-disk seam the tests use. */
export function corroborateAttestation(
  runDir: string,
  proposals: AcceptedProposal[],
  exists: (path: string) => boolean = existsSync,
): Corroboration {
  const list = Array.isArray(proposals) ? proposals : [];
  const claimedTokens = new Set<string>();
  for (const p of list) {
    const invoked = p?.skillsInvoked;
    if (!Array.isArray(invoked)) continue; // untyped JSON.parse: a non-array claims nothing
    for (const token of invoked)
      if (typeof token === "string") claimedTokens.add(token);
  }
  const claimed: string[] = [];
  const corroborated: string[] = [];
  const uncorroborated: string[] = [];
  for (const e of ATTESTATION_EVIDENCE) {
    if (!claimedTokens.has(e.skill)) continue;
    claimed.push(e.skill);
    if (exists(join(runDir, e.artifact))) corroborated.push(e.skill);
    else uncorroborated.push(e.skill);
  }
  return {
    claimed: claimed.sort(),
    corroborated: corroborated.sort(),
    uncorroborated: uncorroborated.sort(),
  };
}

function evidenceFor(skill: string): AttestationEvidence {
  const e = ATTESTATION_EVIDENCE.find((x) => x.skill === skill);
  // Unreachable: `claimed` is built from this same table. Thrown rather than defaulted so a
  // future edit that desynchronises the two fails loud instead of printing a blank artifact name.
  if (!e) throw new Error(`no attestation evidence declared for "${skill}"`);
  return e;
}

/** THE REFUSAL — total absence only. Null when the run has at least one artifact behind its
 *  claims, and null when it claims nothing corroborable at all. */
export function attestationRefusal(c: Corroboration): RoutedRefusal | null {
  if (c.claimed.length === 0) return null;
  if (c.corroborated.length > 0) return null;
  const owed = c.uncorroborated
    .map((s) => `${s} (${evidenceFor(s).artifact})`)
    .join(", ");
  return routed(
    "attestation-uncorroborated",
    `this run's record says it invoked ${owed} — and the run directory holds none of those files, ` +
      "so nothing here shows those skills ever ran",
  );
}

/** The non-fatal half: a run that IS walking the pipeline but owes one artifact. Surfaced so the
 *  gap is read rather than discovered later by a delivery that has nothing to trace. */
export function attestationWarnings(c: Corroboration): string[] {
  if (c.corroborated.length === 0) return []; // total absence is the refusal's business, not a warning
  return c.uncorroborated.map((s) => {
    const e = evidenceFor(s);
    return (
      `skillsInvoked claims "${s}" but ${e.artifact} is absent from the run directory — ` +
      `if it really ran, persist its record: ${e.writes}`
    );
  });
}
