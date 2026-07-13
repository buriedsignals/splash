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

// The format a story is being conformance-checked FOR. The frame-count floor is scoped by
// format (spec §6.3): static uses the key frame (≥1), a video crossfade needs ≥2, an embedded
// scrolly needs a real narrative sequence of 3–6 (spec §6.4). Omitted ⇒ the loosest floor (≥1):
// a bare core check never rejects a single frame, since <2 is an orchestrator degrade-to-static
// decision, not a conformance error (spec §13).
export type ImageFormat = "static" | "video" | "scrolly";

const FRAME_FLOOR: Record<ImageFormat, number> = {
  static: 1,
  video: 2,
  scrolly: 3,
};
const FRAME_CAP = 6; // embedded-module cap (spec §6.4); the cull (§7) enforces it upstream.

// The proper nouns of a text: tokens capitalized in a NON-sentence-initial position. A word
// capitalized only because it starts a sentence is NOT a proper noun — the earlier rule
// ("capitalized anywhere ⇒ proper noun") mis-read sentence-initial common words as proper and
// excluded them asymmetrically (excluded on the sentence-start side, kept on the lowercase
// side), undercounting the intersection and letting a near-copy slip under the overlap
// threshold. Sentence starts = text start or the first word after a `.`/`!`/`?` boundary.
function properNouns(text: string): Set<string> {
  const proper = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const words = [...sentence.matchAll(/[A-Za-z][\w'-]*/g)];
    words.forEach((w, idx) => {
      if (idx === 0) return; // sentence-initial: capitalization carries no proper-noun signal
      if (/^[A-Z]/.test(w[0])) proper.add(w[0].toLowerCase());
    });
  }
  return proper;
}

// Content tokens for the overlap tripwire: lowercase word tokens (≥2 chars; the tokenizer
// admits only letters/`'`/`-`, so pure numbers never appear as tokens), MINUS the shared
// proper-noun set. A self-contained caption legitimately reuses place names, people, and dates
// from the passage it describes — those must NOT count as "copying the article". What we flag
// is reuse of the passage's ordinary descriptive prose. The proper-noun set is computed over
// BOTH texts together (see captionOverlapRatio), so a name is excluded symmetrically whether it
// lands sentence-initially in one text and mid-sentence in the other.
function contentTokens(text: string, proper: Set<string>): Set<string> {
  const tokens = new Set<string>();
  for (const m of text.toLowerCase().matchAll(/[a-z][a-z'-]+/g)) {
    const t = m[0];
    if (!proper.has(t)) tokens.add(t);
  }
  return tokens;
}

// How much of the CAPTION's descriptive prose is lifted from its source passage: the fraction
// of the caption's content tokens that also appear in the passage — directed containment
// |A∩B| / |A|, A = caption. Containment, NOT Jaccard: a short caption that is a verbatim
// excerpt of a LONGER passage is still plagiarism, and Jaccard's union denominator would wrongly
// dilute that by the passage's extra words (letting a copied tail slip under the threshold). The
// proper-noun exclusion set is built from BOTH texts so a reused name is dropped symmetrically.
// 0 = the caption reuses none of the passage's prose; 1 = every content word is lifted.
export function captionOverlapRatio(caption: string, passage: string): number {
  const proper = new Set<string>([
    ...properNouns(caption),
    ...properNouns(passage),
  ]);
  const a = contentTokens(caption, proper);
  const b = contentTokens(passage, proper);
  if (a.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / a.size;
}

export function checkImageConformance(
  story: ImageStory,
  opts?: { overlapThreshold?: number; format?: ImageFormat },
): string[] {
  const v: string[] = [];
  const overlapThreshold = opts?.overlapThreshold ?? 0.6;
  const format = opts?.format;
  if (!story.title?.trim()) v.push("missing story title");
  if (!story.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!story.source?.name?.trim())
    v.push(
      "missing source name — an embedded module must carry its own source",
    );

  // Guard the frames array before touching .length (spec §7: a malformed input must produce a
  // violation, never a raw stack trace).
  if (!Array.isArray(story.frames)) {
    v.push("missing frames — an image story needs a frames array");
    return v;
  }

  const n = story.frames.length;
  const floor = format ? FRAME_FLOOR[format] : 1;
  if (n < floor)
    v.push(
      format
        ? `only ${n} frame${n === 1 ? "" : "s"} — a ${format} needs at least ${floor}`
        : `no frames — an image story needs at least one frame`,
    );
  if (n > FRAME_CAP)
    v.push(
      `${n} frames — an embedded image scrolly is capped at ${FRAME_CAP}; cull upstream`,
    );

  if (
    !Number.isInteger(story.keyFrame) ||
    story.keyFrame < 0 ||
    story.keyFrame >= n
  )
    v.push(`keyFrame ${story.keyFrame} out of range [0,${n})`);

  const ids = new Set<string>();
  story.frames.forEach((f, i) => {
    if (!f.id?.trim()) v.push(`frame at index ${i} has an empty id`);
    else {
      if (ids.has(f.id)) v.push(`duplicate frame id "${f.id}"`);
      ids.add(f.id);
    }
    const label = f.id?.trim() ? `"${f.id}"` : `at index ${i}`;
    if (!f.frameRef?.trim())
      v.push(
        `frame ${label} has an empty frameRef — every frame references a raw image`,
      );
    if (!f.caption?.trim()) v.push(`frame ${label} has empty caption`);
    if (!f.alt?.trim())
      v.push(
        `frame ${label} has empty alt — a photo needs a text alternative describing what is visible`,
      );
    else if (f.alt.trim() === f.caption?.trim())
      v.push(
        `frame ${label} alt duplicates its caption — alt describes what is visible, caption states significance`,
      );
    if (!f.credit?.name?.trim())
      v.push(
        `frame ${label} has no photo credit — each image carries its own attribution`,
      );
    if (!f.sourcePassage?.trim())
      v.push(
        `frame ${label} has no sourcePassage — an article-derived caption must record the passage it came from`,
      );
    else {
      const ratio = captionOverlapRatio(f.caption ?? "", f.sourcePassage);
      if (ratio > overlapThreshold)
        v.push(
          `frame ${label} caption too close to its source passage (overlap ${ratio.toFixed(
            2,
          )} > ${overlapThreshold}) — rephrase self-contained, never a verbatim excerpt`,
        );
    }
  });
  return v;
}
