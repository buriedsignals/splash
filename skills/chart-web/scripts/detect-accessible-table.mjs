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
 *  hover, so the table is checked against the picture's own words and cannot drift from them. */
export function tableCarriesTheMarks(html) {
  const values = [...html.matchAll(/data-detail="([^"]+)"/g)].map((match) => match[1]);
  const table = /<table[\s\S]*?<\/table>/.exec(html)?.[0] ?? "";
  const cells = [...table.matchAll(/<t[dh][^>]*>([^<]*)<\/t[dh]>/g)].map((match) => match[1].trim());
  const rows = (table.match(/<tr\b/g) ?? []).length;
  return { rows, marks: values.length, missing: values.filter((value) => !cells.includes(value)) };
}
