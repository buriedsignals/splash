// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the empty calendar: months, days, the dates that do not exist, the key            0..1
//   fill       the year filled day by day, linear in days, the warm days counted                 0..1
//   filter     every day under the threshold stepping back to a neutral                          0..1
//   trace      the longest run outlined day by day, its length counted                           0..1
//   unfilter   the year's colours back                                                           0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, fill: 0, filter: 0, trace: 0, unfilter: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, fill: 1 };
  const subject = { ...reveal, filter: 1, trace: 1 };
  const conclusion = { ...subject, unfilter: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
