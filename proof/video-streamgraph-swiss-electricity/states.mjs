// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the year ticks                                                                    0..1
//   flow       the stream drawn from the first year to the last, linear in years; solar's rank   0..1
//   focus      every band but solar stepping back, and the year it became third                 0..1
//   mark       the year solar became third, its rule and its year — it stays once marked         0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, flow: 0, focus: 0, mark: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, flow: 1 };
  const subject = { ...reveal, focus: 1, mark: 1 };
  const conclusion = { ...subject, focus: 0, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
