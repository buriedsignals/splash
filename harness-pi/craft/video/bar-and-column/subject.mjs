// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-bar-top-emitters-2024/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: rank the rows, keep the `drawCount` largest, and run the search
// behind the headline (add the next members while they stay under the first). The proof asserted its own answers
// (« five », Germany fits); a story's answers are whatever its data gives, so each assertion becomes a refusal that names
// what to change in beat.mjs.
//
// Runs in Bun only.

/** How many rows a landscape frame holds with every count readable; past it `build.mjs` refuses on row pitch. */
export const MAX_ROWS = 12;

/** A value as a refusal prints it: four significant digits, no float noise (12.252210000000002). */
const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `rows` [{ name, value }], `drawCount`, `subject`, `whole`
 * @returns     `{ top: [{ name, value }], beaten, combined, world, gap }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const ranked = [...beat.rows].map((r) => ({ name: String(r.name), value: r.value })).sort((a, b) => b.value - a.value);
  const drawCount = beat.drawCount ?? 10;
  if (!(Number.isInteger(drawCount) && drawCount >= 4 && drawCount <= MAX_ROWS))
    throw new Error(`drawCount is ${JSON.stringify(beat.drawCount)}: the video draws between 4 and ${MAX_ROWS} rows`);
  if (ranked.length < drawCount) throw new Error(`rows has ${ranked.length} members, fewer than the ${drawCount} rows drawn: lower drawCount`);
  const top = ranked.slice(0, drawCount);
  const negative = top.filter((r) => !(r.value > 0));
  if (negative.length) throw new Error(`a bar's length is its value from zero, so every drawn value must be above 0: ${negative.map((r) => `${r.name}=${n(r.value)}`).join(", ")}`);
  if (top[0].name !== String(beat.subject))
    throw new Error(
      `subject is ${JSON.stringify(beat.subject)}, but the first of the ranking is ${JSON.stringify(top[0].name)}: this video argues the LEADER against the members below it — set subject to the leader's name, or filter rows to the ranking the takeaway is about`,
    );

  const [first, ...rest] = top;
  let combined = 0;
  let beaten = 0;
  for (const row of rest) {
    if (combined + row.value > first.value) break;
    combined += row.value;
    beaten += 1;
  }
  // Sorted, the second never exceeds the first, so the pile holds at least one block; kept as the proof's assertion.
  if (beaten < 1) throw new Error(`no run of the members after ${first.name} stays under it, so the video's pile has nothing to stack`);
  // The last row drawn is the one that slides into the gap left before the first's end: it must be outside the pile.
  if (beaten > drawCount - 2) {
    const need = beaten + 2;
    throw new Error(
      `the ${beaten} members after ${first.name} together stay under it, which leaves no member outside the pile to slide into the gap: ` +
        (ranked.length >= need && need <= MAX_ROWS ? `raise drawCount to ${need}` : `this ranking has too few members for the video's last shot`),
    );
  }
  const gap = first.value - combined;
  const last = top[drawCount - 1];
  if (!(last.value < gap)) {
    // A later member is smaller: find the fewest rows whose last one fits, if any.
    const fits = ranked.findIndex((r, i) => i >= beaten + 1 && i < MAX_ROWS && r.value < gap);
    throw new Error(
      `the video's last shot slides the last row drawn (${last.name}, ${n(last.value)}) into the gap between the ${beaten} piled after ${first.name} (${n(combined)}) and ${first.name}'s end (${n(first.value)}); the gap is ${n(gap)} and it does not fit: ` +
        (fits >= 0 ? `set drawCount to ${fits + 1}, whose last row (${ranked[fits].name}) fits` : `no member within ${MAX_ROWS} rows fits the gap, so this argument does not hold for this data`),
    );
  }
  const world = beat.whole;
  const tenSum = top.reduce((s, r) => s + r.value, 0);
  if (!(typeof world === "number" && Number.isFinite(world)) || tenSum > world * (1 + 1e-9))
    throw new Error(`whole is ${JSON.stringify(world)}, but the ${drawCount} drawn rows add up to ${n(tenSum)}: whole must be the total the ranking is cut from (a "World" row, or the sum of every row) — the video opens on it as one bar`);
  return { top, beaten, combined, world, gap };
}
