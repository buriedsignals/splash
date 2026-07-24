import type { RunElement } from "./manifest";

export type ReviseChange =
  | { kind: "emphasis"; emphasis: string }
  | { kind: "takeaway"; confirmedTakeaway: string; altInsight: string };

// A back-edge: the journalist changes the angle after seeing the visual. We update the
// element's angle; its provenance no longer matches the artifact, so stalenessOf() flips
// true and nextActions() routes back to produce. Staleness is derived — we do NOT delete
// the old artifact here.
export function revise(el: RunElement, change: ReviseChange): RunElement {
  if (!el.angle)
    throw new Error("revise: nothing to revise before an angle exists");
  const angle =
    change.kind === "emphasis"
      ? { ...el.angle, emphasis: change.emphasis }
      : {
          ...el.angle,
          confirmedTakeaway: change.confirmedTakeaway,
          altInsight: change.altInsight,
        };
  return { ...el, angle };
}
