// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-box-plot-france-co2-decades/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: one reading per year, bucketed by decade, each decade
// summarised by the same Tukey rule (`summarizeDecade`, copied below from proof/more-boxplot-france-co2-decades/
// DecadeBoxplot.tsx — that file loads a native rasteriser, so it is not imported), the peak decade the one whose median
// is highest. The proof asserted its own answers (75 readings, the 1970s peak, a fall in every decade after, one outlier
// in 1980); a story's answers are whatever its data gives — the claim is beat.mjs's check() — and what this choreography
// cannot draw becomes a refusal naming what to change in beat.mjs.
//
// Runs in Bun only.
import { extent, quantile } from "d3-array";

/** The walk steps decade to decade: under three there is no walk, past ten the slots are too thin for their years. */
export const MIN_DECADES = 3;
export const MAX_DECADES = 10;
/** A partial last decade is drawn when it holds at least this many years (the proof's 2020–24 holds five). */
export const MIN_PARTIAL = 4;

/** Verbatim from proof/more-boxplot-france-co2-decades/DecadeBoxplot.tsx (types removed). */
export function summarizeDecade(label, values) {
  if (values.length < 2) throw new Error(`decade ${label} needs at least two readings to summarize, got ${values.length}`);
  const q1 = quantile(values, 0.25);
  const median = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const inFence = values.filter((v) => v >= lowerFence && v <= upperFence);
  const outliers = values.filter((v) => v < lowerFence || v > upperFence).sort((a, b) => a - b);
  const [whiskerLo, whiskerHi] = extent(inFence.length > 0 ? inFence : values);
  return { label, n: values.length, q1, median, q3, whiskerLo, whiskerHi, outliers };
}

/**
 * @param beat  beat.mjs's default export: `data` [{ year, value }]
 * @returns     `{ readings, decades, peak, lastYear }` — the names `build.mjs` reads (`peak` is the peak decade's index)
 */
export function subjectOf(beat) {
  const readings = [...beat.data].map((d) => ({ year: d.year, value: d.value })).sort((a, b) => a.year - b.year);
  if (!readings.every((r) => Number.isInteger(r.year))) throw new Error("every year in data must be a whole number (one reading per year)");
  readings.forEach((r, i) => {
    if (i > 0 && r.year !== readings[i - 1].year + 1)
      throw new Error(`data jumps from ${readings[i - 1].year} to ${r.year}: each reading stands at its own year inside its decade, so the series must hold every year — filter data.json to a run of consecutive years`);
  });
  if (readings.length && readings[0].year % 10 !== 0)
    throw new Error(`data starts in ${readings[0].year}: each box is a whole decade, named by its first year — start the series at ${Math.ceil(readings[0].year / 10) * 10} (from: ${Math.ceil(readings[0].year / 10) * 10})`);
  const byDecade = new Map();
  for (const r of readings) {
    const start = Math.floor(r.year / 10) * 10;
    if (!byDecade.has(start)) byDecade.set(start, []);
    byDecade.get(start).push(r);
  }
  const last = [...byDecade.entries()].at(-1);
  if (last && last[1].length < MIN_PARTIAL)
    throw new Error(`the last decade (${last[0]}s) holds only ${last[1].length} year(s), too few for a box: end the series in ${last[0] - 1} (to: ${last[0] - 1})`);
  if (byDecade.size < MIN_DECADES || byDecade.size > MAX_DECADES)
    throw new Error(`data spans ${byDecade.size} decade(s): the video draws between ${MIN_DECADES} and ${MAX_DECADES} boxes — filter data.json's years (from / to)`);
  const decades = [...byDecade.entries()].map(([start, rs]) => ({ start, readings: rs, ...summarizeDecade(`${start}s`, rs.map((r) => r.value)) }));
  const peak = decades.reduce((a, b) => (b.median > a.median ? b : a));
  return { readings, decades, peak: decades.indexOf(peak), lastYear: readings.at(-1).year };
}
