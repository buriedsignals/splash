// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the rows, the years, the 1990 names                                               0..1
//   zoom       the camera closing in on India's tip, tracking it, every line named at its tip     0..1
//   clock      every line advanced from the first year to the last, linear in years             0..1
//   back       the camera pulling back to the whole chart                                        0..1
//   focus      every line but India and the three it passed stepping back                        0..1
//   release    every line back — the whole chart                                                 0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, zoom: 0, clock: 0, back: 0, focus: 0, release: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, zoom: 1, clock: 1 };
  const subject = { ...reveal, back: 1, focus: 1 };
  const conclusion = { ...subject, release: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
