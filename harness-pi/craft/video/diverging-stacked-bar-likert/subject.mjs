// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-diverging-stacked-electricity/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: every row's levels as shares of the row, the left and right sides
// summed, the rows ordered by their left side, and the headline's comparison re-run — in the row with the largest centre,
// the centre outweighs both sides together. The proof asserted its own answers (six rows, France); a story's answers are
// whatever its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));
export const MAX_ROWS = 8;

/**
 * @param beat  beat.mjs's default export: `rows` [{ key, label, left: [{ key, label, value }], centre: { key, label, value },
 *              right: [...] }], `subject` (a row's key)
 * @returns     `{ rows: [{ key, name, left, right, centre, fossil, renewable }], subject }` — the names `build.mjs` reads
 *              (fossil = the left side's total, renewable = the right side's, as the proof named them)
 */
export function subjectOf(beat) {
  if (!(beat.rows.length >= 2 && beat.rows.length <= MAX_ROWS)) throw new Error(`rows has ${beat.rows.length} rows: the video draws 2 to ${MAX_ROWS}`);
  const first = beat.rows[0];
  const keysOf = (r, side) => (r[side] ?? []).map((l) => String(l.key)).join("|");
  for (const side of ["left", "right"]) {
    if (!(Array.isArray(first[side]) && first[side].length >= 1)) throw new Error(`rows[0].${side} must be an array of at least one { key, label, value }`);
    const odd = beat.rows.find((r) => keysOf(r, side) !== keysOf(first, side));
    if (odd) throw new Error(`${odd.key}'s ${side} levels (${keysOf(odd, side)}) are not the first row's (${keysOf(first, side)}): every row holds the same levels in the same order`);
  }
  const rows = beat.rows
    .map((r) => {
      // Side keys are prefixed: the centre's segment is keyed "Nuclear" inside the proof's frame and must not collide.
      const level = (side) => (l) => ({ key: `${side}:${l.key}`, label: String(l.label), share: l.value });
      const left = r.left.map(level("L"));
      const right = r.right.map(level("R"));
      const centre = r.centre.value;
      const fossil = left.reduce((s, l) => s + l.share, 0);
      const renewable = right.reduce((s, l) => s + l.share, 0);
      return { key: String(r.key), name: String(r.label), left, right, centre, fossil, renewable };
    })
    .sort((a, b) => b.fossil - a.fossil);
  for (const row of rows) {
    const bad = [...row.left, ...row.right].find((l) => !(l.share >= 0)) ?? (row.centre >= 0 ? null : { label: "centre", share: row.centre });
    if (bad) throw new Error(`${row.key}: ${bad.label} is ${n(bad.share)}; a share is 0 or more`);
    const sum = row.fossil + row.renewable + row.centre;
    if (Math.abs(sum - 100) > 0.5) throw new Error(`${row.key}: its levels add up to ${n(sum)}, not 100 — each value must be the level's share of its own row, in percent`);
  }
  const subject = rows.find((r) => r.key === String(beat.subject));
  if (!subject) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is no row's key (${rows.map((r) => r.key).join(", ")})`);
  const most = rows.reduce((a, b) => (b.centre > a.centre ? b : a));
  if (most.key !== subject.key)
    throw new Error(`this video argues the row with the LARGEST centre share; that is ${most.key} (${n(most.centre)}), not ${subject.key} (${n(subject.centre)}) — set subject to ${JSON.stringify(most.key)} or choose another type`);
  // The compare shot lays the subject's two sides end to end under its centre and shows them stopping short.
  if (!(subject.centre > subject.fossil + subject.renewable))
    throw new Error(
      `the video lays ${subject.key}'s two sides end to end under its centre and shows them stopping short, but ${n(subject.fossil)} + ${n(subject.renewable)} = ${n(subject.fossil + subject.renewable)} is not less than its centre ${n(subject.centre)}: this argument does not hold for this data`,
    );
  return { rows, subject: subject.key };
}
