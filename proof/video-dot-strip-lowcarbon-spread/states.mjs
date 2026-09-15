// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                          0..1
//   furniture  both rails, the ticks, the two years, the sixteen chips on 2000                         0..1
//   travel     floor first, a copy of each chip travelling to its 2024 seat                            0..1
//   focus      the other fourteen stepping back, Poland's and Sweden's leaders thickening              0..1
//   changes    « +29,5 » and « +2,1 » beside their leaders                                             0..1
//   span       the 2000 span tracing along its rail from Poland to Sweden                              0..1
//   drop       a copy of the span sliding down onto the 2024 rail, pinned to Sweden                    0..1
//   cut        the overhang past Poland's 2024 pin turning, « −27,4 » over it                          0..1
//   settle     the overhang folding away, the fourteen back at full ink                                0..1
//   source     the credit                                                                              0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, travel: 0, focus: 0, changes: 0, span: 0, drop: 0, cut: 0, settle: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, travel: 1 };
  const subject = { ...reveal, focus: 1, changes: 1, span: 1, drop: 1, cut: 1 };
  const conclusion = { ...subject, settle: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
