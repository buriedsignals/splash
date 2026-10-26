// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-radar-electricity-mix/subject.mjs, which read that
// beat's frozen CSV. The derivation is the proof's: two items, each a whole made of the spokes' absolute values, each
// spoke a share of the item's OWN whole, one radial scale whose ceiling is the next round ten above the largest share,
// and the spoke the conclusion rings. The proof asserted its own answers (France and Germany within 25 %, nuclear more
// than half of France's mix and none of Germany's); a story's answers are whatever its data gives — the claim is
// beat.mjs's check() — and what the gesture needs becomes a refusal.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `items` (two names), `subject`, `spokes` [{ key, label, shortLabel?, values }], `named`
 * @returns     `{ spokes: [{ column, label }], countries: [{ name, total, twh, shares }], ratio, ceiling, rings, named }` — the
 *              proof's names, the subject first (`twh` is the absolute value, whatever its unit)
 */
export function subjectOf(beat) {
  const items = [beat.items].flat().map(String);
  if (items.length !== 2 || items[0] === items[1]) throw new Error(`items is ${JSON.stringify(beat.items)}: the video compares exactly TWO items`);
  const subject = String(beat.subject);
  const at = items.indexOf(subject);
  if (at < 0) throw new Error(`subject ${JSON.stringify(beat.subject)} is not one of items (${items.join(", ")}) — spell it exactly as in items`);
  const spokes = beat.spokes;
  if (!Array.isArray(spokes) || spokes.length < 3 || spokes.length > 12) throw new Error(`spokes holds ${spokes?.length} spokes; a radar draws 3 to 12`);
  const keys = spokes.map((s) => String(s.key));
  if (new Set(keys).size !== keys.length) throw new Error("two spokes share a key");
  for (const s of spokes) {
    if (!Array.isArray(s.values) || s.values.length !== 2) throw new Error(`spoke ${s.key}: values must hold the two items' absolute values, in the order of items`);
    if (s.values.some((v) => !(v >= 0))) throw new Error(`spoke ${s.key} holds a negative value: a spoke is a part of its item's whole, zero or more`);
  }
  // The subject first: the accent's item, and the bar the other stretches to.
  const order = at === 0 ? [0, 1] : [1, 0];
  const countries = order.map((i) => {
    const twh = spokes.map((s) => s.values[i]);
    const total = twh.reduce((a, b) => a + b, 0);
    if (!(total > 0)) throw new Error(`${items[i]}'s spokes add up to 0: the video draws each item as its whole first`);
    return { name: items[i], total, twh, shares: twh.map((v) => (v / total) * 100) };
  });
  const named = beat.named === undefined ? -1 : keys.indexOf(String(beat.named));
  if (beat.named !== undefined && named < 0) throw new Error(`named ${JSON.stringify(beat.named)} is not the key of a spoke (${keys.join(", ")})`);
  if (named < 0) throw new Error("named is missing: give the key of the spoke the takeaway turns on — its two shares are ringed at the end");
  const largest = Math.max(...countries.flatMap((c) => c.shares));
  const ceiling = Math.ceil(largest / 10) * 10;
  return {
    spokes: spokes.map((s) => ({ column: String(s.key), label: String(s.label) })),
    countries,
    ratio: Math.max(...countries.map((c) => c.total)) / Math.min(...countries.map((c) => c.total)),
    ceiling,
    rings: [ceiling / 4, ceiling / 2, (ceiling * 3) / 4, ceiling],
    named,
  };
}

/**
 * What the gesture needs, checked AFTER beat.check(): the other item's bar STRETCHES to the subject's length (the one
 * rescale that turns both into shares), so the subject must hold the larger whole.
 */
export function assertGesture(subject) {
  const [first, other] = subject.countries;
  if (!(first.total >= other.total))
    throw new Error(`${first.name}'s whole (${n(first.total)}) is smaller than ${other.name}'s (${n(other.total)}): this video stretches the other item's bar to the subject's length, so the subject must hold the larger whole — this video cannot tell it, offer the static format`);
}
