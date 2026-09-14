// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the unit, the zero line                                                           0..1
//   world      the world's emissions as one bar, the ten largest marked inside it                0..1
//   drop       the ten segments falling out of the world into their rows, largest first          0..1
//   camera     the scale closing onto the ten: the first bar across the frame                    0..1
//   stack      the next five lining up end to end under the first, their sum counting            0..1
//   tenth      the tenth sliding into the gap left before the first's end                        0..1
//   back       every bar back in its row — the whole ranking — the five bracketed with their sum  0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, world: 0, drop: 0, camera: 0, stack: 0, tenth: 0, back: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, world: 1 };
  const reveal = { ...reference, drop: 1, camera: 1 };
  const subject = { ...reveal, stack: 1 };
  const conclusion = { ...subject, tenth: 1, back: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
