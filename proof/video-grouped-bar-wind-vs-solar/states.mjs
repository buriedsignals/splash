// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the six names, the baseline, the key                                              0..1
//   mix        each country's whole electricity rising as one column, source on source, to 100 % 0..1
//   others     every source but wind and solar fading out of the columns                         0..1
//   split      wind and solar sliding down to the baseline, side by side                         0..1
//   camera     the scale closing from 100 % onto the two, their shares landing                   0..1
//   compare    wind's level carried across to solar, group after group, the lead counted          0..1
//   focus      every group but the exception stepping back                                       0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, mix: 0, others: 0, split: 0, camera: 0, compare: 0, focus: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, mix: 1 };
  const reveal = { ...reference, others: 1, split: 1, camera: 1 };
  const subject = { ...reveal, compare: 1 };
  const conclusion = { ...subject, focus: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
