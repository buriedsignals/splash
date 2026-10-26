// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-population-pyramid-swiss-age/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: the bands foot first, each with its two halves, and the
// band where the halves change places, found by the same `beatFacts(…).mirrorCrossingKey` the directed still runs. The
// proof asserted its own answers (21 bands, 8 870 560 people, 60-64); a story's answers are whatever its data gives —
// the claim is beat.mjs's check() — and what the gesture needs becomes a refusal.
//
// Runs in Bun only.

import { beatFacts } from "#shared/chart-beat/treatments.mjs";

/**
 * The whole scale's tick step: the largest round step (1, 2 or 5 × a power of ten) the largest half holds at least three
 * times — 100 000 for the worked example's 340 000.
 */
export function stepFor(most) {
  for (let p = Math.floor(Math.log10(most)); ; p -= 1) for (const m of [5, 2, 1]) if (most / (m * 10 ** p) >= 3) return m * 10 ** p;
}

/**
 * @param beat  beat.mjs's default export: `bands` [{ band, left, right }], youngest first, `crossing`
 * @returns     `{ bands: [{ band, male, female }], crossing, step }` — the proof's names: `male` is the LEFT half
 */
export function subjectOf(beat) {
  if (!Array.isArray(beat.bands) || beat.bands.length < 4 || beat.bands.length > 30) throw new Error(`bands holds ${beat.bands?.length} bands; the video stacks 4 to 30`);
  const names = beat.bands.map((b) => String(b.band));
  if (new Set(names).size !== names.length) throw new Error("two bands share a name: one row per band — filter data.json to one year and one population");
  const bands = beat.bands.map((b) => ({ band: String(b.band), male: b.left, female: b.right }));
  const negative = bands.filter((b) => !(b.male >= 0 && b.female >= 0));
  if (negative.length) throw new Error(`${negative.map((b) => b.band).join(", ")} hold a negative count: a pyramid's bars are counts or shares, zero or more`);
  const facts = beatFacts(
    bands.map((b) => ({ key: b.band, label: b.band, value: b.male + b.female })),
    { subject: String(beat.entity ?? ""), namedSeries: [String(beat.leftName), String(beat.rightName)], mirrored: bands.map((b) => ({ key: b.band, left: b.male, right: b.female })) },
  );
  const found = facts.mirrorCrossingKey;
  const given = beat.crossing === null || beat.crossing === undefined ? null : String(beat.crossing);
  if (given !== found)
    throw new Error(`crossing is ${JSON.stringify(beat.crossing)}, but the data's first band where the halves change places is ${JSON.stringify(found)}: compute crossing from bands`);
  const most = Math.max(...bands.flatMap((b) => [b.male, b.female]));
  if (!(most > 0)) throw new Error("every band is empty");
  return { bands, crossing: found === null ? -1 : bands.findIndex((b) => b.band === found), step: stepFor(most) };
}

/**
 * What the gesture needs, checked AFTER beat.check(): one crossing, the LEFT half ahead below it and the right half from
 * it on — the zoom's word stands in the half the camera empties, the left one over the bands the right half leads.
 */
export function assertGesture(subject, beat) {
  const { bands, crossing } = subject;
  if (crossing < 0) throw new Error("the two halves never change places: this video names the band where they do — offer the static format");
  const at = bands[crossing].band;
  if (!(bands[0].male > bands[0].female))
    throw new Error(`the right half (${beat.rightName}) leads at the foot: this video folds the half that leads at the foot onto the other — swap left and right (and leftName / rightName) so the half that leads at the foot is the LEFT one`);
  const broken = bands.filter((b, i) => (i < crossing ? !(b.male > b.female) : !(b.female > b.male)));
  if (broken.length)
    throw new Error(`the halves change places at ${at} but ${broken.map((b) => b.band).join(", ")} break it (a tie, or a crossing back): this video names ONE crossing, so the left half must lead in every band below ${at} and the right half in every band from it`);
}
