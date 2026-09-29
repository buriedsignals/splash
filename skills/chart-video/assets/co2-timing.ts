/**
 * The seed's own EDIT — the one object a journalist edits to retime `EmissionsVideo`.
 *
 * The vocabulary (`BeatTiming`, `checkTiming`, `progressOf`) is `./timing.ts`, which is carried
 * byte for byte into `shared/chart-video/timing.ts` and `map-beat/assets/timing-contract.ts`; a
 * beat's edit is local to that beat, so it lives here and not in the carried file.
 */

import type { BeatTiming } from "./timing";

/**
 * This story's timing. 8 seconds at 30fps, 1080 × 1080.
 *
 * Read it as the edit: the furniture comes up — title, source, axis (0.87s) — the 1967 level is
 * laid down (0.73s), it is left alone for 0.6s so it can be read, the curve draws 1950 → 2024 at a
 * constant pace (2.6s), the 2024 point lands on its own (0.6s), its value is stated (0.8s), and the
 * finished chart is held for 1.6s.
 */
export const CO2_TIMING: BeatTiming = {
  fps: 30,
  total: 240,
  establish: { start: 0, duration: 26 },
  reference: { start: 32, duration: 22 },
  reveal: { start: 72, duration: 78 },
  subject: { start: 150, duration: 18 },
  conclusion: { start: 168, duration: 24 },
  hold: { start: 192, duration: 48 },
};
