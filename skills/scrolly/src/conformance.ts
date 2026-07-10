import type { ScrollyStory } from "./chapters";
import type { Beat } from "../../map-native/src/map-story";

// Render-free conformance for a scrolly story. beatCount = the number of map
// beats the map steps' refs must index into.
export function checkScrollyConformance(
  story: ScrollyStory,
  beatCount: number,
): string[] {
  const v: string[] = [];
  if (!story.title?.trim()) v.push("missing story title");
  if (!story.description?.trim())
    v.push("missing description — a module must state what/when/where");
  // Source NAME required (an embedded module must carry its own attribution); URL optional
  // — an honest prose source legitimately has none (E2 deadlock).
  if (!story.source?.name?.trim())
    v.push(
      "missing source name — an embedded module must carry its own source",
    );
  if (story.steps.length < 3)
    v.push(`only ${story.steps.length} steps — a scrolly needs at least 3`);
  const ids = new Set<string>();
  for (const s of story.steps) {
    if (!s.prose?.trim()) v.push(`step "${s.id}" has empty prose`);
    if (ids.has(s.id)) v.push(`duplicate step id "${s.id}"`);
    ids.add(s.id);
    if (s.visual === "map") {
      const r = typeof s.ref === "number" ? s.ref : NaN;
      if (!Number.isInteger(r) || r < 0 || r >= beatCount)
        v.push(
          `map step "${s.id}" ref ${s.ref} out of beat range [0,${beatCount})`,
        );
    }
  }
  return v;
}

// GUARDRAIL — the concluding beat must be a DISTINCT takeaway, never a verbatim repeat
// of the intro. The observed defect: the takeaway step recycled the intro/description
// word-for-word (a scrolly that opens and closes on the same sentence says nothing new).
// A well-formed story opens on the description and CLOSES on a data-tied takeaway (the
// gap / the span). Deterministic: compares the first step's prose against the last.
// Only fires when there are ≥3 steps (a real story with a distinct close to check).
export function auditDistinctBookends(story: ScrollyStory): string[] {
  const steps = story.steps;
  if (steps.length < 3) return [];
  const first = steps[0]?.prose?.trim() ?? "";
  const last = steps[steps.length - 1]?.prose?.trim() ?? "";
  if (first && last && first === last)
    return [
      `intro and takeaway are identical — the concluding beat must state a distinct, ` +
        `data-tied takeaway (the gap / the span), not repeat the intro: "${last}"`,
    ];
  return [];
}

// GUARDRAIL for defect #3 — the generic min/max template leaking into TEMPORAL
// data. A temporal/ordinal value field must be told as a SEQUENCE ("the first /
// then / the most recent"), never as a ranking. This audit FAILS if any map step
// whose beat is a TEMPORAL reveal carries "highest" or "lowest" in its prose — the
// exact regression where a year-field story reverts to the max/min template.
//
// It cross-references the derived story against the beats (which carry `pattern`):
// the step's ref indexes into `beats`, so we know each step's originating beat.
const RANKING_WORD = /\b(highest|lowest)\b/i;

// A temporal caption is INFORMATIVE only if it carries a data-tied descriptor
// beyond region + year + a bare connective. Deterministic signals, all of which
// deriveMapStory grounds in the data:
//   - a sequence anchor: "first" / "most recent",
//   - an ordinal: word (second…tenth) or number (2nd, 13th, …),
//   - an interval: "N year(s) later" / "N year(s) after …".
// A caption that is essentially "<region> — <year>, then/next" has NONE of these
// and is flagged as hollow filler.
const ORDINAL_WORD =
  /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|most recent|latest)\b/i;
const ORDINAL_NUMBER = /\b\d+(st|nd|rd|th)\b/i;
const INTERVAL = /\b\d+\s+years?\s+(later|after|on)\b/i;

function isInformativeTemporal(prose: string): boolean {
  return (
    ORDINAL_WORD.test(prose) ||
    ORDINAL_NUMBER.test(prose) ||
    INTERVAL.test(prose)
  );
}

export function auditTemporalNarrative(
  story: ScrollyStory,
  beats: Beat[],
): string[] {
  const v: string[] = [];
  for (const s of story.steps) {
    if (s.visual !== "map" || typeof s.ref !== "number") continue;
    const beat = beats[s.ref];
    if (!beat || beat.kind !== "reveal" || beat.pattern !== "temporal")
      continue;
    if (RANKING_WORD.test(s.prose)) {
      v.push(
        `temporal reveal step "${s.id}" uses ranking language ("highest"/"lowest") — ` +
          `a temporal field must read as a sequence, not a rank: "${s.prose}"`,
      );
      continue;
    }
    if (!isInformativeTemporal(s.prose))
      v.push(
        `temporal reveal step "${s.id}" is uninformative — a bare connective ` +
          `("then"/"next") carries no data. Each temporal caption must state an ` +
          `ordinal ("the first"/"the 3rd") or interval ("N years later"): "${s.prose}"`,
      );
  }
  return v;
}
