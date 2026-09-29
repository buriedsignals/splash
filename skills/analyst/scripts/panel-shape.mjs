// twin/skills/storyboard/scripts/panel-shape.mjs
// THE SHAPE OF A PANEL AND THE COLUMN ITS PERIODS LIVE IN — ONE DECISION, CARRIED.
//
// `storyboard/scripts/ground-claim.mjs` (the grounding check, which decides a gate) and
// `intake/scripts/profile.mjs` (the profiler, carried into `analyst`) must not answer "is this a
// panel, and which column names its subject" differently about the same frozen file: the profiler
// would say panel and the grounding check would say flat table, and the second is the one that
// decides a gate. So both import this file, which is carried byte for byte into
// `intake/scripts/panel-shape.mjs` and `analyst/scripts/panel-shape.mjs` (line 1 names the
// canonical; `splash/test/carried-copies.test.ts` holds the copies to it).

/**
 * THE SHAPE OF A PANEL, DERIVED FROM THE ROWS (three real stories, 2026-08-22).
 *
 * Every fixture this file was built against holds ONE row per period, and every check below was
 * written on that assumption. Real open data is not that shape: Our World in Data, the World Bank,
 * Eurostat and Ember all publish one row per ENTITY per period, and on a 7,585-row file "higher in
 * 2023 than in 2000" was answered from `ASEAN (Ember)`'s rows — the first rows of those years —
 * for a sentence about the world, and came back `supported`. The same reading came back
 * `contradicted`, the verdict that BLOCKS G1, on a true sentence about Ghana.
 *
 * So the shape is established before anything is read out of the table, and it is DERIVED, never
 * named: a table is a panel when one period value carries more than one row, and the column that
 * keys those rows apart is the text column whose value is unique WITHIN every period. That test is
 * arithmetic on the table in hand; a list of column names ("entity", "country", "iso3") would have
 * been a population typed rather than derived, which is the defect this repository keeps finding.
 *
 * Where several columns key the rows apart — the Ember file's `entity` and `code` both do — the one
 * that is never blank wins, then the one carrying more distinct values, then the leftmost. `code`
 * is blank on 645 of those rows, and a key that is sometimes absent cannot name a subject.
 */
export function panelShapeOf(columns, rows) {
  const periodColumn = findYearColumn(Array.isArray(columns) ? columns : []);
  if (!periodColumn || !Array.isArray(rows) || rows.length === 0) return { isPanel: false, periodColumn: periodColumn ?? null, entityColumn: null };
  const perPeriod = new Map();
  for (const row of rows) {
    const key = String(row[periodColumn.name]);
    perPeriod.set(key, (perPeriod.get(key) ?? 0) + 1);
  }
  const rowsPerPeriod = Math.max(...perPeriod.values());
  if (rowsPerPeriod <= 1) return { isPanel: false, periodColumn, entityColumn: null };

  const keyed = [];
  for (const column of columns.filter((c) => c.type === "text")) {
    const seen = new Set();
    const values = new Set();
    let blank = 0;
    let collides = false;
    for (const row of rows) {
      const raw = row[column.name];
      const written = raw === null || raw === undefined ? "" : String(raw).trim();
      if (written === "") {
        blank += 1;
        continue;
      }
      const lower = written.toLowerCase();
      values.add(lower);
      // A separator written as an ESCAPE, not as the byte itself. A raw NUL in the source makes
      // every text tool treat this 200 KB file as binary — `grep -rn` skips it in silence, which
      // is a worse defect than the collision it prevents. `\u0000` cannot appear in a CSV cell,
      // so "2025" + "a" and "2025a" + "" still key apart.
      const pair = `${row[periodColumn.name]}\u0000${lower}`;
      if (seen.has(pair)) {
        collides = true;
        break;
      }
      seen.add(pair);
    }
    if (collides || values.size < 2) continue;
    keyed.push({ column, blank, distinct: values.size, at: columns.indexOf(column) });
  }
  keyed.sort((a, b) => a.blank - b.blank || b.distinct - a.distinct || a.at - b.at);
  return {
    isPanel: true,
    periodColumn,
    entityColumn: keyed[0]?.column ?? null,
    rowsPerPeriod,
    periods: perPeriod.size,
  };
}

/**
 * THE COLUMN A TABLE'S PERIODS LIVE IN — decided by NAME AND VALUE, never by name alone.
 *
 * This used to return the first column whose name carried "year", "date" or "année", with nothing
 * asked about what it held, and two frozen stories show what that costs. `stress-aa-salary-spread`
 * carries `years_service [0, 34]` — a TENURE, one of the things that table measures — and it was
 * taken as the period column, so it was struck out of `measureColumns` and every panel question was
 * asked about it. `stress-t-europe-recycling` carries a text `survey_date` written three different
 * ways ("2025-03-01", "01/03/2025", "March 2025"), which is a period nothing can compare as a
 * number, and `isSequenceColumn` in `intake/scripts/profile.mjs` already said so — two decisions in
 * this tree disagreeing about the same column.
 *
 * So the same rule `ground-claim.mjs`'s coordinate test already states applies here: the name proposes and the
 * values decide. A column named for a period whose values are not period-shaped is not the period
 * column; a column of period-shaped values is, whatever it is called. A table with neither has no
 * period column, which is an answer — and a better one than a tenure.
 *
 * ROUND NINE — THE ORDER OF THE FALLBACKS WAS THE RULE'S OWN EXCEPTION. It read
 * `named.find(holdsPeriods) ?? named[0] ?? columns.find(holdsPeriods)`, so wherever no NAMED column
 * held periods the name still decided, and the values-based fallback behind it could not be
 * reached. WHO's Global Health Observatory publishes 2 919 country-year rows whose period column is
 * `TimeDim` (integer, 2010-2024) and whose only column named for a period is `Date` — WHO's own
 * record-modification timestamp, text, five distinct values. `named[0]` returned the timestamp,
 * `panelShapeOf` reported a 195x15 register as a five-period panel with no entity, the profile said
 * `panel: null`, and the grounding check told the journalist "this profile carries no period column"
 * while naming `TimeDim` in its own parenthesis. So the values-based fallback now comes FIRST and
 * the name-only match is what is left when the table's own values say nothing — which is the rule
 * the two paragraphs above already state. Measured over the 45 frozen profiles in `stories/` and
 * `proof/`: one answer changes, and it is that one.
 */
export function findYearColumn(columns) {
  const holdsPeriods = (c) =>
    c.type === "number" && Number.isInteger(c.min) && Number.isInteger(c.max) && c.min >= 1500 && c.max <= 2100;
  const namesAPeriod = (c) => /year|date|ann[ée]e/i.test(c.name);
  // A NUMERIC column named for a period has made a claim its own values can be held to, and
  // `years_service [0, 34]` fails it. A TEXT one has made no such claim — "2025-03-01" is a period
  // this file cannot compare as a number, which is a different fact and one `intake`'s
  // `periodNotASequence` says out loud rather than settling here.
  const named = columns.filter((c) => namesAPeriod(c) && (c.type !== "number" || holdsPeriods(c)));
  return named.find(holdsPeriods) ?? columns.find(holdsPeriods) ?? named[0] ?? null;
}
