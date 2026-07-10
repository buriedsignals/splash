// image-native — the data contract for a journalist-supplied image sequence and its
// render-free conformance. Pure: no images, no DOM, no I/O. Mirrors the scrolly
// conformance style (a string[] of human-readable violations; empty = valid).
// Spec: docs/superpowers/specs/2026-07-10-image-scrolly-design.md §5, §6.

export interface ImageCredit {
  name: string;
  url?: string;
  licence?: string;
}

export interface ImageStep {
  id: string;
  frameRef: string; // raw image filename, resolved relative to ImageStory.imageDir
  caption: string; // article-derived, self-contained, NEVER a verbatim excerpt
  alt: string; // what is VISIBLE — journalist-supplied, distinct from caption (WCAG 1.1.1)
  credit: ImageCredit; // per-frame photo credit — a different axis from the module source
  sourcePassage: string; // the matched article passage — the tripwire's reference
  fit?: "crop" | "canvas-frame"; // per-frame override of ImageStory.fit
  align?: "left" | "right" | "center";
}

export interface ImageStory {
  title: string; // the insight — persistent header, never a caption
  description: string; // intro caption (what/when/where)
  source: { name: string; url?: string }; // ARTICLE/DATA provenance (≠ per-frame credit)
  frames: ImageStep[];
  keyFrame: number; // index of the representative frame → static export
  fit: "canvas-frame" | "crop"; // project default (canvas-frame is the safe editorial default)
  lang?: string;
  imageDir: string; // root for resolving frameRefs (suggest-image → engine handoff)
}

// Content tokens for the overlap tripwire: lowercase word tokens, MINUS proper nouns
// (any token that appears Capitalized in the original text) and MINUS pure numbers.
// Rationale: a self-contained caption legitimately reuses place names, people, and dates
// from the passage it describes — those must NOT count as "copying the article". What we
// flag is reuse of the passage's ordinary descriptive/connective prose.
function contentTokens(text: string): Set<string> {
  const properOrNumber = new Set<string>();
  for (const m of text.matchAll(/\b([A-Z][\w'-]*|\d[\d.,]*)\b/g))
    properOrNumber.add(m[1].toLowerCase());
  const tokens = new Set<string>();
  for (const m of text.toLowerCase().matchAll(/[a-z][a-z'-]+/g)) {
    const t = m[0];
    if (properOrNumber.has(t)) continue; // proper noun (capitalized somewhere) — excluded
    tokens.add(t);
  }
  return tokens;
}

// Jaccard overlap (|A∩B| / |A∪B|) of the two token sets. 0 = disjoint, 1 = identical set.
export function captionOverlapRatio(caption: string, passage: string): number {
  const a = contentTokens(caption);
  const b = contentTokens(passage);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function checkImageConformance(
  story: ImageStory,
  _opts?: { overlapThreshold?: number },
): string[] {
  const v: string[] = [];
  if (!story.title?.trim()) v.push("missing story title");
  if (!story.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!story.source?.name?.trim())
    v.push(
      "missing source name — an embedded module must carry its own source",
    );
  const n = story.frames.length;
  if (n < 2)
    v.push(
      `only ${n} frame${n === 1 ? "" : "s"} — an image sequence needs at least 2`,
    );
  if (n > 6)
    v.push(
      `${n} frames — an embedded image scrolly is capped at 6; cull upstream`,
    );
  if (
    !Number.isInteger(story.keyFrame) ||
    story.keyFrame < 0 ||
    story.keyFrame >= n
  )
    v.push(`keyFrame ${story.keyFrame} out of range [0,${n})`);
  const ids = new Set<string>();
  for (const f of story.frames) {
    if (ids.has(f.id)) v.push(`duplicate frame id "${f.id}"`);
    ids.add(f.id);
    if (!f.caption?.trim()) v.push(`frame "${f.id}" has empty caption`);
    if (!f.alt?.trim())
      v.push(
        `frame "${f.id}" has empty alt — a photo needs a text alternative describing what is visible`,
      );
    else if (f.alt.trim() === f.caption?.trim())
      v.push(
        `frame "${f.id}" alt duplicates its caption — alt describes what is visible, caption states significance`,
      );
    if (!f.credit?.name?.trim())
      v.push(
        `frame "${f.id}" has no photo credit — each image carries its own attribution`,
      );
  }
  return v;
}
