// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                          0..1
//   furniture  the axis, the world-average rule, the one disc « Monde »                                0..1
//   split      largest first, each country leaving the disc for its seat, the count climbing           0..1
//   ring       the six beyond 20 t ringed and bracketed                                                0..1
//   ghost      the world disc's outline, back where it stood, gliding to the top right                 0..1
//   gather     a copy of each of the six flying into the outline and merging                           0..1
//   share      « 0,6 % » under the merged disc                                                         0..1
//   settle     the copies flying back, the outline going, « 0,6 % » travelling under the bracket       0..1
//   source     the credit                                                                              0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, split: 0, ring: 0, ghost: 0, gather: 0, share: 0, settle: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, split: 1 };
  const subject = { ...reveal, ring: 1, ghost: 1, gather: 1, share: 1 };
  const conclusion = { ...subject, settle: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
