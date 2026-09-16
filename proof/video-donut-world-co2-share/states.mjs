// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title    the title card                                                                            0..1
//   world    the 2000 ring traced from twelve o'clock, its tonnes in the hole, two names beside it      0..1
//   grow     the 2023 ring growing out of it, every arc its tonnes on one length scale                0..1
//   relabel  the two names leaving the 2000 arcs and coming back beside the 2023 ones                  0..1
//   split    country by country, both arcs flying to their own ring, keeping their angles              0..1
//   ring     China's number ringed                                                                     0..1
//   source   the credit                                                                                0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, world: 0, grow: 0, relabel: 0, split: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, world: 1 };
  const reveal = { ...reference, grow: 1, relabel: 1 };
  const subject = { ...reveal, split: 1 };
  const conclusion = { ...subject, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
