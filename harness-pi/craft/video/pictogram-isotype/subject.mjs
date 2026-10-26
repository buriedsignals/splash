// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-pictogram-europe-lowcarbon/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: every unit at its share on a 0–100 axis of twenty 5-point
// columns, stacked in its column in the order of the shares, its shade class from the breaks, and its block from the two
// cuts — under the low cut, between, from the high cut. The proof asserted its own answers (18, 6 and 16 of 40, the
// middle under a quarter); a story's answers are whatever its data gives — the claim is beat.mjs's check() — and what
// the gesture needs becomes a refusal.
//
// Runs in Bun only.

/** One column of the axis per this many points of share; both cuts must fall on a column's edge. */
export const STEP = 5;
export const COLUMNS = 100 / STEP;

/**
 * @param beat  beat.mjs's default export: `units` [{ key, label, value }], `cuts` [low, high], `breaks`
 * @returns     `{ countries, counts, tallest, total, cuts, breaks }` — the names the proof's build.mjs reads
 */
export function subjectOf(beat) {
  const units = beat.units;
  if (!Array.isArray(units) || units.length < 10 || units.length > 120) throw new Error(`units holds ${units?.length} things; the video draws 10 to 120 squares on one axis`);
  const keys = units.map((u) => String(u.key));
  if (new Set(keys).size !== keys.length) throw new Error("two units share a key: one square per thing — filter data.json to one year");
  const outside = units.filter((u) => !(u.value >= 0 && u.value <= 100));
  if (outside.length)
    throw new Error(`${outside.slice(0, 3).map((u) => `${u.key}=${u.value}`).join(", ")} lie outside 0–100: the video stands every square on a 0 % to 100 % axis, so every value is a share in %`);
  const cuts = [beat.cuts].flat();
  if (cuts.length !== 2 || !cuts.every((c) => Number.isInteger(c) && c > 0 && c < 100) || !(cuts[0] < cuts[1]))
    throw new Error(`cuts is ${JSON.stringify(beat.cuts)}: give the two thresholds the takeaway names, low then high, as whole percents between 0 and 100`);
  if (cuts.some((c) => c % STEP !== 0)) throw new Error(`cuts is ${JSON.stringify(cuts)}: the axis stands in ${STEP}-point columns and parts on a column's edge, so each cut must be a multiple of ${STEP}`);
  const breaks = [beat.breaks].flat();
  if (breaks.length < 1 || breaks.length > 6 || breaks.some((b, i) => !(typeof b === "number" && b > 0 && b < 100) || (i > 0 && !(b > breaks[i - 1]))))
    throw new Error(`breaks is ${JSON.stringify(beat.breaks)}: give 1 to 6 increasing numbers between 0 and 100, the edges of the shade classes`);

  const [LOW, HIGH] = cuts;
  const byColumn = Array.from({ length: COLUMNS }, () => []);
  const countries = units
    .map((u) => ({ code: String(u.key), name: String(u.label), share: u.value }))
    .sort((a, b) => a.share - b.share || a.code.localeCompare(b.code))
    .map((c) => {
      const column = Math.min(COLUMNS - 1, Math.floor(c.share / STEP));
      const row = byColumn[column].length;
      const placed = { ...c, column, row, classIndex: breaks.filter((b) => c.share >= b).length, block: c.share >= HIGH ? 2 : c.share >= LOW ? 1 : 0 };
      byColumn[column].push(placed);
      return placed;
    });
  const counts = [0, 1, 2].map((b) => countries.filter((c) => c.block === b).length);
  for (const c of countries) if (c.block !== (c.column >= HIGH / STEP ? 2 : c.column >= LOW / STEP ? 1 : 0)) throw new Error(`${c.name}'s column is not in its block (a kit bug)`);
  return { countries, counts, tallest: Math.max(...byColumn.map((c) => c.length)), total: countries.length, cuts, breaks };
}

/** What the gesture needs, checked AFTER beat.check(): each of the three parts gathers into a block, so none is empty. */
export function assertGesture(subject) {
  const names = [`under ${subject.cuts[0]}`, `from ${subject.cuts[0]} to ${subject.cuts[1]}`, `from ${subject.cuts[1]}`];
  const empty = subject.counts.map((n, b) => (n ? null : names[b])).filter(Boolean);
  if (empty.length) throw new Error(`no unit lies ${empty.join(" or ")}: the video gathers each of the three parts into a block and counts it, so every part needs at least one square — this argument does not hold for this data`);
}
