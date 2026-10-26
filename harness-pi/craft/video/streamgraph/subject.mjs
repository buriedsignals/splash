// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-streamgraph-swiss-electricity/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: every year's reading, the tracked band's rank each year,
// the year it first reaches the rank the title names and holds it since, the giants that hold every rank above it in
// every year (set aside so the race can be seen), and the rival it overtakes that year. The proof asserted its own
// answers (solar third since 2016, past oil, hydropower and nuclear the first two every year); a story's answers are
// whatever its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

const n = (v) => String(+Number(v).toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `keys`, `readings` [{ year, <key>: value }], `tracked`, `rank`, `giants?`
 * @returns     `{ readings, keys, ranks, reachedAt, tracked, giants, rival }` — the names build.mjs reads
 */
export function subjectOf(beat) {
  const { keys, tracked } = beat;
  if (!Array.isArray(keys) || keys.length < 3 || new Set(keys).size !== keys.length) throw new Error("beat.mjs: keys must list at least three different data.json columns (the bands)");
  if (!keys.includes(tracked)) throw new Error(`tracked is ${JSON.stringify(tracked)}, which is not in keys (${keys.join(", ")})`);
  if (!Array.isArray(beat.readings) || beat.readings.length < 5) throw new Error("beat.mjs: readings must hold one { year, <key>: value } per year, at least five years");
  const readings = [...beat.readings].map((r) => ({ year: Number(r.year), ...Object.fromEntries(keys.map((k) => [k, r[k]])) })).sort((a, b) => a.year - b.year);
  for (const r of readings)
    for (const k of keys)
      if (!(typeof r[k] === "number" && Number.isFinite(r[k]) && r[k] >= 0)) throw new Error(`readings for ${r.year} give ${k} = ${JSON.stringify(r[k])}: every band's value must be a number, 0 or more`);
  for (let i = 1; i < readings.length; i++)
    if (readings[i].year !== readings[i - 1].year + 1) throw new Error(`readings jump from ${readings[i - 1].year} to ${readings[i].year}: give every year from the first to the last, once each (a stream drawn across a gap invents the years between)`);
  const rank = beat.rank;
  if (!(Number.isInteger(rank) && rank >= 2 && rank < keys.length)) throw new Error(`rank is ${JSON.stringify(rank)}: the rank the title says the tracked band reached (2 to ${keys.length - 1})`);

  const orderIn = (reading) => keys.map((k) => ({ k, v: reading[k] })).sort((a, b) => b.v - a.v).map((o) => o.k);
  const ranks = readings.map((r) => ({ year: r.year, rank: orderIn(r).indexOf(tracked) + 1 }));
  const reached = ranks.find((r) => r.rank <= rank);
  if (!reached) throw new Error(`${tracked} never reaches rank ${rank} (its best is ${Math.min(...ranks.map((r) => r.rank))})`);
  const lost = ranks.filter((r) => r.year >= reached.year && r.rank > rank);
  if (lost.length) throw new Error(`${tracked} reaches rank ${rank} in ${reached.year} but falls back to rank ${lost[0].rank} in ${lost[0].year}: this video's race tells "has held rank ${rank} since ${reached.year}", which this data does not support`);
  if (reached.year === readings[0].year) throw new Error(`${tracked} already holds rank ${rank} in the first year (${reached.year}): there is no race to show — start the readings earlier, or choose another type`);
  if (beat.reachedIn !== undefined && beat.reachedIn !== reached.year) throw new Error(`reachedIn is ${beat.reachedIn}, but ${tracked} first reaches rank ${rank} in ${reached.year}`);

  // THE GIANTS: the bands that hold every rank above the race in every year, set aside so the race can be seen.
  const giants = beat.giants ?? orderIn(readings[0]).slice(0, rank - 1);
  if (!Array.isArray(giants) || giants.length !== rank - 1 || giants.some((g) => !keys.includes(g) || g === tracked))
    throw new Error(`giants is ${JSON.stringify(beat.giants)}: give the ${rank - 1} key(s) that hold ranks 1 to ${rank - 1} every year, or leave it out`);
  for (const r of readings) {
    const top = orderIn(r).slice(0, giants.length);
    if (!giants.every((g) => top.includes(g)))
      throw new Error(`in ${r.year} the bands ranked 1 to ${giants.length} are ${top.join(", ")}, not ${giants.join(", ")}: setting the giants aside would hide part of the race, so this video's argument does not hold for this data — choose another type or the static format`);
  }
  // THE RIVAL: the band at the rank the year before the tracked one takes it — the one it overtakes.
  const before = readings.find((r) => r.year === reached.year - 1);
  const at = readings.find((r) => r.year === reached.year);
  const rival = orderIn(before)[rank - 1];
  if (!(before[tracked] < before[rival] && at[tracked] > at[rival]))
    throw new Error(`${tracked} takes rank ${rank} in ${reached.year} without passing ${rival} (${n(before[tracked])} vs ${n(before[rival])} in ${before.year}, ${n(at[tracked])} vs ${n(at[rival])} in ${at.year}): the race has no one overtaken, so this argument does not hold for this data`);
  return { readings, keys, ranks, reachedAt: reached.year, tracked, giants, rival };
}
