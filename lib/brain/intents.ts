// The CLOSED intent vocabulary: the nine categories of the FT Visual Vocabulary, the canon
// the KB sheets already cite in their own source headers. Closed on purpose — an intent
// outside this list would be a fact nobody can rank against.
export const INTENTS = [
  "deviation",
  "correlation",
  "ranking",
  "distribution",
  "change-over-time",
  "magnitude",
  "part-to-whole",
  "spatial",
  "flow",
] as const;

export type Intent = (typeof INTENTS)[number];

export function isIntent(v: unknown): v is Intent {
  return typeof v === "string" && (INTENTS as readonly string[]).includes(v);
}
