// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the ten names beside an empty axis                                                0..1
//   rise       the bars from the tenth to the second, one after another, each counting           0..1
//   first      the first bar growing last, counting                                              0..1
//   stack      the next five lining up end to end along the second row, their sum counting       0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, rise: 0, first: 0, stack: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, rise: 1, first: 1 };
  const subject = { ...reveal, stack: 1 };
  const conclusion = { ...subject, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
