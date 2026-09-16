// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title    the title card                                                                     0..1
//   bar      Finland's whole electricity growing along the foot                                 0..1
//   split    gaps cutting the bar into its seven sources and the rest                           0..1
//   stand    each piece rising onto its rail, length kept; the rails and their names arriving   0..1
//   trace    Finland's line joining the tops                                                    0..1
//   settle   the pieces thinning into the line, its name travelling to its seat                 0..1
//   draw     the fifteen other lines drawn across the rails, each name arriving                 0..1
//   zoom     the gap between the nuclear and wind rails opening across the frame                0..1
//   nuclear  a floor rising on the nuclear rail to 25 %, the lines it passes stepping back       0..1
//   wind     a floor rising on the wind rail to 20 %                                            0..1
//   pair     the two left taking the accent                                                     0..1
//   back     the rails closing back to the overview                                             0..1
//   release  every line returning                                                               0..1
//   source   the credit                                                                         0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, bar: 0, split: 0, stand: 0, trace: 0, settle: 0, draw: 0, zoom: 0, nuclear: 0, wind: 0, pair: 0, back: 0, release: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, bar: 1, split: 1, stand: 1, trace: 1, settle: 1 };
  const reveal = { ...reference, draw: 1 };
  const subject = { ...reveal, zoom: 1, nuclear: 1, wind: 1, pair: 1 };
  const conclusion = { ...subject, back: 1, release: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
