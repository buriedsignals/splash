// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the column names, their totals, « 2024 »                                          0..1
//   split      the whole block parting into six columns, gaps opening                            0..1
//   fill       the nine bands growing up each column, column after column                        0..1
//   key        the nine source names in the gutter                                               0..1
//   focus      every band but coal stepping back                                                 0..1
//   pour       each coal cell dropping out and reshaping, area kept, into the strip              0..1
//   label      the strip's words                                                                 0..1
//   ring       Germany's and Poland's coal ringed                                                0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, split: 0, fill: 0, key: 0, focus: 0, pour: 0, label: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, split: 1 };
  const reveal = { ...reference, fill: 1, key: 1 };
  const subject = { ...reveal, focus: 1, pour: 1, label: 1 };
  const conclusion = { ...reveal, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
