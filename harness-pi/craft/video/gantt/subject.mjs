// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-gantt-top-ten-tenure/subject.mjs, which read that
// beat's frozen CSV and derived the yearly top ten itself. Here beat.mjs gives each row's runs (the static kit's shape);
// the derivation is the proof's from there on: the rows ordered by first year then tenure, the rows held every year, and
// how many of the rows present in the first year had never left by each year. The proof asserted its own answers
// (sixteen rows, six throughout, Italy and South Korea interrupted, a count from 10 to 6); a story's answers are whatever
// its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

export const MAX_ROWS = 24;

/**
 * @param beat  beat.mjs's default export: `rows` [{ key, label, runs: [{ from, to }] }], `first`, `last`, `subjects`
 * @returns     `{ years, rows: [{ entity, name, runs, years, throughout, firstYear }], throughout, neverLeft, first, last }`
 */
export function subjectOf(beat) {
  const { first, last } = beat;
  if (!(Number.isInteger(first) && Number.isInteger(last) && last - first >= 4))
    throw new Error(`first and last are ${JSON.stringify(first)} and ${JSON.stringify(last)}: give two whole years at least 4 apart (the clock runs from the first to the last)`);
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  if (!(beat.rows.length >= 2 && beat.rows.length <= MAX_ROWS)) throw new Error(`rows has ${beat.rows.length} rows: the video draws 2 to ${MAX_ROWS}`);
  const rows = beat.rows
    .map((r) => {
      if (!(Array.isArray(r.runs) && r.runs.length)) throw new Error(`${r.key}: runs must be a non-empty array of { from, to }`);
      const runs = r.runs.map((run) => ({ from: run.from, to: run.to })).sort((a, b) => a.from - b.from);
      runs.forEach((run, i) => {
        if (!(Number.isInteger(run.from) && Number.isInteger(run.to) && run.from <= run.to)) throw new Error(`${r.key}: a run is ${JSON.stringify(run)}; from and to are whole years, from ≤ to`);
        if (run.from < first || run.to > last) throw new Error(`${r.key}: the run ${run.from}–${run.to} leaves the window ${first}–${last}`);
        if (i > 0 && !(run.from > runs[i - 1].to + 1)) throw new Error(`${r.key}: the runs ${runs[i - 1].from}–${runs[i - 1].to} and ${run.from}–${run.to} touch or overlap — merge them into one run`);
      });
      const held = runs.reduce((s, run) => s + run.to - run.from + 1, 0);
      return { entity: String(r.key), name: String(r.label), runs, years: held, throughout: held === years.length, firstYear: runs[0].from };
    })
    .sort((a, b) => a.firstYear - b.firstYear || b.years - a.years);
  const throughout = rows.filter((r) => r.throughout);
  const said = [beat.subjects].flat().map(String).sort();
  const truly = throughout.map((r) => r.entity).sort();
  if (said.join("|") !== truly.join("|"))
    throw new Error(`subjects are ${JSON.stringify(said)}, but the rows held every year from ${first} to ${last} are ${JSON.stringify(truly)}: this video picks out the rows that NEVER LEFT — set subjects to exactly those keys`);
  if (!throughout.length) throw new Error(`no row was held every year from ${first} to ${last}: the video's last shot picks out the rows that never left, and there are none — this argument does not hold for this data`);
  // The count over the rows: how many of the first year's rows have held every year up to and including `year`.
  const members = rows.filter((r) => r.firstYear === first);
  const neverLeft = years.map((y) => members.filter((r) => r.runs[0].to >= y).length);
  return { years, rows, throughout: throughout.length, neverLeft, first, last };
}
