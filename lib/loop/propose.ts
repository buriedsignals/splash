import type { RunManifest, FormOption } from "./manifest";

// Thin proposal for the data→chart branch: legal chart-native forms, each with a
// grounded WHY the journalist can judge. It OFFERS — it never chooses (P1: instrument).
// The full typology + FT/perception grounding is the proposal-cerveau sub-project.
export function propose(m: RunManifest): FormOption[] {
  const profile = m.orient?.profile;
  if (!profile) return [];
  const cols = profile.numericColumns;
  if (cols.length === 2) {
    return [
      {
        id: "slope",
        nativeType: "slope",
        why: `Two points in time (${cols[0]} → ${cols[1]}) — a slope shows each row's change and whether the gap widens or narrows.`,
      },
      {
        id: "dumbbell",
        nativeType: "dumbbell",
        why: "A dumbbell marks the two endpoints per row — better when the size of each gap matters more than the trajectory.",
      },
    ];
  }
  if (cols.length >= 3) {
    return [
      {
        id: "line",
        nativeType: "line",
        why: `${cols.length} points over time — a line traces each series' trajectory.`,
      },
    ];
  }
  return [];
}
