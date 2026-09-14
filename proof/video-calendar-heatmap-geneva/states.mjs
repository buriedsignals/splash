// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   curve      the year drawn as its daily temperature, 1 January to 31 December, the warm days counted 0..1
//   drop       every day falling from the curve into its calendar cell, taking its bin's colour  0..1
//   grid       the calendar's furniture: months, day ticks, the key; the curve's 20 °C line gone  0..1
//   filter     every day under the threshold stepping back to a neutral                          0..1
//   trace      the longest run outlined day by day, its length counted                           0..1
//   unfilter   the year's colours back — the whole calendar                                      0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, curve: 0, drop: 0, grid: 0, filter: 0, trace: 0, unfilter: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, curve: 1 };
  const reveal = { ...reference, drop: 1, grid: 1 };
  const subject = { ...reveal, filter: 1, trace: 1 };
  const conclusion = { ...subject, unfilter: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
