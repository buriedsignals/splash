// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title       the title card, alone on the ground                                                0..1
//   furniture   the key: the count and « hors mesure »                                            0..1
//   level       how far inland the sweep has reached, in km; each line appears as the front passes it   km
//   tint        the swept fill's presence                                                          0..1
//   median      the median line's number, in the accent                                           0..1
//   summit      the farthest point's mark and number                                              0..1
//   source      the credit on the map the video ends on                                           0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";

/** @param {{ MEDIAN: number, LAST: number }} subject */
export function statesFor({ MEDIAN, LAST }) {
  const blank = { title: 0, furniture: 0, level: 0, tint: 0, median: 0, summit: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, level: MEDIAN, tint: 1, median: 1 };
  const subject = { ...reveal, level: LAST, summit: 1 };
  const conclusion = { ...subject, tint: 0, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
