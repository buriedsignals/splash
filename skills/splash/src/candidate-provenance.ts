// candidate-provenance.ts — the mechanical lever that makes the suggester's candidates menu
// a PRECONDITION of production (Tom feedback #1/#2/#3; harness↔tool boundary audit 2026-07-18).
//
// The rule the harness used to be the ONLY enforcer of: the orchestrator ROUTES through
// suggest-chart's ranked candidates, it never hand-authors a producer spec. produce-all now
// refuses (fail-hard, recorded) a proposal that cannot trace to a persisted candidate — so
// check:hand-authored-spec / :suggest-chart-no-candidates / :single-proposal-no-alternatives
// demote from "detection of an unguarded gap" to "verification of a tool-enforced invariant".
//
// The invariant is PRODUCER-level: the shipped producer must appear in the persisted menu (and a
// menu must exist at all). The match is deliberately NOT type-level: the candidate/spec type
// vocabularies do not reliably align — a narrative candidate names the FORMAT ("chart-scrolly",
// "map-scrolly", "map-story") while the produced spec names the underlying chart type ("line",
// "choropleth"), and image-native's manifest carries no type at all. A type-strict match would
// FALSE-BLOCK every scrolly/narrative run — and a false block kills a real journalist's run, the
// cardinal sin. So the tool guarantees the load-bearing invariant (a menu existed and the
// producer came from it); finer "same producer, off-menu type" cases stay caught in QA by the
// harness (check:hand-authored-spec flags any spec Write) and by GUARD 5 (skillsInvoked), and by
// GUARD 4 (claim-grounding) for fabricated content. Type-granularity is a documented follow-up.
import type { AcceptedProposal, Producer } from "./producer-spec";
import { AUTHORABLE_SCROLLY_TYPES } from "../../chart-native/src/chart-story";
import { MAP_TYPES } from "../../map-native/src/map-types";

const DIRECT_BRANCH_TOKEN = "splash:cadrage-direct";

/** The provenance context produce-all's CLI builds from the candidates.json beside accepted.json. */
export interface CandidateProvenance {
  /** Whether a candidates.json sibling existed and parsed (false ⇒ the menu was never made). */
  present: boolean;
  /** Every `producer` named by a candidate, at any nesting depth. */
  producers: Set<string>;
}

/**
 * Recursively collect every string `producer` from a parsed candidates.json — robust to the
 * artifact shape (`{ candidates: [...] }`, a bare array, or a per-opportunity nesting all yield
 * the same flat set). A candidate object is identified loosely (a string `producer`), so a
 * candidate that omitted its `type` still contributes its producer to the menu; non-candidate
 * objects (probes, prose, CSV rows) simply carry no `producer` string and are ignored.
 */
export function extractCandidateProducers(json: unknown): Set<string> {
  const producers = new Set<string>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (typeof obj.producer === "string") producers.add(obj.producer);
    for (const value of Object.values(obj)) visit(value);
  };
  visit(json);
  return producers;
}

/**
 * The producer-spec's visual type, across the heterogeneous field naming (dw-chart/map-native/
 * map-dw use `type`, chart-native uses `nativeType`, scrolly uses either, image-native's manifest
 * has neither → null). Used ONLY to enrich the fail-hard message, never for the match decision.
 */
export function specType(spec: unknown): string | null {
  if (!spec || typeof spec !== "object") return null;
  const s = spec as { type?: unknown; nativeType?: unknown };
  if (typeof s.type === "string") return s.type;
  if (typeof s.nativeType === "string") return s.nativeType;
  return null;
}

/**
 * Is this proposal the DIRECT branch (journalist NAMED the visual)? The ONLY provenance
 * exemption. Absent skillsInvoked is NOT direct — that is what closes the omission hole: an
 * improviser can no longer skip the menu by simply omitting the field; they would have to
 * FALSELY declare direct (a visible, checkable claim).
 */
export function isDirectBranch(p: AcceptedProposal): boolean {
  return (p.skillsInvoked ?? []).includes(DIRECT_BRANCH_TOKEN);
}

/**
 * The fail-hard decision for one proposal. Returns an actionable, self-recovering message when
 * the proposal has no candidate provenance (no menu at all, or a producer the menu never
 * proposed), or null when it passes (or is a direct-branch exemption). The message always names
 * the direct-branch escape hatch so a genuine direct run that forgot to declare its branch
 * recovers without code spelunking.
 */
