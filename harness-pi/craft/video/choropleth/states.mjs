// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — the scrolly's own state fields, one state per event of the
// timing contract, run through `assertEventStates` (`skills/chart-video/scripts/choreography.mjs`).
//
// The fields are `choropleth-drive.mjs`'s, and mean what they mean there:
//   classes     the ramp arriving class by class, lowest first                           0..1
//   filter      every country under the floor stepping back to bare land                  0..1
//   top         the six countries of the north-west named                                  0..1
//   zoom        the camera travelling from Europe onto Albania and its neighbours           0..1
//   odd         Albania ringed and named                                                   0..1
// and three the video adds, because the scrolly derives them from its cards:
//   title       the title card, alone on the ground, before the story                          0..1
//   furniture   the panel — the count over the key — while the story needs it                  0..1
//   source      the source, set small on the map once it has pulled back — the video ends on the map  0..1
//   floor       the floor's cursor travelling the key, borne by borne, 0 → 94 %; it stays     0..1
//   count       the counter — « 40 pays » with the panel, then stepping down with the floor; it stays  0..1
//   neighbours  Albania's neighbours named with their shares, and Kosovo « hors données »    0..1
//   context     the three lowest shares named, as the still names them, while their class stands  0..1
//
// A state is the picture at the END of its event. The order INSIDE an event — the names only after the
// filter has landed, only after the camera has settled — is the composition's windows (`scene.mjs`).
//
// EVERY DERIVED VALUE BRIEF.md NAMES IS ASSERTED HERE against the same `loadSubject` the still reads,
// and the north-west is measured again on the seats the live map names the countries at.

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";

// Zone kit: the chart-video skill's script, wherever the root put the skill (states.mjs runs in Bun only).
const { assertEventStates } = await import(skillScriptFrom(import.meta.dirname, "chart-video", "scripts", "choreography.mjs"));

/**
 * ZONE KIT: the proof asserted ITS answers here (40 reported, Ukraine unreported, classes 8·6·6·8·5·7, Albania at
 * 100 %, three neighbours under 60 %, six north or west). A story's answers are its own data's, and the claim is
 * beat.mjs's `check()`, run before this (render-beat.mjs). What stays is what the choreography needs to be true.
 */
/** @param {ReturnType<typeof import("./subject.mjs").subjectOf>} subject
 *  @param {Record<string, [number, number]>} seats  the map's frozen seats, `[lon, lat]` (`map-plan.mjs`, `SEATS`) */
export function assertDerivedValues(subject, seats) {
  const { value, BREAKS, above, ODD_ONE, neighbours, unreported, studySet } = subject;
  if (studySet.length !== value.size + unreported.length)
    throw new Error(`the study set (${studySet.length}) should be the reported (${value.size}) plus the unreported (${unreported.length}) — a kit bug`);
  const counts = new Array(BREAKS.length + 1).fill(0);
  for (const v of value.values()) counts[BREAKS.filter((b) => v.value >= b).length]++;
  if (counts.at(-1) !== above.length) throw new Error(`the top class counts ${counts.at(-1)} and \`above\` ${above.length} — a kit bug`);
  if (!above.some((r) => r.iso === ODD_ONE)) throw new Error(`subject ${ODD_ONE} is not in the top class — a kit bug`);
  if (!neighbours.length) throw new Error(`subject ${ODD_ONE} has no measured neighbour — a kit bug`);
  for (const r of above) if (!seats[r.iso]) throw new Error(`${r.iso} is named but the map has no seat for it`);
  const highest = Math.max(...neighbours.map((iso) => value.get(iso).value));
  return { classCounts: counts, steppedBack: value.size - above.length, highestNeighbour: highest };
}

/** One state per event in `EVENT_ORDER`, the hold restating the conclusion exactly. */
export function statesFor(subject, seats) {
  assertDerivedValues(subject, seats);
  const blank = { title: 0, furniture: 0, classes: 0, filter: 0, floor: 0, count: 0, top: 0, context: 0, zoom: 0, odd: 0, neighbours: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, count: 1, classes: 1, context: 1 };
  const reveal = { ...reference, filter: 1, floor: 1, top: 1, context: 0 };
  const subjectState = { ...reveal, furniture: 0, filter: 0, top: 0, zoom: 1, odd: 1, neighbours: 1 };
  const conclusion = { ...subjectState, furniture: 1, zoom: 0, neighbours: 0, top: 1, context: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject: subjectState, conclusion, hold: { ...conclusion } };
  return assertEventStates(
    EVENT_ORDER.map((name) => byEvent[name]),
    [...EVENT_ORDER],
  );
}
