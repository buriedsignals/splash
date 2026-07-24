import type { RunManifest } from "./manifest";

export type ReviseChange =
  | { kind: "emphasis"; emphasis: string }
  | { kind: "takeaway"; confirmedTakeaway: string; altInsight: string };

// A back-edge: the journalist changes the angle after seeing the visual. We update
// the angle; the artifact's provenance no longer matches, so stalenessOf() flips true
// and nextActions() routes back to produce. Staleness is derived — we do NOT delete
// the old artifact here.
export function revise(m: RunManifest, change: ReviseChange): RunManifest {
  if (!m.angle)
    throw new Error("revise: nothing to revise before an angle exists");
  const angle =
    change.kind === "emphasis"
      ? { ...m.angle, emphasis: change.emphasis }
      : {
          ...m.angle,
          confirmedTakeaway: change.confirmedTakeaway,
          altInsight: change.altInsight,
        };
  return { ...m, angle };
}
