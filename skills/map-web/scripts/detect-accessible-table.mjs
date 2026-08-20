/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts` — the same
 *  `GUARDS` convention `verify-guards.mjs` uses for this format's guards, extended to a capability's
 *  own `detectedBy` name. */
export const GUARDS = ["tableCarriesTheMarks"];

/** The values a delivered page's marks carry, against the values its table carries.
 *
 *  Reads the ARTEFACT, never the component: a `role="table"` in source proves an element exists and
 *  says nothing about what is in it. A mark announces its own fact in `data-detail` — measured on
 *  2026-08-20, 104 of them on one delivered page — which is the exact string the reader gets on
 *  hover, so the primary check is the table's cells against the picture's own words, verbatim.
 *
 *  A CAPABILITY STATES WHAT A READER GETS, NOT HOW A TABLE IS SHAPED. Ruled 2026-08-20 after a
 *  review found the exact-cell check alone refused a table that split the same fact into typed
 *  columns — one cell for a name, one for a number, one for a date — which a screen reader's own
 *  table navigation reads exactly as completely as one joined cell, and nothing about the rule this
 *  detector confirms asked for a single cell in particular. A value that fails the exact check is
 *  given one more chance, PER ROW, never pooled across the whole table: tokenised on every run of
 *  characters that is not a letter or a number, accepted only if some SINGLE row's own cells,
 *  concatenated, contain every one of those tokens. A row that shares only some of them is still
 *  refused — nothing here reassembles a fact from pieces scattered across different rows, and a
 *  table with no matching row at all fails exactly as loudly as it always has.
 *
 *  TOKEN SETS, NOT SUBSTRINGS. Ruled again 2026-08-20, fix round 1, after a review found the first
 *  version of this fallback compared a value's own token against the row's RAW TEXT with
 *  `String.includes` — a plain substring test, so a short or numeric token matches inside an
 *  unrelated longer one: `"9"` is a substring of `"1990"`, and this format's own tokeniser produces
 *  single-character tokens from ordinary decimal values (`"68.9"` → `"68"`, `"9"`). The row's own
 *  concatenated text is now tokenised with the SAME splitter used on the value, into a SET, and a
 *  value's token must be an ELEMENT of that set — `"9"` is an element of `{"Springfield","pop",
 *  "1990"}` only if the row actually carries a standalone `"9"`, which `"1990"` tokenised alone is
 *  not.
 *
 *  A SET ALONE STILL ISN'T ENOUGH FOR A ONE-CHARACTER TOKEN. Measured directly: plain set membership
 *  still accepts `"A · Canada"` against a row reading `"Canada, magnitude class A-band"`, because the
 *  SAME splitter that separates `"68.9"` into `"68"`/`"9"` also separates `"A-band"` into `"A"`/
 *  `"band"` — the row's set legitimately contains `"A"`, and nothing about set membership can tell a
 *  token that was always its own word from one that only exists because a compound identifier got
 *  torn in half. So a ONE-CHARACTER value token is held to a stricter test than set membership: it
 *  must appear in the row's own RAW text as a standalone run, bounded by anything except a letter, a
 *  number, or a HYPHEN specifically — `"A"` in `"A-band"` is bounded by a hyphen on its right and
 *  fails; `"9"` in `"M7.9"` is bounded by a period, not a hyphen, and still passes. Multi-character
 *  tokens are unaffected and still compared by plain set membership, exactly as ruled above. */
export function tableCarriesTheMarks(html) {
  const values = [...html.matchAll(/data-detail="([^"]+)"/g)].map((match) => match[1]);
  const table = /<table[\s\S]*?<\/table>/.exec(html)?.[0] ?? "";
  const cellTexts = (source) =>
    [...source.matchAll(/<t[dh][^>]*>([^<]*)<\/t[dh]>/g)].map((match) => match[1].trim());
  const cells = cellTexts(table);
  const rows = (table.match(/<tr\b/g) ?? []).length;
  const tokenise = (text) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const rowTexts = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) =>
    cellTexts(match[1]).join(" "),
  );
  const rowTokenSets = rowTexts.map((text) => new Set(tokenise(text)));
  const standalone = (token, rowText) =>
    new RegExp(`(?<![\\p{L}\\p{N}-])${token}(?![\\p{L}\\p{N}-])`, "u").test(rowText);
  const missing = values.filter((value) => {
    if (cells.includes(value)) return false;
    const tokens = tokenise(value);
    return !rowTokenSets.some((rowTokens, i) =>
      tokens.every((token) =>
        token.length === 1 ? standalone(token, rowTexts[i]) : rowTokens.has(token),
      ),
    );
  });
  return { rows, marks: values.length, missing };
}
