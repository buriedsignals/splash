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

// v1: one scroll step per MEANINGFUL map beat. The title shows exactly once, so:
//  - the `establish` beat is dropped (it's the video's fade-in over the same full
//    extent the title beat already frames — in scroll it would just repeat the title),
//  - a `takeaway` beat with no distinct closing line (its copy equals the title, so
//    map-story left it empty) is dropped too, rather than falling back to the title
//    and making it reappear at the end.
// Each remaining beat keeps its ORIGINAL index as `ref` (ScrollyMap indexes the full
// beats array). Cards are centred by default.
export function mapStoryToChapters(
  beats: Beat[],
  meta: { title: string; source?: { name: string; url: string } },
): ScrollyStory {
  const steps: ScrollyStep[] = [];
  beats.forEach((b, i) => {
    if (b.kind === "establish") return;
    const hasCopy = !!(b.copy && b.copy.trim());
    if (b.kind === "takeaway" && !hasCopy) return;
    steps.push({
      id: `step-${i}-${b.kind}`,
      visual: "map",
      action: "flyTo",
      ref: i,
      prose: hasCopy ? b.copy : meta.title,
      align: "center",
    });
  });
  return { title: meta.title, source: meta.source, visual: "map", steps };
}
