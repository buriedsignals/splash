/**
 * The timing contract for « Le charbon a reculé dans les douze pays qui en dépendaient le plus — la Pologne en tire
 * encore plus de la moitié » (BRIEF.md, « The choreography »).
 *
 * - `establish` 45: the title card, alone on the ground from frame 0.
 * - `reference` 66: the map of 2010, class by class, the year and the count coming up with the key.
 * - `reveal` 186: THE YEARS RUN — 2010 to 2024, twelve frames a year, every country's fill stepping with its own
 *   reading while the count above half steps down 3 → 1.
 * - `subject` 150: the camera travels onto Poland; once settled, each share counts down from 2010 to 2024 on one gauge,
 *   the half notched — Poland stays over the notch, Czechia crosses it, Germany was never there.
 * - `conclusion` 84: pull back, Poland ringed and named, the source on the sea.
 * - `hold` 60.
 *
 * Total: 600 frames, 20 s at 30 fps.
 */

import type { BeatTiming } from "#shared/chart-video/timing.ts";

export const COAL_VIDEO_TIMING: BeatTiming = {
  fps: 30,
  total: 600,
  establish: { start: 0, duration: 45 },
  reference: { start: 45, duration: 66 },
  reveal: { start: 114, duration: 186 },
  subject: { start: 303, duration: 150 },
  conclusion: { start: 456, duration: 84 },
  hold: { start: 540, duration: 60 },
};
