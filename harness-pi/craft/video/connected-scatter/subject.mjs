// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-connected-scatter-lowcarbon/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: every entity at two states as two shares (x, y), the ones
// that rose (every disc lands higher than its ring, and the counter counts them as they land), the ones lighter on x —
// largest loss first, picked out one after another — the subject's two moves, the order the discs travel in (the
// largest rise first) and the close-up that leaves the largest out. The proof asserted its own answers (all sixteen
// cleaner, five lighter, France lighter by more than five points, France and Germany outside the 0–12 % close-up); a
// story's answers are whatever its data gives — the claim is beat.mjs's check() — and what this choreography cannot draw
// becomes a refusal naming what to change in beat.mjs.
//
// Runs in Bun only.

export const MIN_ENTITIES = 5;
export const MAX_ENTITIES = 24;

const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `entities` [{ name, label, code, from: { x, y }, to: { x, y } }], `subject`,
 *              `closeUp`
 * @returns     `{ entities, lighter, subject, moves, arrivals, close, closeTicks }` — the names `build.mjs` reads (the
 *              proof's `weight` is x, its `ownMix` y)
 */
export function subjectOf(beat) {
  const raw = beat.entities;
  if (raw.length < MIN_ENTITIES || raw.length > MAX_ENTITIES) throw new Error(`entities has ${raw.length} members: the video draws between ${MIN_ENTITIES} and ${MAX_ENTITIES}`);
  const entities = raw.map((e) => {
    const name = String(e.label ?? e.name);
    const code = String(e.code ?? name.slice(0, 3).toUpperCase());
    return { key: String(e.name), code, name, from: { weight: e.from.x, ownMix: e.from.y }, to: { weight: e.to.x, ownMix: e.to.y } };
  });
  for (const [what, list] of [["name", entities.map((e) => e.key)], ["code", entities.map((e) => e.code)]]) {
    const twice = list.find((v, i) => list.indexOf(v) !== i);
    if (twice !== undefined) throw new Error(`two entities share the ${what} ${JSON.stringify(twice)}: give each entity its own ${what === "code" ? "code (3 letters, printed when its label finds no room)" : "name"}`);
  }
  const outside = entities.filter((e) => [e.from.weight, e.from.ownMix, e.to.weight, e.to.ownMix].some((v) => !(v >= 0 && v <= 100)));
  if (outside.length)
    throw new Error(`both axes are shares from 0 to 100 (the y axis is drawn 0–100, the x bars grow from zero): ${outside.slice(0, 3).map((e) => `${e.key} (${n(e.from.weight)}, ${n(e.from.ownMix)}) → (${n(e.to.weight)}, ${n(e.to.ownMix)})`).join(", ")} — give x and y in percent`);

  // THE COUNTER counts every disc that lands as one that rose: a disc landing lower would be counted as risen.
  const fell = entities.filter((e) => !(e.to.ownMix > e.from.ownMix));
  if (fell.length)
    throw new Error(`the video counts every disc that lands as one whose y rose; ${fell.map((e) => `${e.key} (${n(e.from.ownMix)} → ${n(e.to.ownMix)})`).join(", ")} did not rise — this choreography cannot tell this data; use another format`);
  const lighter = entities.filter((e) => e.to.weight < e.from.weight).sort((a, b) => a.to.weight - a.from.weight - (b.to.weight - b.from.weight));
  if (!lighter.length) throw new Error("no entity's x fell: the video's last shot picks out the ones that moved left, and there are none — this choreography cannot tell this data");
  const subject = entities.find((e) => e.key === String(beat.subject));
  if (!subject) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is no entity's name (they are ${entities.slice(0, 4).map((e) => JSON.stringify(e.key)).join(", ")}, …)`);
  const moves = { weight: subject.to.weight - subject.from.weight, ownMix: subject.to.ownMix - subject.from.ownMix };

  // THE CLOSE-UP: the x axis closes onto the crowd near the origin and the largest leave the frame.
  const close = beat.closeUp ?? 12;
  if (!(typeof close === "number" && close > 0 && close < 100)) throw new Error(`closeUp is ${JSON.stringify(beat.closeUp)}: give the x value the close-up runs to (12 in the worked example)`);
  const crowd = entities.filter((e) => Math.max(e.from.weight, e.to.weight) < close);
  const left = entities.length - crowd.length;
  if (!left || crowd.length < 3) {
    const sorted = entities.map((e) => Math.max(e.from.weight, e.to.weight)).sort((a, b) => a - b);
    const hint = sorted.length >= 4 ? `; ${n(Math.ceil(sorted.at(-2) * 0.99))} would leave the largest out and keep ${sorted.filter((v) => v < Math.ceil(sorted.at(-2) * 0.99)).length}` : "";
    throw new Error(`the close-up to x ${n(close)} ${left ? `holds only ${crowd.length} entities` : "leaves no entity out"}: it must leave the largest out and open a crowd of at least 3 — set closeUp${hint}`);
  }
  const step = close / 4;
  const closeTicks = [0, 1, 2, 3, 4].map((i) => +(i * step).toFixed(2));
  /** The order the discs travel in: the largest rise first. */
  const arrivals = [...entities].sort((a, b) => b.to.ownMix - b.from.ownMix - (a.to.ownMix - a.from.ownMix)).map((e) => e.code);
  return { entities, lighter: lighter.map((e) => e.code), subject, moves, arrivals, close, closeTicks };
}
