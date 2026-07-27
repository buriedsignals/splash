// lib/brain/rank-intent.ts
// A SUGGESTION — nothing here decides anything any more.
//
// This used to be the ONE semantic step: `propose` read the ranking's intent straight out of the
// journalist's prose with the keyword pass below. Measured on real editorial phrasings (spec
// 2026-07-27-intent-declared-design.md §1), it answered NOTHING on ordinary French claims
// ("Genève paie la prime la plus lourde" ⇒ []), nothing on ordinary English ones ("Premiums rose
// 30% over ten years" ⇒ []), nothing on a correlation in either language — and it mis-fired,
// reading a claim about spread as geography because the word "canton" appeared in it. The offer
// was then ordered by fit and readiness alone, with the run saying nothing about it.
//
// The crudeness was documented and the fallback was honest; the MECHANISM was the defect.
// Guessing the intent from someone's phrasing is exactly what the socle forbids — the tool
// describes factually and the journalist chooses the angle. So the intent is now a declared part
// of the angle (lib/loop/angle.ts), and this pass survives with one job: to OFFER a reading of a
// draft takeaway that the journalist confirms or overrules (lib/host/suggest-intent.ts). Being
// wrong now costs a pre-filled answer somebody looks at, not an order nobody was told about.
//
// It stays crude on purpose, and it must NEVER be called as a silent default: `propose` reaches
// for it only for an angle recorded before the declaration existed, and `state` reports when it
// did (lib/host/state.ts).
import { INTENTS, type Intent } from "./intents";

const CUES: Record<Intent, RegExp> = {
  "change-over-time":
    /\b(evolution|évolu|trend|tendance|since|depuis|grew|grow|augment|baiss|decline|entre \d{4}|over time|au fil)\b/i,
  magnitude: /\b(how (much|many)|combien|size|taille|total|amount|montant)\b/i,
  ranking:
    /\b(rank|classement|top|best|worst|highest|lowest|premier|dernier|plus élevé|plus faible)\b/i,
  "part-to-whole":
    /\b(share|part|proportion|percentage|pourcentage|breakdown|répartition|composition)\b/i,
  distribution:
    /\b(distribution|spread|répartit|range|écart-type|median|médiane|typical)\b/i,
  correlation:
    /\b(correlat|corrél|relationship|relation|link|lien|versus|vs\.?|against)\b/i,
  deviation:
    /\b(gap|écart|difference|différence|above|below|au-dessus|en dessous|deviation|surplus|deficit)\b/i,
  spatial:
    /\b(map|carte|region|région|canton|commune|country|pays|where|où|geograph|géograph)\b/i,
  flow: /\b(flow|flux|from .* to|transfer|migration|move[ds]? to)\b/i,
};

/**
 * What this wording MIGHT be trying to show — a suggestion, never an answer.
 *
 * Named for what it does: `intentsFromAngle` read as a derivation ("the angle's intents"), and a
 * name that reads like a fact is how a guess ends up believed. An empty result is an ordinary,
 * frequent outcome and it is reported as such — never rounded up to a plausible default.
 */
export function suggestIntents(takeaway: string): Intent[] {
  return INTENTS.filter((i) => CUES[i].test(takeaway));
}
