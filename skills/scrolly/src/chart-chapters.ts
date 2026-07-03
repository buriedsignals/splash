import type { ChartBeat } from "../../chart-native/src/chart-story";
import type { ScrollyStory, ScrollyStep } from "./chapters";

// Chart analog of mapStoryToChapters: one scroll step per beat, self-contained data-tied
// captions (never article text). title + establish carry the figure DESCRIPTION (see all
// the data first); reveals carry the beat copy; the takeaway closes on the insight.
export function chartStoryToChapters(
  beats: ChartBeat[],
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
  },
): ScrollyStory {
  const desc = meta.description?.trim() ? meta.description : meta.title;
  const steps: ScrollyStep[] = beats.map((b, i) => {
    let prose: string;
    if (b.kind === "title" || b.kind === "establish") prose = desc;
    else if (b.kind === "takeaway") prose = b.copy?.trim() ? b.copy : desc;
    else prose = b.copy;
    return {
      id: `step-${i}-${b.kind}`,
      visual: "chart",
      action: "drawTo",
      ref: i,
      prose,
      align: "center",
    };
  });
  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "chart",
    steps,
  };
}
