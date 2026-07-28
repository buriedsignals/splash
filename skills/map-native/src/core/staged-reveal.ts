import { Easing, interpolate } from "remotion";

// The per-feature entrance envelope, lifted from RouteReveal (RouteReveal.tsx:441-467):
// border draws on, then fill blooms with an overshoot, then the label rises — each phase a
// CONSTANT number of seconds from the feature's own trigger (never a fraction of a global
// progress). Pure: no clock, no randomness.
//
// Phases may OVERLAP: `fillStart`/`labelStart` set when the fill and label windows begin,
// independent of when the border finishes. Their defaults reproduce the original STRICTLY
// SEQUENTIAL timing (fill after border, label after fill) — so callers that pass neither
// (e.g. RouteReveal) are byte-identical. Areal comps pass earlier starts so the phases
// interweave into one fluid gesture instead of three discrete steps.
export const STAGED_BORDER_S = 2.5;
export const STAGED_FILL_S = 1.0;
export const STAGED_LABEL_S = 0.7;
/** How far above the settle target the fill blooms at its peak. */
export const STAGED_FILL_OVERSHOOT = 1.25;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * The one name for "this number is about to become a MapLibre opacity". Every comp that
 * scales the raw envelope by its own ceiling passes the product through here, so the
 * discipline is greppable instead of re-derived per component.
 */
export const clampOpacity = clamp01;

export interface StagedEntrance {
  /** 0..1 eased — fraction of the border drawn. */
  borderProgress: number;
  /**
   * A VALID opacity, 0..1 — the envelope below made safe for a paint property. Hand THIS
   * to `fill-opacity` / `circle-opacity` and friends.
   */
  fillOpacity: number;
  /**
   * The RAW envelope: eased 0 → target*STAGED_FILL_OVERSHOOT → target, 0 until the fill
   * window opens. **Not an opacity** — its whole point is that it leaves the channel, and
   * a target above 0.8 puts the peak past 1. Read it when the overshoot is the signal
   * (a progress remap, or a ceiling you are about to multiply by), then clamp the result.
   */
  fillEnvelope: number;
  /**
   * The overshoot ALONE: `max(0, fillEnvelope - target)`, so 0 everywhere except during
   * the bloom. A valid opacity by construction (it never exceeds target*0.25). This is the
   * value the context-mode areal comps paint on the bloom layer sitting above the base
   * fill — clamping the envelope instead of exposing this would have quietly cut their
   * bloom to the headroom left under 1.
   */
  fillBloom: number;
  /** 0..1 eased — label rise/fade progress. */
  labelReveal: number;
}

/**
 * @param localSeconds seconds since this feature's trigger: (frame - triggerFrame) / fps.
 * @param opts.fillOpacity the settle target the fill blooms to (the feature's base fill).
 */
export function stagedEntrance(
  localSeconds: number,
  opts: {
    fillOpacity: number;
    borderS?: number;
    fillS?: number;
    labelS?: number;
    /** seconds from trigger when the fill window begins. Default: after the border (sequential). */
    fillStart?: number;
    /** seconds from trigger when the label window begins. Default: after the fill (sequential). */
    labelStart?: number;
  },
): StagedEntrance {
  const borderS = opts.borderS ?? STAGED_BORDER_S;
  const fillS = opts.fillS ?? STAGED_FILL_S;
  const labelS = opts.labelS ?? STAGED_LABEL_S;
  const fillStart = opts.fillStart ?? borderS; // default: fill after border completes
  const labelStart = opts.labelStart ?? fillStart + fillS; // default: label after fill completes
  const ls = localSeconds;

  const borderProgress = interpolate(clamp01(ls / borderS), [0, 1], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
  });

  // `extrapolateLeft/Right: "clamp"` bounds the INPUT of the interpolation, never its
  // output — so the peak keyframe below is exactly what the curve reaches, overshoot and
  // all. That is intended for the envelope and wrong for an opacity, hence the two fields.
  const target = opts.fillOpacity;
  const fp = clamp01((ls - fillStart) / fillS);
  const fillEnvelope =
    fp <= 0
      ? 0
      : interpolate(
          fp,
          [0, 0.6, 1],
          [0, target * STAGED_FILL_OVERSHOOT, target],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          },
        );

  const labelReveal = clamp01((ls - labelStart) / labelS);

  return {
    borderProgress,
    fillOpacity: clamp01(fillEnvelope),
    fillEnvelope,
    fillBloom: Math.max(0, Math.min(1, fillEnvelope - target)),
    labelReveal,
  };
}
