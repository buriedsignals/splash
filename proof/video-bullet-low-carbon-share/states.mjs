// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the names in their 2015 order, the key, the ticks                                 0..1
//   before     each country's whole electricity to 100 %: its 2015 low-carbon part, the fossil rest 0..1
//   after      the frontier moving to 2024: the part gained filling in, fossil receding, counted  0..1
//   reorder    the rows re-sorting by gain, one row climbing at a time                           0..1
//   half       the 50 % line dropped, the whole chart kept, Poland ringed                        0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, before: 0, after: 0, reorder: 0, half: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, before: 1 };
  const reveal = { ...reference, after: 1 };
  const subject = { ...reveal, reorder: 1 };
  const conclusion = { ...subject, half: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
