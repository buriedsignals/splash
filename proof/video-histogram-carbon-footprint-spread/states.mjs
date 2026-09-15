// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the zero line and the bin names                                                   0..1
//   rug        a tick per country along the axis, swept from 0 to 36+                            0..1
//   counts     the count ticks                                                                   0..1
//   fall       every tick widening into one cell and stacking into its bin                       0..1
//   rule       the 4-tonne cut rising, « 127 » on the first bin                                   0..1
//   stack      the tail's bins rising and sliding onto the 4–8 bin (and back at conclusion)      0..1
//   tailLabel  the column's count                                                                0..1
//   tenths     the seams cutting both columns into tenths of the 213                             0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, rug: 0, counts: 0, fall: 0, rule: 0, stack: 0, tailLabel: 0, tenths: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, rug: 1 };
  const reveal = { ...reference, counts: 1, fall: 1 };
  const subject = { ...reveal, rule: 1, stack: 1, tailLabel: 1, tenths: 1 };
  const conclusion = { ...subject, stack: 0, tailLabel: 0, tenths: 0, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
