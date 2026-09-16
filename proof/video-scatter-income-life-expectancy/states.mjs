// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                          0..1
//   furniture  the gridlines, the ticks, the axis names, the one column of 165 dots                    0..1
//   split      poorest first, each dot flying horizontally to its income, the count climbing          0..1
//   rule       the break drawn down at 30 000 $                                                        0..1
//   fold       the cloud folding against the break into two columns                                    0..1
//   bars       a bar growing beside each column over its span, with its value                          0..1
//   stack      three copies of the short bar flying one after another onto the long bar                0..1
//   times      « 3 fois »                                                                              0..1
//   unfold     the dots back on their incomes, the copies and « 3 fois » going                         0..1
//   source     the credit                                                                              0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, split: 0, rule: 0, fold: 0, bars: 0, stack: 0, times: 0, unfold: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, split: 1 };
  const subject = { ...reveal, rule: 1, fold: 1, bars: 1, stack: 1, times: 1 };
  const conclusion = { ...subject, unfold: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
