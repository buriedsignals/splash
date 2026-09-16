// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the ticks and the years                                                           0..1
//   fill       the surface filled from the first year to the last, linear in years; the stock    0..1
//   gauge      the surface steps back to its tint, the stock's gauge and the rule come in        0..1
//   sweep      the rule travels back from 2024 to the midpoint, the recent surface and share      0..1
//   flatten    each half's top levelled to its mean — the same surface, as a block                0..1
//   named      each half's years and length, inside it                                           0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, fill: 0, gauge: 0, sweep: 0, flatten: 0, named: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, fill: 1 };
  const subject = { ...reveal, gauge: 1, sweep: 1, flatten: 1, named: 1 };
  const conclusion = { ...subject, flatten: 0, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
