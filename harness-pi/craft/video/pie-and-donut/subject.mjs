// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-donut-world-co2-share/subject.mjs, which read that
// beat's frozen CSV. The derivation is the proof's: every ring's absolute value at the two states, the whole each share
// is of (every part of the partition, not only the rings drawn), the rings ordered by their second-state value, each
// one's share of the whole at each state. The proof asserted its own answers (the United States a quarter and China a
// seventh in 2000, the swap in 2023, the world up by half); a story's answers are whatever its data gives — the claim is
// beat.mjs's check() — and what the gesture needs becomes a refusal.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `rings` [{ key, name, before, after }], `wholeBefore`, `wholeAfter`, `subject`,
 *              `named`, `from`, `to`
 * @returns     `{ countries: [{ code, name, gt0, gt1, share0, share1 }], world0, world1, growth, FROM, TO, NAMED, SUBJECT }`
 *              — the names the proof's build.mjs reads (`gt` is the absolute value, whatever its unit)
 */
export function subjectOf(beat) {
  const rings = beat.rings;
  if (!Array.isArray(rings) || rings.length < 2 || rings.length > 8) throw new Error(`rings holds ${rings?.length} entities; the video draws 2 to 8 rings (6 on a landscape row)`);
  const keys = rings.map((r) => String(r.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two rings share a key (${keys.join(", ")}): one ring per entity`);
  const negative = rings.filter((r) => !(r.before >= 0 && r.after >= 0));
  if (negative.length) throw new Error(`${negative.map((r) => r.key).join(", ")} hold a negative value: an arc is a part of a whole, zero or more`);
  const world0 = beat.wholeBefore;
  const world1 = beat.wholeAfter;
  if (!(world0 > 0 && world1 > 0)) throw new Error(`wholeBefore and wholeAfter must be the totals of every part at each state, above 0 (they are ${world0} and ${world1})`);
  const sum0 = rings.reduce((s, r) => s + r.before, 0);
  const sum1 = rings.reduce((s, r) => s + r.after, 0);
  if (sum0 > world0 * (1 + 1e-9) || sum1 > world1 * (1 + 1e-9))
    throw new Error(`the rings add up to ${n(sum0)} and ${n(sum1)}, more than the wholes (${n(world0)}, ${n(world1)}): wholeBefore / wholeAfter must be the total of EVERY part, the rings drawn included — one turn is the whole on every ring`);
  const SUBJECT = String(beat.subject);
  if (!keys.includes(SUBJECT)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not the key of any ring (${keys.join(", ")})`);
  const NAMED = [beat.named ?? [SUBJECT]].flat().map(String);
  if (NAMED.length !== 2 || NAMED[0] === NAMED[1] || !NAMED.includes(SUBJECT))
    throw new Error(`named is ${JSON.stringify(beat.named)}: the world ring names exactly TWO members beside their arcs — the subject and the one the takeaway compares it with`);
  const unknown = NAMED.filter((k) => !keys.includes(k));
  if (unknown.length) throw new Error(`named holds ${unknown.join(", ")}, not the key of any ring`);
  const countries = rings
    .map((r) => ({ code: String(r.key), name: String(r.name), gt0: r.before, gt1: r.after, share0: (r.before / world0) * 100, share1: (r.after / world1) * 100 }))
    .sort((a, b) => b.gt1 - a.gt1);
  return { countries, world0, world1, growth: (world1 / world0 - 1) * 100, FROM: String(beat.from), TO: String(beat.to), NAMED, SUBJECT };
}

/**
 * What the gesture needs, checked AFTER beat.check(): the 2nd-state ring grows out of the 1st-state one, its radius the
 * whole's — a whole that shrank would make the « grown » ring smaller and draw it under the first.
 */
export function assertGesture(subject) {
  if (!(subject.world1 > subject.world0))
    throw new Error(`the whole fell from ${n(subject.world0)} to ${n(subject.world1)}: this video grows the second state's ring OUT of the first's (its radius is the whole), so it cannot tell a whole that shrank — offer the static format`);
}
