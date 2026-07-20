import type { Beat } from "./map-story.ts";
import type { Phase } from "./story-timeline.ts";

/** Map each reveal beat's subject region (beat.highlight[0]) to that beat's start frame. */
export function triggerFrameByRegion(
  beats: Beat[],
  phases: Phase[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].kind !== "reveal") continue;
    const key = beats[i].highlight[0];
    if (!key) continue;
    if (!m.has(key)) m.set(key, phases[i].startFrame);
  }
  return m;
}
