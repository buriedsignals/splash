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
 *  table with no matching row at all fails exactly as loudly as it always has. */
export function tableCarriesTheMarks(html) {
  const values = [...html.matchAll(/data-detail="([^"]+)"/g)].map((match) => match[1]);
  const table = /<table[\s\S]*?<\/table>/.exec(html)?.[0] ?? "";
  const cellTexts = (source) =>
    [...source.matchAll(/<t[dh][^>]*>([^<]*)<\/t[dh]>/g)].map((match) => match[1].trim());
  const cells = cellTexts(table);
  const rows = (table.match(/<tr\b/g) ?? []).length;
  const rowTexts = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) =>
    cellTexts(match[1]).join(" "),
  );
  const missing = values.filter((value) => {
    if (cells.includes(value)) return false;
    const tokens = value.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return !rowTexts.some((row) => tokens.every((token) => row.includes(token)));
  });
  return { rows, marks: values.length, missing };
}
