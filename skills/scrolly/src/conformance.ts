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
  if (!story.source?.name?.trim() || !story.source?.url?.trim())
    v.push(
      "missing source (name + url) — an embedded module must carry its own source",
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

// GUARDRAIL for defect #3 — the generic min/max template leaking into TEMPORAL
// data. A temporal/ordinal value field must be told as a SEQUENCE ("the first /
// then / the most recent"), never as a ranking. This audit FAILS if any map step
// whose beat is a TEMPORAL reveal carries "highest" or "lowest" in its prose — the
// exact regression where a year-field story reverts to the max/min template.
//
// It cross-references the derived story against the beats (which carry `pattern`):
// the step's ref indexes into `beats`, so we know each step's originating beat.
const RANKING_WORD = /\b(highest|lowest)\b/i;

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
    if (RANKING_WORD.test(s.prose))
      v.push(
        `temporal reveal step "${s.id}" uses ranking language ("highest"/"lowest") — ` +
          `a temporal field must read as a sequence, not a rank: "${s.prose}"`,
      );
  }
  return v;
}
