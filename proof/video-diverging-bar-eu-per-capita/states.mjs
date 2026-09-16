// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the 27 names in two columns, the unit                                             0..1
//   level      the 1990 levels growing from zero, row after row                                  0..1
//   shrink     every level going to 2024, the largest fall first, the part lost left pale        0..1
//   flip       the level bars going, the parts lost sliding across the zero line: the changes     0..1
//   zoom       the camera closing ×250 onto the zero line, the one rise becoming a length          0..1
//   back       the camera pulling back                                                           0..1
//   focus      every fall stepping back, the rise's row ringed                                   0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, level: 0, shrink: 0, flip: 0, zoom: 0, back: 0, focus: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, level: 1 };
  const reveal = { ...reference, shrink: 1 };
  const subject = { ...reveal, flip: 1, zoom: 1 };
  const conclusion = { ...subject, back: 1, focus: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
