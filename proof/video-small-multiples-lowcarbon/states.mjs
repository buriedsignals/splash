// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                        0..1
//   furniture  the shared scale and the key                                                          0..1
//   level      the sixteen 2000 bars growing side by side in one row                                 0..1
//   cut        the row cut — each bar travelling to its own panel, its name arriving                 0..1
//   grow       a copy of each 2000 bar sliding out beside it and rising to 2024, the gain counting   0..1
//   detach     every part added since 2000 dropping to the baseline, the rest of the bar stepping away 0..1
//   reorder    the panels re-sorting by their 2000 start                                            0..1
//   back       every added part climbing back onto its level                                         0..1
//   ring       Denmark and Sweden ringed                                                             0..1
//   source     the credit                                                                            0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, level: 0, cut: 0, grow: 0, detach: 0, reorder: 0, back: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, level: 1, cut: 1 };
  const reveal = { ...reference, grow: 1 };
  const subject = { ...reveal, detach: 1, reorder: 1 };
  const conclusion = { ...subject, back: 1, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
