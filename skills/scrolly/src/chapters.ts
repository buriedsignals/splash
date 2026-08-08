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
    /** Deliverable language — localizes the auto-generated reveal descriptors ("the highest
     *  of the N shown" / "the first" / …).
     *
     *  REQUIRED, and `undefined` is a legitimate value (an English run declares no language).
     *  It is required because OPTIONAL is exactly how the English leak got out: six of this
     *  function's callers — every map-native `*Scrolly.tsx` video composition — simply never
     *  wrote the key, and a French locator page shipped "the highest of the 5 shown" with a
     *  clean exit. `storyCopy` cannot tell "English on purpose" from "nobody said", so the
     *  only place that distinction can be forced is here, at the call. A required key makes
     *  the omission a type error instead of a silent English caption. */
    lang: string | undefined;
  },
): ScrollyStory {
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
          ? nameAndValue(b.callout.name, b.callout.value)
          : desc;
    } else if (b.kind === "reveal" && b.callout && !b.callout.value.trim()) {
      // ★ NO VALUE ⇒ NOTHING TO COMPOSE. A locator marker carries no number (locator-story.ts
      // resolves every anchor to value:""), so the "<name> — <value>" template below rendered
      // a name, an em dash and a hole — measured on a delivered French page:
      //     "Pont d'Austerlitz — , the highest of the 5 shown"
      //     "Notre-Dame de Paris —"
      // The caption a journalist would sign is the one the DERIVER already wrote and put in
      // `copy`: the marker's own note, or, failing that, the place's name. This branch ships
      // it, and — because a rank descriptor is a claim about a QUANTITY — adds no descriptor
      // to a beat that has none. Same rule the authored branch above already states for an
      // arc ("never a rank descriptor, because nothing here computed a rank"); it was simply
      // never applied to the derived walk, where the composer read rank off POSITION and so
      // asserted "the highest" over a walk of five places that ranked nothing at all.
      prose = hasCopy ? b.copy : b.callout.name;
    } else if (b.kind === "reveal" && b.callout) {
      let descriptor = "";
      if (b.pattern === "temporal") {
        // Sequence language, NEVER "highest/lowest", and NEVER a bare "then".
        // Every temporal caption must carry a data-tied descriptor: an ordinal
        // ("the first" / "the most recent" / "the 3rd") and, for interior steps,
        // the interval to the previous reveal or since the first — all values
        // that deriveMapStory computed from the data (seqIndex/seqTotal/seqYear*).
        descriptor = temporalDescriptor(b, meta.lang);
      } else if (b.pattern === "categorical") {
        // A CATEGORICAL walk ranks nothing, and says so out loud. The locator's categorized
        // regime orders its beats by category NAME, so its position is the alphabet — and
        // "Écoles — 3 sites, le plus élevé des 5" was a ranking claim over an alphabetical
        // list, against a total that counted markers rather than categories. Beat.pattern
        // exists for exactly this judgment (see its own comment: it tells the caption engine
        // "whether ranking language is honest"); it had only ever been consulted for the
        // temporal half.
        //
        // Since the branch below stopped deriving rank from position, an absent declaration
        // already yields no descriptor — so this branch is now a REFUSAL rather than the only
        // defence: a beat that declares "categorical" gets no rank language even if some
        // future deriver also wrote rank tags onto it. Two contradictory declarations resolve
        // to the quieter one.
        descriptor = "";
      } else if (b.rank !== undefined) {
        // ★ RANK IS DECLARED, NEVER DERIVED HERE. A magnitude walk's descriptor comes from the
        // tags the DERIVER wrote (rank + rankRole): the leader reads "the highest of the N
        // shown", the tail "the lowest", and the middle leaders their ordinal ("the second",
        // "the third"), so the walk explains the distribution instead of jumping max→min.
        // Localized per meta.lang — the auto-generated words must never leak English into a
        // French deliverable.
        //
        // It used to fall back to POSITION when a beat carried no tags — `i === minBeat` ⇒
        // "the lowest", `i === maxBeat` ⇒ "the highest of the N shown". That is honest only for
        // choropleth, whose magnitudeRevealRows deliberately appends the TRUE tail; four other
        // types walk a plain top-N whose last beat is merely the last one visited. Measured on
        // built pages (2026-08-08): "Rome — 67$bn, the lowest" with Amsterdam's 52$bn drawn on
        // the same map; "#5 hexagon — 15 points, the lowest" out of 62; "Denmark — 64, the
        // lowest" out of 18; and dot-density, whose walk is ranked by DENSITY, captioning
        // "Netherlands — 18M, the highest of the 14 shown" ahead of Germany's 84M.
        //
        // So position no longer stands in for rank anywhere. A walk that ranked nothing — or
        // ranked something other than the number it prints — declares no tags and gets no rank
        // language, which is the same rule the `categorical` branch above already states and
        // the one `authored` states for an arc. `magnitudeRankTags` (map-story.ts) is the one
        // place a deriver answers "what rank may I claim?".
        const copy = storyCopy(meta.lang);
        if (b.rankRole === "tail") descriptor = copy.lowest;
        else if (b.rank === 1)
          descriptor = copy.highestOf(meta.regionsWithData);
        else descriptor = copy.ordinalWord(b.rank);
      }
      prose = `${nameAndValue(b.callout.name, b.callout.value)}${descriptor ? ", " + descriptor : ""}`;
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

/**
 * "<name> — <value>", or whichever half exists on its own.
 *
 * The separator belongs to the PAIR, not to either half. Written inline as
 * "`${name} — ${value}`" it punched a hole at BOTH ends, and both were measured on delivered
 * pages:
 *   · no value — every locator anchor (a marker carries no number):
 *       "Rue du Stand 26 — "   ·   "Pont d'Austerlitz — , the highest of the 5 shown"
 *   · no name — a symbol map built from a CSV with no label column (SymbolPoint.label is
 *     optional, and the loop only sets it when a label column exists):
 *       "— 220 MW, le plus élevé des 4"
 * One helper, so no caption path can disagree about the separator and no half that was never
 * going to exist can leave a published caption hanging on it.
 */
export function nameAndValue(name: string, value: string): string {
  const hasName = name.trim() !== "";
  const hasValue = value.trim() !== "";
  if (hasName && hasValue) return `${name} — ${value}`;
  return hasName ? name : hasValue ? value : "";
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
