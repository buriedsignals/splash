// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-histogram-carbon-footprint-spread/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: the observations sorted, binned in equal bins from the start
// with the last one open, every observation in one bin and its place in it, the count under the threshold — the edge
// between the first two bins — and its share in tenths. The proof asserted its own answers (213 countries, 127 under 4 t,
// 6 in 10); a story's answers are whatever its data gives, so each assertion becomes a refusal that names what to change
// in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));
export const MIN_OBSERVATIONS = 20;
export const MAX_OBSERVATIONS = 600;

/**
 * @param beat  beat.mjs's default export: `observations` [{ name, value }], `binStart`, `binWidth`, `binCount`, `threshold`
 * @returns     `{ countries, bins, total, under, share, binWidth }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const start = beat.binStart ?? 0;
  const { binWidth, binCount, threshold } = beat;
  if (!(typeof binWidth === "number" && binWidth > 0)) throw new Error(`binWidth is ${JSON.stringify(binWidth)}: give the width of one bin, above 0`);
  if (!(Number.isInteger(binCount) && binCount >= 4 && binCount <= 14)) throw new Error(`binCount is ${JSON.stringify(binCount)}: the video draws 4 to 14 bins, the last one open`);
  // The cut the video rules and counts against is the edge between the first two bins.
  if (Math.abs(threshold - (start + binWidth)) > 1e-9)
    throw new Error(`threshold is ${n(threshold)}, but the video rules its cut between the first two bins, at binStart + binWidth = ${n(start + binWidth)}: set binWidth so the first bin ends at the threshold`);
  const countries = beat.observations
    .map((o) => ({ name: String(o.name), value: o.value }))
    .sort((a, b) => a.value - b.value);
  if (!(countries.length >= MIN_OBSERVATIONS && countries.length <= MAX_OBSERVATIONS))
    throw new Error(`observations has ${countries.length} readings: the video drops each into its bin as one cell, ${MIN_OBSERVATIONS} to ${MAX_OBSERVATIONS} of them`);
  const below = countries.filter((c) => c.value < start);
  if (below.length) throw new Error(`${below.length} reading(s) are under binStart ${n(start)} (${below.slice(0, 3).map((c) => `${c.name} ${n(c.value)}`).join(", ")}): the bins start there`);

  const bins = Array.from({ length: binCount }, (_, i) => {
    const lo = start + i * binWidth;
    return { lo: +lo.toPrecision(12), hi: +(lo + binWidth).toPrecision(12), open: i === binCount - 1, count: 0 };
  });
  const placed = countries.map((c) => {
    const bin = Math.min(binCount - 1, Math.floor((c.value - start) / binWidth + 1e-12));
    const j = bins[bin].count;
    bins[bin].count += 1;
    return { ...c, bin, j };
  });
  const total = countries.length;
  const under = countries.filter((c) => c.value < threshold).length;
  if (under !== bins[0].count) throw new Error(`${under} readings under ${n(threshold)}, the first bin holds ${bins[0].count} (a kit bug)`);
  if (!(under > 0 && under < total)) throw new Error(`${under} of ${total} readings are under ${n(threshold)}: the video sets the readings under the cut against the rest, so both sides need some`);
  if (!bins.slice(2).some((b) => b.count > 0))
    throw new Error(`no reading lies past the second bin: the video stacks the tail's bins onto the second one, and there is none to stack — this argument does not hold for this data`);
  const share = Math.round((under / total) * 10);
  return { countries: placed, bins, total, under, share, binWidth };
}
