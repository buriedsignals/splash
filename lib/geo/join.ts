// The join ledger — spec D6. `pending` is this task's addition to the spec's own type sketch:
// the raw values a below-ADM1 join found ambiguous and has not yet resolved. Populating it (and
// `decisions`) from an actual journalist dialogue is out of this task's scope — see this task's
// header in the plan.
export type GeoJoinDecision = {
  value: string; // the raw value in the journalist's column
  featureId: string; // the polygon it was bound to
  basis: "unambiguous" | "journalist";
};

export type GeoJoinLedger = {
  column: string;
  geographySha256: string; // WHICH file these decisions were taken against (D1b)
  decisions: GeoJoinDecision[];
  pending: string[]; // values still awaiting a decision
};

/** Mirrors lib/loop/manifest.ts's unauthoredBeats(el) exactly: a list of what is still owed,
 *  never a count. Empty ⇒ produce may proceed (Task 15's gate). */
export function unresolvedGeoJoins(
  ledger: GeoJoinLedger | undefined,
): string[] {
  if (!ledger) return [];
  const decided = new Set(ledger.decisions.map((d) => d.value));
  return ledger.pending.filter((v) => !decided.has(v));
}

/** A decision taken against one file must not be replayed against a different one — spec D6's
 *  PH-13 case: a code reassigned to a different region under a newer boundary release is
 *  EXACTLY the mechanism of a wrong map with no error. True ⇒ the caller re-poses the decisions
 *  as new questions rather than trusting `decisions` as-is. */
export function staleGeoJoinDecisions(
  ledger: GeoJoinLedger | undefined,
  currentGeographySha256: string,
): boolean {
  if (!ledger) return false;
  return ledger.geographySha256 !== currentGeographySha256;
}
