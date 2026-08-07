// reduced-motion-verdict.ts — WHICH TRANSITION THE REDUCED-MOTION GUARD TESTS.
//
// The guard (scripts/snap-reduced-motion.mjs) proves one thing about a map scrolly: under an
// emulated `prefers-reduced-motion: reduce`, a camera flight must be an instant jump, not a
// 1200ms animation still running after the reader has stopped scrolling. To prove it, it needs
// a step transition where the camera ACTUALLY MOVES — testing a pair that frames the same box
// proves nothing.
//
// ★ IT USED TO GUESS WHICH PAIR THAT WAS, FROM THE STEP COUNT ALONE, and refuse the build when
// the guess was static ("vacuous check: step 3's camera equals step 2's"). Two different stories
// walked into that:
//   · a story that moves everywhere EXCEPT at the sampled index — refused for a defect it
//     does not have, while the flight it does perform goes untested;
//   · a story whose camera never moves at all — refused for a defect nobody can have. A locator
//     of ONE place is the honest example: there is a single frame to hold, no flight to linger.
//
// So the guard now reads every step's settled camera and decides from the whole story:
//   · at least one pair differs ⇒ test the differing pair nearest the middle (the same reveal
//     step the fixed index was aiming at, now found rather than assumed);
//   · no pair differs anywhere ⇒ the story is still, which is a fact about the story and not a
//     violation. It is reported in the journalist's terms and the build proceeds.
//
// This keeps the guard's teeth: a story that flies is ALWAYS tested, and the still verdict needs
// every step to agree, not one sampled pair.

/** A settled camera, as scripts/snap-reduced-motion.mjs samples it (rounded to 1e-6). */
export interface StepCamera {
  lng: number;
  lat: number;
  zoom: number;
}

export type ReducedMotionTarget =
  { kind: "transition"; from: number; to: number } | { kind: "still" };

/** What a still story is, for a reader of the producer's output who is not a developer. */
export const STILL_STORY_NOTE =
  "this story's map holds the same frame from its first step to its last — there is no camera flight, so there is nothing that could keep moving after the reader stops scrolling";

const same = (a: StepCamera, b: StepCamera) =>
  a.lng === b.lng && a.lat === b.lat && a.zoom === b.zoom;

export function chooseReducedMotionTransition(
  cams: readonly StepCamera[],
): ReducedMotionTarget {
  const movers: number[] = [];
  for (let i = 1; i < cams.length; i++) {
    if (!same(cams[i - 1]!, cams[i]!)) movers.push(i);
  }
  if (movers.length === 0) return { kind: "still" };
  // The index the fixed sampling aimed at: never step 0 (the title) and never the last step
  // (the takeaway, which for a map story is often the establishing camera again — testing it
  // would be a no-op). Kept as the PREFERENCE, no longer as the assumption.
  const preferred = Math.max(
    1,
    Math.min(cams.length - 2, Math.floor(cams.length / 2)),
  );
  let best = movers[0]!;
  for (const to of movers) {
    if (Math.abs(to - preferred) < Math.abs(best - preferred)) best = to;
  }
  return { kind: "transition", from: best - 1, to: best };
}
