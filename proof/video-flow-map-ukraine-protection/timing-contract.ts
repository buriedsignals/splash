/**
 * The timing contract for « 4,5 millions d'Ukrainiens sous protection temporaire » (BRIEF.md, « The choreography »).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 60 frames. The land, the node on Ukraine, the width scale.
 * - `reveal`: 210 frames. The bands trace out of the node, largest first, about seven seconds; the count climbs.
 * - `subject`: 120 frames. The other bands step back; the top two's share counts up.
 * - `conclusion`: 60 frames. The others return; the credit.
 * - `hold`: 90 frames: the flow map the video ends on.
 *
 * Total: 609 frames, 20.3 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const FLOW_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 609,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 60 },
  reveal: { start: 117, duration: 210 },
  subject: { start: 333, duration: 120 },
  conclusion: { start: 459, duration: 60 },
  hold: { start: 519, duration: 90 },
};
