// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-diverging-bar-eu-per-capita/subject.mjs, which read
// that beat's frozen CSV through the static beat's `changesBetween`. The derivation is the proof's: each row's change from
// its first reading to its second, sorted from the largest rise to the largest fall, and the « only one rose » claim
// re-run. The proof asserted its own answers (27 members, one rise, 26 falls); a story's answers are whatever its data
// gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `rows` [{ name, from, to }], `subject` (the one row that rose)
 * @returns     `{ rows: [{ key, name, from, to, change }], subject, falls }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const rows = beat.rows
    .map((r) => ({ key: String(r.name), name: String(r.name), from: r.from, to: r.to, change: r.to - r.from }))
    .sort((a, b) => b.change - a.change);
  if (rows.length < 4) throw new Error(`rows has ${rows.length} members: the video draws a field of at least 4 rows (one rise among falls)`);
  // The level bars grow from zero, so both readings are lengths.
  const negative = rows.filter((r) => !(r.from >= 0 && r.to >= 0));
  if (negative.length) throw new Error(`a level is drawn as a bar from zero, so every from and to must be 0 or more: ${negative.slice(0, 3).map((r) => `${r.name} ${n(r.from)} → ${n(r.to)}`).join(", ")}`);
  const rose = rows.filter((r) => r.change > 0);
  const fell = rows.filter((r) => r.change < 0);
  // The choreography zooms onto ONE rise among falls: a second rise has no shot, and none leaves the zoom nothing to show.
  if (rose.length !== 1)
    throw new Error(
      `${rose.length} rows rose (${rose.slice(0, 4).map((r) => `${r.name} ${r.change > 0 ? "+" : ""}${n(r.change)}`).join(", ") || "none"}): this video argues ONE row that rose (to above from) while the others fell, and zooms onto that one — ` +
        `filter rows to the field the takeaway is about, or choose another type for this data`,
    );
  if (rose[0].name !== String(beat.subject))
    throw new Error(`subject is ${JSON.stringify(beat.subject)}, but the one row that rose is ${JSON.stringify(rose[0].name)}: set subject to that row's name`);
  if (fell.length < 2) throw new Error(`only ${fell.length} row(s) fell: the video counts the falls before it shows the one rise; it needs at least 2`);
  return { rows, subject: rose[0].key, falls: fell.length };
}
