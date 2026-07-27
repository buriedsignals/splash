// Prose figures: Splash RE-PRESENTS them, it never derives from them.
//
// A figure quoted in the journalist's text is not the same evidential object as a column in a
// CSV they own. The CSV is a record — re-checkable, re-aggregatable, with a denominator you can
// inspect. A prose figure is a claim that has already been published, whose method Splash does
// not hold. So the two support different operations, and this module is where that difference
// stops being a paragraph and becomes a check: every figure that reaches a visual built on a
// `prose` source must appear LITERALLY in the quoted text. A sum, a share, a per-capita or a
// growth rate computed from prose figures is a new claim nobody made.
//
// The quoted text is passed IN, never stored: the run manifest records inputs as path + sha256
// and never their content (lib/loop/freeze.ts, lib/loop/acceptance.test.ts:71). An excerpt on
// the declaration would have been input content on the manifest. So the caller reads the frozen
// article at check time and hands it here.
//
// The tokenizer mirrors lib/brain/verify-offer.ts's claim-grounding — same digit-group collapse,
// same comma-decimal normalization — because a correct French "17 600" must not read as two
// numbers. It is DUPLICATED rather than imported: `numbersIn` is not exported there, and
// lib/brain/ is outside this slice's boundary. Extracting one copy into lib/core is recorded as
// a follow-up in the design spec (§6).

// A digit-group separator (space, no-break space, narrow no-break space) between a digit and a
// following exactly-three-digit chunk is thousands grouping, not two numbers.
function collapseDigitGroups(s: string): string {
  return s.replace(/(\d)[\u0020\u00a0\u202f](?=\d{3}(?:\D|$))/g, "$1");
}

/** Every numeric token of a text, normalized (thousands collapsed, comma decimal → period). */
export function figuresIn(text: string): string[] {
  return (collapseDigitGroups(text).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) =>
    n.replace(",", "."),
  );
}

/**
 * The figures present in what will be rendered but absent from the quoted text — in order of
 * first appearance, each reported once. Empty means the visual only re-presents.
 */
export function ungroundedFigures(
  quoted: string,
  rendered: string | string[],
): string[] {
  const allowed = new Set(figuresIn(quoted));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of Array.isArray(rendered) ? rendered : [rendered])
    for (const figure of figuresIn(text)) {
      if (allowed.has(figure) || seen.has(figure)) continue;
      seen.add(figure);
      out.push(figure);
    }
  return out;
}

/**
 * Throws when a visual built on a prose source would show a figure the article never states.
 * Throws (rather than returning) for the reason verifyOffer and assertDeliveredContract throw:
 * a caller that wants to be lenient about an invented number has to say so out loud.
 */
export function assertProseGrounded(
  quoted: string,
  rendered: string | string[],
): void {
  const ungrounded = ungroundedFigures(quoted, rendered);
  if (ungrounded.length === 0) return;
  throw new Error(
    `prose source: the figure${ungrounded.length > 1 ? "s" : ""} ${ungrounded.join(", ")} ` +
      `${ungrounded.length > 1 ? "are" : "is"} nowhere in the quoted text — a prose source is re-presented, never computed from`,
  );
}
