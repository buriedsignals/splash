// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one state per event, run through `assertEventStates`.
//
//   title    the title card                                                                          0..1
//   grow     row after row, each country's bar of 100 % grown across the grid, the seven counted       0..1
//   floor    the dashed 94 % line and its label                                                      0..1
//   split    every bar's segments folding into their cells, taking their class's colour               0..1
//   grid     the matrix's furniture: heads, families, the share column, the bracket, the key          0..1
//   filter   the rows outside the seven stepping back                                                0..1
//   swap     the seven reordered by route (Norvège and Suède trade rows)                              0..1
//   part     the three routes parted by a gap                                                        0..1
//   routes   the bracket split into three named brackets, the nuclear column of the seven ringed     0..1
//   source   the credit                                                                              0..1

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";

export function statesFor() {
  const blank = { title: 0, grow: 0, floor: 0, split: 0, grid: 0, filter: 0, swap: 0, part: 0, routes: 0, source: 0 };
  const establish = { ...blank, title: 1 };
  const reference = { ...establish, title: 0, grow: 1, floor: 1 };
  const reveal = { ...reference, floor: 0, split: 1, grid: 1 };
  const subject = { ...reveal, filter: 1, swap: 1, part: 1, routes: 1 };
  const conclusion = { ...reveal, source: 1 };
  const byEvent = { establish, reference, reveal, subject, conclusion, hold: { ...conclusion } };
  return assertEventStates(EVENT_ORDER.map((name) => byEvent[name]), [...EVENT_ORDER]);
}
