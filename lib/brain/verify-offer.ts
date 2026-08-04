// The seam guard. The model writes the offer's prose; this decides whether what came back is
// still the offer. It throws rather than returning a verdict, for the reason
// assertFormatAllowed throws: a caller that wants to be lenient has to say so out loud.
//
// The order check is EXACT (same ids, same count, same positions) — not a subsequence check.
// A phrasing that drops an option is a silent removal, and the spec forbids that twice over
// (§7 "does not reorder, does not add, does NOT remove"; §8 "never silently removed"). The
// candidate most likely to be dropped is also the one the ranking penalises for being marked —
// the very form whose entire point is that the journalist gets told the path exists. Deleting
// the offer down to `[]` must throw exactly like reordering it does; both are the same
// violation (the model rewrote the list), so they share the same check and the same error.
//
// The readiness mark is STRUCTURAL, not textual. An earlier version tried to verify "the why
// discloses the mark" by keyword-matching the reason string, in a product whose prose ships in
// French, German and Italian. That failed three independent ways: an empty `reason` (a
// capability the newsroom simply switched off — readiness.ts:54, before eligibility.ts's fix)
// made every possible `why` throw; a `why` that named the dependency while claiming the
// OPPOSITE ("chart-native est déjà là, tout est prêt") satisfied it anyway, because the check
// only asked whether a word was present, never what the sentence did with it; and a faithful
// non-English disclosure that never happened to repeat the English reason string was refused.
// The guard cannot verify MEANING across languages, so it no longer tries to. Instead it
// verifies that the phrasing step consciously handled the mark: `PhrasedOption.markAcknowledged`
// is a boolean the phrasing step must set to `true` for a marked option, and the mark's own
// words — status, reason, help — are emitted by the CODE beside the why (by whatever renders
// the offer to the journalist), never left for the model to remember or restate.
//
// Accepted limitations — known and deliberate, not oversights:
//   - CROSS-ATTRIBUTION: two options' `why` bodies swapped still passes. There is no textual
//     tie to check against — the sheet fragments are English and the prose is the journalist's
//     language, so nothing here can tell "this why was actually written for that option."
//   - SPELLED-OUT NUMBERS ("vingt-six cantons") bypass claim-grounding entirely. Only
//     digit-shaped claims are checked.
//   - AN EMPTY `why` passes for an unmarked option. There is no substance floor.
import type { Offer } from "./offer";
import { figuresIn } from "../core/figures";

export type PhrasedOption = {
  id: string;
  why: string;
  markAcknowledged?: true;
  limitsAcknowledged?: true;
};

export function verifyOffer(phrased: PhrasedOption[], offer: Offer): void {
  const offered = offer.options.map((o) => o.id);
  const discarded = new Set(offer.excluded.map((e) => e.id));

  for (const p of phrased) {
    if (discarded.has(p.id))
      throw new Error(
        `verifyOffer: "${p.id}" was discarded, and is presented as offered`,
      );
    if (!offered.includes(p.id))
      throw new Error(`verifyOffer: "${p.id}" was not offered`);
  }
  // Exact match: same ids, same count, same order. Dropping an option (including dropping ALL
  // of them, phrased = []) fails this exactly like reordering does — a shorter list is still a
  // list that no longer matches, position for position.
  const got = phrased.map((p) => p.id);
  if (got.length !== offered.length || got.some((id, i) => id !== offered[i]))
    throw new Error(
      `verifyOffer: the order changed — offered ${offered.join(", ")}, phrased ${got.join(", ")}`,
    );

  for (const p of phrased) {
    const option = offer.options.find((o) => o.id === p.id)!;
    // Claim grounding: every number in the prose must be a number the brain computed, or one
    // the sheet's own fragments already contain. Anything else is invented.
    const allowed = new Set([
      ...Object.values(option.whySource.facts).flatMap(figuresIn),
      ...option.whySource.fragments.flatMap(figuresIn),
      ...figuresIn(option.readiness?.reason ?? ""),
    ]);
    for (const n of figuresIn(p.why))
      if (!allowed.has(n))
        throw new Error(
          `verifyOffer: "${p.id}" claims the number ${n}, which is in neither the facts nor the sheet`,
        );
    // Structural acknowledgement, not textual disclosure — see the header. A marked option
    // must set markAcknowledged; an unmarked one must not (there is nothing to acknowledge).
    if (option.readiness && p.markAcknowledged !== true)
      throw new Error(
        `verifyOffer: "${p.id}" is marked (${option.readiness.status}) and the phrasing did not acknowledge it`,
      );
    if (!option.readiness && p.markAcknowledged)
      throw new Error(
        `verifyOffer: "${p.id}" is not marked, so there is no mark for it to acknowledge`,
      );
    // Same discipline as a readiness mark, for a DIFFERENT thing: a mark says the form may not
    // be buildable; a limit says the form IS buildable and will not do one specific thing. Both
    // must be shown, and the guard can only check that structurally — so the reason itself is
    // printed by code, never left to the model to restate.
    if (option.limits?.length && p.limitsAcknowledged !== true)
      throw new Error(
        `verifyOffer: "${p.id}" declares a render limit and the phrasing does not set ` +
          "limitsAcknowledged — print the limit beside the why",
      );
    if (!option.limits?.length && p.limitsAcknowledged)
      throw new Error(
        `verifyOffer: "${p.id}" declares no render limit, so limitsAcknowledged must not be set`,
      );
  }
}

// A digit-group separator — ordinary space, non-breaking space, narrow no-break space — sitting
// between a digit and a following exactly-three-digit chunk is thousands grouping ("8 000",
// "1 234 567"), not two different numbers. Collapsed before numbers are extracted, on BOTH the
// prose and the grounding sources, so correct French/German/Italian prose at ordinary data
// sizes (>= 1000 rows) is not refused for how it writes a number it got right.
