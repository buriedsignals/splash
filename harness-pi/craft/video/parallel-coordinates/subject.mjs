// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-parallel-coordinates-electricity-mix/subject.mjs,
// which read that beat's frozen CSV. The derivation is the proof's: every line's values on the axes in the beat's order,
// each a SHARE (%) of the line's own whole, and the rest (the parts on no axis); the lines at or above each floor and at
// or above both; the correlation between the two claim axes; the line whose whole bar stands up first; the shared
// ceiling. The proof asserted its own answers (two of sixteen, Finland and Sweden, r < −0.2); a story's answers are
// whatever its data gives — the claim is beat.mjs's check() — and what the gesture needs becomes a refusal.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `axes`, `lines` [{ key, name, values }], `claimAxes`, `floors`, `thread`, `shown`
 * @returns     `{ axes, lines: [{ code, name, values: [...], rest }], floors, nuclearHeavy, windHeavy, both, r, shown, ceiling }`
 *              — the proof's names: « nuclear » is the first claim axis, « wind » the second
 */
export function subjectOf(beat) {
  const axes = beat.axes.map((a) => ({ key: String(a.key), name: String(a.name) }));
  if (axes.length < 3 || axes.length > 9) throw new Error(`axes holds ${axes.length} axes; the video stands a line on 3 to 9 rails`);
  if (new Set(axes.map((a) => a.key)).size !== axes.length) throw new Error("two axes share a key");
  const claim = [beat.claimAxes].flat().map(String);
  if (claim.length !== 2) throw new Error(`claimAxes must name the TWO axes the takeaway relates; it holds ${claim.length}`);
  // THE CLOSE-UP OPENS THE GAP BETWEEN THE FIRST TWO RAILS: the camera's second spacing puts rail 0 at the left of the
  // frame and rail 1 at its right, and the floors rise on those two.
  if (axes[0].key !== claim[0] || axes[1].key !== claim[1])
    throw new Error(`claimAxes is ${claim.join(", ")}, but the first two axes are ${axes[0].key}, ${axes[1].key}: put the two claim axes FIRST in axes, in claimAxes' order (the video opens the gap between the first two rails)`);
  const floors = [beat.floors].flat();
  if (floors.length !== 2 || !floors.every((f) => Number.isInteger(f) && f > 0 && f < 100))
    throw new Error(`floors is ${JSON.stringify(beat.floors)}: give the two floors the takeaway names, one per claim axis, as whole percents (e.g. [25, 20])`);

  if (!Array.isArray(beat.lines) || beat.lines.length < 3 || beat.lines.length > 30) throw new Error(`lines holds ${beat.lines?.length} entities; the video draws 3 to 30 lines`);
  const keys = beat.lines.map((l) => String(l.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two lines share a key: one line per entity — filter data.json to one year`);
  const lines = beat.lines.map((l) => {
    const absent = axes.filter((a) => !(a.key in (l.values ?? {})));
    if (absent.length) throw new Error(`line ${l.key} has no value for ${absent.map((a) => a.key).join(", ")}: every line carries every axis (0 where there is none)`);
    const values = axes.map((a) => l.values[a.key]);
    if (values.some((v) => !(v >= 0))) throw new Error(`line ${l.key} holds a negative share: every value is a share of the line's own whole, from 0 to 100`);
    const sum = values.reduce((s, v) => s + v, 0);
    // THE REFERENCE STANDS ONE LINE'S WHOLE ON THE RAILS: 100 points cut into the axes' parts and the rest.
    if (sum > 100 + 1e-6) throw new Error(`line ${l.key}'s values add up to ${n(sum)}: the video stands a line's whole (100 %) on the rails, so every value is a SHARE in % of the line's own total (the parts on no axis included), and they add up to 100 at most`);
    return { code: String(l.key), name: String(l.name), values, rest: 100 - sum };
  });

  const [NUCLEAR_FLOOR, WIND_FLOOR] = floors;
  const nuclearHeavy = lines.filter((l) => l.values[0] >= NUCLEAR_FLOOR);
  const windHeavy = lines.filter((l) => l.values[1] >= WIND_FLOOR);
  const both = nuclearHeavy.filter((l) => l.values[1] >= WIND_FLOOR);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const xs = lines.map((l) => l.values[0]);
  const ys = lines.map((l) => l.values[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const r = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));

  const thread = [beat.thread].flat().map(String);
  const unknown = thread.filter((t) => !keys.map(String).includes(t));
  if (unknown.length) throw new Error(`thread names ${unknown.join(", ")}, not the key of any line`);
  const shownKey = String(beat.shown ?? thread[0]);
  const shown = lines.find((l) => l.code === shownKey);
  return { axes, lines, floors, thread, nuclearHeavy, windHeavy, both, r: Number.isFinite(r) ? r : 0, shown, shownKey, ceiling: Math.ceil(Math.max(...lines.flatMap((l) => l.values)) / 10) * 10 };
}

/**
 * What the gesture needs of that subject, checked AFTER beat.check(): the floors sweep the lines down to the thread, so
 * the thread must be exactly the lines at or above both floors, and the bar stood up first one of them.
 */
export function assertGesture(subject) {
  const { both, thread, shown, shownKey, floors, axes, ceiling } = subject;
  if (!both.length) throw new Error(`no line is at or above both floors (${axes[0].key} ≥ ${floors[0]}, ${axes[1].key} ≥ ${floors[1]}): the sweep would leave nothing, so this argument does not hold for this data`);
  const bothKeys = both.map((l) => l.code).sort();
  if (bothKeys.join() !== [...thread].sort().join())
    throw new Error(`thread is ${thread.join(", ")}, but the lines at or above both floors are ${bothKeys.join(", ")}: the sweep leaves exactly those, and they take the accent — set thread to them`);
  if (!shown) throw new Error(`shown is ${shownKey}, not the key of any line`);
  if (!both.includes(shown)) throw new Error(`shown is ${shownKey}: the line whose whole stands up first is one of the thread (${bothKeys.join(", ")})`);
  if (floors.some((f) => f > ceiling)) throw new Error(`a floor (${floors.join(", ")}) is above every value: the floor would rise past the rails' top`);
}
