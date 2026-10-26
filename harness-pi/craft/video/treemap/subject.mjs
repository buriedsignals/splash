// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-treemap-europe-capacity/subject.mjs, which read
// that beat's frozen station list. The derivation is the proof's: one cell per item, sorted largest first, each with the
// share its PART (the proof's wind and solar) holds; the items whose part is over half (they "tipped") are the thread;
// their sum against the largest cell's, which the gather lays out as a picture. The proof asserted its own answers
// (water and atom over 70 %, ten tipped, under 25 % of the whole, France the largest and not tipped); a story's answers
// are whatever its data gives, so each assertion the gesture needs becomes a refusal that names what to change in
// beat.mjs.
//
// Runs in Bun only.

/** The share of a cell its part must pass to be flooded — the midline the fill draws across every cell. */
export const TIPPED_AT = 0.5;

const n = (v) => String(+Number(v).toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `cells` [{ name, value, part }]
 * @returns     `{ countries, total, tipped, tippedMw, biggest, intoBiggest }` — the names build.mjs reads (the proof's,
 *              in megawatts there; here in the beat's own unit)
 */
export function subjectOf(beat) {
  if (!Array.isArray(beat.cells)) throw new Error("beat.mjs: cells must be an array of { name, value, part }");
  if (beat.cells.length < 4) throw new Error(`beat.mjs gives ${beat.cells.length} cells: a treemap shares a whole among at least 4`);
  const names = beat.cells.map((c) => String(c.name));
  if (new Set(names).size !== names.length) throw new Error("cells holds the same name twice: ADD UP the rows of one item into one cell");
  const bad = beat.cells.filter((c) => !(c.value > 0) || !(c.part >= 0) || c.part > c.value * (1 + 1e-9));
  if (bad.length)
    throw new Error(`a cell's area is its value and its fill is its part, so every value must be above 0 and every part between 0 and its value: ${bad.slice(0, 3).map((c) => `${c.name} (value ${n(c.value)}, part ${n(c.part)})`).join(", ")}`);
  const total = beat.cells.reduce((s, c) => s + c.value, 0);
  const countries = beat.cells
    .map((c) => ({ key: String(c.name), name: String(c.name), mw: c.value, newBuild: c.part, tipped: c.part / c.value > TIPPED_AT }))
    .sort((a, b) => b.mw - a.mw);
  const tipped = countries.filter((c) => c.tipped);
  const tippedMw = tipped.reduce((s, c) => s + c.mw, 0);
  const biggest = countries[0];
  if (!tipped.length) throw new Error(`no cell's part is over half its value: the video floods the cells past the middle, so it has nothing to flood — this argument does not hold for this data; choose another type or the static format`);
  if (biggest.tipped)
    throw new Error(`the largest cell (${biggest.name}) is itself past the middle: the video gathers the flooded cells INTO the largest cell, which must stay outside them — this argument does not hold for this data; choose another type or the static format`);
  // THE GATHER: the flooded cells, gathered, must fit inside the largest cell — otherwise the gather has no room to land in.
  const intoBiggest = tippedMw / biggest.mw;
  if (!(intoBiggest < 1))
    throw new Error(`the ${tipped.length} cells past the middle add up to ${n(tippedMw)}, not less than ${biggest.name}'s ${n(biggest.mw)}: the video packs them inside the largest cell, so they do not fit — this argument does not hold for this data; choose another type or the static format`);
  return { countries, total, tipped, tippedMw, biggest, intoBiggest };
}
