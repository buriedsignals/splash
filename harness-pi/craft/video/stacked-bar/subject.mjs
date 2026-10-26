// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-stacked-bar-lowcarbon-growth/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: every row's [level, growth] stack, the `drawCount` that
// added most, the first-state order, the order of gain, and how many copies of the adder's level lay end to end along
// the incumbent's. The proof asserted its own answers (Spain added most, France started five times higher, the five
// copies' end within 1 %); a story's answers are whatever its data gives, so each assertion becomes a refusal that names
// what to change in beat.mjs.
//
// Runs in Bun only.

/** How many rows a landscape frame holds with every name and count readable. */
export const MAX_ROWS = 12;
/** The fewest and the most copies of the adder's level the subject shot lays along the incumbent's. */
export const MIN_COPIES = 2;
export const MAX_COPIES = 12;
/**
 * How far the copies' end may stand from the incumbent's level, as a share of it, before « ×N » would be a rounding and
 * not a picture. The proof held its own data to 1 % (five copies of Spain's 2000 level against France's); a kit has to
 * take a story's data as it comes, and 5 % is the most a copy row may visibly over- or undershoot and still read as N.
 */
export const COPY_TOLERANCE = 0.05;

const n = (v) => String(+Number(v).toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `rows` [{ name, level, growth }], `adder`, `incumbent`, `drawCount`
 * @returns     `{ rows, adder, incumbent, copies, before, byGain, omitted }` — the names build.mjs reads
 */
export function subjectOf(beat) {
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { name, level, growth }");
  const all = beat.rows
    .map((r) => ({ key: String(r.name), name: String(r.name), level: r.level, growth: r.growth, total: r.level + r.growth }))
    .sort((x, y) => y.growth - x.growth);
  const names = all.map((r) => r.key);
  if (new Set(names).size !== names.length) throw new Error("rows holds the same name twice: give each row ONE pair (filter data.json to the two states)");
  const drawCount = beat.drawCount ?? Math.min(MAX_ROWS, all.length);
  if (!(Number.isInteger(drawCount) && drawCount >= 3 && drawCount <= MAX_ROWS)) throw new Error(`drawCount is ${JSON.stringify(beat.drawCount)}: the video draws between 3 and ${MAX_ROWS} rows`);
  if (all.length < drawCount) throw new Error(`rows has ${all.length} members, fewer than the ${drawCount} rows drawn: lower drawCount`);
  const negative = all.filter((r) => !(r.level > 0));
  if (negative.length) throw new Error(`a level is a bar from zero, so every level must be above 0: ${negative.map((r) => `${r.name}=${n(r.level)}`).join(", ")}`);
  const shrank = all.filter((r) => !(r.growth > 0));
  if (shrank.length)
    throw new Error(`${shrank.map((r) => r.name).join(", ")} did not grow (growth ${shrank.map((r) => n(r.growth)).join(", ")}), which a [level, growth] stack cannot draw — a negative segment is a waterfall or a diverging bar: leave those rows out, or choose another type`);
  const adder = all.find((r) => r.key === String(beat.adder));
  if (!adder) throw new Error(`adder is ${JSON.stringify(beat.adder)}, which is no row's name: set adder to the row whose growth the takeaway is about`);
  const incumbent = all.find((r) => r.key === String(beat.incumbent));
  if (!incumbent) throw new Error(`incumbent is ${JSON.stringify(beat.incumbent)}, which is no row's name: set incumbent to the row the adder is compared with`);
  if (adder === incumbent) throw new Error("adder and incumbent are the same row");
  if (!(adder.growth > incumbent.growth))
    throw new Error(`${adder.name} added ${n(adder.growth)} and ${incumbent.name} ${n(incumbent.growth)}: this video argues the adder added MORE than the incumbent, so that argument does not hold for this data`);
  const rows = all.slice(0, drawCount);
  for (const d of [adder, incumbent])
    if (!rows.includes(d)) throw new Error(`${d.name} is not among the ${drawCount} rows that added most (drawn largest growth first): raise drawCount, up to ${MAX_ROWS}`);

  // THE COPIES: as many of the adder's level as lay along the incumbent's, their end within COPY_TOLERANCE of it.
  const headStart = incumbent.level / adder.level;
  const copies = Math.round(headStart);
  if (copies < MIN_COPIES)
    throw new Error(`${incumbent.name} started ${n(headStart)} times as high as ${adder.name}: the video lays copies of ${adder.name}'s level along ${incumbent.name}'s to show a head start of several times, and ${copies} copy is none — that argument does not hold for this data; choose another type or the static format`);
  if (copies > MAX_COPIES) throw new Error(`${incumbent.name} started ${n(headStart)} times as high as ${adder.name}: the video lays at most ${MAX_COPIES} copies — choose another type or the static format`);
  const miss = Math.abs(copies * adder.level - incumbent.level) / incumbent.level;
  if (miss > COPY_TOLERANCE)
    throw new Error(
      `${copies} copies of ${adder.name}'s level end at ${n(copies * adder.level)}, ${(miss * 100).toFixed(1)} % from ${incumbent.name}'s ${n(incumbent.level)} (the ratio is ${n(headStart)}): « ×${copies} » would be a rounding, not a picture (the video allows ${COPY_TOLERANCE * 100} %) — that argument does not hold for this data; choose another type or the static format`,
    );
  const before = [...rows].sort((a, b) => b.level - a.level).map((d) => d.key);
  const byGain = rows.map((d) => d.key);
  return { rows, adder, incumbent, copies, before, byGain, omitted: all.slice(drawCount) };
}
