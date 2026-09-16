// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the six names, the zero line, the unit                                            0..1
//   rise       the six 2000 stems rising, pair after pair                                        0..1
//   focus      the four others stepping back                                                     0..1
//   stack      copies of China's stem flying over and stacking beside the American stem          0..1
//   travel     every stem to 2023, a tint left at 2000; the copies re-forming, fewer fitting     0..1
//   release    the copies gone, the whole chart back, China ringed                               0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, rise: 0, focus: 0, stack: 0, travel: 0, release: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, rise: 1 };
  const reveal = { ...reference, focus: 1, stack: 1 };
  const subject = { ...reveal, travel: 1 };
  const conclusion = { ...subject, release: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