export function candidateProvenanceIssue(
  p: AcceptedProposal,
  provenance: CandidateProvenance,
): string | null {
  if (isDirectBranch(p)) return null;

  const escapeHatch =
    ` — if the journalist NAMED this visual, mark it direct ` +
    `(skillsInvoked: ["${DIRECT_BRANCH_TOKEN}", …]); otherwise route it through ` +
    `suggest-chart's candidates menu (persist candidates.json beside accepted.json)`;

  if (!provenance.present) {
    return (
      `no candidates.json beside accepted.json — the ranked candidates menu was never ` +
      `made, so proposal "${p.id}" (${p.producer}) cannot be a menu choice` +
      escapeHatch
    );
  }

  if (provenance.producers.has(p.producer)) return null;

  const type = specType(p.spec);
  const shown = type ? `${p.producer}/${type}` : p.producer;
  return (
    `proposal "${p.id}" (${shown}) uses a producer the suggester never proposed — its ` +
    `candidates.json names [${[...provenance.producers].sort().join(", ") || "none"}]` +
    escapeHatch
  );
}

// A candidate is NARRATIVE when its producer is a narrative engine (scrolly / image-native) or
// its type/format names a narrative form (scrolly · story · video · reveal). The suggest-chart
// contract (SKILL.md): the menu carries EITHER at least one narrative-family candidate OR an
// explicit `narrativeRuledOut` reason — "silent narrative absence is not a valid payload".
const NARRATIVE_TYPE_RE = /scrolly|story|video|reveal/i;
const NARRATIVE_PRODUCERS = new Set<string>(["scrolly", "image-native"]);

function nodeIsNarrativeCandidate(obj: Record<string, unknown>): boolean {
  if (typeof obj.producer === "string" && NARRATIVE_PRODUCERS.has(obj.producer))
    return true;
  const t = typeof obj.type === "string" ? obj.type : "";
  const f = typeof obj.format === "string" ? obj.format : "";
  return NARRATIVE_TYPE_RE.test(t) || NARRATIVE_TYPE_RE.test(f);
}

/**
 * Tom feedback #3, surfaced by the tool (menu-level, NON-blocking). Returns a warning when a
 * PRESENT candidates.json carries NEITHER a narrative-family candidate NOR a non-empty
 * `narrativeRuledOut` reason — the "silent narrative absence" the suggest-chart contract forbids.
 * Null when narrative was considered (offered or explicitly ruled out). This moves the check that
 * used to live only in the harness (check:narrative-not-considered) into the tool as an
 * observability signal; the harness verifies it. Recurses so a per-opportunity nesting works.
 */
/** The narrative form THIS element could have taken, or null when it has none. Derived from the
 *  engines' own lists, never from a hand-kept table: a chart scrolly is authorable for
 *  AUTHORABLE_SCROLLY_TYPES only (chart-story.ts:127), and a map track exists for MAP_TYPES. */
function narrativeSiblingOf(
  accepted: unknown[] | undefined,
): { form: string; type: string } | null {
  for (const a of accepted ?? []) {
    const p = a as { producer?: string; spec?: Record<string, unknown> };
    const nt =
      typeof p.spec?.nativeType === "string" ? p.spec.nativeType : null;
    const mt = typeof p.spec?.type === "string" ? p.spec.type : null;
    if (
      p.producer === "chart-native" &&
      nt &&
      (AUTHORABLE_SCROLLY_TYPES as readonly string[]).includes(nt)
    )
      return { form: "chart-scrolly", type: nt };
    if (
      p.producer === "map-native" &&
      mt &&
      (MAP_TYPES as readonly string[]).includes(mt)
    )
      return { form: "map-scrolly", type: mt };
  }
  return null;
}

export function narrativeConsiderationWarning(
  json: unknown,
  accepted?: unknown[],
): string | null {
  let sawNarrativeCandidate = false;
  let sawRuledOut = false;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (
      typeof obj.narrativeRuledOut === "string" &&
      obj.narrativeRuledOut.trim() !== ""
    )
      sawRuledOut = true;
    if (nodeIsNarrativeCandidate(obj)) sawNarrativeCandidate = true;
    for (const value of Object.values(obj)) visit(value);
  };
  visit(json);
  if (sawNarrativeCandidate || sawRuledOut) return null;
  const base =
    "candidates.json considered NO narrative form and carries no explicit " +
    "`narrativeRuledOut` reason — the menu skipped the narrative family (chart-scrolly · " +
    "map-story · map-scrolly · image-scrolly · video reveal) silently. Either offer the " +
    'narrative candidate the story shape warrants, or state `narrativeRuledOut: "<reason>"` ' +
    "(suggest-chart contract: silent narrative absence is not a valid payload)";
  if (accepted === undefined) return base;
  // SIGNAL AND PROPOSE (the form D25 took in family B): name the concrete sibling of THIS run's
  // element, or say plainly that it has none — naming one it does not have would be the same
  // false promise this family exists to close.
  const sib = narrativeSiblingOf(accepted);
  return sib
    ? `${base}. For this run: the ${sib.type} you accepted also comes as a ${sib.form} — ` +
        "offer it, or rule it out by name."
    : base +
        ". For this run: the element you accepted has no narrative form of its own, so " +
        "`narrativeRuledOut` is the honest answer here.";
}
