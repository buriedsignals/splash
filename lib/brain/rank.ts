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

// Four tiers, checked strictly in this order — each only breaks a tie the tier above left
// standing, and NONE are blended into a shared number. That is not a style choice: an earlier
// version blended a graded readiness penalty into the intent score (matching the brief's own
// scale, a constant against an intent spread of 4 per match) and it held for a form matching
// two intents, but broke at one match — the common case, since most KB sheets declare a single
// intent (a missing single-match form scored worse than a ready zero-match form). Any constant
// chosen to survive one match count is eventually crossed by enough marks or matches at some
// other count; blending is the wrong shape of fix regardless of the constant. The actual rule
// is categorical, not a trade-off: intent fit dominates readiness completely, at every match
// count. That is exactly the lesson tiers 3/4 below already teach this file (format must never
// leak into the fill decision) applied one level up — kept as a separate tier, not summed in.
//
// 1. intent fit — a form that serves the stated intent, and serves it with fewer other
//    purposes (the more specific answer), outranks EVERY form that serves it less well or not
//    at all — regardless of readiness. A journalist's angle is never buried by a credential
//    check, at any match count (spec §3.4: marked, never silently removed).
// 2. readiness — among forms that fit the intent equally, a ready one leads. Ties are broken
//    by eligibility.ts's SEVERITY ordinal (`unverified` < `disabled` < `missing`) reused
//    as-is, not redefined: for RANKING (this file) as for "worst status wins" (eligibility.ts),
//    a deliberately-off capability (`disabled` — the newsroom chose not to enable it, never a
//    failure per readiness.ts) is a firmer "not now" than a probably-working one the last check
//    simply could not REACH (`unverified`), so `disabled` ranks below `unverified` in both
//    places for the same underlying reason — this is the same ordinal answering two different
//    questions, not a contradiction of readiness.ts calling `disabled` "never a failure".
// 3. fill (0..1, computed in eligibility) — among equally-fitting, equally-ready forms, one
//    running close to its own readability cap ranks below a roomier peer.
// 4. format preference — interactive over static over video over scrolly, as a last resort.
function tiers(
  c: Candidate,
  intents: Intent[],
): [number, number, number, number] {
  const matches = c.sheet.intent.filter((i) => intents.includes(i)).length;
  const intentTier = matches > 0 ? -matches : 1;
  const readinessTier = c.readiness
    ? SEVERITY[c.readiness.status]
    : SEVERITY.ready;
  return [intentTier, readinessTier, c.fill, FORMAT_ORDER[c.format] ?? 4];
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
