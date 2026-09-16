// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event (the picture at the event's end), run through
// `assertEventStates`: every event but the final hold changes the picture, and the hold changes nothing.
//
//   title      the title card                                                              0..1
//   furniture  the key — the year and the count over the class swatches                    0..1
//   arrive     the twelve arriving in their 2010 class, lowest class first                  0..1
//   year       the years running 2010 → 2024 on the whole map, the fills stepping per year  0..1
//   zoom       the camera travelling from the whole map onto Poland and its neighbours      0..1
//   rewind     the fills and the key going back to 2010 as the camera closes in             0..1
//   names      Poland, Czechia and Germany named, each share over a gauge notched at half,  0..1
//              and the year on the close-up's sea (the key steps back while the camera holds the close-up)
//   replay     the years running again, each gauge counting its share down past the notch  0..1
//   ring       Poland outlined and named on the whole map                                   0..1
//   source     the credit                                                                  0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, arrive: 0, year: 0, zoom: 0, rewind: 0, names: 0, replay: 0, ring: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1, arrive: 1 };
  const reveal = { ...reference, year: 1 };
  const subject = { ...reveal, furniture: 0, zoom: 1, rewind: 1, names: 1, replay: 1 };
  const conclusion = { ...subject, furniture: 1, zoom: 0, names: 0, ring: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
