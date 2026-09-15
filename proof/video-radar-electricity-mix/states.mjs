// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title    the title card                                                                            0..1
//   bars     the two bars growing on one TWh scale, their names and totals                             0..1
//   stretch  Germany's bar stretching to France's length, both totals giving way to « 100 % »          0..1
//   cut      gaps opening at the source boundaries                                                     0..1
//   grid     the wheel's rings, spokes and ceiling; the names travelling to the key                    0..1
//   fly      source after source, both parts swinging onto their spoke, the tips joined                0..1
//   close    both outlines closing and filling, the parts giving way to the vertices                   0..1
//   ring     nuclear's two shares ringed                                                               0..1
//   source   the credit                                                                                0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, bars: 0, stretch: 0, cut: 0, grid: 0, fly: 0, close: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, bars: 1 };
  const reveal = { ...reference, stretch: 1, cut: 1 };
  const subject = { ...reveal, grid: 1, fly: 1 };
  const conclusion = { ...subject, close: 1, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
