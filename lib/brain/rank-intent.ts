// lib/brain/rank-intent.ts
// Deriving an intent from the journalist's takeaway is the ONE semantic step, and it is
// deliberately crude: a keyword pass over the confirmed takeaway. It feeds the ranking only
// (spec §4.2), so being wrong costs an order, never a form. A richer reader can replace this
// file without touching anything else.
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

export function intentsFromAngle(takeaway: string): Intent[] {
  const hits = INTENTS.filter((i) => CUES[i].test(takeaway));
  // No cue ⇒ no intent: the ranking then falls back on fit and readiness, which is the honest
  // behaviour. It must NOT guess "magnitude" and quietly reorder the offer around a guess.
  return hits;
}
