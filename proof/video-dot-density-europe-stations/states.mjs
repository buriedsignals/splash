// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the key                                                                           0..1
//   arrive     the fuels arriving one after another, the station count climbing                  0..1
//   focus      every station but the nuclear stepping back, the 72 ringed and counted            0..1
//   named      the 72's ring and count — they stay once named                                       0..1
//   weight     every dot grown to an area proportional to its capacity, the power count climbing 0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, arrive: 0, focus: 0, named: 0, weight: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, arrive: 1 };
  const reveal = { ...reference, focus: 1, named: 1 };
  const subject = { ...reveal, focus: 0, weight: 1 };
  const conclusion = { ...subject, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
