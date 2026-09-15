// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                        0..1
//   furniture  the halves' names, the band names, the ticks                                          0..1
//   grow       band after band from the foot, each pair of bars growing out of the spine            0..1
//   fold       every men's bar sliding across the spine onto the women's                            0..1
//   common     the part both share turning neutral                                                   0..1
//   detach     the shared part leaving; the difference sliding to the spine, on its leader's side    0..1
//   camera     the scale multiplying around the spine, the ticks going from 100k to 10k             0..1
//   cross      the rule between the halves' last and first lead, the two values either side         0..1
//   back       the camera returning to ×1, the values leaving                                        0..1
//   rebuild    the shared part growing back out of the spine, pushing each difference out           0..1
//   source     the credit                                                                            0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, grow: 0, fold: 0, common: 0, detach: 0, camera: 0, cross: 0, back: 0, rebuild: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, grow: 1 };
  const reveal = { ...reference, fold: 1, common: 1, detach: 1 };
  const subject = { ...reveal, camera: 1, cross: 1 };
  const conclusion = { ...subject, back: 1, rebuild: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
