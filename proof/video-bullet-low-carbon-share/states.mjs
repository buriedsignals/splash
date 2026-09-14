// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  six empty tracks to 100 %, the names in their 2015 order, the key                 0..1
//   before     the thick pale 2015 bars extending from zero, row after row                       0..1
//   after      the thin 2024 bars extending on from the 2015 ends, each gain counting            0..1
//   reorder    the rows re-sorting by gain, one row climbing at a time                           0..1
//   half       the 50 % line dropped, every row but Poland stepping back                         0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, before: 0, after: 0, reorder: 0, half: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, before: 1, after: 1 };
  const subject = { ...reveal, reorder: 1 };
  const conclusion = { ...subject, half: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
