// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the ticks and the years                                                           0..1
//   fill       the surface filled from 1800 to 2023, linear in years; the population counts up   0..1
//   tint       the surface steps back to its tint                                                0..1
//   unit       the 1800 slice repainted in the accent — the unit                                 0..1
//   stack      copies of the unit rise on it, linear in value, until the 2023 level              0..1
//   level      a dashed level runs from the stack's top to the 2023 reading                      0..1
//   zoom       the camera closes in on the last years, and pulls back                            0..1
//   named      in the close-up, the 8 billion crossing ringed, its year above                    0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, fill: 0, tint: 0, unit: 0, stack: 0, level: 0, zoom: 0, named: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, fill: 1 };
  const subject = { ...reveal, tint: 1, unit: 1, stack: 1, level: 1, zoom: 1, named: 1 };
  const conclusion = { ...subject, tint: 0, zoom: 0, named: 0, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
