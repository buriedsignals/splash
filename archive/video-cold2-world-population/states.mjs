// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event (the picture at the event's end), run through
// `assertEventStates`: every event but the final hold changes the picture, and the hold changes nothing.
//
//   title      the title card                                         0..1
//   furniture  the ticks and the years                                0..1
//   fill       the surface's reach, 1800 → 2023, linear in years       0..1
//   counter    the running population in the upper left               0..1
//   tint       the surface stepped back to its tint                   0..1
//   lift       the 1800 slice outlined and lifted in the accent       0..1
//   stack      the eight copies' journey to the column beside 2023     0..1
//   named      the 2022 crossing's dot and name                       0..1
//   source     the credit                                              0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, fill: 0, counter: 0, tint: 0, lift: 0, stack: 0, named: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, fill: 1, counter: 1 };
  const subject = { ...reveal, tint: 1, lift: 1, stack: 1 };
  const conclusion = { ...subject, tint: 0, counter: 0, named: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
