// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   country    Ukraine tinted and named, the station's ring on the continent                     0..1
//   zoom       the camera from Europe to the close-up                                            0..1
//   regions    the focus country's regional borders, as the camera closes in                     0..1
//   names      the close-up's places: countries, settlements, waters                             0..1
//   subject    the ring closing on the station, its name and its capacity counting up            0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, country: 0, zoom: 0, regions: 0, names: 0, subject: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, country: 1 };
  const reveal = { ...reference, zoom: 1, regions: 1, names: 1 };
  const subject = { ...reveal, subject: 1 };
  const conclusion = { ...subject, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
