// twin/skills/intake/scripts/csv.mjs
// RFC 4180. A naive split on "," is the bug this file exists to prevent.

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
