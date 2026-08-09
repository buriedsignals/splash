// A physical copy of the motion grammar's vocabulary (`twin-chart-video/assets/timing.ts` /
// `twin-map-beat/assets/timing.ts`), not an import — a proof beat stays copy-pasteable on its own.
// Only the vocabulary is copied here; the beat's own edit lives in `timing.ts`.

export type TimingEvent = {
  /** First frame of the event, inclusive. */
  start: number;
  /** How many frames it takes. `start + duration` is the first frame after it. */
  duration: number;
};

export type BeatTiming = {
  fps: number;
  /** Composition length in frames. `hold` must end exactly here. */
  total: number;
  /** Furniture: title, source line, the empty legend. Comes up, then never moves again. */
  establish: TimingEvent;
  /** The level the argument is measured against, laid down before the evidence. */
  reference: TimingEvent;
  /** The data arriving, in the data's own order. */
  reveal: TimingEvent;
  /** The one mark the takeaway is about, landing as its own event. */
  subject: TimingEvent;
  /** The assertion that closes the argument, stated once the subject has landed. */
  conclusion: TimingEvent;
  /** Stillness. The frame a reader actually reads. */
  hold: TimingEvent;
};

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

export function progressOf(frame: number, event: TimingEvent): number {
  if (event.duration <= 0) return frame >= event.start ? 1 : 0;
  return Math.max(0, Math.min(1, (frame - event.start) / event.duration));
}

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

  for (let i = 1; i < EVENT_ORDER.length; i++) {
    const previous = EVENT_ORDER[i - 1];
    const current = EVENT_ORDER[i];
    if (timing[current].start < endOf(timing[previous]))
      errors.push(
        `${current} starts at ${timing[current].start}, before ${previous} finishes at ${endOf(timing[previous])}`,
      );
  }

  if (endOf(timing.hold) !== timing.total)
    errors.push(
      `hold ends at ${endOf(timing.hold)}, not at the composition's ${timing.total} frames`,
    );

  if (timing.hold.duration < timing.fps / 2)
    errors.push(
      `hold is ${timing.hold.duration} frames, under the half-second floor of ${timing.fps / 2}`,
    );

  return errors;
}
