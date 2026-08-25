// twin/skills/intake/scripts/header.mjs
//
// WHERE A FROZEN TABLE'S HEADER ACTUALLY IS, AND WHAT ITS BLANK NAMES MEAN.
//
// `profileTable` used to take `rows[0]` as the header and every one of its cells as a column name.
// Round eight froze two publishers' real files and both broke it, in opposite directions:
//
//   Destatis  21 named columns followed by 16 with NO header and no value in any of the 327 rows —
//             a spreadsheet's used range overshooting its own table. The profile came back with
//             37 columns, the last sixteen named "", handed to every later phase that addresses a
//             column BY NAME.
//   SLF       three banner lines above the header. The profile came back with ONE column named
//             "WSL Institute for Snow and Avalanche Research SLF" and 1,409 rows, over a file with
//             21 columns and 1,406 rows. No warning, exit 0.
//
// Both are one defect: intake wrote a record the bytes it had just read deny, and could not observe
// that it had. This is the observation. It never edits the publisher's file — `freezeSource` writes
// those bytes through untouched — and it never guesses: a file whose rows agree on no width is
// reported as having no header this can find, rather than being handed one.
//
// A NOTE ON REPAIR VERSUS REPORT, the standing rule in this profiler: nothing here is clamped,
// re-scaled or dropped in silence. A column is dropped only when the publisher named it nothing AND
// no row carries a value in it, and the drop is listed with its index; an unnamed column that
// carries values is kept, named by position, and the record says the name is this profiler's.

/** The width the rows of a table agree on — the modal field count of every row that carries any
 *  content at all.
 *
 *  MODAL, NOT MAXIMAL: one stray row with an extra comma in it must not redefine the table, and a
 *  banner line must not either. Ties go to the WIDER width, because a table's real header is the
 *  widest thing several rows agree on; a two-way tie between 1 and 21 on a file with three banner
 *  lines and three data rows would otherwise read the banner as the table. */
export function tableWidth(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (row.every((cell) => cell.trim() === "")) continue;
    counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
  }
  let width = null;
  let best = 0;
  for (const [candidate, count] of [...counts.entries()].sort((a, b) => b[0] - a[0])) {
    if (count > best) {
      best = count;
      width = candidate;
    }
  }
  return width;
}

/** A table's header, its banner, its body, and every change this reading made to the names.
 *
 *  Returns `{ headerAt, names, banner, body, dropped, renamed, says }`.
 *  `headerAt` is `null` when no row is as wide as the table, which is a refusal and not an answer:
 *  `names` and `body` are empty and `says` states it.
 *  `says` is `null` when this reading changed nothing — the field a caller can put straight into a
 *  record without having to decide whether an empty string means "clean" or "never asked". */
export function readHeader(rows) {
  const width = tableWidth(rows);
  if (width === null)
    return {
      headerAt: null,
      names: [],
      banner: [],
      body: [],
      dropped: [],
      renamed: [],
      says: "no header could be read: no row of this file carries any content",
    };

  const headerAt = rows.findIndex(
    (row) => row.length === width && row.some((cell) => cell.trim() !== ""),
  );
  if (headerAt === -1)
    return {
      headerAt: null,
      names: [],
      banner: [],
      body: [],
      dropped: [],
      renamed: [],
      says: `no header could be read: this file's rows are ${width} fields wide and no row of that width carries a name`,
    };

  const banner = rows.slice(0, headerAt);
  const rawHeader = rows[headerAt];
  const rawBody = rows.slice(headerAt + 1);

  const dropped = [];
  const renamed = [];
  const keep = [];
  rawHeader.forEach((cell, index) => {
    const name = cell.trim();
    if (name !== "") {
      keep.push(index);
      return;
    }
    const carrying = rawBody.filter((row) => (row[index] ?? "").trim() !== "").length;
    if (carrying === 0) {
      dropped.push({
        index,
        says: "the publisher named no column here and no row carries a value in it",
      });
      return;
    }
    keep.push(index);
    renamed.push({
      index,
      name: `column ${index + 1}`,
      says: `the publisher named no column here, and ${carrying} of ${rawBody.length} rows carry a value in it, so it is named by its position and the name is this profiler's, not the publisher's`,
    });
  });

  const renamedAt = new Map(renamed.map((r) => [r.index, r.name]));
  const names = keep.map((index) => renamedAt.get(index) ?? rawHeader[index].trim());
  const body = rawBody.map((row) => keep.map((index) => row[index] ?? ""));

  const said = [];
  if (banner.length)
    said.push(
      `this file's header is on line ${headerAt + 1}; the ${banner.length} line${banner.length === 1 ? "" : "s"} above it are a publisher's banner and are not data`,
    );
  if (dropped.length)
    said.push(
      `${dropped.length} column${dropped.length === 1 ? " was" : "s were"} dropped: the publisher named ${dropped.length === 1 ? "it" : "them"} nothing and no row carries a value in ${dropped.length === 1 ? "it" : "them"} (index ${dropped.map((d) => d.index).join(", ")})`,
    );
  if (renamed.length)
    said.push(
      `${renamed.length} column${renamed.length === 1 ? " carries" : "s carry"} values under no name and ${renamed.length === 1 ? "is" : "are"} named by position here (${renamed.map((r) => r.name).join(", ")})`,
    );

  return {
    headerAt,
    names,
    banner,
    body,
    dropped,
    renamed,
    says: said.length ? said.join("; ") : null,
  };
}
