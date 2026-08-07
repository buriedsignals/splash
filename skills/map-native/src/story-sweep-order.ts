// story-sweep-order.ts — THE CARRIER DECIDES *WHEN*, AND NOTHING ELSE.
//
// `sweep-carrier.ts` says where each mark sits on the sweep. `sweep-schedule.ts` (deleted with
// the last of its callers) turned those stops into their OWN frame window — a second clock,
// running from the end of the title card to the end of the video, independent of the beat
// timeline the camera is flying. That is the shape this module replaces, and the reason is not
// taste:
//
//   the camera tours BEATS (buildTimeline: move, hold, move, hold), and the sweep lit regions on
//   a clock that had never heard of a beat. Measured on Rémy's own run, 2026-08-06 — three
//   defects, all of them the same defect:
//     (a) the camera left a region before its entrance had finished;
//     (b) regions lit up outside the frame, because the sweep had reached them and the camera
//         had not;
//     (c) regions sat on screen unlit, because the camera had reached them and the sweep had not.
//
// Map Explainer (Buried Signals) has no such split: a country's entrance is triggered by the
// river ARRIVING at it, and the camera is where the river is. One clock. So this module keeps the
// one clock we already have — the beat timeline — and gives the carrier the only job it needs:
//
//   ★ THE CARRIER ORDERS THE REVEAL BEATS. THE TIMELINE PLAYS THEM. NOTHING ELSE MOVES.
//
// Each reveal beat already triggers its region's `stagedEntrance` (border draws → fill blooms →
// label rises) from its own beat's start frame — tuned, in `story-choreography.ts`, so the
// entrance completes inside the hold. Reordering the beats therefore changes WHEN each region
// lights up and touches nothing about HOW. A region lit by a previous beat stays lit, because
// `stagedEntrance` settles at its target and holds.
//
// What this deliberately does NOT do: choose WHICH regions are revealed. That is the deriver's
// salience walk (or the journalist's confirmed arc), and a carrier that silently re-selected
// subjects would be re-editing the story, not pacing it.

import type { SweepStops } from "./sweep-carrier";

/** The shape a beat must have for the carrier to place it — deliberately structural, so this
 *  module stays free of `map-story.ts`'s import chain (remotion, turf, the choropleth geo). */
export interface OrderableBeat {
  kind: string;
  /** The beat's subject key(s); `highlight[0]` is the region a reveal beat is about. */
  highlight: string[];
  /** Set by applyMapArc alone: this reveal came from a journalist-CONFIRMED walk. */
  authored?: true;
}

/**
 * Permute the REVEAL beats into the carrier's order, leaving every other beat where it is.
 *
 * The title, establish and takeaway beats are structural — the story opens and closes on them —
 * so only the reveal beats move, and they move only among the slots reveal beats already occupy.
 * The beat COUNT is therefore invariant, which is what lets `calculateMetadata` (Root.tsx) size
 * the composition without knowing a carrier exists.
 *
 * Refuses to touch an AUTHORED walk: an arc the journalist confirmed IS the order of the
 * argument (see `applyMapArc`), and re-sorting it by a number read off the data would silently
 * replace his reasoning with the deriver's. A carrier paces a derived walk; it does not overrule
 * a confirmed one.
 *
 * Stable: reveals whose stops tie keep their derived order, so a carrier that cannot separate two
 * regions leaves the deriver's tie-break standing rather than inventing one.
 */
export function orderRevealBeatsBySweep<T extends OrderableBeat>(
  beats: T[],
  stops: SweepStops,
): T[] {
  const slots: number[] = [];
  for (let i = 0; i < beats.length; i++)
    if (beats[i]!.kind === "reveal") slots.push(i);
  if (slots.length < 2) return beats;
  // A confirmed arc is the order. One authored reveal is enough — an arc is a whole walk.
  if (slots.some((i) => beats[i]!.authored)) return beats;

  // A mark the carrier could not place lands at the END (sweep-carrier.ts's own rule), so an
  // unplaced region closes the walk rather than opening it with a rank the data never gave.
  const stopOf = (i: number) => stops[beats[i]!.highlight[0] ?? ""] ?? 1;
  const ordered = [...slots].sort(
    (a, b) => stopOf(a) - stopOf(b) || slots.indexOf(a) - slots.indexOf(b),
  );

  const out = [...beats];
  slots.forEach((slot, k) => {
    out[slot] = beats[ordered[k]!]!;
  });
  return out;
}
