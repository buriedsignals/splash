// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title      the title card                                                                    0..1
//   furniture  the axes, the key, the sixteen 2000 rings, France named                           0..1
//   travel     every country along its arc to 2024, one after another, the count climbing       0..1
//   zoom       the x axis closing onto 0–12 %, the crowd near the origin opening, its names      0..1
//   back       the x axis opening again onto the whole                                           0..1
//   lighter    the five that weigh less picked out one after another, the rest stepping back     0..1
//   legs       France's arc split into its two moves, each with its value                        0..1
//   source     the credit                                                                        0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, furniture: 0, travel: 0, zoom: 0, back: 0, lighter: 0, legs: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, furniture: 1 };
  const reveal = { ...reference, travel: 1 };
  const subject = { ...reveal, zoom: 1 };
  const conclusion = { ...subject, back: 1, lighter: 1, legs: 1, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
