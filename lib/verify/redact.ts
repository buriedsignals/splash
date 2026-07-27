// The independence boundary (issue #9).
//
// Independence is not "a second model". It is NOT BEING ABLE TO GRADE THE PROCESS. A
// reviewer that knows which option the brain ranked first, why it ranked it, which element
// id it belongs to and how many turns it took can grade the orchestration — and a reviewer
// that can grade the orchestration will, because that is the easier question. Strip those
// inputs and the only question left is the artifact.
//
// So this module is the load-bearing half of #9, and it is mechanically testable:
//   - buildReviewerInput is a WHITELIST (a filter forgets the field added tomorrow);
//   - assertNoInternals re-scans the result for identifier-shaped leaks, because a
//     whitelist fails silently and a scanner fails loudly;
//   - hashReviewerInput / hashReviewerOutput make the record able to prove WHAT was
//     reviewed and what came back, without storing private reasoning.
import { basename } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import type {
  CaptureRecord,
  EvidenceExtract,
  Finding,
  InteractionResult,
  ReviewerInput,
} from "./types";
import type { Channel, VisualFormat } from "../core/vocabulary";

// Everything a caller HAS. Only the fields named in buildReviewerInput's body travel.
export type ReviewerSource = {
  format: VisualFormat;
  channel: Channel;
  confirmedTakeaway: string;
  unit: string;
  altText: string;
  sourceName: string;
  evidenceExtracts: EvidenceExtract[];
  captures: CaptureRecord[];
  interactionResults: InteractionResult[];
  rubric: string[];
  /** The title as actually RENDERED — artifact content, so it travels to the reviewer:
   *  judging title-fidelity without the title would be judging the caller's intent. */
  renderedTitle?: string;
  // Below: present on the caller's side, never forwarded. Typed here so that dropping them
  // is a visible decision in this file rather than an accident of what the caller passed.
  runDir?: string;
  runId?: string;
  elementId?: string;
  chosenId?: string;
  why?: string;
  whySource?: unknown;
  provenanceHash?: string;
  agentLabel?: string;
};

/** The reviewer's ONLY input. Built field by field: an unknown key cannot ride along. */
export function buildReviewerInput(s: ReviewerSource): ReviewerInput {
  return {
    format: s.format,
    channel: s.channel,
    confirmedTakeaway: s.confirmedTakeaway,
    unit: s.unit,
    altText: s.altText,
    sourceName: s.sourceName,
    evidenceExtracts: s.evidenceExtracts.map((e) => ({
      text: e.text,
      provenance: e.provenance,
    })),
    renders: s.captures.map((c) => ({
      breakpoint: c.breakpoint,
      // The file NAME, never the run-dir path: where a run lives on someone's disk is
      // orchestration, and it is also the most common way a private project name leaks.
      path: basename(c.path),
      cssViewport: c.cssViewport,
      deviceScaleFactor: c.deviceScaleFactor,
      rootBox: c.rootBox,
      artifactSha256: c.artifactSha256,
    })),
    interactionResults: s.interactionResults.map((i) => ({
      name: i.name,
      outcome: i.outcome,
      detail: i.detail,
    })),
    rubric: [...s.rubric],
    // Conditional so an absent title is an ABSENT KEY: a `renderedTitle: undefined` would
    // vanish across JSON and break the round-trip invariant (I6).
    ...(s.renderedTitle ? { renderedTitle: s.renderedTitle } : {}),
  };
}

// Identifier-shaped leaks. Each carries a `probe` — a string that MUST trip it — so the
// test suite can prove every declared pattern actually fires instead of trusting the regex.
export const INTERNAL_PATTERNS: readonly {
  name: string;
  re: RegExp;
  probe: string;
}[] = [
  { name: "runId", re: /\brun-?id\b/i, probe: 'runId "r-1"' },
  { name: "elementId", re: /\belement-?id\b/i, probe: "elementId e1" },
  { name: "chosenId", re: /\bchosen-?id\b/i, probe: "chosenId slope" },
  {
    name: "provenanceHash",
    re: /\bprovenance-?hash\b/i,
    probe: "provenanceHash abc",
  },
  { name: "whySource", re: /\bwhy-?source\b/i, probe: "whySource docs/kb.md" },
  {
    name: "agent or task plumbing",
    re: /\b(sub)?agent[-_ ]?(id|label)?\b|\btask[-_ ]?(id|agent)\b/i,
    probe: "task-agent-7",
  },
  {
    name: "absolute filesystem path",
    re: /(^|[\s"'(])(\/[A-Za-z0-9._-]+){2,}|[A-Za-z]:\\/,
    probe: "/Users/someone/runs/x",
  },
];

/**
 * Refuse an input carrying orchestration plumbing.
 *
 * Throws rather than returning a verdict: a caller that reached this function with a
 * contaminated input has a bug, and shipping unpublished reporting plus internal
 * identifiers to a reviewer is not a recoverable outcome. The message names the PATTERN,
 * never the matched value — an exception that echoes the private content it was protecting
 * would just move the leak into a log.
 */
export function assertNoInternals(input: ReviewerInput): void {
  const json = JSON.stringify(input);
  for (const p of INTERNAL_PATTERNS)
    if (p.re.test(json))
      throw new Error(
        `reviewer input carries internal orchestration detail (${p.name}) — the reviewer grades the artifact, never the process`,
      );
}

// Canonical JSON: keys sorted at every depth, so a hash describes CONTENT and not the order
// an object literal happened to be written in. Written here rather than imported from
// lib/loop/canonical-hash.ts because lib/loop/manifest.ts imports this package — reaching
// back would close a cycle.
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort())
      out[k] = canonicalize((value as Record<string, unknown>)[k]);
    return out;
  }
  return value;
}

function digest(value: unknown): string {
  return Buffer.from(
    sha256(new TextEncoder().encode(JSON.stringify(canonicalize(value)))),
  ).toString("hex");
}

export function hashReviewerInput(input: ReviewerInput): string {
  return digest(input);
}

/** Findings are a SET: the same review reported in another order is the same review. */
export function hashReviewerOutput(findings: Finding[]): string {
  const sorted = [...findings]
    .map((f) => canonicalize(f))
    .map((f) => JSON.stringify(f))
    .sort();
  return digest(sorted);
}
