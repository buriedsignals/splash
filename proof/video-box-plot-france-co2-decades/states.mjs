// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                          0..1
//   furniture  the ticks, the unit, the decade names                                                   0..1
//   readings   the 75 annual readings appearing in chronological order, each at its year and value     0..1
//   gather     decade after decade, the readings sliding sideways into one column                     0..1
//   box        the median drawn through the column, the box opening to Q1 and Q3, the whiskers, the ring 0..1
//   lift       the box, its whiskers and its ring lifting out beside the readings                       0..1
//   walk       one median walking the decades, sliding to each next box and landing on its median      0..1
//   release    the walking median dissolving into the last decade's own                                0..1
//   source     the credit                                                                              0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, readings: 0, gather: 0, box: 0, lift: 0, walk: 0, release: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, readings: 1 };
  const reveal = { ...reference, gather: 1, box: 1, lift: 1 };
  const subject = { ...reveal, walk: 1 };
  const conclusion = { ...subject, release: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
