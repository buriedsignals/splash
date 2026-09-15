// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                      0..1
//   furniture  the ticks, the gridlines, « 2015 »                                                  0..1
//   level      the 2015 total growing from zero                                                    0..1
//   carry      a copy of it sliding across to the 2024 slot                                        0..1
//   split      the seams cutting both totals into their members, the names beside 2015            0..1
//   morph      the 2024 copy's members going to their 2024 lengths, its total counting            0..1
//   seat       the names riding to their slots                                                     0..1
//   detach     the gained and lost parts lighting up and sliding onto the running total           0..1
//   close      the seams closing                                                                   0..1
//   bracket    the net change between the totals                                                  0..1
//   source     the credit                                                                          0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, level: 0, carry: 0, split: 0, morph: 0, seat: 0, detach: 0, close: 0, bracket: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, level: 1, carry: 1 };
  const reveal = { ...reference, split: 1, morph: 1 };
  const subject = { ...reveal, seat: 1, detach: 1 };
  const conclusion = { ...subject, close: 1, bracket: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
