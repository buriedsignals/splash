import type { Beat } from "../../map-native/src/map-story";
import { storyCopy } from "../../../lib/core/story-copy";

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

// The dispatcher seam Scrolly.tsx routes its sticky graphic AND its story derivation
// on — pure, so tests exercise the routing without importing the (MapTiler-keyed)
// component tree. Mirrors how the branches were chosen inline before the image track:
// an explicit visual:"image" wins, a `nativeType` config is the chart track, and
// everything else is the map family (choropleth default).
export function resolveVisual(config: {
  visual?: unknown;
  nativeType?: unknown;
}): VisualKind {
  if (config.visual === "image") return "image";
  if (typeof config.nativeType === "string") return "chart";
  return "map";
}

export interface ScrollyStory {
  title: string;
  description?: string;
  // A cited source must carry a name (conformance relies on it); the URL is optional —
  // not every source is linkable. Matches map-native's MapFrame furniture shape.
  source?: { name: string; url?: string };
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
    source?: { name: string; url?: string };
    regionsWithData: number;
    /** deliverable language — localizes the auto-generated reveal descriptors
     * ("the highest of the N shown" / "the first" / …). Default English. */
    lang?: string;
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
    } else if (b.kind === "reveal" && b.authored) {
      // A journalist-CONFIRMED arc beat (applyMapArc). Its caption is the claim the
      // journalist wrote, shipped as written — the chart track has always done this
      // (chart-chapters.ts: `else prose = b.copy`), and the map track did not, which is the
      // whole defect: it rebuilt every caption as "<name> — <value>, <descriptor>" and read
      // the descriptor off the beat's POSITION among the reveals. Under an arc that position
      // is the order of the argument, so the last beat of a geographic walk was captioned
      // "the lowest" while another region held the minimum. Two rules broken at once — the
      // journalist's words shipping as the machine's, and a validated plan producing a
      // materially different artifact.
      //
      // An arc beat with no claim text (roles are optional, so a plan MAY be anchors only)
      // still gets the data-tied caption — but never a rank descriptor, because nothing here
      // computed a rank.
      prose = hasCopy
        ? b.copy
        : b.callout
          ? `${b.callout.name} — ${b.callout.value}`
          : desc;
    } else if (b.kind === "reveal" && b.callout) {
      let descriptor = "";
      if (b.pattern === "temporal") {
        // Sequence language, NEVER "highest/lowest", and NEVER a bare "then".
        // Every temporal caption must carry a data-tied descriptor: an ordinal
        // ("the first" / "the most recent" / "the 3rd") and, for interior steps,
        // the interval to the previous reveal or since the first — all values
        // that deriveMapStory computed from the data (seqIndex/seqTotal/seqYear*).
        descriptor = temporalDescriptor(b, meta.lang);
      } else if (revealIdx.length > 1) {
        // magnitude / ranking — a RANK-aware descriptor for EVERY reveal, not just the
        // extremes (deriveMapStory tags each magnitude beat with rank + rankRole, F11):
        // the leader reads "the highest of the N shown", the tail "the lowest", and the
        // middle leaders their ordinal ("the second", "the third") — so the walk explains
        // the distribution instead of jumping max→min. Falls back to the old max/min
        // labelling if a beat lacks rank tags (older stories). Localized per meta.lang —
        // the auto-generated words must never leak English into a French deliverable.
        const copy = storyCopy(meta.lang);
        if (b.rankRole === "tail" || i === minBeat) descriptor = copy.lowest;
        else if (b.rank === 1 || i === maxBeat)
          descriptor = copy.highestOf(meta.regionsWithData);
        else if (b.rank !== undefined) descriptor = copy.ordinalWord(b.rank);
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

// Compose the data-tied descriptor for a temporal reveal. Uses only facts
// deriveMapStory computed from the data: the reveal's ordinal position in the
// earliest→latest sequence, and the interval (in years) to the previous reveal
// or since the first reveal. NEVER a bare connective, NEVER an invented fact.
// `lang` picks the shared story-copy row — an auto-generated caption must never leak
// English words into a non-English deliverable (or vice versa).
export function temporalDescriptor(b: Beat, lang?: string): string {
  const copy = storyCopy(lang);
  const idx = b.seqIndex ?? 0;
  const total = b.seqTotal ?? 0;
  if (total <= 1) return "";

  // First reveal — the earliest in the sequence.
  if (idx === 0) return copy.first;

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
    if (sinceFirst && sinceFirst > 0) {
      return copy.mostRecentSince(copy.years(sinceFirst));
    }
    return copy.mostRecent;
  }

  // Interior reveal — ordinal position plus the gap to the previous reveal.
  const ord = copy.ordinalWord(idx + 1);
  if (gapPrev && gapPrev > 0) {
    return copy.laterBy(ord, copy.years(gapPrev));
  }
  return ord;
}
