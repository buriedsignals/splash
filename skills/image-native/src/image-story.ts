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
  // Where the caption's WORDS came from — the discriminant `sourcePassage`'s requirement is
  // keyed on (spec §5, line 92: "REQUIS dès que la caption est article-dérivée" — required as
  // soon as the caption is article-derived):
  //   "article"   (or absent — see the default note below) — suggest-image's vision-matched
  //                path (skills/suggest-image): the caption is a rephrase of a matched article
  //                passage, and `sourcePassage` is REQUIRED so the anti-copy overlap tripwire
  //                has something to check the rephrase against.
  //   "authored"  — the loop's own beat-authored path (lib/loop/assemble/image-native.ts): the
  //                caption IS the journalist's own narrative beat, never matched against
  //                anything, so `sourcePassage` is correctly absent and nothing is checked.
  // DEFAULT IS "article" when this key is omitted entirely — not "authored". A frame that says
  // nothing about its provenance is far likelier to be a manifest from the older, undiscriminated
  // shape (every caller before this field existed) than a caller opting into the new authored
  // path, and the safe failure on that ambiguity is the LOUD one: keep enforcing the guard
  // rather than silently waiving it.
  captionSource?: "article" | "authored";
  // The matched article passage — the tripwire's reference (spec §6.5). Required exactly when
  // `captionSource` is "article" (or absent, by the default above); absent and unchecked when
  // "authored". Never fabricate one for an authored frame: there is no passage it came from, and
  // inventing one would hand the overlap tripwire a reference nobody wrote, to compare a caption
  // against words it never came from.
  sourcePassage?: string;
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
  // Newsroom ground (#rrggbb) — scaffold + matte derive from it (threaded by the splash
  // brand-profile merge; per-element value wins). Absent = light default.
  themeBg?: string;
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

// Function words (EN + FR) that carry no
// plagiarism signal. Excluded so a terse caption that merely shares "the/over/on/as" with its
// topically-matched passage is not counted as copying: directed containment (see below) has a
// small denominator, so a shared preposition + article would otherwise trip the threshold. The
// tripwire measures reuse of DESCRIPTIVE prose, not shared grammar.
const STOPWORDS = new Set<string>([
  // EN
  "the",
  "an",
  "and",
  "or",
  "but",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "from",
  "into",
  "onto",
  "over",
  "under",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "has",
  "have",
  "had",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "he",
  "she",
  "they",
  "we",
  "you",
  "his",
  "her",
  "their",
  "our",
  "your",
  "not",
  "no",
  "than",
  "then",
  "so",
  "up",
  "out",
  "off",
  "down",
  "about",
  "after",
  "before",
  "once",
  "here",
  "there",
  "where",
  "when",
  "while",
  "which",
  "who",
  "whom",
  "whose",
  "will",
  "would",
  "can",
  "could",
  "may",
  "might",
  "must",
  "should",
  "do",
  "does",
  "did",
  "through",
  "along",
  "across",
  "between",
  "against",
  "during",
  "without",
  "within",
  "last",
  "every",
  // FR
  "le",
  "la",
  "les",
  "un",
  "une",
  "des",
  "du",
  "de",
  "et",
  "ou",
  "mais",
  "en",
  "dans",
  "sur",
  "sous",
  "par",
  "pour",
  "avec",
  "sans",
  "vers",
  "chez",
  "ce",
  "cet",
  "cette",
  "ces",
  "il",
  "elle",
  "ils",
  "elles",
  "on",
  "nous",
  "vous",
  "se",
  "sa",
  "son",
  "ses",
  "leur",
  "leurs",
  "ne",
  "pas",
  "plus",
  "que",
  "qui",
  "quoi",
  "dont",
  "comme",
  "si",
  "alors",
  "puis",
  "ici",
  "sont",
  "ont",
  // EN determiners / quantifiers / high-frequency adverbs (no descriptive signal)
  "all",
  "any",
  "some",
  "more",
  "most",
  "other",
  "another",
  "each",
  "both",
  "many",
  "much",
  "few",
  "such",
  "same",
  "own",
  "only",
  "also",
  "just",
  "very",
  "what",
  "how",
  "why",
  "one",
  "two",
  // FR (accented forms now tokenize under the Unicode tokenizer)
  "à",
  "au",
  "aux",
  "été",
  "être",
  "était",
  "étaient",
  "où",
  "déjà",
  "très",
  "ça",
  "tout",
  "tous",
  "toute",
  "toutes",
  "autre",
  "autres",
  "même",
  "mêmes",
  "aussi",
  "encore",
  "chaque",
  "cela",
]);

// The caption's content words IN ORDER: lowercase, curly apostrophes normalized to straight (so
// a hand-typed caption `l'usine` and a pasted passage `l’usine` compare equal — elision is the
// commonest French orthographic feature and Heidi.news is French-first), Unicode-tokenized (so
// accented French words stay whole), ≥2 chars, function words (STOPWORDS) removed. Numbers are
// kept (a copied date sequence is verbatim reuse). Order is preserved because the tripwire
// compares adjacent-word PAIRS, not a bag of words.
function contentSequence(text: string): string[] {
  const seq: string[] = [];
  const normalized = text.toLowerCase().replace(/[‘’ʼ]/g, "'");
  for (const m of normalized.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu)) {
    const t = m[0];
    if (t.length < 2 || STOPWORDS.has(t)) continue;
    seq.push(t);
  }
  return seq;
}

