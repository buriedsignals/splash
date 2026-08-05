// The one thing a route's video owes the journalist: saying that their storyboard is not in it.
//
// A route's video draws the line on continuously, through every crossed territory in geographic
// order — that IS the animation. So a confirmed arc has nothing to drive: "walk 2 of 3
// territories" is not expressible for a line that must physically reach the third through them,
// and reordering would draw the line out of order. That reasoning is sound and is written where
// it belongs (RouteReveal.tsx, story-comps.mjs); this file does NOT argue with it.
//
// What it fixes is the silence around it. The reachability audit found route to be the only map
// type whose default video mode drops `arcBeats`, and rated the silent drop worse than a refusal
// — because a refusal is something the journalist learns. They confirmed beats, each carrying
// prose they wrote; the film shows none of it and says nothing.
//
// Deliberately a NOTICE, not a refusal. The video is still the right artefact for a route, and
// blocking it would trade a silent loss for a dead end. The journalist is told what is lost and
// which format keeps it, and decides.

export type RouteArcNoticeInput = {
  type?: string;
  format?: string;
  arcBeats?: { region?: string; text?: string }[];
};

/** The sentence to print, or null when there is nothing to admit. */
export function routeArcNotice(input: RouteArcNoticeInput): string | null {
  if (input.type !== "route") return null;
  if (input.format !== "video") return null;
  if (!input.arcBeats?.length) return null;

  const n = input.arcBeats.length;
  const withText = input.arcBeats.filter((b) => (b.text ?? "").trim()).length;
  return (
    `this route's video does not use the ${n} confirmed beats of your storyboard. ` +
    `A route's film draws its line on continuously, through every crossed territory in order — ` +
    `there is no sequence of camera stops for beats to drive, so they cannot be honoured here` +
    (withText
      ? `, and the text you wrote on ${withText === n ? "them" : `${withText} of them`} will not appear either`
      : "") +
    `. To keep the storyboard, deliver this route as a SCROLLY, which walks the beats one at a ` +
    `time. To keep the video, nothing more is needed — the line still draws through the whole route.`
  );
}
