/**
 * The timing contract — the one object a journalist edits to retime a beat.
 *
 * Every interpolation window in the drawing derives from here. No frame literal appears in the
 * composition: a build with `interpolate(frame, [72, 150], ...)` scattered through it can be
 * re-rendered but it cannot be re-edited, which is the whole point of the video path
 * (`twin-doctrine/references/motion-grammar.md`, "The timing contract").
 *
 * The event names are editorial, not technical. Someone who has never read a line of JSX can look
 * at `reveal.duration` and make the line draw slower.
 */

export type TimingEvent = {
  /** First frame of the event, inclusive. */
  start: number;
  /** How many frames it takes. `start + duration` is the first frame after it. */
  duration: number;
};

/**
 * The six events, in the order a video beat plays them.
 *
 * Gaps between events are legal and load-bearing: the pause that lets the reader read the baseline
 * IS the gap between `reference` ending and `reveal` starting. Gaps are not named, because nothing
 * arrives during them — that is what makes them pauses.
 */
export type BeatTiming = {
  fps: number;
  /** Composition length in frames. `hold` must end exactly here. */
  total: number;
  /** Ground, source line, axis, ticks, gridlines. Comes up, then never moves again. */
  establish: TimingEvent;
  /** The level the argument is measured against, laid down before the evidence. */
  reference: TimingEvent;
  /** The data arriving, in the data's own order. */
  reveal: TimingEvent;
  /** The one mark the takeaway is about, landing as its own event. */
  subject: TimingEvent;
  /** The journalist's sentence, handed over once the chart has proved it. */
  conclusion: TimingEvent;
  /** Stillness. The frame a reader actually reads. */
  hold: TimingEvent;
};

/** The order the events must appear in, and the order the checks read them in. */
export const EVENT_ORDER = [
  "establish",
  "reference",
  "reveal",
  "subject",
  "conclusion",
  "hold",
] as const;

export type EventName = (typeof EVENT_ORDER)[number];

export function endOf(event: TimingEvent): number {
  return event.start + event.duration;
}

/**
 * How far through an event a given frame is, 0..1, clamped at both ends.
 *
 * Clamped is not a detail: an unclamped window keeps moving outside itself, so a label that faded
 * in over 24 frames keeps getting more opaque for the rest of the video, and the hold is not still.
 */
export function progressOf(frame: number, event: TimingEvent): number {
  if (event.duration <= 0) return frame >= event.start ? 1 : 0;
  return Math.max(0, Math.min(1, (frame - event.start) / event.duration));
}

/**
 * The reasons a timing object is not a legal beat timing. Empty means it is one.
 *
 * These are the motion grammar's structural rules, mechanised: the conclusion cannot precede its
 * evidence, the subject cannot be the tail of the reveal, and the video cannot end on a transition.
 * A reviewer reading the mp4 would catch these; a test catches them before the render.
 */
export function checkTiming(timing: BeatTiming): string[] {
  const errors: string[] = [];

  for (const name of EVENT_ORDER) {
    const event = timing[name];
    if (!Number.isInteger(event.start) || event.start < 0)
      errors.push(`${name}: start must be a frame index, got ${event.start}`);
    if (!Number.isInteger(event.duration) || event.duration <= 0)
      errors.push(
        `${name}: duration must be at least one frame, got ${event.duration}`,
      );
  }
  if (errors.length > 0) return errors;

  // Each event begins only once the one before it has finished. This is "the conclusion appears
  // only after its evidence is visible" and "the subject arrives as a distinct event", as arithmetic.
  for (let i = 1; i < EVENT_ORDER.length; i++) {
    const previous = EVENT_ORDER[i - 1];
    const current = EVENT_ORDER[i];
    if (timing[current].start < endOf(timing[previous]))
      errors.push(
        `${current} starts at ${timing[current].start}, before ${previous} finishes at ${endOf(timing[previous])}`,
      );
  }

  // Nothing arrives during the hold, so it is the last thing in the composition and it ends on the
  // last frame. A video that ends before its hold, or after it, has no complete frame to be read.
  if (endOf(timing.hold) !== timing.total)
    errors.push(
      `hold ends at ${endOf(timing.hold)}, not at the composition's ${timing.total} frames`,
    );

  // Half a second is the floor stated in the motion grammar.
  if (timing.hold.duration < timing.fps / 2)
    errors.push(
      `hold is ${timing.hold.duration} frames, under the half-second floor of ${timing.fps / 2}`,
    );

  return errors;
}

/**
 * This story's timing. 8 seconds at 30fps, 1080 × 1080.
 *
 * Read it as the edit: the frame settles (0.87s), the 1967 level is laid down (0.73s), it is left
 * alone for 0.6s so it can be read, the curve draws 1950 → 2024 at a constant pace (2.6s), the
 * 2024 point lands on its own (0.6s), the sentence arrives (0.8s), and the finished chart is held
 * for 1.6s — long enough to read a 70-character sentence, which is longer than the grammar's
 * half-second floor for a build that ends on marks alone.
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
