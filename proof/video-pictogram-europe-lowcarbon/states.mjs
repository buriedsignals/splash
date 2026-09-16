// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                     0..1
//   furniture  the axis and its two end words                                                     0..1
//   sweep      a square dropping onto its column as the front sweeps from 0 to 100 %               0..1
//   cuts       the two cuts rising with their words                                               0..1
//   split      the axis parting at the cuts                                                       0..1
//   gather     each part's squares settling into its block, the counts climbing                   0..1
//   counts     the blocks' counts                                                                 0..1
//   close      the parts closing into the pictogram, magnified                                   0..1
//   ring       the ring round « 6 pays »                                                          0..1
//   source     the credit                                                                         0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, sweep: 0, cuts: 0, split: 0, gather: 0, counts: 0, close: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, sweep: 1 };
  const reveal = { ...reference, cuts: 1, split: 1 };
  const subject = { ...reveal, gather: 1, counts: 1 };
  const conclusion = { ...subject, close: 1, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
