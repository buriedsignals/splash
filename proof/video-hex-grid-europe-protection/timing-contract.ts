/**
 * The timing contract for « Par habitant, la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants » (BRIEF.md).
 *
 * - `establish`: 45 frames. THE TITLE CARD from frame 0.
 * - `reference`: 144 frames. The live map of the hosts, the key column on the Atlantic; every country then leaves
 *   geography for its cell — the shapes over the map's fills, the travel into the hexagons over about two and a half
 *   seconds, the basemap fading under them — and the codes land. (60 frames before the map: 2026-09-15.)
 * - `reveal`: 120 frames. The cells take their count class, lowest first; Germany ringed and its line.
 * - `subject`: 180 frames. Every cell changes to its rate class over about three seconds; Czechia ringed; the lines.
 * - `conclusion`: 60 frames. The credit.
 * - `hold`: 90 frames: the grid per inhabitant.
 *
 * Total: 657 frames, 21.9 seconds at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const HEX_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 657,
  establish: { start: 0, duration: 45 },
  reference: { start: 51, duration: 144 },
  reveal: { start: 201, duration: 120 },
  subject: { start: 327, duration: 180 },
  conclusion: { start: 507, duration: 60 },
  hold: { start: 567, duration: 90 },
};
