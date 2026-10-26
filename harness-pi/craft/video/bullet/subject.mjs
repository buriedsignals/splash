// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-bullet-low-carbon-share/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: each row's share at the earlier and the later state, the gain,
// the row that gained most, and the insertion that takes the earlier order to the order of gain, one row at a time. The
// proof asserted its own answer (the furthest mover is the only row still under half); the video rings that row alone
// against the half line, so the same assertion stays here as a refusal naming the arithmetic.
//
// Runs in Bun only.

export const MIN_ROWS = 3;
export const MAX_ROWS = 10;

const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `rows` [{ name, label, marker, measure }], `threshold`, `subject`
 * @returns     `{ countries: [{ key, name, before, after }], moved, steps, threshold }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const countries = beat.rows.map((r) => ({ key: String(r.name), name: String(r.label ?? r.name), before: r.marker, after: r.measure }));
  if (countries.length < MIN_ROWS || countries.length > MAX_ROWS) throw new Error(`rows has ${countries.length} members: the video draws between ${MIN_ROWS} and ${MAX_ROWS} rows`);
  const keys = countries.map((c) => c.key);
  const twice = keys.find((k, i) => keys.indexOf(k) !== i);
  if (twice !== undefined) throw new Error(`rows holds ${JSON.stringify(twice)} twice: give each row ONE marker and ONE measure`);
  const outside = countries.filter((c) => !(c.before >= 0 && c.before <= 100 && c.after >= 0 && c.after <= 100));
  if (outside.length)
    throw new Error(`each bar is a whole to 100 %, so marker and measure are shares between 0 and 100: ${outside.slice(0, 3).map((c) => `${c.key} ${n(c.before)} → ${n(c.after)}`).join(", ")} — compute the share in percent`);
  const fell = countries.filter((c) => c.after < c.before);
  if (fell.length)
    throw new Error(`the video's frontier only moves forward and counts each gain up from +0: ${fell.map((c) => `${c.key} fell (${n(c.before)} → ${n(c.after)})`).join(", ")} — this choreography cannot tell a fall; use another format`);
  const threshold = beat.threshold ?? 50;
  if (!(threshold > 0 && threshold < 100)) throw new Error(`threshold is ${JSON.stringify(beat.threshold)}: the reference line stands between 0 and 100 (default 50)`);

  const byGain = [...countries].sort((a, b) => b.after - b.before - (a.after - a.before));
  const moved = byGain[0];
  if (beat.subject !== undefined && String(beat.subject) !== moved.key)
    throw new Error(`subject is ${JSON.stringify(beat.subject)}, but the row that gained most is ${JSON.stringify(moved.key)} (+${n(moved.after - moved.before)}): this video argues the furthest mover — set subject to it, or leave subject out`);
  // The last shot drops the line and rings the furthest mover ALONE as the one short of it.
  const under = countries.filter((c) => c.after < threshold);
  if (under.length !== 1 || under[0] !== moved)
    throw new Error(
      `the video's last shot rings ${moved.key}, the row that gained most, as the only one still under ${n(threshold)} at the later state; ` +
        (under.length ? `here ${under.map((c) => `${c.key} (${n(c.after)})`).join(", ")} ${under.length > 1 ? "are" : "is"} under it` : `here no row is under it`) +
        ` — this choreography cannot tell this data; use another format`,
    );

  // THE INSERTION, the proof's: from the earlier order to the order of gain, one row at a time.
  const start = [...countries].sort((a, b) => b.before - a.before).map((c) => c.key);
  const steps = [start];
  byGain.forEach((c, slot) => {
    const current = steps.at(-1);
    if (current[slot] === c.key) return;
    const next = current.filter((k) => k !== c.key);
    next.splice(slot, 0, c.key);
    steps.push(next);
  });
  if (steps.at(-1).join() !== byGain.map((c) => c.key).join()) throw new Error("the insertion does not end on the order of gain (a kit bug, not a beat.mjs one)");
  return { countries, moved, steps, threshold };
}
