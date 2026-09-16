// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the six names, « 2024 »                                                           0..1
//   grow       the whole 100 % bars growing from one left edge, row after row                    0..1
//   slide      each bar sliding until its nuclear sits astride the anchor; the totals landing     0..1
//   focus      the other five rows stepping back                                                 0..1
//   split      France's bar parting: nuclear up, the two sides down                              0..1
//   carry      fossil then renewables sliding end to end from the nuclear's left edge            0..1
//   sum        the sum of the two sides at their end                                             0..1
//   ring       France's nuclear ringed                                                           0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, grow: 0, slide: 0, focus: 0, split: 0, carry: 0, sum: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, grow: 1 };
  const reveal = { ...reference, slide: 1 };
  const subject = { ...reveal, focus: 1, split: 1, carry: 1, sum: 1 };
  const conclusion = { ...subject, focus: 0, split: 0, carry: 0, sum: 0, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
