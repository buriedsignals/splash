// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — the scrolly's own state fields, one state per event of the
// timing contract, run through `assertEventStates` (`skills/chart-video/scripts/choreography.mjs`).
//
// The fields are `choropleth-drive.mjs`'s, and mean what they mean there:
//   classes     the ramp arriving class by class, lowest first                           0..1
//   filter      every country under the floor stepping back to bare land                  0..1
//   top         the six countries of the north-west named                                  0..1
//   zoom        the camera travelling from Europe onto Albania and its neighbours           0..1
//   odd         Albania ringed and named                                                   0..1
//   missing     the reporting country with no reading named                                0..1
// and three the video adds, because the scrolly derives them from its cards:
//   furniture   the eyebrow, title, key frame and source, up once at `establish`            0..1
//   count       the counter counting up to seven — it stays once counted (BRIEF.md)         0..1
//   neighbours  Albania's neighbours named with their shares, and Kosovo « hors données »    0..1
//
// A state is the picture at the END of its event. The order INSIDE an event — the names only after the
// filter has landed, only after the camera has settled — is the composition's windows (`scene.mjs`).
//
// EVERY DERIVED VALUE BRIEF.md NAMES IS ASSERTED HERE against the same `loadSubject` the still reads,
// and the north-west is measured again on the seats this video actually draws.

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

const EXPECTED_CLASS_COUNTS = [8, 6, 6, 8, 5, 7];

/** @param {ReturnType<typeof import("../static-choropleth-europe-lowcarbon/beat.mjs").loadSubject>} subject
 *  @param {{ shapes: Array<{ iso: string, seat: { x: number, y: number } }> }} geometry  `videoGeometry(subject)` */
export function assertDerivedValues(subject, geometry) {
  const { value, BREAKS, FLOOR, above, ODD_ONE, neighbours, unreported, studySet, format, NEIGHBOUR_CEILING } = subject;
  if (value.size !== 40) throw new Error(`establish reports 40 countries; loadSubject carries ${value.size}`);
  if (unreported.length !== 1 || unreported[0].iso !== "UKR")
    throw new Error(`establish names one unreported country, Ukraine; loadSubject carries ${unreported.map((u) => u.iso).join(", ")}`);
  if (studySet.length !== value.size + unreported.length)
    throw new Error(`the study set (${studySet.length}) should be the reported (${value.size}) plus the unreported (${unreported.length})`);

  const counts = new Array(BREAKS.length + 1).fill(0);
  for (const v of value.values()) counts[BREAKS.filter((b) => v.lowCarbon >= b).length]++;
  if (counts.join(",") !== EXPECTED_CLASS_COUNTS.join(","))
    throw new Error(`reference's six class counts should be ${EXPECTED_CLASS_COUNTS.join("·")}; the data now classes ${counts.join("·")}`);
  if (counts.at(-1) !== 7 || above.length !== 7)
    throw new Error(`the top class and \`above\` should both count 7; they count ${counts.at(-1)} and ${above.length}`);
  if (value.size - above.length !== 33)
    throw new Error(`reveal's filter steps back 33 countries; value.size - above.length is ${value.size - above.length}`);

  const odd = value.get(ODD_ONE);
  if (!odd || format(odd.lowCarbon) !== "100 %" || !above.some((r) => r.iso === ODD_ONE))
    throw new Error(`subject names Albania at 100 %, above the floor; loadSubject carries ${odd ? format(odd.lowCarbon) : "no value"}`);
  if (neighbours.length !== 3) throw new Error(`subject names 3 measured neighbours; loadSubject carries ${neighbours.length}`);
  const highest = Math.max(...neighbours.map((iso) => value.get(iso).lowCarbon));
  if (!(highest < NEIGHBOUR_CEILING))
    throw new Error(`every measured neighbour should be under ${NEIGHBOUR_CEILING} %; the highest is ${highest.toFixed(1)} %`);

  const seatOf = (iso) => {
    const shape = geometry.shapes.find((s) => s.iso === iso);
    if (!shape) throw new Error(`${iso} is named but the video's geometry draws no shape for it`);
    return shape.seat;
  };
  const oddSeat = seatOf(ODD_ONE);
  const named = above.filter((r) => r.iso !== ODD_ONE);
  if (named.length !== 6) throw new Error(`reveal names six of the seven above ${FLOOR} %; it would name ${named.length}`);
  const notNorthWest = named.filter((r) => seatOf(r.iso).y > oddSeat.y && seatOf(r.iso).x > oddSeat.x);
  if (notNorthWest.length)
    throw new Error(`the title says the other six are north or west of Albania; on the drawn seats ${notNorthWest.map((r) => r.label).join(", ")} is neither`);
  return { classCounts: counts, steppedBack: value.size - above.length, highestNeighbour: highest };
}

/** One state per event in `EVENT_ORDER`, the hold restating the conclusion exactly. */
export function statesFor(subject, geometry) {
  assertDerivedValues(subject, geometry);
  const blank = { furniture: 0, classes: 0, filter: 0, count: 0, top: 0, zoom: 0, odd: 0, neighbours: 0, missing: 0 };
  const establish = { ...blank, furniture: 1 };
  const reference = { ...establish, classes: 1 };
  const reveal = { ...reference, filter: 1, count: 1, top: 1 };
  const subjectState = { ...reveal, filter: 0, top: 0, zoom: 1, odd: 1, neighbours: 1 };
  const conclusion = { ...subjectState, zoom: 0, neighbours: 0, top: 1, missing: 1 };
  const byEvent = { establish, reference, reveal, subject: subjectState, conclusion, hold: { ...conclusion } };
  return assertEventStates(
    EVENT_ORDER.map((name) => byEvent[name]),
    [...EVENT_ORDER],
  );
}
