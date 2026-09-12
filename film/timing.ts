// THE FILM'S ONE TIMING CONTRACT — every beat is a number in this file and nowhere
// else, so the cut can be re-timed here rather than hunted through four components.
//
// 60 fps, 1182 frames — nineteen and seven tenths seconds.
//
// SIXTY, BECAUSE THAT IS WHAT THE PAGE PAINTS. Chrome casts on its compositor's clock,
// sixty a second, and this page holds nearly all of them — measured on a full take, 89%
// of casts carry a new paint. Asking for 25 or 30 out of that made ffmpeg choose, per
// slot, whichever cast was nearest, so the picture advanced by two paints, then three,
// then two; under the push, where a paint is a long step, that is a visible stutter.
// Nothing is resampled now: one cast, one frame.
//
// The beats below are not invented either. `capture.mjs` stamps its own take into
// `public/stage-marks.json` — in output frames — and these are read off that and off the
// recording's luminance. In footage time:
//
//   0.0 → 2.5   the loading screen, which carries no face — just its ink
//   2.5 → 3.7   the paper climbs and clips that ink away: the papers arrive
//   3.7 → 10.6  the wall of front pages — American, British and Swiss at once
//  10.6 → 11.7  the crossing: the papers lift off the chapter
//  11.7 → 13.55 the field of plates arriving on its own clock, while the gate is crossed
// 13.55 → 19.55 ONE push on ONE curve, unbroken across the last three lines. Measured on
//               the recording, the field's motion climbs monotonically with no plateau
//               and no step anywhere in it.
// 17.87 → 19.55 and the turn, which belongs to the LAST LINE and to nothing else.
//
// WHAT MAY NOT BEGIN AT A SENTENCE IS THE ACCELERATION. An earlier cut lined the scroll
// push up with the fourth line and the spiral with the fifth, and two accelerations that
// each begin under a sentence do not read as a room speeding up — they read as a room
// changing gear every time a sentence arrives, and the sentence reads as the cause. The
// travel is now one curve across all five, and the lines are simply spaced against it.
// The ROTATION is the one event left, and it is the event the last line names.
//
// Fifty-six plates in that room, not the twenty-eight a reader gets — `?plates=56`.
//
// The five lines run 3.3s, 3.5, 3.25, 3.25, 2.15 — even, and the last one short:
// the picture under them is accelerating, and by the last line it is moving fast enough
// that a full measure would be standing still against it.
//
// The film enters at 2.4 — on the paper's first edge. It does not open on the mark:
// the mark is the ENDING, and a mark shown twice means less the second time.

export const FPS = 60;

const s = (seconds: number) => Math.round(seconds * FPS);

/** A window: when it arrives, when it leaves. */
export type Beat = { in: number; out: number };

export const LAUNCH_TIMING = {
  fps: FPS,
  total: s(19.7),

  /** Where the recording is entered, in ITS frames. Everything else on this timeline
   *  is film time; this is the one conversion. */
  footageIn: s(2.4),

  /** The recording goes out ACROSS the spiral: the fade opens with the frame still full
   *  and closes as the last tiles swing off it, so the picture and the room empty
   *  together. It is also before the push ends, so the room is never seen falling back
   *  to its drift — the last line is not an instruction to slow down.
   *
   *  It moved forward with the turn. At three times the angular acceleration a tile
   *  covers far more ground for the same reach, and the frame is all but clear about a
   *  second after the spiral opens; the fade has to be over it, not after it. */
  footageOut: { in: s(16.3), out: s(17.15) } as Beat,

  /** The five lines, in the order they are spoken. The second leaves exactly as the
   *  paper starts to lift, so the crossing is uncovered rather than played behind a
   *  sentence. The fifth lands on the first frame of the spiral, and outlives the
   *  picture so it is the last thing standing before the mark. */
  lines: [
    { in: s(1.2), out: s(4.5) },
    { in: s(4.7), out: s(8.2) },
    { in: s(8.45), out: s(11.7) },
    { in: s(11.95), out: s(15.2) },
    { in: s(15.47), out: s(17.6) },
  ] as Beat[],

  /** The rosette and the wordmark, alone on the ink. */
  wordmark: { in: s(17.65), out: s(19.7) } as Beat,

  /** How long anything takes to rise into place, and to leave. One motion for the whole
   *  film — the lines and the mark move the same way, rather than two ways that nearly
   *  match. */
  rise: s(0.7),
  fall: s(0.45),
  /** And how far apart two words of a line set off. In SECONDS, converted here: written
   *  as a frame count it silently doubled in pace the day the film went from 25 to 60. */
  wordStep: s(0.08),
} as const;
