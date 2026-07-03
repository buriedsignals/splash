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
  description?: string;
  source?: { name: string; url: string };
  visual: VisualKind;
  steps: ScrollyStep[];
}

// v2: one scroll step per map beat, written as a self-contained, data-tied caption
// (NEVER article text). Sequence: [title] → [OVERVIEW (establish)] → [reveals] →
// [TAKEAWAY (always)]. The title lives in the module header, so it is never a step
// caption; the title step and OVERVIEW step both carry the description (so the viewer
// first sees ALL the data); reveal steps add a PATTERN-AWARE descriptor: a
// magnitude/ranking field reads "the highest / the lowest" (deriveMapStory
// orders max → min); a TEMPORAL field reads as a SEQUENCE — "the first / then /
// the most recent" — never "highest/lowest" (deriveMapStory orders those reveals
// earliest → latest and tags each beat with seqIndex/seqTotal). The TAKEAWAY
// closes on all the data.
export function mapStoryToChapters(
  beats: Beat[],
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
    regionsWithData: number;
  },
): ScrollyStory {
  const revealIdx: number[] = [];
  beats.forEach((b, i) => {
    if (b.kind === "reveal") revealIdx.push(i);
  });
  const maxBeat = revealIdx[0];
  const minBeat = revealIdx[revealIdx.length - 1];
  const desc = meta.description?.trim() ? meta.description : meta.title;

  const steps: ScrollyStep[] = [];
  beats.forEach((b, i) => {
    const hasCopy = !!(b.copy && b.copy.trim());

    let prose: string;
    if (b.kind === "title") {
      prose = desc; // intro caption = the figure's description
    } else if (b.kind === "establish") {
      prose = desc; // OVERVIEW caption = the figure's description (see all the data)
    } else if (b.kind === "reveal" && b.callout) {
      let descriptor = "";
      if (b.pattern === "temporal") {
        // Sequence language, NEVER "highest/lowest". deriveMapStory orders
        // temporal reveals earliest→latest and tags each with seqIndex/seqTotal.
        const idx = b.seqIndex ?? 0;
        const total = b.seqTotal ?? revealIdx.length;
        if (total > 1) {
          if (idx === 0) descriptor = "the first";
          else if (idx === total - 1) descriptor = "the most recent";
          else descriptor = "then";
        }
      } else if (revealIdx.length > 1) {
        // magnitude / ranking (also the categorical fallback) — ranking language.
        if (i === maxBeat)
          descriptor = `the highest of the ${meta.regionsWithData} shown`;
        else if (i === minBeat) descriptor = "the lowest";
      }
      prose = `${b.callout.name} — ${b.callout.value}${descriptor ? ", " + descriptor : ""}`;
    } else {
      prose = hasCopy ? b.copy : desc;
    }

    steps.push({
      id: `step-${i}-${b.kind}`,
      visual: "map",
      action: "flyTo",
      ref: i,
      prose,
      align: "center",
    });
  });

  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "map",
    steps,
  };
}
