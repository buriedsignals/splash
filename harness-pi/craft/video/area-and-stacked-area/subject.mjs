// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-area-swiss-co2/subject.mjs, which read that
// beat's frozen CSV. The derivation is the proof's: consecutive readings, the stock (their sum), the running total, and
// the midpoint — the first year the running total reaches half the stock — with each half's length and share. The proof
// asserted its own answers (half after 1986 between 45 and 50 %, 38 × 3 < 129 years); a story's answers are whatever its
// data gives — the claim is beat.mjs's check() — and what this choreography cannot draw becomes a refusal naming what to
// change in beat.mjs.
//
// Runs in Bun only.

/** The fill draws every reading in 195 frames: under this many there is no surface to fill. */
export const MIN_READINGS = 8;
export const MAX_READINGS = 250;

const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `data` [{ year, value }]
 * @returns     `{ readings: [{ year, mt }], cumulative, total, midpoint, after, before, shareAfter, shareBefore }` — the
 *              names `build.mjs` reads (`mt` is the proof's name for a reading, whatever its unit)
 */
export function subjectOf(beat) {
  const readings = [...beat.data].map((d) => ({ year: d.year, mt: d.value })).sort((a, b) => a.year - b.year);
  if (readings.length < MIN_READINGS || readings.length > MAX_READINGS)
    throw new Error(`data has ${readings.length} readings: the video fills between ${MIN_READINGS} and ${MAX_READINGS} years — filter data.json's years (from / to)`);
  for (let i = 1; i < readings.length; i++)
    if (readings[i].year !== readings[i - 1].year + 1)
      throw new Error(`data jumps from ${readings[i - 1].year} to ${readings[i].year}: an area drawn over a gap measures years the source never reported — start the series after the gap (from: ${readings[i].year})`);
  const negative = readings.filter((r) => !(r.mt >= 0));
  if (negative.length) throw new Error(`an area is drawn from zero, so no reading may be below 0: ${negative.slice(0, 3).map((r) => `${r.year}=${n(r.mt)}`).join(", ")}`);
  const total = readings.reduce((s, r) => s + r.mt, 0);
  if (!(total > 0)) throw new Error("every reading is 0: there is no stock to fill");
  let running = 0;
  const cumulative = readings.map((r) => (running += r.mt));
  const midpoint = readings[cumulative.findIndex((c) => c >= total / 2)].year;
  const last = readings.at(-1).year;
  // The rule sweeps back from the last year to the midpoint and each half is levelled into a block: both halves need years.
  if (midpoint >= last)
    throw new Error(`the running total reaches half the stock only in the last year (${last}): there is no later half for the rule to sweep — this video cannot tell this series; use another format`);
  const after = readings.filter((r) => r.year > midpoint);
  const before = readings.filter((r) => r.year <= midpoint);
  const shareAfter = (after.reduce((s, r) => s + r.mt, 0) / total) * 100;
  return { readings, cumulative, total, midpoint, after: after.length, before: before.length, shareAfter, shareBefore: 100 - shareAfter };
}
