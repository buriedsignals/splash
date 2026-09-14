// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the six names, the zero line, the dates under the first pair                      0..1
//   rise       both stems of every pair rising to the 2000 level, one pair after another         0..1
//   travel     every pair's second stem travelling to its 2023 level, the ratio counting down    0..1
//   focus      the four others stepping back, China's head ringed                                0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, rise: 0, travel: 0, focus: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, rise: 1 };
  const subject = { ...reveal, travel: 1 };
  const conclusion = { ...subject, focus: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
