// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                  0..1
//   whole      the one bar growing down the left rail, its total counting                      0..1
//   split      gaps opening in the bar, cutting it into the nine sources                        0..1
//   pour       the ribbons pouring to the right, source after source, the countries filling     0..1
//   filter     every ribbon but nuclear's stepping back                                         0..1
//   trace      the nuclear → France ribbon filling with the accent, left to right               0..1
//   slide      a copy of the nuclear bar travelling to France's node, the bracket and « 84 % »  0..1
//   back       the copy sliding home, the other ribbons returning                               0..1
//   mark       « 84 % » on the accent ribbon                                                    0..1
//   source     the credit                                                                       0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, whole: 0, split: 0, pour: 0, filter: 0, trace: 0, slide: 0, back: 0, mark: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, whole: 1 };
  const reveal = { ...reference, split: 1, pour: 1 };
  const subject = { ...reveal, filter: 1, trace: 1, slide: 1 };
  const conclusion = { ...subject, back: 1, mark: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
