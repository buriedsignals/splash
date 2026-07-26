// The seam guard. The model writes the offer's prose; this decides whether what came back is
// still the offer. It throws rather than returning a verdict, for the reason
// assertFormatAllowed throws: a caller that wants to be lenient has to say so out loud.
import type { Offer } from "./offer";

export type PhrasedOption = { id: string; why: string };

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
  // A phrasing may offer fewer options than the brain did (it never adds one — that already
  // throws above), so this checks the RELATIVE order survives, not that every option is present:
  // the ids the model kept must appear in strictly increasing offered-position.
  const positions = phrased.map((p) => offered.indexOf(p.id));
  for (let i = 1; i < positions.length; i++)
    if (positions[i] <= positions[i - 1])
      throw new Error(
        `verifyOffer: the order changed — offered ${offered.join(", ")}, phrased ${phrased.map((p) => p.id).join(", ")}`,
      );

  for (const p of phrased) {
    const option = offer.options.find((o) => o.id === p.id)!;
    // Claim grounding: every number in the prose must be a number the brain computed, or one
    // the sheet's own fragments already contain. Anything else is invented.
    const allowed = new Set([
      ...Object.values(option.whySource.facts).flatMap(numbersIn),
      ...option.whySource.fragments.flatMap(numbersIn),
      ...numbersIn(option.readiness?.reason ?? ""),
    ]);
    for (const n of numbersIn(p.why))
      if (!allowed.has(n))
        throw new Error(
          `verifyOffer: "${p.id}" claims the number ${n}, which is in neither the facts nor the sheet`,
        );
    // A marked form must SAY it is marked: offering it bare promises what the install cannot do.
    if (option.readiness && !mentionsMark(p.why, option.readiness.reason))
      throw new Error(
        `verifyOffer: "${p.id}" is marked (${option.readiness.status}) and its why does not say so`,
      );
  }
}

function numbersIn(s: string): string[] {
  return (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
}

// The mark has to survive translation, so this cannot match on wording: it asks that the why
// carry a content word of the reason the brain produced.
function mentionsMark(why: string, reason: string): boolean {
  const words = reason
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 3);
  const hay = why.toLowerCase();
  return words.some((w) => hay.includes(w));
}
