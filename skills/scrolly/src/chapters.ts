import type { Beat } from "../../map-native/src/map-story";

export type VisualKind = "map" | "chart" | "image";
export type StepAction = "flyTo" | "drawTo" | "crossfade";

export interface ScrollyStep {
  id: string;
  visual: VisualKind;
  action: StepAction;
  ref: number | string;
  prose: string;
  align?: "left" | "right" | "center";
}

export interface ScrollyStory {
  title: string;
  source?: { name: string; url: string };
  visual: VisualKind;
  steps: ScrollyStep[];
}

// v1: one scroll step per map beat. Prose = the beat's copy, falling back to the
// story title when a beat carries no words (the establish beat is intentionally
// caption-less in the video — but a scroll step always needs text beside the map).
export function mapStoryToChapters(
  beats: Beat[],
  meta: { title: string; source?: { name: string; url: string } },
): ScrollyStory {
  const steps: ScrollyStep[] = beats.map((b, i) => ({
    id: `step-${i}-${b.kind}`,
    visual: "map",
    action: "flyTo",
    ref: i,
    prose: b.copy && b.copy.trim() ? b.copy : meta.title,
    align: "left",
  }));
  return { title: meta.title, source: meta.source, visual: "map", steps };
}
