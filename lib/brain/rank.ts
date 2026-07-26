// lib/brain/rank.ts
// The SOFT half. Ordering only — the membership of the array it is handed is the membership it
// returns. That is the whole reason a semantic input (the intent, read from prose) is allowed
// anywhere near the brain: it can be wrong and cost nothing but an order.
//
// The ordering is task-efficiency-first, per FT Visual Vocabulary + the effectiveness-by-task
// literature (Saket, TVCG 2019 · Kim & Heer). No solver, no learned weights, and the model is
// never asked to rank (spec §4.2).
import type { Intent } from "./intents";
import { SEVERITY, type Candidate } from "./eligibility";

const FORMAT_ORDER: Record<string, number> = {
  interactive: 0,
  static: 1,
  video: 2,
  scrolly: 3,
};

// Readiness MARKS, it does not remove (spec §3.4) — a capability that is missing, disabled, or
// merely unverified still gets offered, just penalised, so a graded readiness check must never
// be able to out-rank intent fit into oblivion. MARK_PENALTY=10 against an intent spread of 4
// per match is the brief's own scale: a marked form matching two intents (-2*4 + 10 = +2) still
// beats a ready form matching none (+1*4 = +4). Graded by SEVERITY (eligibility.ts) rather than
// binary, because the statuses are not interchangeable — readiness.ts is explicit that
// "unverified" only means the last check could not REACH the provider and may well work, while
// "missing" is the one status that means the form cannot be built right now. Scaled so the
// worst severity (missing) lands on the brief's original 10, and lesser severities land
// proportionally below it — the invariant above holds for every graded value, not just the
// ceiling.
const MARK_PENALTY = 10;
const WORST_SEVERITY = SEVERITY.missing;

function markPenalty(c: Candidate): number {
  if (!c.readiness) return 0;
  return (MARK_PENALTY / WORST_SEVERITY) * SEVERITY[c.readiness.status];
}

// Three tiers, checked in this order, each only breaking a tie the tier above left standing:
// 1. intent fit combined with the readiness penalty — a form that serves the stated intent
//    (and serves it with fewer other purposes — the more specific answer) comes first; a
//    marked form is penalised within this same tier, graded by how severe the mark is, never
//    enough on its own to bury a form that clearly serves the intent (see markPenalty above).
// 2. fill (0..1, computed in eligibility) — among equally-fitting, equally-ready forms, one
//    running close to its own readability cap ranks below a roomier peer.
// 3. format preference — interactive over static over video over scrolly, as a last resort.
//
// Tier 1 is intentionally a blended sum (matching the brief's graded trade-off) but tiers 1, 2
// and 3 are compared as separate tiers, not blended together: a single float across ALL four
// factors risks a low-priority weight (format) leaking into a higher-priority decision (fill)
// whenever their gaps are close — exactly the bug the brief's own reference formula had, and
// exactly the failure a "roomier form leads" guarantee cannot tolerate. Splitting fill and
// format into their own tiers below the intent/readiness blend keeps that guarantee airtight
// while still letting intent and readiness trade off against each other by degree, as designed.
function tiers(c: Candidate, intents: Intent[]): [number, number, number] {
  const matches = c.sheet.intent.filter((i) => intents.includes(i)).length;
  const intentComponent = (matches > 0 ? -matches : 1) * 4;
  const intentTier = intentComponent + markPenalty(c);
  return [intentTier, c.fill, FORMAT_ORDER[c.format] ?? 4];
}

export function rank(candidates: Candidate[], intents: Intent[]): Candidate[] {
  return candidates
    .map((c, i) => ({ c, i, key: tiers(c, intents) }))
    .sort((a, b) => {
      for (let t = 0; t < a.key.length; t++) {
        const d = a.key[t]! - b.key[t]!;
        if (d !== 0) return d;
      }
      return a.i - b.i; // stable on ties
    })
    .map((x) => x.c);
}
