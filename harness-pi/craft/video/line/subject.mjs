// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-line-swiss-co2/subject.mjs, which read that
// beat's frozen CSV. The derivation is the proof's: the series, its peak, its last reading, and the year the rising line
// last passed through that reading before the peak — where the level line shot back from the last reading lands. The
// proof asserted its own answers (the 1973 peak, 2024 under 1967, 1966 the last year at or under it); a story's answers
// are whatever its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** The trace draws every reading in 240 frames: under this many there is no line to trace, past it a year is a blur. */
export const MIN_READINGS = 8;
export const MAX_READINGS = 160;

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `data` [{ year, value }]
 * @returns     `{ data: [{ year, mt }], peak, end, reference, rise }` — the names `build.mjs` reads (`mt` is the
 *              proof's name for a reading, whatever its unit)
 */
export function subjectOf(beat) {
  const data = [...beat.data].map((d) => ({ year: d.year, mt: d.value })).sort((a, b) => a.year - b.year);
  if (data.length < MIN_READINGS || data.length > MAX_READINGS)
    throw new Error(`data has ${data.length} readings: the video traces between ${MIN_READINGS} and ${MAX_READINGS} years — filter data.json's years (from / to)`);
  if (!data.every((d) => Number.isInteger(d.year))) throw new Error("every year in data must be a whole number (one reading per year)");
  const gap = data.findIndex((d, i) => i > 0 && d.year !== data[i - 1].year + 1);
  if (gap > 0)
    throw new Error(`data jumps from ${data[gap - 1].year} to ${data[gap].year}: the trace is linear in years and the rewind counts every year down, so the series must hold one reading for EVERY year — start it after the gap (from: ${data[gap].year})`);

  const peak = data.reduce((a, b) => (b.mt > a.mt ? b : a));
  const end = data.at(-1);
  if (peak === end || !(end.mt < peak.mt))
    throw new Error(`the last reading (${end.year}, ${n(end.mt)}) is the series' highest: this video argues a fall back under an earlier level, which this series does not make — use another format`);
  // The landing: the last year before the peak where the rising line passed through the last reading.
  let rise = -1;
  for (let i = 1; i < data.length && data[i].year < peak.year; i++) if (data[i - 1].mt <= end.mt && data[i].mt > end.mt) rise = i;
  if (rise < 1)
    throw new Error(
      `before its ${peak.year} peak the series never rises through the last reading (${end.year}, ${n(end.mt)}) — it starts above it in ${data[0].year}: the level line shot back from ${end.year} has no earlier year to land on. Start data earlier (lower from) if data.json has the years, or use another format`,
    );
  // The proof's middle tick: the level of the year the line lands on (1967's 32,5 under the proof's title).
  const reference = data[rise].mt;
  return { data, peak, end, reference, rise, landingYear: data[rise].year };
}
