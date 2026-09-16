// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                  0..1
//   furniture  the names in their 2000 order, the key, the ticks                               0..1
//   level      the 2000 levels growing from zero, each number past its end                     0..1
//   grow       the part added by 2024 stacking on each level, the gain counting               0..1
//   copies     copies of Spain's level laid end to end along France's, « ×N » counting          0..1
//   detach     every added part sliding off its level to zero, the levels stepping back        0..1
//   reorder    the rows re-sorting by gain                                                     0..1
//   back       every added part sliding back onto its level, the levels returning              0..1
//   ring       Spain and France ringed                                                         0..1
//   source     the credit                                                                      0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, level: 0, grow: 0, copies: 0, detach: 0, reorder: 0, back: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, level: 1 };
  const reveal = { ...reference, grow: 1 };
  const subject = { ...reveal, copies: 1, detach: 1, reorder: 1 };
  const conclusion = { ...subject, back: 1, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
