// twin/skills/intake/scripts/csv.mjs
// RFC 4180. A naive split on "," is the bug this file exists to prevent.

/** A csv's rows and fields, RFC 4180. THE READER EVERY OTHER ONE IN THIS TREE WAS WRITTEN INSTEAD
 *  OF, and the one the catalogue's own `csv-split-by-hand` cites as "already shipped and nobody
 *  used": a bare `row.split(",")` tears `"1,234.5"` into two fields and `"Netherlands, the"` in
 *  half, silently, with every column after it one off.
 *
 *  A QUOTED FIELD MAY CARRY A NEWLINE, and that is the clause a line-oriented reader cannot have.
 *  Splitting the text into lines first and parsing quotes per line is the shape `storyboard`'s own
 *  `readFrozenRows` carried until 2026-08-23: measured on a three-row table whose note column held
 *  one wrapped sentence, it returned FOUR rows, the fourth being the sentence's second half read as
 *  an entity name with every other column empty. `csvSplitByHand` cannot see that defect — there is
 *  no `.split(",")` in it — which is why the two skills that read a journalist's frozen table read
 *  it with one reader rather than with two that agree on the easy cases.
 *
 *  Every field comes back as TEXT. Deciding whether a cell is a number is `readNumericToken`'s job
 *  and it is a different one: "1,7" is a French decimal or a torn pair depending on the table, and
 *  a reader that guessed here would make that decision twice. */
export function parseCsv(text) {
  // A byte-order mark, when a journalist's editor writes one, sits before the
  // very first field of the very first row — strip it once, here, so a header
  // like "country" never carries it into a downstream column name.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    // A lone CR (no paired LF) still terminates a row — classic Mac line endings,
    // and stray CRs from copy-paste, must not be swallowed into field text.
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
