// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-beeswarm-co2-per-person/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: the marks, their total size (the one disc the video opens on),
// the size-weighted mean (where that disc sits), the tail beyond the threshold and its share of the total, the named
// marks. The proof asserted its own answers (six above 20 t, under 1 %, the mean above what 60 % emit, India named); a
// story's answers are whatever its data gives — the claim is beat.mjs's check() — and what this choreography cannot draw
// becomes a refusal naming what to change in beat.mjs.
//
// Runs in Bun only.

export const MIN_MARKS = 10;
export const MAX_MARKS = 400;
/** The gather flies one copy per tail member into the outline, in 100 frames: past this many it is a blur. */
export const MAX_TAIL = 15;
export const MAX_NAMED = 3;

const n = (v) => String(+v.toPrecision(4));

/** Round ticks from zero past the largest value — the proof's 0, 10, 20, 30, 40 over a 40,2 t tail. */
export function ticksOf(top) {
  const pow = 10 ** Math.floor(Math.log10(top));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * pow).find((s) => Math.ceil(top / s) <= 5);
  // A last tick a hair under the largest value is kept (the proof's 40 under a 40,2 t tail; its domain runs 2 % past).
  const count = Math.round(top / step) * step >= 0.95 * top ? Math.round(top / step) : Math.ceil(top / step);
  return Array.from({ length: count + 1 }, (_, i) => +(i * step).toFixed(10));
}

/**
 * @param beat  beat.mjs's default export: `marks` [{ name, value, size }], `threshold`, `callouts` [{ name, label }]
 * @returns     `{ countries: [{ code, entity, tonnes, people }], world, mean, high, highPeople, share, threshold, named,
 *              ticks }` — the names `build.mjs` reads (the proof's names for a mark, its value and its size)
 */
export function subjectOf(beat) {
  const countries = beat.marks.map((m) => ({ code: String(m.name), entity: String(m.name), tonnes: m.value, people: m.size }));
  if (countries.length < MIN_MARKS || countries.length > MAX_MARKS)
    throw new Error(`marks has ${countries.length} members: the swarm draws between ${MIN_MARKS} and ${MAX_MARKS} — filter data.json to one row per unit`);
  const names = countries.map((c) => c.code);
  const twice = names.find((name, i) => names.indexOf(name) !== i);
  if (twice !== undefined) throw new Error(`marks holds ${JSON.stringify(twice)} twice: give each unit ONE mark (filter data.json to one year)`);
  const badSize = countries.filter((c) => !(c.people > 0));
  if (badSize.length) throw new Error(`a circle's area is its size, so every size must be above 0: ${badSize.slice(0, 3).map((c) => `${c.code}=${c.people}`).join(", ")}`);
  const negative = countries.filter((c) => !(c.tonnes >= 0));
  if (negative.length) throw new Error(`the axis starts at zero, so every value must be 0 or more: ${negative.slice(0, 3).map((c) => `${c.code}=${n(c.tonnes)}`).join(", ")}`);

  const threshold = beat.threshold;
  if (!(typeof threshold === "number" && Number.isFinite(threshold))) throw new Error(`threshold is ${JSON.stringify(threshold)}: give the value beyond which the tail is ringed, as a number`);
  const world = countries.reduce((s, c) => s + c.people, 0);
  const mean = countries.reduce((s, c) => s + c.tonnes * c.people, 0) / world;
  const high = countries.filter((c) => c.tonnes > threshold);
  if (!high.length) throw new Error(`no mark is above the threshold ${n(threshold)} (the largest is ${n(Math.max(...countries.map((c) => c.tonnes)))}): the video rings the tail beyond it — lower threshold to the takeaway's figure`);
  if (high.length > MAX_TAIL) throw new Error(`${high.length} marks are above the threshold ${n(threshold)}: the video flies one copy of each into the whole, at most ${MAX_TAIL} — this is a tail of ${high.length}, which this choreography cannot tell; raise threshold only if the takeaway says so, or use another format`);
  if (!(threshold > mean)) throw new Error(`the threshold ${n(threshold)} is not above the weighted mean ${n(mean)}: the video's tail is the far right of the swarm, beyond the mean`);
  const highPeople = high.reduce((s, c) => s + c.people, 0);
  const share = (highPeople / world) * 100;

  const callouts = beat.callouts ?? [];
  if (!Array.isArray(callouts) || callouts.length > MAX_NAMED) throw new Error(`callouts holds ${callouts.length} marks: the video names at most ${MAX_NAMED}, inside their circles`);
  const named = {};
  for (const c of callouts) {
    if (!names.includes(String(c.name))) throw new Error(`callouts names ${JSON.stringify(c.name)}, which is no mark's name (marks are named ${names.slice(0, 4).map((x) => JSON.stringify(x)).join(", ")}, …)`);
    named[String(c.name)] = String(c.label ?? c.name);
  }
  const ticks = beat.ticks ?? ticksOf(Math.max(...countries.map((c) => c.tonnes)));
  if (!(Array.isArray(ticks) && ticks.length >= 2 && ticks[0] === 0 && ticks.every((t, i) => i === 0 || t > ticks[i - 1])))
    throw new Error(`ticks is ${JSON.stringify(ticks)}: give rising values from 0, or leave ticks out`);
  return { countries, world, mean, high: high.map((c) => c.code), highPeople, share, threshold, named, ticks };
}
