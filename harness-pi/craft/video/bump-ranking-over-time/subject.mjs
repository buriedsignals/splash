// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-bump-emitter-rank/subject.mjs, which read that
// beat's frozen CSV. The derivation is the proof's: the top `slots` by year, every entity ever in it, the subject's rank
// from the first year to the last, and every entity it passed (above it one year, below it or out the next) — those
// still in the top at the end are the ones the last shot keeps beside it. The proof asserted its own answers (India
// from 8th to 3rd, past Germany, Japan and Russia); a story's answers are whatever its data gives — the claim is
// beat.mjs's check() — and what this choreography cannot draw becomes a refusal naming what to change in beat.mjs.
//
// Runs in Bun only.

export const MIN_YEARS = 5;
export const MAX_YEARS = 80;

/**
 * @param beat  beat.mjs's default export: `values` [{ entity, year, value }], `slots`, `subject`
 * @returns     `{ years, tracks, top, from, to, passed, stillIn, slots, subject }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const slots = beat.slots ?? 10;
  if (!(Number.isInteger(slots) && slots >= 3 && slots <= 15)) throw new Error(`slots is ${JSON.stringify(beat.slots)}: the video draws between 3 and 15 ranks`);
  const rows = beat.values.map((r) => ({ entity: String(r.entity), year: r.year, value: r.value }));
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  if (years.length < MIN_YEARS || years.length > MAX_YEARS) throw new Error(`values span ${years.length} years: the clock runs between ${MIN_YEARS} and ${MAX_YEARS} years — filter data.json's years`);
  years.forEach((y, i) => {
    if (i > 0 && y !== years[i - 1] + 1) throw new Error(`values jump from ${years[i - 1]} to ${y}: the clock is linear in years, so every year must be ranked — filter data.json to a run of consecutive years`);
  });
  const seen = new Set();
  for (const r of rows) {
    const key = `${r.entity}|${r.year}`;
    if (seen.has(key)) throw new Error(`values hold ${r.entity} twice in ${r.year}: give each entity ONE value per year (filter data.json to one series, and leave out aggregates)`);
    seen.add(key);
  }
  const top = new Map(years.map((y) => [y, rows.filter((r) => r.year === y).sort((a, b) => b.value - a.value).slice(0, slots).map((r) => r.entity)]));
  for (const y of years) if (top.get(y).length < slots) throw new Error(`${y} has only ${top.get(y).length} entities: the video ranks ${slots} every year — lower slots`);
  const rankOf = (entity, year) => {
    const i = top.get(year).indexOf(entity);
    return i < 0 ? null : i + 1;
  };
  const subject = String(beat.subject);
  // The camera closes on the subject's tip and tracks it the whole clock: its line must be in the top every year.
  const outYears = years.filter((y) => rankOf(subject, y) === null);
  if (outYears.length)
    throw new Error(
      `${JSON.stringify(subject)} is outside the top ${slots} in ${outYears.slice(0, 4).join(", ")}${outYears.length > 4 ? ", …" : ""}: the camera tracks its tip every year — raise slots, start the years later, or set subject to an entity that is ranked every year`,
    );
  const everIn = [...new Set([...top.values()].flat())];
  const tracks = everIn.map((entity) => ({ entity, ranks: years.map((y) => rankOf(entity, y)) }));
  const from = rankOf(subject, years[0]);
  const to = rankOf(subject, years.at(-1));
  const passed = [];
  for (let i = 1; i < years.length; i++) {
    const [p, y] = [years[i - 1], years[i]];
    const ia = rankOf(subject, p);
    const ib = rankOf(subject, y);
    for (const c of top.get(p)) {
      const a = rankOf(c, p);
      const b = rankOf(c, y);
      if (ia && ib && a < ia && (b === null || b > ib)) passed.push({ entity: c, year: y });
    }
  }
  const stillIn = passed.filter((p) => rankOf(p.entity, years.at(-1)) !== null);
  // The last shot keeps the subject and the ones it passed: one that passed it back would stand above it as "passed".
  const back = [...new Set(stillIn.map((p) => p.entity))].filter((e) => rankOf(e, years.at(-1)) < to);
  if (back.length)
    throw new Error(`${back.join(", ")} passed ${subject} but end${back.length > 1 ? "" : "s"} above it in ${years.at(-1)}: the video's last shot keeps the members the subject passed beside it, and this one would read as passed — this choreography cannot tell this ranking; use another format`);
  return { years, tracks, top, from, to, passed, stillIn, slots, subject };
}
