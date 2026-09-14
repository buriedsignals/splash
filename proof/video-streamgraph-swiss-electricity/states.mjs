// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the year ticks                                                                    0..1
//   flow       the stream drawn from the first year to the last, linear in years                 0..1
//   aside      the two giants fade and close to nothing; the small sources close in, same scale  0..1
//   magnify    the small stream enlarged to the frame                                            0..1
//   lines      the small stream turned into lines from zero                                      0..1
//   race       a cursor travels the years, solar's rank riding its line; 2016 marked once passed 0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, flow: 0, aside: 0, magnify: 0, lines: 0, race: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, flow: 1 };
  const subject = { ...reveal, aside: 1, magnify: 1, lines: 1, race: 1 };
  const conclusion = { ...subject, aside: 0, magnify: 0, lines: 0, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