// The set of adjacent content-word pairs ("content bigrams") of a token sequence.
function contentBigrams(seq: string[]): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i + 1 < seq.length; i++) grams.add(`${seq[i]} ${seq[i + 1]}`);
  return grams;
}

// The anti-copy tripwire: what fraction of the caption's adjacent content-word pairs (bigrams)
// also occur in the passage — directed containment over CONTENT BIGRAMS, not a bag of words. A
// verbatim / near-verbatim excerpt reuses the passage's word RUNS; a legitimate terse caption
// merely reuses the subject's unavoidable topic nouns in ISOLATION (a photo of a protest has to
// say "protesters"), which shares tokens but not runs. Because it is case-insensitive and works
// on runs, Title-Case / ALL-CAPS captions and reused proper names no longer distort the score —
// a shared name alone is one token, never a shared bigram — so no proper-noun heuristic is
// needed. 0 = no shared content phrase; 1 = every caption bigram is lifted. A caption with fewer
// than two content words has no bigram → 0 (too short to be a passage excerpt). Tradeoff: a
// DELIBERATE full word-shuffle of a short passage evades (bigrams need adjacency), but that is
// contrived for a photo caption, whereas the bag-of-words alternative false-flagged the common
// terse caption — a guard that cries wolf on every ordinary caption gets ignored. The guard's
// force still rests on ② supplying a tightly-scoped sourcePassage (spec §6.5).
export function captionOverlapRatio(caption: string, passage: string): number {
  const a = contentBigrams(contentSequence(caption));
  if (a.size === 0) return 0;
  const b = contentBigrams(contentSequence(passage));
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / a.size;
}

// ---------------------------------------------------------------------------------
// Scrolly bridge (spec §5) — ImageStory → the scrolly scaffold's story shape.
// Typed STRUCTURALLY (no import from skills/scrolly) so the dependency stays one-way:
// scrolly imports image-native's schema, never the reverse. The shapes below are
// assignable to scrolly's ScrollyStep/ScrollyStory by construction (visual:"image"
// and action:"crossfade" are members of its VisualKind/StepAction unions).
export interface ImageScrollyStep {
  id: string;
  visual: "image";
  action: "crossfade";
  ref: number; // frame index into ImageStory.frames
  prose: string;
  align?: "left" | "right" | "center";
}

export interface ImageScrollyStory {
  title: string;
  description?: string;
  source?: { name: string; url?: string };
  visual: "image";
  steps: ImageScrollyStep[];
}

// One intro step (the description — what/when/where, shown over the FIRST frame) then
// one step per frame. The caption is passed through AS-IS — unlike mapStoryToChapters,
// which DERIVES its prose from the data — which is exactly why the §6/§7 tripwires
// (sourcePassage + overlap + the mandatory journalist gate) sit upstream of this call.
export function imageStoryToChapters(story: ImageStory): ImageScrollyStory {
  const steps: ImageScrollyStep[] = [
    {
      id: "step-0-intro",
      visual: "image",
      action: "crossfade",
      ref: 0,
      prose: story.description,
      align: "center",
    },
  ];
  story.frames.forEach((frame, i) => {
    steps.push({
      id: `step-${i + 1}-frame-${frame.id}`,
      visual: "image",
      action: "crossfade",
      ref: i,
      prose: frame.caption,
      align: frame.align ?? "center",
    });
  });
  return {
    title: story.title,
    description: story.description,
    source: story.source,
    visual: "image",
    steps,
  };
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
    // Path-safety (review F1/F2, probed exploits): the id becomes an output FILENAME
    // (prep writes `<framesDir>/<id>.jpg`, the inliner reads it back) and the frameRef is
    // resolved under imageDir. A traversal in either is an arbitrary read/write primitive
    // reachable from an LLM-composed manifest — refuse at conformance, BEFORE any dispatch.
    else if (!/^[A-Za-z0-9_-]+$/.test(f.id))
      v.push(
        `frame id "${f.id}" is not a safe slug (letters, digits, - and _ only) — ids become output filenames`,
      );
    else {
      if (ids.has(f.id)) v.push(`duplicate frame id "${f.id}"`);
      ids.add(f.id);
    }
    const label = f.id?.trim() ? `"${f.id}"` : `at index ${i}`;
    if (!f.frameRef?.trim())
      v.push(
        `frame ${label} has an empty frameRef — every frame references a raw image`,
      );
    else if (
      f.frameRef.startsWith("/") ||
      f.frameRef.startsWith("\\") ||
      /^[A-Za-z]:[\\/]/.test(f.frameRef) ||
      f.frameRef.split(/[\\/]/).includes("..")
    )
      v.push(
        `frame ${label} frameRef "${f.frameRef}" must be a plain path INSIDE the image folder — no absolute paths, no ".." (the raw images live under imageDir, nothing else is readable)`,
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
    // sourcePassage's requirement is GATED ON captionSource (see ImageStep's own comment), not
    // blanket-optional: an article-derived frame (captionSource: "article", or the field absent
    // — the safe, loud default) still owes one, exactly as it did before "authored" existed.
    // Only a frame explicitly marked "authored" is legitimately exempt — the loop's own beats
    // were never matched against any passage. This is the discriminant a review found missing:
    // without it, EVERY caller (including suggest-image's shipped vision-matched path) could
    // omit sourcePassage and the anti-copy tripwire would silently stop checking anything.
    const isArticleDerived = f.captionSource !== "authored";
    if (isArticleDerived && !f.sourcePassage?.trim())
      v.push(
        `frame ${label} has no sourcePassage — an article-derived caption must record the passage it came from`,
      );
    else if (f.sourcePassage) {
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
