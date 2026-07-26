// lib/brain/rank.ts
// The SOFT half. Ordering only — the membership of the array it is handed is the membership it
// returns. That is the whole reason a semantic input (the intent, read from prose) is allowed
// anywhere near the brain: it can be wrong and cost nothing but an order.
//
// The ordering is task-efficiency-first, per FT Visual Vocabulary + the effectiveness-by-task
// literature (Saket, TVCG 2019 · Kim & Heer). No solver, no learned weights, and the model is
// never asked to rank (spec §4.2).
import type { Intent } from "./intents";
import type { Candidate } from "./eligibility";

const FORMAT_ORDER: Record<string, number> = {
  interactive: 0,
  static: 1,
  video: 2,
  scrolly: 3,
};

// Four tiers, checked in this order, each only breaking a tie the tier above left standing:
// 1. readiness — a marked form (missing/disabled/unverified capability) sinks below every
//    ready one, regardless of how well it fits the intent: a journalist cannot use what is
//    not there, so fit is moot until the form is usable.
// 2. intent fit — among usable forms, one that serves the stated intent, and serves it with
//    fewer other purposes (the more specific answer), comes first.
// 3. fill (0..1, computed in eligibility) — a form running close to its own readability cap
//    ranks below a roomier peer.
// 4. format preference — interactive over static over video over scrolly, as a last resort.
//
// These are compared as separate tiers, not blended into one weighted sum: a single float
// score risks a low-priority tier's weight (format) leaking into a higher-priority tier's
// decision (fill) whenever their gaps are close — exactly the failure a "roomier form leads"
// guarantee cannot tolerate. Each tier is authoritative on its own terms.
function tiers(
  c: Candidate,
  intents: Intent[],
): [number, number, number, number] {
  const matches = c.sheet.intent.filter((i) => intents.includes(i)).length;
  const readinessTier = c.readiness ? 1 : 0;
  const intentTier = matches > 0 ? -matches : 1;
  return [readinessTier, intentTier, c.fill, FORMAT_ORDER[c.format] ?? 4];
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
