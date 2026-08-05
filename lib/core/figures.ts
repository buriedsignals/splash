// THE NUMERIC TOKENS OF A TEXT — one definition, because three guards read the same numbers.
//
// This lived in three copies (registry A18): `figuresIn` in lib/source/prose.ts and `numbersIn`
// in both lib/brain/verify-offer.ts and lib/brain/verify-beats.ts. They were byte-identical in
// behaviour when measured, which is exactly why the copies were dangerous rather than obviously
// broken: nothing was failing, and the next fix to the tokenizer would have landed in one of
// them. All three feed a GROUNDING guard — "is this figure in the source the journalist quoted"
// — so a tokenizer that disagrees with itself means one guard passes what another refuses.
//
// The three separators are not decoration: a French or Swiss article writes 17 600 with a plain
// space, a non-breaking space, or a narrow non-breaking space depending on the CMS that produced
// it, and a reader of the same number must collapse all three or invent a figure that is not in
// the text (17 and 600 instead of 17600).
/** Thousands separators a real article uses: space, NBSP, narrow NBSP. Collapsed so a grouped
 *  figure reads as ONE number and not as two. */
function collapseDigitGroups(s: string): string {
  return s.replace(/(\d)[   ](?=\d{3}(?:\D|$))/g, "$1");
}

/** Every numeric token of a text, normalized: thousands collapsed, comma decimal → period. */
export function figuresIn(text: string): string[] {
  return (collapseDigitGroups(text).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) =>
    n.replace(",", "."),
  );
}
