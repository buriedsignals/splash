// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-waterfall-germany-electricity-bridge/subject.mjs,
// which read that beat's frozen CSV. The derivation is the proof's: three members, each with its value in the opening
// and the closing state and its change, the two totals, the net change, and the bridge replayed to the tenth (every step
// printed to the tenth must walk the opening to the closing). The proof asserted its own answers (renewables rose,
// nuclear and fossil fell, 143 TWh fewer); a story's answers are whatever its data gives, so each assertion the gesture
// needs becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

export const tenth = (v) => Math.round(v * 10) / 10;
/** The bridge has five slots — the opening total, one step per member, the closing total — so exactly three members. */
export const MEMBERS = 3;
/** The closing total counts from the opening in tenths: past this many texts the unit is too fine for a counter. */
export const MAX_COUNTER_TEXTS = 20000;

const n = (v) => String(+Number(v).toPrecision(5));

/**
 * @param beat  beat.mjs's default export: `members` [{ name, from, to }] in the order the bridge walks them
 * @returns     `{ members, opening, closing, net, stack }` — the names build.mjs reads
 */
export function subjectOf(beat) {
  if (!Array.isArray(beat.members) || beat.members.length !== MEMBERS)
    throw new Error(`beat.mjs gives ${Array.isArray(beat.members) ? beat.members.length : "no"} members: this video's bridge has five slots — the opening total, one step for each of exactly ${MEMBERS} members, the closing total — so group the data's columns into ${MEMBERS} members`);
  const names = beat.members.map((m) => String(m.name));
  if (new Set(names).size !== names.length) throw new Error("members holds the same name twice");
  const bad = beat.members.filter((m) => !(m.from >= 0 && m.to >= 0));
  if (bad.length) throw new Error(`a member is a segment of a total from zero, so every from and to must be 0 or more: ${bad.map((m) => m.name).join(", ")}`);
  const members = beat.members.map((m, i) => ({ key: `m${i}`, name: String(m.name), from: m.from, to: m.to, change: m.to - m.from }));
  const flat = members.filter((m) => tenth(m.change) === 0);
  if (flat.length) throw new Error(`${flat.map((m) => m.name).join(", ")} did not change (to the tenth): a step of zero is no step — group the columns differently`);
  const opening = members.reduce((t, m) => t + m.from, 0);
  const closing = members.reduce((t, m) => t + m.to, 0);
  if (!(opening > 0 && closing > 0)) throw new Error("both totals must be above 0");
  // The bridge as the chart prints it: every step to the tenth, walked from the opening to the tenth.
  const walked = tenth(members.reduce((t, m) => t + tenth(m.change), tenth(opening)));
  if (walked !== tenth(closing))
    throw new Error(`the bridge does not balance to the tenth: the printed steps walk ${n(tenth(opening))} to ${walked}, the closing total prints ${tenth(closing)} — round every member's from and to to one decimal in beat.mjs (Math.round(v * 10) / 10)`);
  const texts = Math.abs(Math.round(closing * 10) - Math.round(opening * 10)) + 1;
  if (texts > MAX_COUNTER_TEXTS)
    throw new Error(`the closing total counts from ${n(opening)} to ${n(closing)} in tenths, ${texts} texts: draw the values in a larger unit (thousands → millions) so the totals stay under ${MAX_COUNTER_TEXTS / 10} apart, and say it in unit`);
  const net = closing - opening;
  // The members stacked in a total, bottom to top: the one the bridge walks first sits on top.
  const stack = members.map((m) => m.key).reverse();
  return { members, opening, closing, net, stack };
}
