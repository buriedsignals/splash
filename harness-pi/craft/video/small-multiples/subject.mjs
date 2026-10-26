// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-small-multiples-lowcarbon/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: every panel's two values and its gain, the one shared scale, the
// correlation between the start and the gain, the grid's first order (alphabetical, which hides the pattern), the order
// of the start the grid re-sorts into, and the two panels the last shot rings (the largest and the smallest gain). The
// proof asserted its own answers (all sixteen rose, Denmark the most, Sweden the least, a 0–100 % scale); a story's
// answers are whatever its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** The correlation under which the re-sort by start shows "the lower the start, the larger the gain" (the proof's rule). */
export const CORRELATION_MAX = -0.5;

const n = (v) => String(+Number(v).toPrecision(4));

/** The Pearson correlation between two equal-length series. */
export function correlationOf(xs, ys) {
  const count = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / count;
  const my = ys.reduce((s, v) => s + v, 0) / count;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const sx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const sy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return cov / (sx * sy);
}

/**
 * @param beat  beat.mjs's default export: `panels` [{ name, from, to }], `ceiling`, `lang`
 * @returns     `{ rows, ceiling, correlation, before, byStart, rings }` — the names build.mjs reads
 */
export function subjectOf(beat, lang = "en") {
  if (!Array.isArray(beat.panels)) throw new Error("beat.mjs: panels must be an array of { name, from, to }");
  if (beat.panels.length < 4) throw new Error(`beat.mjs gives ${beat.panels.length} panels: a grid compares at least 4`);
  const panels = beat.panels.map((p) => ({ key: String(p.name), name: String(p.name), from: p.from, to: p.to, delta: p.to - p.from }));
  const names = panels.map((p) => p.key);
  if (new Set(names).size !== names.length) throw new Error("panels holds the same name twice: give each panel ONE pair of values (filter data.json to the two states)");
  const negative = panels.filter((p) => p.from < 0 || p.to < 0);
  if (negative.length) throw new Error(`a bar's height is its value from zero, so every value must be 0 or more: ${negative.map((p) => p.name).join(", ")}`);
  // The second bar slides out of the first and RISES; the gain counts up from +0.
  const fell = panels.filter((p) => !(p.delta > 0));
  if (fell.length)
    throw new Error(`${fell.map((p) => `${p.name} (${n(p.from)} → ${n(p.to)})`).join(", ")} did not rise: in this video every panel's second bar rises out of its first and its gain counts up, so it tells only stories where every panel rose — leave those panels out, or choose another type`);
  const largest = Math.max(...panels.flatMap((p) => [p.from, p.to]));
  const ceiling = beat.ceiling;
  if (!(typeof ceiling === "number" && Number.isFinite(ceiling) && ceiling >= largest && ceiling <= 2 * largest))
    throw new Error(`ceiling is ${JSON.stringify(ceiling)}: it must be the top of the ONE shared scale, a round number at or just above the largest value (${n(largest)}) — e.g. Math.ceil(max / 25) * 25`);
  const correlation = correlationOf(panels.map((p) => p.from), panels.map((p) => p.delta));
  if (!(correlation < CORRELATION_MAX))
    throw new Error(
      `the correlation between the first value and the gain is ${correlation.toFixed(2)}: this video re-sorts the panels by their first value to show that the lowest starts gained the most (it needs a correlation under ${CORRELATION_MAX}), so that argument does not hold for this data; choose another type or the static format`,
    );
  const byDelta = [...panels].sort((a, b) => b.delta - a.delta);
  const byStart = [...panels].sort((a, b) => a.from - b.from);
  // THE VIDEO'S ORDERS: the grid opens alphabetical, which hides the pattern, and ends in the order of the start.
  const rows = [...panels].sort((a, b) => a.name.localeCompare(b.name, lang));
  return {
    rows,
    ceiling,
    correlation,
    before: rows.map((p) => p.key),
    byStart: byStart.map((p) => p.key),
    rings: [byDelta[0].key, byDelta.at(-1).key],
  };
}
