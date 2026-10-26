// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-dot-strip-lowcarbon-spread/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: every mark read at both states, the floor and the ceiling of the
// field, how far each rose, how far the spread closed, and the three figures the video writes adding up as written. The
// proof asserted its own answers (Poland the floor, Sweden the ceiling, +29,5 and +2,1); a story's answers are whatever
// its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));
export const MIN_MARKS = 8;
export const MAX_MARKS = 24;

/**
 * @param beat    beat.mjs's default export: `marks` [{ code, before, after }], `subject` (the floor's code)
 * @param round   the figures as the video prints them (the story's decimals), so "adds up as written" is tested on them
 * @returns       `{ marks, floor, ceiling, floorRise, ceilRise, spreadBefore, spreadAfter, closed, byBefore }`
 */
export function subjectOf(beat, round) {
  const marks = beat.marks.map((m) => ({ code: String(m.code), before: m.before, after: m.after }));
  if (!(marks.length >= MIN_MARKS && marks.length <= MAX_MARKS)) throw new Error(`marks has ${marks.length} marks: the video draws a field of ${MIN_MARKS} to ${MAX_MARKS}`);
  const long = marks.filter((m) => !(m.code.length >= 1 && m.code.length <= 4));
  if (long.length) throw new Error(`a code is printed on its chip and is 1 to 4 characters: ${long.slice(0, 3).map((m) => JSON.stringify(m.code)).join(", ")} — use the ISO code, not the name`);
  // Both strips share ONE 0–100 scale (the proof's build.mjs draws it so).
  const off = marks.filter((m) => ![m.before, m.after].every((v) => v >= 0 && v <= 100));
  if (off.length) throw new Error(`both strips are drawn on one 0–100 scale, so every before and after is a percentage from 0 to 100: ${off.slice(0, 3).map((m) => `${m.code} ${n(m.before)} → ${n(m.after)}`).join(", ")}`);
  const lowest = (key) => marks.reduce((a, b) => (b[key] < a[key] ? b : a));
  const highest = (key) => marks.reduce((a, b) => (b[key] > a[key] ? b : a));
  const floor = marks.find((m) => m.code === String(beat.subject));
  if (!floor) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is no mark's code`);
  // The span is drawn from the floor's chip to the ceiling's, in both strips: each end must be the same mark at both states.
  if (lowest("before").code !== floor.code || lowest("after").code !== floor.code)
    throw new Error(`this video spans the field from the FLOOR to the ceiling and the subject is the floor at both states; the lowest is ${lowest("before").code} before and ${lowest("after").code} after, not ${floor.code} at both — set subject to the floor, or choose another type`);
  const ceiling = highest("before");
  if (highest("after").code !== ceiling.code)
    throw new Error(`the video pins the slid span to the ceiling's own mark; the highest is ${ceiling.code} before and ${highest("after").code} after — the field's ceiling changed hands, so this argument does not hold for this data`);
  if (ceiling.code === floor.code) throw new Error("the floor and the ceiling are the same mark");
  const floorRise = floor.after - floor.before;
  const ceilRise = ceiling.after - ceiling.before;
  const spreadBefore = ceiling.before - floor.before;
  const spreadAfter = ceiling.after - floor.after;
  const closed = spreadBefore - spreadAfter;
  // The first span, pinned to the ceiling, overhangs the floor's new pin by what the spread closed.
  if (!(closed > 0)) throw new Error(`the spread from ${floor.code} to ${ceiling.code} went from ${n(spreadBefore)} to ${n(spreadAfter)}: it did not close, so the slid span has no overhang to show — this argument does not hold for this data`);
  if (!(floorRise > 0)) throw new Error(`the floor ${floor.code} went from ${n(floor.before)} to ${n(floor.after)}: the video names its rise with a plus`);
  if (Math.abs(round(floorRise) - round(ceilRise) - round(closed)) > 1e-9)
    throw new Error(`the three figures the video writes do not add up as printed: ${round(floorRise)} − ${round(ceilRise)} ≠ ${round(closed)} — set decimals one higher`);
  const byBefore = [...marks].sort((a, b) => a.before - b.before).map((m) => m.code);
  return { marks, floor, ceiling, floorRise, ceilRise, spreadBefore, spreadAfter, closed, byBefore };
}
