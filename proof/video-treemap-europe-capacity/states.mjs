// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                  0..1
//   whole      the one block growing from the left, its total counting                         0..1
//   split      the seams cutting the block into its cells, largest first, the words arriving   0..1
//   fill       each cell's wind and solar rising to its share, a midline across each            0..1
//   flood      the cells past the middle flooding with the accent, the others draining          0..1
//   gather     the flooded cells sliding onto the largest cell, keeping their areas             0..1
//   back       the flooded cells sliding back to their own places                               0..1
//   ring       the largest cell ringed                                                          0..1
//   source     the credit                                                                       0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, whole: 0, split: 0, fill: 0, flood: 0, gather: 0, back: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, whole: 1 };
  const reveal = { ...reference, split: 1 };
  const subject = { ...reveal, fill: 1, flood: 1, gather: 1 };
  const conclusion = { ...subject, back: 1, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
