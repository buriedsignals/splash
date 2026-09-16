// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the rails and the sixteen 2000 values                                            0..1
//   travel     the lines drawn to 2024 one after another, the rises counted                     0..1
//   france     France's line taking the accent: the line to pass                                0..1
//   check      every line that started under France tested in turn, the lowest finish first     0..1
//   release    every line back — the whole chart — the pair in the accent, the crossing ringed  0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, travel: 0, france: 0, check: 0, release: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, travel: 1 };
  const subject = { ...reveal, france: 1, check: 1 };
  const conclusion = { ...subject, release: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
