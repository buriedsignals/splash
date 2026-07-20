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

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export interface StagedEntrance {
  /** 0..1 eased — fraction of the border drawn. */
  borderProgress: number;
  /** eased 0 → overshoot(target*1.25) → target. 0 until the border completes. */
  fillOpacity: number;
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

  const fp = clamp01((ls - fillStart) / fillS);
  const fillOpacity =
    fp <= 0
      ? 0
      : interpolate(
          fp,
          [0, 0.6, 1],
          [0, opts.fillOpacity * 1.25, opts.fillOpacity],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          },
        );

  const labelReveal = clamp01((ls - labelStart) / labelS);

  return { borderProgress, fillOpacity, labelReveal };
}
