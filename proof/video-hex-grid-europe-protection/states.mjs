// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the cells with their codes, and the key column                                    0..1
//   count      the cells taking their class by count, lowest first                               0..1
//   largest    the largest host ringed, and its line (its count, then its rate)                   0..1
//   rate       every cell changing from its count class to its rate class                        0..1
//   leader     the leader per inhabitant ringed, and its line                                     0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, count: 0, largest: 0, rate: 0, leader: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, count: 1, largest: 1 };
  const subject = { ...reveal, rate: 1, leader: 1 };
  const conclusion = { ...subject, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
