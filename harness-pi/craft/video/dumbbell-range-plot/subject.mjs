// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-dumbbell-life-expectancy-gains/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: every row read at both states, its gain, the rows ranked by
// their first level and by their gain, the largest gain (the subject, ringed) and the smallest. The proof asserted its own
// answers (every one gained, Poland the most, the United States the least); a story's answers are whatever its data gives,
// so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));
export const MIN_ROWS = 3;
export const MAX_ROWS = 14;

/**
 * @param beat  beat.mjs's default export: `rows` [{ key, label, from, to }], `subject` (the key of the largest gain)
 * @returns     `{ rows: [{ key, label, from, to, gain }], byGain, byLevel, most, least }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const rows = beat.rows.map((r) => ({ key: String(r.key), label: String(r.label), from: r.from, to: r.to, gain: r.to - r.from }));
  if (!(rows.length >= MIN_ROWS && rows.length <= MAX_ROWS)) throw new Error(`rows has ${rows.length} rows: the video draws ${MIN_ROWS} to ${MAX_ROWS}`);
  // The counter reads « n rose » as every dot lands, and every gain is a copy laid right of one start line.
  const flat = rows.filter((r) => !(r.gain > 0));
  if (flat.length)
    throw new Error(`the video counts every row as it lands as one that rose, and lays every gain rightward from one start; these did not rise: ${flat.slice(0, 4).map((r) => `${r.key} ${n(r.from)} → ${n(r.to)}`).join(", ")} — this argument does not hold for this data`);
  const byGain = [...rows].sort((a, b) => b.gain - a.gain);
  const byLevel = [...rows].sort((a, b) => b.from - a.from);
  const most = byGain[0];
  const least = byGain.at(-1);
  if (most.key !== String(beat.subject))
    throw new Error(`subject is ${JSON.stringify(beat.subject)}, but the largest gain is ${JSON.stringify(most.key)}'s (+${n(most.gain)}): this video rings the LARGEST gain — set subject to its key`);
  if (most.gain === byGain[1].gain) throw new Error(`${most.key} and ${byGain[1].key} gained exactly as much: the largest gain is not one row`);
  return { rows, byGain: byGain.map((r) => r.key), byLevel: byLevel.map((r) => r.key), most, least };
}
