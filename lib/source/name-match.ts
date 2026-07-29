// Is this the SAME source, written differently?
//
// The ledger's comparison had exactly two normalization operations — toLowerCase and trim —
// and refused to record a decision whenever the form differed: a German genitive, an accent
// the CLI mangled, a URL that was literally in the article. 19 cases of 83, and each one
// produced a WORSE second act: splash worked around it silently (D17 = D01's fuel).
//
// The bar is not lowered on WHAT is required. It is lowered on the FORM of the string. The
// accepted cost (spec §7): a fabricated source whose name resembles an article word would now
// pass. MIN_STEM and the all-tokens rule are what keep that halo small.
//
// Imports nothing: skills/splash/src imports it directly.

export const MIN_STEM = 4;

/** NFD-fold combining diacritics. The same expression chart-native's conformance belt already
 *  uses (src/core/conformance.ts:255-257) — module-private there, so it is written once more
 *  here rather than reached into across the layering boundary. */
export function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeName(s: string): string {
  return deaccent(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** True when every SIGNIFICANT token of `name` appears in `article` — as a whole token, or as
 *  a stem of one (which is what makes "Bundesamt" match "Bundesamtes"). Tokens shorter than
 *  MIN_STEM are dropped, not matched loosely: "de", "of", "la" would otherwise carry a match
 *  on their own. A name with NO significant token (every one of its tokens is a short common
 *  word) has nothing that can safely stand for it, so it does not match at all — a whole-string
 *  substring fallback here would readmit exactly the bug this function exists to close: a short
 *  needle is trivially "included" in almost any haystack that happens to contain that word. */
export function nameAppearsIn(name: string, article: string): boolean {
  const hay = normalizeName(article);
  const needle = normalizeName(name);
  if (!needle) return false;
  const tokens = needle.split(" ").filter((t) => t.length >= MIN_STEM);
  if (tokens.length === 0) return false;
  const hayTokens = hay.split(" ");
  return tokens.every((t) =>
    hayTokens.some(
      (h) =>
        h === t ||
        (h.startsWith(t) && h.length - t.length <= 3) ||
        (t.startsWith(h) && h.length >= MIN_STEM && t.length - h.length <= 3),
    ),
  );
}
