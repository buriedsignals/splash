// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-lollipop-co2-per-person/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: the pairs in the beat's order, the subject's stem and the
// OTHER stem it measures, and the ratio between the two at each state. The proof asserted its own answers (China and the
// United States among the six, the ratio from above five to under two and a half); a story's answers are whatever its
// data gives, so each assertion the gesture needs becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));

/** The most copies of the subject's stem the stack holds: past it the blocks are slivers and the count is unreadable. */
export const MAX_COPIES = 15;

/**
 * @param beat  beat.mjs's default export: `pairs` [{ key, name, before, after }], `subject`, `other`
 * @returns     `{ pairs: [{ code, name, before, after }], subject, other, focus, against, ratio: { before, after }, copies }`
 */
export function subjectOf(beat) {
  const pairs = beat.pairs.map((p) => ({ code: String(p.key), name: String(p.name), before: p.before, after: p.after }));
  if (pairs.length < 2 || pairs.length > 8)
    throw new Error(`pairs holds ${pairs.length} entities; a lollipop video draws 2 to 8 pairs side by side. Keep the subject, the other it is measured against, and the largest others`);
  const keys = pairs.map((p) => p.code);
  if (new Set(keys).size !== keys.length) throw new Error(`two pairs share a key (${keys.join(", ")}): one pair per entity — filter data.json to one row per entity`);
  const subject = String(beat.subject);
  const other = String(beat.other);
  if (!keys.includes(subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not the key of any pair (${keys.join(", ")})`);
  if (!keys.includes(other)) throw new Error(`other ${JSON.stringify(beat.other)} is not the key of any pair (${keys.join(", ")})`);
  if (subject === other) throw new Error(`subject and other are both ${subject}: the video measures one pair's stem with copies of ANOTHER's`);
  const negative = pairs.filter((p) => p.before < 0 || p.after < 0);
  if (negative.length)
    throw new Error(`${negative.map((p) => p.code).join(", ")} hold a negative value: a lollipop stem is a height from zero. A change that crosses zero is a diverging bar, not a lollipop`);
  const focus = pairs.find((p) => p.code === subject);
  const against = pairs.find((p) => p.code === other);
  if (!(focus.before > 0 && focus.after > 0))
    throw new Error(`${subject}'s stem is 0 at one state: the video measures ${other} with copies of ${subject}'s stem, so both its values must be above 0`);
  const ratio = { before: against.before / focus.before, after: against.after / focus.after };
  // THE REVEAL'S ARGUMENT: « an X emits N Y » — at the first state at least one whole copy of the subject's stem fits
  // under the other's head. Below one, the stack is a fraction of a copy and the gesture measures nothing.
  if (!(ratio.before >= 1))
    throw new Error(
      `at the first state ${other} (${n(against.before)}) is under ${subject} (${n(focus.before)}): the video stacks copies of ${subject}'s stem up to ${other}'s head, so ${other} must be the taller at the first state — this argument does not hold for this data; swap subject and other only if the takeaway is about ${other}`,
    );
  // Along the travel the ratio moves monotonically between its two ends, so the stack never needs more copies than this.
  const copies = Math.ceil(Math.max(ratio.before, ratio.after));
  if (copies > MAX_COPIES)
    throw new Error(`${other} is ${n(Math.max(ratio.before, ratio.after))} times ${subject}: the stack would hold ${copies} copies, more than the ${MAX_COPIES} a viewer can count — compare ${subject} with a pair nearer its level`);
  return { pairs, subject, other, focus, against, ratio, copies };
}
