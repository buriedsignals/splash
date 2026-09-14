// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the sixteen rows, their names, the years                                          0..1
//   clock      every bar grown year by year from 1990 to 2024, linear in years                  0..1
//   focus      the six who never left picked out, the ten others stepping back                   0..1
//   release    the ten others back — the whole chart — the six kept in the accent                0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, clock: 0, focus: 0, release: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, clock: 1 };
  const subject = { ...reveal, focus: 1 };
  const conclusion = { ...subject, release: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
