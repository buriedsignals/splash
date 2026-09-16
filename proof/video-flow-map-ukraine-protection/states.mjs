// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the node on Ukraine and the width scale                                           0..1
//   trace      the bands drawing out of the node, largest first, the count climbing               0..1
//   focus      every band but the top two stepping back                                          0..1
//   share      the top two's share, counting up — it stays once counted                          0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, trace: 0, focus: 0, share: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, trace: 1 };
  const subject = { ...reveal, focus: 1, share: 1 };
  const conclusion = { ...subject, focus: 0, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
