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
// orders max → min); a TEMPORAL field reads as a SEQUENCE — "the first / the
// 3rd, N years later / the most recent, N years after the first" — never
// "highest/lowest", never a bare "then" (deriveMapStory orders those reveals
// earliest → latest and tags each beat with seqIndex/seqTotal + seqYear anchors,
// so every temporal caption states an ordinal and/or interval from the data).
// The TAKEAWAY closes on all the data.
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
        // Sequence language, NEVER "highest/lowest", and NEVER a bare "then".
        // Every temporal caption must carry a data-tied descriptor: an ordinal
        // ("the first" / "the most recent" / "the 3rd") and, for interior steps,
        // the interval to the previous reveal or since the first — all values
        // that deriveMapStory computed from the data (seqIndex/seqTotal/seqYear*).
        descriptor = temporalDescriptor(b);
      } else if (revealIdx.length > 1) {
        // magnitude / ranking — a RANK-aware descriptor for EVERY reveal, not just the
        // extremes (deriveMapStory tags each magnitude beat with rank + rankRole, F11):
        // the leader reads "the highest of the N shown", the tail "the lowest", and the
        // middle leaders their ordinal ("the second", "the third") — so the walk explains
        // the distribution instead of jumping max→min. Falls back to the old max/min
        // labelling if a beat lacks rank tags (older stories).
        if (b.rankRole === "tail" || i === minBeat) descriptor = "the lowest";
        else if (b.rank === 1 || i === maxBeat)
          descriptor = `the highest of the ${meta.regionsWithData} shown`;
        else if (b.rank !== undefined) descriptor = `the ${ordinal(b.rank)}`;
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

// Ordinal word for the small ranks the sequence uses ("the first" reads better
// than "the 1st"); numeric ordinals with the right suffix beyond that.
function ordinal(n: number): string {
  const words = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  if (n >= 1 && n <= words.length) return words[n - 1];
  const rem100 = n % 100;
  const rem10 = n % 10;
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? "th"
      : rem10 === 1
        ? "st"
        : rem10 === 2
          ? "nd"
          : rem10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

function years(n: number): string {
  return `${n} year${n === 1 ? "" : "s"}`;
}

// Compose the data-tied descriptor for a temporal reveal. Uses only facts
// deriveMapStory computed from the data: the reveal's ordinal position in the
// earliest→latest sequence, and the interval (in years) to the previous reveal
// or since the first reveal. NEVER a bare connective, NEVER an invented fact.
export function temporalDescriptor(b: Beat): string {
  const idx = b.seqIndex ?? 0;
  const total = b.seqTotal ?? 0;
  if (total <= 1) return "";

  // First reveal — the earliest in the sequence.
  if (idx === 0) return "the first";

  // Interval to the previously revealed step, when we know both years.
  const gapPrev =
    b.seqYear !== undefined && b.seqYearPrev !== undefined
      ? b.seqYear - b.seqYearPrev
      : undefined;

  // Last reveal — the most recent; add the span since the first when known.
  if (idx === total - 1) {
    const sinceFirst =
      b.seqYear !== undefined && b.seqYearFirst !== undefined
        ? b.seqYear - b.seqYearFirst
        : undefined;
    return sinceFirst && sinceFirst > 0
      ? `the most recent, ${years(sinceFirst)} after the first`
      : "the most recent";
  }

  // Interior reveal — ordinal position plus the gap to the previous reveal.
  const ord = `the ${ordinal(idx + 1)}`;
  if (gapPrev && gapPrev > 0) return `${ord}, ${years(gapPrev)} later`;
  return ord;
}
