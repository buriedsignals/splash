// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                          0..1
//   furniture  the axis, the names ranked by their 2000 level, the 2000 dots                           0..1
//   travel     row by row, each dot travelling to 2023, the rises counted                              0..1
//   reorder    the rows gliding into the order of their gains                                          0..1
//   detach     a copy of each gain sliding onto the common start, one after another                    0..1
//   ring       Poland's row ringed                                                                     0..1
//   settle     the copies sliding back onto their dumbbells, every row back at full ink                0..1
//   source     the credit                                                                              0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, travel: 0, reorder: 0, detach: 0, ring: 0, settle: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, travel: 1 };
  const subject = { ...reveal, reorder: 1, detach: 1, ring: 1 };
  const conclusion = { ...subject, settle: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
