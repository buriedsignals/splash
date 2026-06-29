import type { ScrollyStory } from "./chapters";

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
