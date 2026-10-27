/**
 * The interval family's still plate (variant "gantt"): the per-type gantt's anatomy — names in a gutter, a faint track
 * per row, runs as bars on one time axis whose last year an open run ends flush with, year ticks walked until they
 * clear — with its fixed staging (the "throughout" rows in the accent) replaced by the beat's composed gestures:
 * the accent, rings and stepped-back rows, a compare's copy, reference rules, and every note, all at once.
 */
import { GestureKeyedStatic } from "./GestureKeyedStatic.tsx";
import { intervalScene } from "./gesture-family-interval.mjs";

export function GestureIntervalStatic({ variant = "gantt", model, plan, state, format, ...plate }: any) {
  if (variant !== "gantt") throw new Error(`the interval family draws the gantt variant, not ${variant}`);
  return (
    <GestureKeyedStatic
      {...plate}
      state={state}
      sceneOf={(box, measure, lead) => intervalScene({ ...model, plan, box, measure, lead, format, spanLabel: model.spanLabel })}
    />
  );
}
