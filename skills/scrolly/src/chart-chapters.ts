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
    /** The line the scrolly OPENS on — its OWN field, resolved from the framing material and
     *  never from the title. A chart's title IS its confirmed takeaway on the loop path
     *  (lib/loop/assemble/chart-native.ts:20), so an opening card that fell back to the title
     *  opened the piece on its own chute — and the emptied takeaway beat (chart-story.ts:524)
     *  then landed on that same string. Default: the description (the what/when/where deck the
     *  framing already produced, which checkScrollyConformance requires). Absent both, there is
     *  no opening CARD: the title stays where it belongs — the persistent header
     *  (Scrolly.tsx:538, "Shown once here; never repeated as a step caption"). */
    opening?: string;
    source?: { name: string; url: string };
  },
): ScrollyStory {
  const opening = meta.opening?.trim()
    ? meta.opening
    : meta.description?.trim()
      ? meta.description
      : "";
  const steps: ScrollyStep[] = beats
    .map((b, i) => {
      let prose: string;
      if (b.kind === "title" || b.kind === "establish") prose = opening;
      // The takeaway carries its OWN copy or nothing. It deliberately no longer borrows the
      // opening's text: recycling the intro at the close is the defect (D09), and writing a
      // closing line is the journalist's job, not the engine's.
      else if (b.kind === "takeaway") prose = b.copy?.trim() ? b.copy : "";
      else prose = b.copy;
      return {
        id: `step-${i}-${b.kind}`,
        visual: "chart" as const,
        action: "drawTo" as const,
        ref: i,
        prose,
        align: "center" as const,
      };
    })
    // A card with no text is not a card. Filtered AFTER the map, so every surviving step keeps
    // `ref` = its BEAT index — which is what the sticky graphic advances on
    // (Scrolly.tsx: `story.steps[currentStep].ref`) and what lineCardTargets reads.
    .filter((s) => s.prose.trim() !== "");
  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "chart",
    steps,
  };
}
