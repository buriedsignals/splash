// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event of the timing contract, run through
// `assertEventStates` (`skills/map-beat/scripts/choreography.mjs`).
//
//   title       the title card, alone on the ground, before the story                             0..1
//   furniture   the key — the class swatches, their bornes and the absence                        0..1
//   classes     the ramp arriving class by class, lowest first                                   0..1
//   focus       every country but the widest stepping back                                        0..1
//   widest      the widest country named with its share                                           0..1
//   area        the balance's pivot set under the area-weighted mean, « au km² » — it stays       0..1
//   morph       every country from its territory (0) to its equal tile (1) — the balance's weights
//               with it, from territory to one each, and a live pivot sliding to the country mean  0..1
//   codes       every tile's code set on it                                                       0..1
//   source      the credit, set on the cartogram the video ends on                                0..1
//
// A state is the picture at the END of its event. The order INSIDE an event is the composition's windows
// (`scene.mjs`).

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";

/** One state per event in `EVENT_ORDER`, the hold restating the conclusion exactly. */
export function statesFor() {
  const blank = { title: 0, furniture: 0, classes: 0, focus: 0, widest: 0, area: 0, morph: 0, codes: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, classes: 1 };
  const reveal = { ...reference, focus: 1, widest: 1, area: 1 };
  const subject = { ...reveal, focus: 0, widest: 0, morph: 1, codes: 1 };
  const conclusion = { ...subject, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
